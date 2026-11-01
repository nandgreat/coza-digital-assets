<?php

namespace App\Services;

use App\Models\DailyAssetDownload;
use App\Models\DailyUniqueUser;
use App\Support\AnalyticsLabels;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * Analytics Data Service
 *
 * Builds dashboard aggregates exclusively from normalized local analytics tables.
 *
 * Google Analytics 4 is intentionally not queried from this service. All GA4
 * communication belongs to GoogleAnalyticsService, while synchronization of
 * GA4 data into the local tables belongs to RefreshAnalyticsData.
 *
 * This service therefore provides one stable, fast data source to the dashboard,
 * exports and other local reporting endpoints.
 */
class AnalyticsDataService
{
    /**
     * Build all dashboard aggregates from local tables.
     *
     * This method queries only normalized local tables – no GA4 calls.
     *
     * @param string $startDate
     * @param string $endDate
     * @param string|null $serviceType
     * @param string|null $program
     * @param int $limit
     * @return array
     */
    public function buildDashboardData(
        string $startDate,
        string $endDate,
        ?string $serviceType,
        ?string $program,
        int $limit = 10
    ): array {
        // ─── Base Query ─────────────────────────────────────────────────────
        $query = DailyAssetDownload::whereBetween(
            'date',
            [$startDate, $endDate]
        );

        if ($serviceType) {
            $query->where('service_type', $serviceType);
        }

        if ($program) {
            $query->where('program', $program);
        }

        // ─── Total Downloads ────────────────────────────────────────────────
        $totalDownloads = (int) $query->sum('downloads');

        // ─── Daily Unique Users Trend ───────────────────────────────────────
        $uniqueUserQuery = DailyUniqueUser::whereBetween(
            'date',
            [$startDate, $endDate]
        );

        $dailyUniqueTrend = $uniqueUserQuery
        ->select('date', 'unique_users')
        ->orderBy('date')
        ->get()
        ->map(fn($item) => [
            'date' => $item->date instanceof \Carbon\Carbon 
                ? $item->date->toDateString() 
                : $item->date,
            'uniqueUsers' => (int) $item->unique_users,
        ])
        ->values()
        ->toArray();

        // ─── Total Unique Users KPI ─────────────────────────────────────────
        /**
         * `daily_unique_users` stores one active-user value per day for the
         * `asset_download` event. Summing this column produces the dashboard's
         * cumulative daily-unique-user KPI, not a de-duplicated user count over
         * the entire date range.
         *
         * A true period-level distinct-user KPI would require a separately
         * persisted period aggregate or a direct GA4 activeUsers query.
         */
        $totalUniqueUsers = (int) $uniqueUserQuery->sum('unique_users');

        // ─── Breakdown by Asset Type (Downloads) ────────────────────────────
        // Merge NULL / "unknown" / "(not set)" / alias rows into one proper label
        // each (e.g. "Sermon Notes"), then sort and keep the top $limit.
        $assetTotals = [];

        (clone $query)
            ->select('asset_type', DB::raw('SUM(downloads) as total'))
            ->groupBy('asset_type')
            ->get()
            ->each(function ($item) use (&$assetTotals) {
                $label = AnalyticsLabels::assetLabel($item->asset_type);
                $assetTotals[$label] = ($assetTotals[$label] ?? 0) + (int) $item->total;
            });

        arsort($assetTotals);

        $assetTotalCount = count($assetTotals);

        $byAsset = collect($assetTotals)
            ->map(fn ($total, $label) => ['asset_type' => (string) $label, 'eventCount' => $total])
            ->take($limit)
            ->values()
            ->toArray();

        // ─── Breakdown by Service Type (Downloads) ──────────────────────────
        // Only real service types: downloads GA4 could not attribute to a service
        // (even after the catalog lookup at sync time) are not a service, so they
        // are left out instead of being shown as "Unknown".
        $serviceTotalCount = AnalyticsLabels::whereNamed(clone $query, 'service_type')
            ->select('service_type')
            ->distinct()
            ->count('service_type');

        $byService = AnalyticsLabels::whereNamed(clone $query, 'service_type')
            ->select(
                'service_type',
                DB::raw('SUM(downloads) as total')
            )
            ->groupBy('service_type')
            ->orderBy('total', 'desc')
            ->limit($limit)
            ->get()
            ->map(fn($item) => [
                'service_type' => $item->service_type,
                'eventCount' => (int) $item->total,
            ])
            ->values()
            ->toArray();

        // ─── Downloads that cannot be attributed to a service ───────────────
        // Hidden from the service chart, but still inside $totalDownloads. Shown
        // as a footnote so the chart total and the KPI visibly reconcile. When a
        // service filter is active every row already belongs to that service.
        $unattributedDownloads = $serviceType
            ? 0
            : (int) AnalyticsLabels::whereBlank(clone $query, 'service_type')->sum('downloads');

        // ─── Daily Trend (Downloads) ────────────────────────────────────────
        $dailyTrend = (clone $query)
            ->select(
                'date',
                DB::raw('SUM(downloads) as total')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn($item) => [
                'date' => $item->date instanceof \Carbon\Carbon 
                    ? $item->date->toDateString() 
                    : $item->date,
                'eventCount' => (int) $item->total,
            ])
            ->values()
            ->toArray();

        // ─── Top Sessions ───────────────────────────────────────────────────
        $topSessions = (clone $query)
            ->select(
                'program',
                'session',
                DB::raw('SUM(downloads) as total')
            )
            ->whereNotNull('session')
            ->groupBy('program', 'session')
            ->orderBy('total', 'desc')
            ->limit(10)
            ->get()
            ->map(fn($item) => [
                'program' => $item->program,
                'session' => $item->session,
                'eventCount' => (int) $item->total,
            ])
            ->values()
            ->toArray();

        // ─── Comparison Period ─────────────────────────────────────────────
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

        // ─── Return Dashboard Dataset ──────────────────────────────────────
        return [
            'totalDownloads'   => (int) $totalDownloads,
            'totalUniqueUsers' => (int) $totalUniqueUsers,
            'dailyUniqueUsers' => $dailyUniqueTrend,
            'byAssetType'      => $byAsset,
            'byServiceType'    => $byService,
            'dailyTrend'       => $dailyTrend,
            'topSessions'      => $topSessions,
            'uniqueByAsset'    => [],
            'geoData'          => [],
            'filters'          => [
                'start_date'    => $startDate,
                'end_date'      => $endDate,
                'compare_start' => $compareStart,
                'compare_end'   => $compareEnd,
                'service_type'  => $serviceType,
                'program'      => $program,
            ],
            'totalChange'      => (int) $totalChange,
            'totalPercent'     => (float) $totalPercent,
            'assetTotalCount'  => (int) $assetTotalCount,
            'serviceTotalCount'=> (int) $serviceTotalCount,
            'unattributedDownloads' => $unattributedDownloads,
        ];
    }

    /**
     * Convert a nullable local dimension value into a dashboard-safe label.
     *
     * GA4 `(not set)` and empty custom-dimension values are stored as NULL by
     * RefreshAnalyticsData. The dashboard receives a consistent `Unknown` label.
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
