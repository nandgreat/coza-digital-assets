<?php

namespace App\Jobs;

use App\Models\DailyAssetDownload;
use App\Models\DailyUniqueUser;
use App\Services\GoogleAnalyticsService;
use App\Support\AnalyticsLabels;
use App\Support\CatalogResolver;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Pulls asset_download data from GA4 into the local reporting tables.
 *
 * CHANGES (v2):
 *  - Incremental mode now re-fetches the last 2 already-synced days (overlap)
 *    so late GA4 processing is picked up. Both modes replace their fetched
 *    window (delete + bulk insert in one transaction) so re-fetching never
 *    duplicates rows.
 *  - `pagePath` is requested as an extra dimension so blank asset_type values
 *    can be inferred from the page the download happened on. Rows are
 *    re-aggregated in PHP afterwards.
 *  - Blank service_type / program / session inside the 7DG window become "7DG"
 *    (see App\Support\AnalyticsLabels and config/analytics.php).
 *  - (v3) Blank service_type / program / session are first re-derived from the
 *    catalog using the session slug in `pagePath` (App\Support\CatalogResolver),
 *    so they are attributed to the right service instead of showing as "Unknown".
 *    The 7DG window rule is only the last resort.
 *  - (v3) A sync always replaces the WHOLE fetched date window. The optional
 *    service/program arguments no longer narrow the GA4 fetch or the delete:
 *    a blank value resolved to a service cannot be matched by a raw GA4 filter,
 *    which used to delete rows without re-inserting them.
 *  - (v4) GA4 leaves events that carry none of the custom parameters out of ANY report that
 *    requests those dimensions (verified: with asset_type / service_type / program / session
 *    requested, every day before the dimensions existed came back empty, so the local total was
 *    ~27% of GA4's). A second, dimension-light query (date x pagePath) now reports every
 *    download; whatever the detailed query did not return is added back and attributed from the
 *    page path (catalog slug / path rules, 7DG window as the last resort). Nothing is double
 *    counted: only the per date+page difference is added.
 *  - The job no longer writes the dashboard cache itself (it bypassed the
 *    live unique-user logic); it just invalidates it.
 */
class RefreshAnalyticsData implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Days of already-synced data re-fetched by an incremental refresh. */
    private const OVERLAP_DAYS = 2;

    public int $tries = 2;
    public int $timeout = 300;

    public function __construct(
        protected string $startDate,
        protected string $endDate,
        protected ?string $serviceType = null,
        protected ?string $program = null,
        protected bool $fullRefresh = false,
    ) {
    }

    public function handle(GoogleAnalyticsService $ga): void
    {
        Log::info('Analytics refresh job started', [
            'start_date' => $this->startDate, 'end_date' => $this->endDate,
            'service_type' => $this->serviceType, 'program' => $this->program,
            'full_refresh' => $this->fullRefresh,
        ]);

        // GA4 has no data for the future.
        $endDate = min($this->endDate, now()->toDateString());

        // ── Fetch range ────────────────────────────────────────────────
        if ($this->fullRefresh) {
            $fetchStart = $this->startDate;
        } else {
            $lastLocal = DailyAssetDownload::max('date');
            $fetchStart = $lastLocal
                ? Carbon::parse($lastLocal)->subDays(self::OVERLAP_DAYS)->toDateString()
                : $this->startDate;
        }

        if ($fetchStart > $endDate) {
            Cache::put('analytics_refresh_status', 'done', 60);
            return;
        }

        // ── GA4 filters ───────────────────────────────────────────────
        // Intentionally none: the window is replaced as a whole (see v3 note).
        $filters = [];
        $catalog = new CatalogResolver();

        // ── Asset downloads (fetched BEFORE any local delete) ──────────
        $gaData = $ga->getDownloads(
            $fetchStart,
            $endDate,
            ['date', 'asset_type', 'service_type', 'program', 'session', 'pagePath'],
            ['eventCount'],
            'asset_download',
            $filters,
            true // always bypass the 1-hour cache for a sync
        );

        // Every download with its page, regardless of custom parameters (see v4 note).
        $pageRows = $ga->getDownloads(
            $fetchStart,
            $endDate,
            ['date', 'pagePath'],
            ['eventCount'],
            'asset_download',
            $filters,
            true
        );

        $aggregated = [];

        foreach ($gaData as $row) {
            $date = self::isoDate($row['date'] ?? null);

            if ($date === null) {
                Log::warning('Skipping GA4 row with invalid date', ['row' => $row]);
                continue;
            }

            $this->addDownloads(
                $aggregated,
                $catalog,
                $date,
                $row['asset_type'] ?? $row['customEvent:asset_type'] ?? null,
                $row['service_type'] ?? $row['customEvent:service_type'] ?? null,
                $row['program'] ?? $row['customEvent:program'] ?? null,
                $row['session'] ?? $row['customEvent:session'] ?? null,
                $row['pagePath'] ?? null,
                (int) ($row['eventCount'] ?? 0)
            );
        }

        // Downloads the detailed query could not see: attribute them from the page alone.
        $recoveredRows      = 0;
        $recoveredDownloads = 0;

        foreach (self::unreportedByPage($gaData, $pageRows) as $missing) {
            $this->addDownloads(
                $aggregated, $catalog, $missing['date'], null, null, null, null, $missing['pagePath'], $missing['count']
            );

            $recoveredRows++;
            $recoveredDownloads += $missing['count'];
        }

        // ── Replace the fetched window atomically ──────────────────────
        $now = now();

        DB::transaction(function () use ($aggregated, $fetchStart, $endDate, $now): void {
            DailyAssetDownload::whereBetween('date', [$fetchStart, $endDate])->delete();

            $rows = array_map(
                fn (array $r) => $r + ['created_at' => $now, 'updated_at' => $now],
                array_values($aggregated)
            );

            foreach (array_chunk($rows, 500) as $chunk) {
                DailyAssetDownload::insert($chunk);
            }
        });

        // ── Daily unique users (global, kept as a local fallback) ──────
        try {
            $dailyUnique = $ga->getDownloads(
                $fetchStart, $endDate, ['date'], ['activeUsers'], 'asset_download', [], true
            );

            foreach ($dailyUnique as $row) {
                try {
                    $date = Carbon::createFromFormat('Ymd', $row['date'] ?? '')->toDateString();
                } catch (\Throwable) {
                    continue;
                }

                DailyUniqueUser::updateOrCreate(
                    ['date' => $date],
                    ['unique_users' => (int) ($row['activeUsers'] ?? 0)]
                );
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to fetch daily unique users', ['error' => $e->getMessage()]);
        }

        // ── Invalidate the cached dashboard so the next read rebuilds it
        //    through AnalyticsDashboardService (with live unique users).
        Cache::forget('analytics_dashboard_' . md5(
            $this->startDate . $this->endDate . ($this->serviceType ?? '') . ($this->program ?? '')
        ));

        Cache::forget('analytics_refresh_error');
        Cache::put('analytics_refresh_status', 'done', 60);

        Log::info('Analytics refresh job completed', [
            'fetched_from' => $fetchStart, 'fetched_to' => $endDate,
            'ga_rows' => count($gaData), 'saved_rows' => count($aggregated),
            'recovered_rows' => $recoveredRows, 'recovered_downloads' => $recoveredDownloads,
        ]);
    }

    /**
     * Attribute one batch of downloads and add it to the aggregate.
     *
     * Explicit GA4 values win; blanks are recovered from the catalog via the session slug in the
     * page path, then from the program name, and only then by the legacy 7DG window rule.
     *
     * @param array<string, array<string, mixed>> $aggregated
     */
    private function addDownloads(
        array &$aggregated,
        CatalogResolver $catalog,
        string $date,
        mixed $assetRaw,
        mixed $serviceRaw,
        mixed $programRaw,
        mixed $sessionRaw,
        ?string $pagePath,
        int $count
    ): void {
        if ($count <= 0) {
            return;
        }

        $asset = AnalyticsLabels::canonicalAssetType($assetRaw) ?? AnalyticsLabels::assetTypeFromPath($pagePath);

        // Explicit GA4 values first; blank ones are NULL here.
        $service = $this->clean($serviceRaw);
        $program = $this->clean($programRaw);
        $session = $this->clean($sessionRaw);

        // Recover blanks from the catalog via the session slug in the page path...
        if ($service === null || $program === null || $session === null) {
            $hit = $catalog->fromPath($pagePath);

            $service ??= $hit['service'] ?? null;
            $program ??= $hit['program'] ?? null;
            $session ??= $hit['session'] ?? null;
        }

        // ...or a service from the program name...
        $service ??= $catalog->serviceForProgram($program);

        // ...and only then fall back to the legacy 7DG window rule (else NULL).
        $service = AnalyticsLabels::normaliseDimension($service, $date);
        $program = AnalyticsLabels::normaliseDimension($program, $date);
        $session = AnalyticsLabels::normaliseDimension($session, $date);

        $key = implode('|', [$date, $asset, $service, $program, $session]);

        $aggregated[$key] ??= [
            'date' => $date, 'asset_type' => $asset, 'service_type' => $service,
            'program' => $program, 'session' => $session, 'downloads' => 0,
        ];
        $aggregated[$key]['downloads'] += $count;
    }

    /**
     * Downloads present in the date x pagePath report but absent from the detailed report.
     *
     * @param array<int, array<string, mixed>> $detailRows rows of the custom-dimension report (need date, pagePath, eventCount)
     * @param array<int, array<string, mixed>> $pageRows   rows of the date x pagePath report
     * @return array<int, array{date: string, pagePath: ?string, count: int}>
     */
    public static function unreportedByPage(array $detailRows, array $pageRows): array
    {
        $seen = [];

        foreach ($detailRows as $row) {
            $date = self::isoDate($row['date'] ?? null);

            if ($date !== null) {
                $key = $date . '|' . ($row['pagePath'] ?? '');
                $seen[$key] = ($seen[$key] ?? 0) + (int) ($row['eventCount'] ?? 0);
            }
        }

        $missing = [];

        foreach ($pageRows as $row) {
            $date = self::isoDate($row['date'] ?? null);

            if ($date === null) {
                continue;
            }

            $path  = $row['pagePath'] ?? null;
            $count = (int) ($row['eventCount'] ?? 0) - ($seen[$date . '|' . ($path ?? '')] ?? 0);

            if ($count > 0) {
                $missing[] = ['date' => $date, 'pagePath' => $path, 'count' => $count];
            }
        }

        return $missing;
    }

    private static function isoDate(mixed $ymd): ?string
    {
        try {
            return Carbon::createFromFormat('Ymd', (string) $ymd)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    /** Trimmed GA4 dimension value, or NULL when it is blank / "(not set)" / "unknown". */
    private function clean(mixed $value): ?string
    {
        return AnalyticsLabels::isBlank($value) ? null : trim((string) $value);
    }

    public function failed(\Throwable $exception): void
    {
        Cache::put('analytics_refresh_error', $exception->getMessage(), 300);
        Cache::put('analytics_refresh_status', 'failed', 300);

        Log::error('Analytics refresh job failed permanently', [
            'start_date' => $this->startDate, 'end_date' => $this->endDate,
            'error' => $exception->getMessage(),
        ]);
    }
}
