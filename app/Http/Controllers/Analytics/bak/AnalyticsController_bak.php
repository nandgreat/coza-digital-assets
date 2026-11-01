<?php

namespace App\Http\Controllers\Analytics;

use App\Http\Controllers\Controller;
use App\Models\DailyAssetDownload;
use App\Jobs\RefreshAnalyticsData;
use App\Services\GoogleAnalyticsService;
use App\Services\Analytics\AnalyticsDashboardService;
use App\Data\Analytics\AnalyticsFiltersData;
use App\Data\Analytics\AnalyticsRefreshStatusData;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * Analytics Controller
 *
 * Handles the analytics dashboard for COZA digital asset downloads.
 * Dashboard aggregates are sourced from the local `daily_asset_downloads`
 * table, which is refreshed from Google Analytics 4 by the asynchronous
 * `RefreshAnalyticsData` queue job.
 *
 * The controller follows a clear separation of responsibilities:
 * - `GoogleAnalyticsService` owns GA4 communication and dimension normalization.
 * - `RefreshAnalyticsData` owns GA4 -> local-table synchronization and rebuilds.
 * - `AnalyticsDataService` owns local-table aggregation for the dashboard.
 * - This controller owns HTTP request/response orchestration only.
 *
 * Performance optimizations:
 * - Cached dashboard data (5 minutes) to reduce DB load.
 * - Controlled full refreshes through the queue rather than synchronous GA4 calls.
 * - Local database aggregation for dashboard breakdowns and exports.
 * - Database indexes on `date`, `service_type`, `program`, `asset_type`, `session`.
 * - Auto-refresh fallback when the requested local dataset is empty.
 */
class AnalyticsController extends Controller
{
    /**
     * @var GoogleAnalyticsService
     */
    protected $ga;

    /**
     * @var AnalyticsDashboardService
     */
    protected AnalyticsDashboardService $dashboardService;

    /**
     * Cache duration in minutes.
     */
    protected int $cacheMinutes = 5;

    /**
     * Constructor – inject the GA service and the data aggregation service.
     *
     * @param GoogleAnalyticsService $ga
     */
    public function __construct(
        GoogleAnalyticsService $ga,
        AnalyticsDashboardService $dashboardService,
    ) {
        $this->ga = $ga;
        $this->dashboardService = $dashboardService;
    }

    /**
     * Display the analytics dashboard page (Inertia Render).
     *
     * @param Request $request
     * @return \Inertia\Response
     */
    public function index(Request $request): Response
    {
        $filters = AnalyticsFiltersData::fromRequest($request);
        $primaryStart = $filters->startDate;
        $primaryEnd = $filters->endDate;
        $serviceType = $filters->serviceType;
        $program = $filters->program;

        $cacheKey = $this->dashboardCacheKey(
            $primaryStart,
            $primaryEnd,
            $serviceType,
            $program
        );

        $cachedData = Cache::get($cacheKey);

        if ($cachedData) {
            $dashboard = new \App\Data\Analytics\AnalyticsDashboardData($cachedData);
        } else {
            $dashboard = $this->dashboardService->dashboard($filters);
            $dashboardArray = $dashboard->toArray();

            if ((int) ($dashboardArray['totalDownloads'] ?? 0) === 0) {
                $this->dispatchRefreshIfNeeded(
                    $primaryStart,
                    $primaryEnd,
                    $serviceType,
                    $program
                );
            }

            Cache::put(
                $cacheKey,
                $dashboardArray,
                now()->addMinutes($this->cacheMinutes)
            );
        }

        $dashboardArray = $dashboard->toArray();

        return Inertia::render('Analytics/Dashboard', [
            // Preserve the historical flat props for backwards compatibility.
            ...$dashboardArray,

            'locationData' => $this->dashboardService->geo($filters),
            'cartoRegistry' => config('continent_map'),

            // Canonical typed Inertia contracts consumed by the refactored React dashboard.
            'analyticsDashboard' => $dashboardArray,
            'analyticsFilters' => $this->dashboardService->filterOptions()->toArray(),

            'assetBreakdown' => Inertia::defer(fn () =>
                $this->dashboardService
                    ->breakdown(
                        AnalyticsFiltersData::fromRequest($request),
                        'asset',
                        max(0, (int) $request->input('asset_offset', 0)),
                        10
                    )
                    ->toArray()
            ),

            'serviceBreakdown' => Inertia::defer(fn () =>
                $this->dashboardService
                    ->breakdown(
                        AnalyticsFiltersData::fromRequest($request),
                        'service',
                        max(0, (int) $request->input('service_offset', 0)),
                        10
                    )
                    ->toArray()
            ),

            'sessionsPage' => Inertia::defer(fn () =>
                $this->dashboardService
                    ->sessions(
                        AnalyticsFiltersData::fromRequest($request),
                        max(0, (int) $request->input('sessions_offset', 0)),
                        min(100, max(1, (int) $request->input('sessions_limit', 10)))
                    )
                    ->toArray()
            ),

            'uniqueByAssetData' => Inertia::defer(fn () =>
                $this->dashboardService->uniqueUsersByAsset(
                    AnalyticsFiltersData::fromRequest($request)
                )
            ),

            'geoData' => Inertia::defer(fn () =>
                $this->dashboardService->geo(
                    AnalyticsFiltersData::fromRequest($request)
                )
            ),
        ]);
    }

    /**
     * Return the canonical dashboard dataset as JSON.
     *
     * This legacy transport adapter delegates all dashboard aggregation to the
     * same `AnalyticsDashboardService` contract used by the Inertia dashboard.
     * It remains temporarily for legacy consumers and performs no direct
     * analytics aggregation or GA4 communication.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function data(Request $request)
    {
        $filters = AnalyticsFiltersData::fromRequest($request);
        $cacheKey = $this->dashboardCacheKey(
            $filters->startDate,
            $filters->endDate,
            $filters->serviceType,
            $filters->program,
        );

        $data = Cache::get($cacheKey);

        if (!$data) {
            $data = $this->dashboardService->dashboard($filters)->toArray();

            if ((int) ($data['totalDownloads'] ?? 0) === 0) {
                $this->dispatchRefreshIfNeeded(
                    $filters->startDate,
                    $filters->endDate,
                    $filters->serviceType,
                    $filters->program,
                );
            }

            Cache::put($cacheKey, $data, now()->addMinutes($this->cacheMinutes));
        }

        return response()->json($data);
    }

    /**
     * Helper to dispatch background GA4 sync job when local dataset is empty.
     */
    private function dispatchRefreshIfNeeded(string $start, string $end, ?string $serviceType, ?string $program): void
    {
        if (Cache::get('analytics_refresh_status') !== 'in_progress') {
            Cache::put('analytics_refresh_status', 'in_progress', now()->addMinutes(30));
            RefreshAnalyticsData::dispatch($start, $end, $serviceType, $program, true);
        }
    }

    /**
     * Get geographic distribution of unique users by country.
     *
     * The legacy JSON transport delegates to the canonical dashboard service.
     * GA4 communication remains isolated inside GoogleAnalyticsService.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function geo(Request $request)
    {
        return response()->json(
            $this->dashboardService->geo(
                AnalyticsFiltersData::fromRequest($request)
            )
        );
    }

    /**
     * Get unique users breakdown by asset type.
     *
     * The legacy JSON transport delegates to the canonical dashboard service.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function uniqueByAsset(Request $request)
    {
        return response()->json(
            $this->dashboardService->uniqueUsersByAsset(
                AnalyticsFiltersData::fromRequest($request)
            )
        );
    }

    /**
     * Fetch a paginated asset/service breakdown through the canonical service.
     *
     * The JSON contract is retained for compatibility while all aggregation
     * now comes from AnalyticsDashboardService.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function breakdown(Request $request)
    {
        $type = $request->input('breakdown');

        if (!in_array($type, ['asset', 'service'], true)) {
            return response()->json([
                'items'   => [],
                'status'  => 'error',
                'message' => 'Invalid breakdown. Expected asset or service.',
            ], 422);
        }

        $offsetField = $type === 'asset' ? 'asset_offset' : 'service_offset';

        return response()->json(
            $this->dashboardService->breakdown(
                AnalyticsFiltersData::fromRequest($request),
                $type,
                max(0, (int) $request->input('offset', $request->input($offsetField, 0))),
                min(100, max(1, (int) $request->input('limit', 10))),
            )->toArray()
        );
    }

    /**
     * Get paginated top sessions through the canonical service contract.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function sessions(Request $request)
    {
        return response()->json(
            $this->dashboardService->sessions(
                AnalyticsFiltersData::fromRequest($request),
                max(0, (int) $request->input(
                    'offset',
                    $request->input('sessions_offset', 0)
                )),
                min(100, max(1, (int) $request->input(
                    'limit',
                    $request->input('sessions_limit', 10)
                ))),
            )->toArray()
        );
    }

    /**
     * Refresh the local analytics dataset from Google Analytics 4.
     *
     * This endpoint dispatches a controlled full rebuild for the requested
     * period. The actual GA4 request, normalization, validation and database
     * replacement are performed asynchronously by RefreshAnalyticsData.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function refresh(Request $request)
    {
        $filters = AnalyticsFiltersData::fromRequest($request);

        if (Cache::get('analytics_refresh_status') === 'in_progress') {
            return response()->json(
                (new AnalyticsRefreshStatusData(
                    'in_progress',
                    'An analytics refresh is already in progress.'
                ))->toArray(),
                409
            );
        }

        Cache::put(
            'analytics_refresh_status',
            'in_progress',
            now()->addMinutes(30)
        );

        RefreshAnalyticsData::dispatch(
            $filters->startDate,
            $filters->endDate,
            $filters->serviceType,
            $filters->program,
            true
        );

        return response()->json(
            (new AnalyticsRefreshStatusData(
                'refreshing',
                'Analytics refresh started.',
            ))->toArray() + [
                'start_date'   => $filters->startDate,
                'end_date'     => $filters->endDate,
                'service_type' => $filters->serviceType,
                'program'      => $filters->program,
                'full_refresh' => true,
            ]
        );
    }

    /**
     * Full refresh endpoint – rebuilds the entire requested period from GA4.
     *
     * This endpoint is retained as an explicit administrative/backfill route.
     * It uses the exact same controlled rebuild job as the normal refresh route,
     * ensuring there is only one persistence path for GA4 -> local analytics data.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function fullRefresh(Request $request)
    {
        return $this->refresh($request);
    }

    /**
     * Check the status of the asynchronous analytics refresh job.
     *
     * The background lifecycle remains JSON because it is a transport operation,
     * while any dashboard reconstruction is delegated to the service contract.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function refreshStatus(Request $request)
    {
        return response()->json(
            $this->dashboardService->refreshStatus(
                AnalyticsFiltersData::fromRequest($request),
                $this->cacheMinutes,
            )->toArray()
        );
    }

    /**
     * Get available filter options through the canonical dashboard service.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function filters()
    {
        return response()->json($this->dashboardService->filterOptions()->toArray());
    }

    /**
     * Export dashboard data as a CSV file.
     *
     * Generates a CSV with the following sections:
     * - Summary (total downloads, comparison)
     * - Daily trend (date, downloads)
     * - Breakdown by asset type
     * - Breakdown by service type
     * - Top 10 sessions
     *
     * The file is streamed to the browser as a download.
     *
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\StreamedResponse
     */
    public function export(Request $request)
    {
        $dates = $this->validatedDateRange($request);

        $startDate   = $dates['start'];
        $endDate     = $dates['end'];
        $serviceType = $request->input('service_type');
        $program     = $request->input('program');

        // Build a fresh query (no dashboard cache) from the normalized local table.
        $query = DailyAssetDownload::whereBetween('date', [$startDate, $endDate]);

        if ($serviceType) {
            $query->where('service_type', $serviceType);
        }

        if ($program) {
            $query->where('program', $program);
        }

        // ─── Summary ──────────────────────────────────────────────────────
        $totalDownloads = (int) $query->sum('downloads');

        // ─── Daily Trend ──────────────────────────────────────────────────
        $dailyTrend = (clone $query)
            ->select('date', DB::raw('SUM(downloads) as total'))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn($item) => [
                'date'      => $item->date,
                'downloads' => (int) $item->total,
            ]);

        // ─── By Asset Type ────────────────────────────────────────────────
        $byAsset = (clone $query)
            ->select('asset_type', DB::raw('SUM(downloads) as total'))
            ->groupBy('asset_type')
            ->orderByDesc('total')
            ->get()
            ->map(fn($item) => [
                'asset_type' => $this->displayDimensionValue($item->asset_type),
                'downloads'  => (int) $item->total,
            ]);

        // ─── By Service Type ──────────────────────────────────────────────
        $byService = (clone $query)
            ->select('service_type', DB::raw('SUM(downloads) as total'))
            ->groupBy('service_type')
            ->orderByDesc('total')
            ->get()
            ->map(fn($item) => [
                'service_type' => $this->displayDimensionValue($item->service_type),
                'downloads'    => (int) $item->total,
            ]);

        // ─── Top Sessions ─────────────────────────────────────────────────
        $topSessions = (clone $query)
            ->select(
                'program',
                'session',
                DB::raw('SUM(downloads) as total'),
            //    DB::raw('MAX(date) as latest_date') // Add the raw date aggregate
            )
            ->whereNotNull('session')
            ->where('session', '!=', '')
            ->groupBy('program', 'session')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn($item) => [
                'program'     => $this->displayDimensionValue($item->program),
                'session'     => $this->displayDimensionValue($item->session),
                'downloads'   => (int) $item->total,
            //    'eventCount'  => (int) $item->total,
            //    'date'        => $item->latest_date, // Map it to match the frontend expectation
            ])
            ->values()
            ->toArray();

        // ─── Comparison Period ────────────────────────────────────────────
        $daysDiff = Carbon::parse($startDate)
            ->diffInDays(Carbon::parse($endDate)) + 1;

        $compareStart = Carbon::parse($startDate)
            ->subDays($daysDiff)
            ->toDateString();

        $compareEnd = Carbon::parse($endDate)
            ->subDays($daysDiff)
            ->toDateString();

        $compareQuery = DailyAssetDownload::whereBetween(
            'date',
            [$compareStart, $compareEnd]
        );

        if ($serviceType) {
            $compareQuery->where('service_type', $serviceType);
        }

        if ($program) {
            $compareQuery->where('program', $program);
        }

        $compareTotal = (int) $compareQuery->sum('downloads');

        $totalChange = $totalDownloads - $compareTotal;
        $totalPercent = $compareTotal > 0
            ? round(($totalChange / $compareTotal) * 100, 1)
            : 0;

        // ─── Generate CSV content using a temporary stream ────────────────
        $callback = function () use (
            $totalDownloads,
            $compareTotal,
            $totalChange,
            $totalPercent,
            $dailyTrend,
            $byAsset,
            $byService,
            $topSessions,
            $startDate,
            $endDate
        ) {
            $handle = fopen('php://output', 'w');

            // --- Summary ---
            fputcsv($handle, ['COZA Asset Analytics Report']);
            fputcsv($handle, ['Date Range', $startDate, 'to', $endDate]);
            fputcsv($handle, ['Total Downloads', $totalDownloads]);
            fputcsv($handle, ['Previous Period Total', $compareTotal]);
            fputcsv(
                $handle,
                [
                    'Change',
                    $totalChange,
                    '(' . ($totalPercent >= 0 ? '+' : '') . $totalPercent . '%)',
                ]
            );
            fputcsv($handle, []);

            // --- Daily Trend ---
            fputcsv($handle, ['Daily Trend']);
            fputcsv($handle, ['Date', 'Downloads']);

            foreach ($dailyTrend as $row) {
                fputcsv($handle, [$row['date'], $row['downloads']]);
            }

            fputcsv($handle, []);

            // --- By Asset Type ---
            fputcsv($handle, ['Downloads by Asset Type']);
            fputcsv($handle, ['Asset Type', 'Downloads']);

            foreach ($byAsset as $row) {
                fputcsv($handle, [$row['asset_type'], $row['downloads']]);
            }

            fputcsv($handle, []);

            // --- By Service Type ---
            fputcsv($handle, ['Downloads by Service Type']);
            fputcsv($handle, ['Service Type', 'Downloads']);

            foreach ($byService as $row) {
                fputcsv($handle, [$row['service_type'], $row['downloads']]);
            }

            fputcsv($handle, []);

            // --- Top Sessions ---
            fputcsv($handle, ['Top 10 Sessions']);
            fputcsv($handle, ['Rank', 'Program', 'Session', 'Downloads']);

            $rank = 1;

            foreach ($topSessions as $row) {
                fputcsv(
                    $handle,
                    [
                        $rank++,
                        $row['program'],
                        $row['session'],
                        $row['downloads'],
                    ]
                );
            }

            fclose($handle);
        };

        $filename = 'analytics_' . $startDate . '_to_' . $endDate . '.csv';

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ]);
    }

    /**
     * Temporary diagnostic endpoint for GA4 asset_download events.
     *
     * This endpoint is useful for debugging:
     * - Checking what data GA4 returns for the current property.
     * - Verifying that custom dimensions are correctly registered.
     * - Inspecting the normalized response structure.
     *
     * This endpoint should be removed or protected before production deployment.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function diagnoseGoogleAnalytics(Request $request)
    {
        $dates = $this->validatedDateRange($request);

        try {
            $data = $this->ga->diagnoseAssetDownloads(
                $dates['start'],
                $dates['end']
            );

            return response()->json([
                'success'    => true,
                'property_id'=> config('services.ga4.property_id'),
                'start_date' => $dates['start'],
                'end_date'   => $dates['end'],
                'rows'       => count($data),
                'data'       => $data,
            ], 200, [], JSON_PRETTY_PRINT);
        } catch (\Throwable $e) {
            Log::error(
                'GA4 diagnostic failed',
                [
                    'message' => $e->getMessage(),
                    'trace'   => $e->getTraceAsString(),
                ]
            );

            return response()->json([
                'success' => false,
                'error'   => $e->getMessage(),
            ], 500, [], JSON_PRETTY_PRINT);
        }
    }

    /**
     * Build the cache key used for a specific dashboard filter combination.
     *
     * @param string $startDate
     * @param string $endDate
     * @param string|null $serviceType
     * @param string|null $program
     * @return string
     */
    private function dashboardCacheKey(
        string $startDate,
        string $endDate,
        ?string $serviceType,
        ?string $program
    ): string {
        return 'analytics_dashboard_' . md5(
            $startDate .
            $endDate .
            ($serviceType ?? '') .
            ($program ?? '')
        );
    }

    /**
     * Validate and normalize dashboard date-range input.
     *
     * @param Request $request
     * @return array{start:string,end:string}
     */
    private function validatedDateRange(Request $request): array
    {
        $start = $request->input(
            'start_date',
            now()->subDays(30)->toDateString()
        );

        $end = $request->input(
            'end_date',
            now()->toDateString()
        );

        $startDate = Carbon::parse($start)->toDateString();
        $endDate   = Carbon::parse($end)->toDateString();

        if ($startDate > $endDate) {
            abort(422, 'The start date cannot be later than the end date.');
        }

        return [
            'start' => $startDate,
            'end'   => $endDate,
        ];
    }

    /**
     * Convert a nullable local dimension value into a dashboard-safe label.
     *
     * The database uses NULL for GA4 values that are missing or `(not set)`.
     * The presentation layer displays those values as `Unknown`.
     *
     * @param mixed $value
     * @return string
     */
    private function displayDimensionValue($value): string
    {
        $value = trim((string) $value);

        return $value !== '' ? $value : 'Unknown';
    }
}
