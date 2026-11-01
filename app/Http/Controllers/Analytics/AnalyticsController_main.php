<?php

namespace App\Http\Controllers\Analytics;

use App\Http\Controllers\Controller;
use App\Models\DailyAssetDownload;
use App\Jobs\RefreshAnalyticsData;
use App\Services\GoogleAnalyticsService;
use App\Services\AnalyticsDataService;
use Inertia\Inertia;
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
     * @var AnalyticsDataService
     */
    protected $analyticsData;

    /**
     * Cache duration in minutes.
     */
    protected int $cacheMinutes = 5;

    /**
     * Constructor – inject the GA service and the data aggregation service.
     *
     * @param GoogleAnalyticsService $ga
     * @param AnalyticsDataService $analyticsData
     */
    public function __construct(GoogleAnalyticsService $ga, AnalyticsDataService $analyticsData)
    {
        $this->ga = $ga;
        $this->analyticsData = $analyticsData;
    }

    /**
     * Display the analytics dashboard.
     *
     * 1. Build a cache key from the request parameters (date range + filters).
     * 2. If cached data exists, return it immediately.
     * 3. Otherwise, build dashboard aggregates from the normalized local table.
     * 4. If the requested local dataset is empty, dispatch a controlled full refresh.
     * 5. Render the Inertia dashboard without making synchronous GA4 requests.
     *
     * @param Request $request
     * @return \Inertia\Response
     */
    public function index(Request $request)
    {
        // ────────────────────────────────────────────────────────────────
        // Extract and validate request parameters
        // ────────────────────────────────────────────────────────────────

        $primaryStart = $request->input(
            'start_date',
            now()->subDays(30)->toDateString()
        );

        $primaryEnd = $request->input(
            'end_date',
            now()->toDateString()
        );

        $serviceType = $request->input('service_type');
        $program     = $request->input('program');

        if (Carbon::parse($primaryStart)->gt(Carbon::parse($primaryEnd))) {
            abort(422, 'The start date cannot be later than the end date.');
        }

        // ────────────────────────────────────────────────────────────────
        // Build a unique cache key for the exact combination of filters
        // ────────────────────────────────────────────────────────────────

        $cacheKey = $this->dashboardCacheKey(
            $primaryStart,
            $primaryEnd,
            $serviceType,
            $program
        );

        // ────────────────────────────────────────────────────────────────
        // Attempt to retrieve from cache
        // ────────────────────────────────────────────────────────────────

        $cachedData = Cache::get($cacheKey);

        /**
         * Only use cached dashboard data when the payload contains the
         * expected array-based structure.
         *
         * This prevents stale or previously serialized Collection objects
         * from reaching Inertia.
         */
        if (
            is_array($cachedData) &&
            is_array($cachedData['dailyTrend'] ?? null) &&
            is_array($cachedData['byAssetType'] ?? null) &&
            is_array($cachedData['byServiceType'] ?? null) &&
            is_array($cachedData['topSessions'] ?? null) &&
            is_array($cachedData['dailyUniqueUsers'] ?? null)
        ) {
            return Inertia::render(
                'Analytics/Dashboard',
                $cachedData
            );
        }

        // ────────────────────────────────────────────────────────────────
        // Build the data from the local normalized analytics tables.
        // ────────────────────────────────────────────────────────────────

        $data = $this->analyticsData->buildDashboardData(
            $primaryStart,
            $primaryEnd,
            $serviceType,
            $program
        );

        // ────────────────────────────────────────────────────────────────
        // If the requested dataset is empty, dispatch the same controlled
        // rebuild used by the explicit Refresh operation.
        // ────────────────────────────────────────────────────────────────

        $refreshInProgress = Cache::get('analytics_refresh_status') === 'in_progress';
        
        if ((int) ($data['totalDownloads'] ?? 0) === 0) {

            /**
             * The dashboard does not perform a synchronous GA4 rebuild.
             *
             * Instead, dispatch the controlled full-refresh job. This ensures
             * that all GA4 communication, normalization, validation and local
             * persistence follow one consistent code path.
             */
            if (!$refreshInProgress) {

                Cache::put(
                    'analytics_refresh_status',
                    'in_progress',
                    now()->addMinutes(30)
                );

                RefreshAnalyticsData::dispatch(
                    $primaryStart,
                    $primaryEnd,
                    $serviceType,
                    $program,
                    true
                );

                $refreshInProgress = true;
            }
        }

        // ────────────────────────────────────────────────────────────────
        // Cache only a populated dashboard result.
        // ────────────────────────────────────────────────────────────────
        //
        // A zero-result response must never be cached because the dashboard
        // may currently be waiting for a controlled background rebuild.
        // Caching the empty response can cause the frontend to continue
        // displaying zero values even after the local analytics table has
        // been successfully rebuilt.

        if ((int) ($data['totalDownloads'] ?? 0) > 0) {

            Cache::put(
                $cacheKey,
                $data,
                now()->addMinutes($this->cacheMinutes)
            );
        }

        return Inertia::render('Analytics/Dashboard', $data);
    }

    /**
     * Get geographic distribution of unique users by country.
     *
     * This endpoint queries GA4 for the `activeUsers` metric grouped by `country`
     * (a built-in dimension) within the selected date range and optional filters.
     *
     * Geographic data is intentionally retrieved directly from GA4 because
     * country is a standard GA4 dimension and does not belong in the local
     * digital-asset aggregation table.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function geo(Request $request)
    {
        $start = $request->input(
            'start_date',
            now()->subDays(30)->toDateString()
        );

        $end = $request->input(
            'end_date',
            now()->toDateString()
        );

        $serviceType = $request->input('service_type');
        $program     = $request->input('program');

        $filters = [];

        if ($serviceType) {
            $filters['service_type'] = $serviceType;
        }

        if ($program) {
            $filters['program'] = $program;
        }

        // `country` is a built-in GA4 dimension and requires no customEvent prefix.
        $data = $this->ga->getUniqueUsersByDimension(
            $start,
            $end,
            ['country'],
            $filters
        );

        $mapData = [];

        foreach ($data as $row) {
            $country = trim((string) ($row['country'] ?? 'Unknown')) ?: 'Unknown';

            $mapData[$country] = (int) ($row['activeUsers'] ?? 0);
        }

        return response()->json($mapData);
    }

    /**
     * Get unique users breakdown by asset type.
     *
     * This endpoint fetches the number of unique users who downloaded each
     * asset type directly from GA4. The controller deliberately passes the
     * application-level dimension name `asset_type`; GoogleAnalyticsService
     * owns the conversion to `customEvent:asset_type` before the API request.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function uniqueByAsset(Request $request)
    {
        $start = $request->input(
            'start_date',
            now()->subDays(30)->toDateString()
        );

        $end = $request->input(
            'end_date',
            now()->toDateString()
        );

        $serviceType = $request->input('service_type');
        $program     = $request->input('program');

        $filters = [];

        if ($serviceType) {
            $filters['service_type'] = $serviceType;
        }

        if ($program) {
            $filters['program'] = $program;
        }

        $data = $this->ga->getUniqueUsersByDimension(
            $start,
            $end,
            ['asset_type'],
            $filters
        );

        return response()->json($data);
    }

    /**
     * Fetch paginated breakdown items for asset or service types.
     * Used by the "Load More" button in the frontend.
     *
     * This method queries the local `daily_asset_downloads` table,
     * not GA4 directly. The local table is already populated with
     * normalized application-level dimension names by RefreshAnalyticsData.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function breakdown(Request $request)
    {
        $start = $request->input(
            'start_date',
            now()->subDays(30)->toDateString()
        );

        $end = $request->input(
            'end_date',
            now()->toDateString()
        );

        $serviceType = $request->input('service_type');
        $program     = $request->input('program');
        $breakdown   = $request->input('breakdown');
        $offset      = max(0, (int) $request->input('offset', 0));
        $limit       = min(100, max(1, (int) $request->input('limit', 10)));

        if (!in_array($breakdown, ['asset', 'service'], true)) {
            return response()->json([
                'items'  => [],
                'status' => 'error',
                'message' => 'Invalid breakdown. Expected asset or service.',
            ], 422);
        }

        $query = DailyAssetDownload::whereBetween('date', [$start, $end]);

        if ($serviceType) {
            $query->where('service_type', $serviceType);
        }

        if ($program) {
            $query->where('program', $program);
        }

        $field = $breakdown === 'asset'
            ? 'asset_type'
            : 'service_type';

        $items = $query
            ->select(
                $field,
                DB::raw('SUM(downloads) as total')
            )
            ->groupBy($field)
            ->orderByDesc('total')
            ->skip($offset)
            ->take($limit)
            ->get()
            ->map(fn($item) => [
                $field       => $this->displayDimensionValue($item->$field),
                'eventCount' => (int) $item->total,
            ])
            ->values();

        return response()->json([
            'items'  => $items,
            'offset' => $offset,
            'limit'  => $limit,
        ]);
    }

    /**
     * Get paginated top sessions with total count and latest date.
     *
     * Queries the local table, not GA4 directly.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function sessions(Request $request)
    {
        $start = $request->input(
            'start_date',
            now()->subDays(30)->toDateString()
        );

        $end = $request->input(
            'end_date',
            now()->toDateString()
        );

        $serviceType = $request->input('service_type');
        $program     = $request->input('program');
        $offset      = max(0, (int) $request->input('offset', 0));
        $limit       = min(100, max(1, (int) $request->input('limit', 10)));

        $query = DailyAssetDownload::whereBetween('date', [$start, $end])
            ->whereNotNull('session')
            ->where('session', '!=', '');

        if ($serviceType) {
            $query->where('service_type', $serviceType);
        }

        if ($program) {
            $query->where('program', $program);
        }

        // Total distinct (program, session) pairs.
        $total = (clone $query)
            ->select('program', 'session')
            ->distinct()
            ->get()
            ->count();

        // Paginated sessions with latest date and total downloads.
        $sessions = $query
            ->select(
                'program',
                'session',
                DB::raw('SUM(downloads) as total_downloads'),
                DB::raw('MAX(date) as latest_date')
            )
            ->groupBy('program', 'session')
            ->orderByDesc('total_downloads')
            ->skip($offset)
            ->take($limit)
            ->get()
            ->map(fn($item) => [
                'program'    => $this->displayDimensionValue($item->program),
                'session'    => $this->displayDimensionValue($item->session),
                'eventCount' => (int) $item->total_downloads,
                'date'       => $item->latest_date,
            ])
            ->values();

        return response()->json([
            'data'   => $sessions,
            'total'  => $total,
            'offset' => $offset,
            'limit'  => $limit,
        ]);
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
        $dates = $this->validatedDateRange($request);

        $serviceType = $request->input('service_type');
        $program     = $request->input('program');

        if (Cache::get('analytics_refresh_status') === 'in_progress') {
            return response()->json([
                'status'  => 'in_progress',
                'message' => 'An analytics refresh is already in progress.',
            ]);
        }

        Cache::put(
            'analytics_refresh_status',
            'in_progress',
            now()->addMinutes(30)
        );

        RefreshAnalyticsData::dispatch(
            $dates['start'],
            $dates['end'],
            $serviceType,
            $program,
            true
        );

        return response()->json([
            'status'       => 'refreshing',
            'start_date'   => $dates['start'],
            'end_date'     => $dates['end'],
            'service_type' => $serviceType,
            'program'      => $program,
            'full_refresh' => true,
        ]);
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
     * Check the status of the refresh job.
     *
     * Returns the cached dashboard data if the job is done; otherwise returns
     * the current asynchronous refresh status.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function refreshStatus(Request $request)
    {
        $status = Cache::get('analytics_refresh_status', 'idle');

        if ($status === 'in_progress') {
            return response()->json([
                'status' => 'in_progress',
            ]);
        }

        if ($status === 'failed') {
            return response()->json([
                'status'  => 'failed',
                'message' => Cache::get(
                    'analytics_refresh_error',
                    'The analytics refresh failed.'
                ),
            ]);
        }

        if ($status === 'done') {
            $dates = $this->validatedDateRange($request);
            $serviceType = $request->input('service_type');
            $program     = $request->input('program');

            $cacheKey = $this->dashboardCacheKey(
                $dates['start'],
                $dates['end'],
                $serviceType,
                $program
            );

            $data = Cache::get($cacheKey);

            if (!$data) {
                $data = $this->analyticsData->buildDashboardData(
                    $dates['start'],
                    $dates['end'],
                    $serviceType,
                    $program
                );

                Cache::put(
                    $cacheKey,
                    $data,
                    now()->addMinutes($this->cacheMinutes)
                );
            }

            return response()->json([
                'status' => 'done',
                'data'   => $data,
            ]);
        }

        return response()->json([
            'status' => 'idle',
        ]);
    }

    /**
     * Get available filter options (service types and programs) from the local table.
     * Used to populate dropdown menus in the frontend.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function filters()
    {
        $serviceTypes = DailyAssetDownload::query()
            ->whereNotNull('service_type')
            ->where('service_type', '!=', '')
            ->distinct()
            ->orderBy('service_type')
            ->pluck('service_type')
            ->values()
            ->toArray();

        $programs = DailyAssetDownload::query()
            ->whereNotNull('program')
            ->where('program', '!=', '')
            ->distinct()
            ->orderBy('program')
            ->pluck('program')
            ->values()
            ->toArray();

        return response()->json([
            'serviceTypes' => $serviceTypes,
            'programs'     => $programs,
        ]);
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
                DB::raw('SUM(downloads) as total')
            )
            ->whereNotNull('session')
            ->where('session', '!=', '')
            ->groupBy('program', 'session')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn($item) => [
                'program'   => $this->displayDimensionValue($item->program),
                'session'   => $this->displayDimensionValue($item->session),
                'downloads' => (int) $item->total,
            ]);

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
