<?php

namespace App\Services\Analytics;

use App\Data\Analytics\AnalyticsBreakdownData;
use App\Data\Analytics\AnalyticsDashboardData;
use App\Data\Analytics\AnalyticsFiltersData;
use App\Data\Analytics\AnalyticsFilterOptionsData;
use App\Data\Analytics\AnalyticsSessionsData;
use App\Data\Analytics\AnalyticsRefreshStatusData;
use App\Services\AnalyticsDataService;
use App\Services\GoogleAnalyticsService;
use App\Models\DailyAssetDownload;
use App\Models\Program;
use App\Models\ServiceType;
use App\Support\AnalyticsLabels;
use App\Support\GeoCoder;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ============================================================
 * Service: AnalyticsDashboardService
 * ============================================================
 *
 * Orchestrates dashboard-facing analytics reads while keeping the HTTP
 * controller responsible only for request/response concerns.
 *
 * IMPORTANT:
 * - This service never writes analytics data.
 * - It never dispatches the GA4 persistence job.
 * - GA4 -> local-table synchronization remains exclusively owned by
 *   GoogleAnalyticsService + RefreshAnalyticsData.
 * - This service only reads local reporting tables or performs read-only GA4
 *   dimension queries required by the dashboard.
 */
final class AnalyticsDashboardService
{
    /**
     * @param AnalyticsDataService $analyticsData Local aggregate reader.
     * @param GoogleAnalyticsService $ga Read-only GA4 query service.
     */
    public function __construct(
        private readonly AnalyticsDataService $analyticsData,
        private readonly GoogleAnalyticsService $ga,
    ) {
    }

    /**
     * Build the canonical dashboard contract from local reporting tables.
     *
     * @param AnalyticsFiltersData $filters Normalized dashboard filters.
     * @return AnalyticsDashboardData
     */
    public function dashboard(AnalyticsFiltersData $filters): AnalyticsDashboardData
    {
        $data = $this->analyticsData->buildDashboardData(
            $filters->startDate,
            $filters->endDate,
            $filters->serviceType,
            $filters->program,
        );

        return new AnalyticsDashboardData($this->withLiveUniqueUsers($data, $filters));
    }

    /**
     * Replace the local unique-user numbers with filter-aware GA4 figures.
     *
     * - `totalUniqueUsers` is the period-level distinct active-user count, taken
     *   from the SAME (cached) GA4 country query that feeds the GeoMap, so the
     *   KPI card and the map total always tally. The old value was the SUM of
     *   daily active users, which counts a returning user once per day.
     * - `dailyUniqueUsers` now honours the service-type and program filters.
     *
     * Falls back to the local table values if GA4 is unavailable.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function withLiveUniqueUsers(array $data, AnalyticsFiltersData $filters): array
    {
        try {
            $data['totalUniqueUsers'] = array_sum($this->geo($filters));
        } catch (\Throwable $e) {
            Log::warning('Live unique-user total unavailable, using local value', [
                'error' => $e->getMessage(),
            ]);
        }

        try {
            $rows = $this->ga->getUniqueUsersByDimension(
                $filters->startDate,
                $filters->endDate,
                ['date'],
                $this->gaFilters($filters),
            );

            $trend = [];
            foreach ($rows as $row) {
                try {
                    $date = Carbon::createFromFormat('Ymd', $row['date'] ?? '')->toDateString();
                } catch (\Throwable) {
                    continue;
                }
                $trend[$date] = ['date' => $date, 'uniqueUsers' => (int) ($row['activeUsers'] ?? 0)];
            }
            ksort($trend);

            $data['dailyUniqueUsers'] = array_values($trend);
        } catch (\Throwable $e) {
            Log::warning('Live daily unique-user trend unavailable, using local values', [
                'error' => $e->getMessage(),
            ]);
        }

        return $data;
    }

    /**
     * GA4 dimension filters for the active service-type / program selection.
     *
     * @return array<string, string>
     */
    private function gaFilters(AnalyticsFiltersData $filters): array
    {
        return array_filter([
            'service_type' => $filters->serviceType,
            'program'      => $filters->program,
        ], static fn ($value) => $value !== null && $value !== '');
    }

    /**
     * Build the filter-option contract from local reporting data.
     *
     * @return AnalyticsFilterOptionsData
     */
    public function filterOptions(): AnalyticsFilterOptionsData
    {
        $localServices = DailyAssetDownload::query()
            ->whereNotNull('service_type')->where('service_type', '!=', '')
            ->distinct()->pluck('service_type');

        $localPrograms = DailyAssetDownload::query()
            ->whereNotNull('program')->where('program', '!=', '')
            ->distinct()->pluck('program');

        // Catalog entries first (admin-defined order) so a brand-new service
        // type such as CGLS is selectable before its first download exists.
        $catalogServices = ServiceType::query()->orderBy('sort_order')->pluck('name');
        $catalogPrograms = Program::query()->orderBy('sort_order')->pluck('name');

        return new AnalyticsFilterOptionsData(
            $catalogServices->merge($localServices)->filter()->unique()->values()->all(),
            $catalogPrograms->merge($localPrograms)->filter()->unique()->values()->all(),
        );
    }

    /**
     * Fetch a paginated asset/service breakdown from local reporting tables.
     *
     * @param AnalyticsFiltersData $filters
     * @param string $type asset|service
     * @param int $offset
     * @param int $limit
     * @return AnalyticsBreakdownData
     */
    public function breakdown(
        AnalyticsFiltersData $filters,
        string $type,
        int $offset = 0,
        int $limit = 10,
    ): AnalyticsBreakdownData {
        if (!in_array($type, ['asset', 'service'], true)) {
            throw new \InvalidArgumentException('Invalid breakdown type.');
        }

        $offset = max(0, $offset);
        $limit = min(100, max(1, $limit));

        $query = DailyAssetDownload::whereBetween(
            'date',
            [$filters->startDate, $filters->endDate]
        );

        if ($filters->serviceType) {
            $query->where('service_type', $filters->serviceType);
        }

        if ($filters->program) {
            $query->where('program', $filters->program);
        }

        $field = $type === 'asset' ? 'asset_type' : 'service_type';

        // A blank service type is not a service: never list it as "Unknown".
        if ($type === 'service') {
            AnalyticsLabels::whereNamed($query, 'service_type');
        }

        // Group in SQL, then merge labels in PHP so legacy asset aliases such as
        // "quotes"/"quote" merge into one row before sorting and paging.
        $merged = [];

        $query->select($field, DB::raw('SUM(downloads) as total'))
            ->groupBy($field)
            ->get()
            ->each(function ($item) use (&$merged, $field) {
                $label = $field === 'asset_type'
                    ? AnalyticsLabels::assetLabel($item->{$field})
                    : $this->displayDimensionValue($item->{$field});

                $merged[$label] = ($merged[$label] ?? 0) + (int) $item->total;
            });

        arsort($merged);

        $items = collect($merged)
            ->map(fn ($total, $label) => [$field => (string) $label, 'eventCount' => $total])
            ->slice($offset, $limit)
            ->values()
            ->toArray();

        return new AnalyticsBreakdownData($items, $offset, $limit);
    }

    /**
     * Fetch a paginated sessions table from local reporting tables.
     *
     * @param AnalyticsFiltersData $filters
     * @param int $offset
     * @param int $limit
     * @return AnalyticsSessionsData
     */
    public function sessions(
        AnalyticsFiltersData $filters,
        int $offset = 0,
        int $limit = 10,
    ): AnalyticsSessionsData {
        $offset = max(0, $offset);
        $limit = min(100, max(1, $limit));

        $query = DailyAssetDownload::whereBetween(
            'date',
            [$filters->startDate, $filters->endDate]
        )
            ->whereNotNull('session')
            ->where('session', '!=', '');

        if ($filters->serviceType) {
            $query->where('service_type', $filters->serviceType);
        }

        if ($filters->program) {
            $query->where('program', $filters->program);
        }

        $total = (clone $query)->count(DB::raw('DISTINCT program, session'));

        $sessions = $query
            ->select(
                'program',
                'session',
                DB::raw('SUM(downloads) as total_downloads'),
                DB::raw('MAX(date) as latest_date'),
            )
            ->groupBy('program', 'session')
            ->orderByDesc('total_downloads')
            ->skip($offset)
            ->take($limit)
            ->get()
            ->map(fn ($item) => [
                'program'    => $this->displayDimensionValue($item->program),
                'session'    => $this->displayDimensionValue($item->session),
                'eventCount' => (int) $item->total_downloads,
                'date'       => $item->latest_date,
            ])
            ->values()
            ->toArray();

        return new AnalyticsSessionsData($sessions, $total, $offset, $limit);
    }

    /**
     * Query GA4 for read-only unique-user totals per asset type.
     *
     * One de-duplicated GA4 count per asset type (see
     * GoogleAnalyticsService::getUniqueUsersForAssetType). Events whose
     * asset_type is blank are attributed by page path inside that query, so
     * there is no "Uncategorised" bucket; asset types with no users are omitted.
     *
     * This method performs no writes and does not participate in the GA4
     * persistence path.
     *
     * @param AnalyticsFiltersData $filters
     * @return array<int, array<string, mixed>>
     */
    public function uniqueUsersByAsset(AnalyticsFiltersData $filters): array
    {
        $rows = [];

        foreach (AnalyticsLabels::knownAssetTypes() as $assetType) {
            $users = $this->ga->getUniqueUsersForAssetType(
                $filters->startDate,
                $filters->endDate,
                $assetType,
                $this->gaFilters($filters),
            );

            if ($users > 0) {
                $rows[] = [
                    'asset_type'  => AnalyticsLabels::assetLabel($assetType),
                    'activeUsers' => (string) $users,
                ];
            }
        }

        usort($rows, static fn (array $a, array $b) => (int) $b['activeUsers'] <=> (int) $a['activeUsers']);

        return $rows;
    }

    /**
     * Query GA4 for read-only geographic unique-user data.
     *
     * @param AnalyticsFiltersData $filters
     * @return array<string, int>
     */
    public function geo(AnalyticsFiltersData $filters): array
    {
        $data = $this->ga->getUniqueUsersByDimension(
            $filters->startDate,
            $filters->endDate,
            ['country'],
            $this->gaFilters($filters),
        );

        $mapData = [];

        foreach ($data as $row) {
            $country = trim((string) ($row['country'] ?? 'Unknown')) ?: 'Unknown';
            $mapData[$country] = (int) ($row['activeUsers'] ?? 0);
        }

        return $mapData;
    }

    /**
     * Geographic breakdown WITH region and city detail, for the GeoMap.
     *
     * Shape (keyed by country name):
     *   country => {users, downloads, code, states: [
     *       {name, users, downloads, lat, lng, cities: [{name, users, downloads, lat, lng}]}
     *   ]}
     *
     * Each tier is its own GA4 query so `users` (activeUsers) stays de-duplicated at
     * that tier; summing city rows would count a person once per city. Country
     * `users` comes from the same country-level query as geo(), so the map total
     * still tallies with the Unique Users KPI. `downloads` is GA4's eventCount.
     *
     * GA4 returns place names only, so region / city coordinates come from
     * App\Support\GeoCoder (cached). A region's pin is the user-weighted centre of
     * its located cities. Anything that cannot be located yet gets null coordinates
     * (the map lists it but does not pin it) and is retried on later loads.
     *
     * @return array<string, array<string, mixed>>
     */
    public function geoDetail(AnalyticsFiltersData $filters): array
    {
        $gaFilters = $this->gaFilters($filters);
        $metrics   = ['activeUsers', 'eventCount'];
        $fetch     = fn (array $dimensions) => $this->ga->getDownloads(
            $filters->startDate,
            $filters->endDate,
            $dimensions,
            $metrics,
            'asset_download',
            $gaFilters,
        );

        // ── Tier 1: countries (same de-duplicated numbers as geo()) ────────
        $countries = [];

        foreach ($fetch(['country', 'countryId']) as $row) {
            $name = trim((string) ($row['country'] ?? '')) ?: 'Unknown';
            $code = strtolower(trim((string) ($row['countryId'] ?? '')));

            $countries[$name] ??= ['users' => 0, 'downloads' => 0, 'code' => null, 'states' => []];
            $countries[$name]['users']     += (int) ($row['activeUsers'] ?? 0);
            $countries[$name]['downloads'] += (int) ($row['eventCount'] ?? 0);

            if (preg_match('/^[a-z]{2}$/', $code) === 1) {
                $countries[$name]['code'] = $code;
            }
        }

        try {
            $regionRows = $fetch(['country', 'region']);
            $cityRows   = $fetch(['country', 'region', 'city']);
        } catch (\Throwable $e) {
            Log::warning('Region/city breakdown unavailable, returning country level only', [
                'error' => $e->getMessage(),
            ]);

            return $countries;
        }

        $registry = (array) config('continent_map', []);
        $iso2Of   = function (string $country) use ($countries, $registry): ?string {
            $code = $countries[$country]['code'] ?? null;

            if ($code) {
                return $code;
            }

            foreach ($registry as $registryName => $meta) {
                if (strcasecmp((string) $registryName, $country) === 0) {
                    return isset($meta['iso2']) ? strtolower((string) $meta['iso2']) : null;
                }
            }

            return null;
        };

        // ── Tier 2: regions ────────────────────────────────────────────────
        $regions = []; // [country][region] => node

        foreach ($regionRows as $row) {
            $country = trim((string) ($row['country'] ?? '')) ?: 'Unknown';
            $region  = $row['region'] ?? null;

            // Users with no region stay in the country total, they just have no region pin.
            if (!isset($countries[$country]) || AnalyticsLabels::isBlank($region)) {
                continue;
            }

            $region = trim((string) $region);
            $regions[$country][$region] ??= [
                'name' => $region, 'users' => 0, 'downloads' => 0, 'lat' => null, 'lng' => null, 'cities' => [],
            ];
            $regions[$country][$region]['users']     += (int) ($row['activeUsers'] ?? 0);
            $regions[$country][$region]['downloads'] += (int) ($row['eventCount'] ?? 0);
        }

        // ── Tier 3: cities ─────────────────────────────────────────────────
        foreach ($cityRows as $row) {
            $country = trim((string) ($row['country'] ?? '')) ?: 'Unknown';
            $region  = AnalyticsLabels::isBlank($row['region'] ?? null) ? null : trim((string) $row['region']);
            $city    = AnalyticsLabels::isBlank($row['city'] ?? null) ? null : trim((string) $row['city']);

            if ($region === null || $city === null || !isset($regions[$country][$region])) {
                continue;
            }

            $regions[$country][$region]['cities'][$city] ??= [
                'name' => $city, 'users' => 0, 'downloads' => 0, 'lat' => null, 'lng' => null,
            ];
            $regions[$country][$region]['cities'][$city]['users']     += (int) ($row['activeUsers'] ?? 0);
            $regions[$country][$region]['cities'][$city]['downloads'] += (int) ($row['eventCount'] ?? 0);
        }

        // Totals BEFORE trimming, so the tooltip's "Regions" / "Cities" counts are the real ones.
        foreach ($regions as $country => $byRegion) {
            $countries[$country]['regionCount'] = count($byRegion);
            $countries[$country]['cityCount']   = 0;

            foreach ($byRegion as $region => $node) {
                $regions[$country][$region]['cityCount'] = count($node['cities']);
                $countries[$country]['cityCount']       += count($node['cities']);
            }
        }

        // Keep the busiest places only, so one load stays small and fast to geocode.
        foreach ($regions as $country => $byRegion) {
            uasort($byRegion, static fn ($a, $b) => $b['users'] <=> $a['users']);
            $byRegion = array_slice($byRegion, 0, 40, true);

            foreach ($byRegion as $region => $node) {
                uasort($node['cities'], static fn ($a, $b) => $b['users'] <=> $a['users']);
                $byRegion[$region]['cities'] = array_slice($node['cities'], 0, 15, true);
            }

            $regions[$country] = $byRegion;
        }

        // ── Coordinates: cities first (busiest first, so the per-call budget goes to them) ──
        $cityPlaces = [];

        foreach ($regions as $country => $byRegion) {
            foreach ($byRegion as $region => $node) {
                foreach ($node['cities'] as $city => $cityNode) {
                    $cityPlaces[] = [
                        'users' => $cityNode['users'],
                        'key'   => implode('|', [$country, $region, $city]),
                        'place' => ['name' => $city, 'iso2' => $iso2Of($country), 'region' => $region, 'kind' => 'city'],
                        'path'  => [$country, $region, $city],
                    ];
                }
            }
        }

        usort($cityPlaces, static fn ($a, $b) => $b['users'] <=> $a['users']);

        $located = GeoCoder::locate(array_column($cityPlaces, 'place', 'key'));

        foreach ($cityPlaces as $entry) {
            [$country, $region, $city] = $entry['path'];

            if (($point = $located[$entry['key']] ?? null) !== null) {
                $regions[$country][$region]['cities'][$city]['lat'] = $point['lat'];
                $regions[$country][$region]['cities'][$city]['lng'] = $point['lng'];
            }
        }

        // Region pin = user-weighted centre of its located cities...
        $needRegionLookup = [];

        foreach ($regions as $country => $byRegion) {
            foreach ($byRegion as $region => $node) {
                $weight = 0;
                $lat = 0.0;
                $lng = 0.0;

                foreach ($node['cities'] as $cityNode) {
                    if ($cityNode['lat'] !== null) {
                        $w       = max(1, $cityNode['users']);
                        $weight += $w;
                        $lat    += $cityNode['lat'] * $w;
                        $lng    += $cityNode['lng'] * $w;
                    }
                }

                if ($weight > 0) {
                    $regions[$country][$region]['lat'] = $lat / $weight;
                    $regions[$country][$region]['lng'] = $lng / $weight;
                } else {
                    $needRegionLookup[implode('|', [$country, $region])] = [
                        'name' => $region, 'iso2' => $iso2Of($country), 'region' => $region, 'kind' => 'region',
                    ];
                }
            }
        }

        // ...or the region's own geocode when none of its cities could be located.
        if ($needRegionLookup !== []) {
            foreach (GeoCoder::locate($needRegionLookup) as $key => $point) {
                if ($point !== null) {
                    [$country, $region] = explode('|', $key, 2);
                    $regions[$country][$region]['lat'] = $point['lat'];
                    $regions[$country][$region]['lng'] = $point['lng'];
                }
            }
        }

        // ── Assemble ───────────────────────────────────────────────────────
        foreach ($regions as $country => $byRegion) {
            $countries[$country]['states'] = array_values(array_map(
                static fn (array $node) => [...$node, 'cities' => array_values($node['cities'])],
                $byRegion
            ));
        }

        return $countries;
    }

    /**
     * Build the refresh-state contract from the cached asynchronous lifecycle.
     *
     * Dashboard reconstruction remains a read-only service concern; the actual
     * GA4 synchronization job is still owned by RefreshAnalyticsData.
     *
     * @param AnalyticsFiltersData|null $filters Optional filters used when the
     *        refresh completes and a fresh dashboard snapshot is requested.
     * @param int $cacheMinutes Dashboard cache duration.
     * @return AnalyticsRefreshStatusData
     */
    public function refreshStatus(
        ?AnalyticsFiltersData $filters = null,
        int $cacheMinutes = 5,
    ): AnalyticsRefreshStatusData {
        $status = cache()->get('analytics_refresh_status', 'idle');

        if ($status === 'in_progress') {
            return new AnalyticsRefreshStatusData('in_progress');
        }

        if ($status === 'failed') {
            return new AnalyticsRefreshStatusData(
                'failed',
                cache()->get(
                    'analytics_refresh_error',
                    'The analytics refresh failed.'
                )
            );
        }

        if ($status !== 'done' || $filters === null) {
            return new AnalyticsRefreshStatusData('idle');
        }

        $cacheKey = 'analytics_dashboard_' . md5(
            $filters->startDate .
            $filters->endDate .
            ($filters->serviceType ?? '') .
            ($filters->program ?? '')
        );

        $data = cache()->get($cacheKey);

        if (!$data) {
            $data = $this->dashboard($filters)->toArray();
            cache()->put($cacheKey, $data, now()->addMinutes($cacheMinutes));
        }

        return new AnalyticsRefreshStatusData('done', null, $data);
    }

    /**
     * Convert nullable database dimensions into a stable dashboard label.
     *
     * @param mixed $value
     * @return string
     */
    private function displayDimensionValue(mixed $value): string
    {
        $value = trim((string) $value);

        return $value !== '' ? $value : 'Unknown';
    }
}
