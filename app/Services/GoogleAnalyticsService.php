<?php

namespace App\Services;

use Google\Client;
use Google\Service\AnalyticsData;
use Google\Service\AnalyticsData\RunReportRequest;
use Google\Service\AnalyticsData\DateRange;
use Google\Service\AnalyticsData\Dimension;
use Google\Service\AnalyticsData\Metric;
use Google\Service\AnalyticsData\OrderBy;
use Google\Service\AnalyticsData\MetricOrderBy;
use Google\Service\AnalyticsData\FilterExpression;
use Google\Service\AnalyticsData\Filter;
use Google\Service\AnalyticsData\StringFilter; // ✅ correct nested class
use Google\Service\AnalyticsData\InListFilter;
use Google\Service\AnalyticsData\FilterExpressionList;
use App\Support\AnalyticsLabels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Google Analytics Service
 *
 * Centralizes all communication with the Google Analytics Data API.
 *
 * Normalization responsibility is intentionally kept inside this service:
 *
 * 1. Application -> GA4
 *    Short application dimension names such as `asset_type` are converted
 *    to GA4 event-scoped API names such as `customEvent:asset_type`.
 *
 * 2. GA4 -> Application
 *    GA4 response headers such as `customEvent:asset_type` are converted
 *    back to application-level names such as `asset_type`.
 *
 * This allows controllers, jobs and aggregation services to remain unaware
 * of GA4-specific naming conventions.
 */
class GoogleAnalyticsService
{
    /**
     * @var AnalyticsData The Google Analytics Data API service instance.
     */
    protected $analytics;

    /**
     * Constructor – initialises the Google client and Analytics Data service.
     *
     * @throws \Exception If the service account key file is missing or invalid.
     */
    public function __construct()
    {
        $client = new Client();
        $client->setAuthConfig(config('services.ga4.service_account_key_path'));
        $client->setScopes(['https://www.googleapis.com/auth/analytics.readonly']);
        $this->analytics = new AnalyticsData($client);
    }

    /**
     * Create a Filter object for a string field with exact match.
     *
     * @param string $fieldName The dimension or event name to filter on.
     * @param string $value     The exact value to match.
     * @return \Google\Service\AnalyticsData\Filter
     */
    private function createStringFilter(string $fieldName, string $value): Filter
    {
        // Create the nested StringFilter
        $stringFilter = new StringFilter();
        $stringFilter->setValue($value);
        $stringFilter->setMatchType('EXACT');  // EXACT, CONTAINS, etc.

        // Create the parent Filter and attach the StringFilter
        $filter = new Filter();
        $filter->setFieldName($fieldName);
        $filter->setStringFilter($stringFilter);

        return $filter;
    }

    /**
     * Convert application dimension names into GA4 API dimension names.
     *
     * The application uses short names such as `asset_type`,
     * `service_type`, `program`, and `session`.
     *
     * GA4 requires event-scoped custom dimensions to be addressed
     * using the `customEvent:` prefix.
     *
     * This method is intentionally idempotent. Passing an already-normalized
     * name such as `customEvent:asset_type` returns it unchanged.
     *
     * @param string $fieldName
     * @return string
     */
    private function normalizeDimensionName(string $fieldName): string
    {
        $customDimensions = [
            'asset_type',
            'service_type',
            'program',
            'session',
        ];

        if (
            in_array($fieldName, $customDimensions, true) &&
            !str_starts_with($fieldName, 'customEvent:')
        ) {
            return 'customEvent:' . $fieldName;
        }

        return $fieldName;
    }

    /**
     * Normalize a collection of application dimension names
     * before sending them to the GA4 API.
     *
     * This is the collection-level counterpart to normalizeDimensionName().
     *
     * @param array $dimensions
     * @return array
     */
    private function normalizeDimensions(array $dimensions): array
    {
        return array_map(
            fn($dimension) => $this->normalizeDimensionName($dimension),
            $dimensions
        );
    }

    /**
     * Normalize a GA4 response dimension header back to its application name.
     *
     * Example:
     *     customEvent:asset_type -> asset_type
     *
     * @param string $fieldName
     * @return string
     */
    private function denormalizeDimensionName(string $fieldName): string
    {
        if (str_starts_with($fieldName, 'customEvent:')) {
            return substr($fieldName, strlen('customEvent:'));
        }

        return $fieldName;
    }

    /**
     * Fetch GA4 report data for a given date range and optional dimensions/metrics/filters.
     *
     * @param string $startDate  YYYY-MM-DD
     * @param string $endDate    YYYY-MM-DD
     * @param array  $dimensions e.g. ['asset_type', 'service_type']
     * @param array  $metrics    e.g. ['eventCount', 'activeUsers']
     * @param string $eventName  The event name to filter on (default 'asset_download')
     * @param array  $filters    Additional dimension filters (field => value)
     * @param bool   $bypassCache Whether to force a fresh GA4 request.
     * @return array             Rows with normalized dimension and metric values.
     */
    public function getDownloads(
        string $startDate,
        string $endDate,
        array $dimensions = [],
        array $metrics = ['eventCount'],
        string $eventName = 'asset_download',
        array $filters = [],
        bool $bypassCache = false
    ) {
        // Keep cache keys independent from whether the caller supplied
        // application names or already-normalized GA4 names.
        $cacheDimensions = $this->normalizeDimensions($dimensions);

        $cacheFilters = [];

        foreach ($filters as $field => $value) {
            $cacheFilters[$this->normalizeDimensionName($field)] = $value;
        }

        $cacheKey = 'ga4_downloads_' . md5(
            $startDate . $endDate .
            implode('|', $cacheDimensions) .
            implode('|', $metrics) .
            $eventName .
            json_encode($cacheFilters)
        );

        $fetchReport = function () use (
            $startDate,
            $endDate,
            $dimensions,
            $metrics,
            $eventName,
            $filters
        ) {
            $request = new RunReportRequest();
            $request->setProperty('properties/' . config('services.ga4.property_id'));

            // ─── Date range ───────────────────────────────────────────────
            $dateRange = new DateRange();
            $dateRange->setStartDate($startDate);
            $dateRange->setEndDate($endDate);
            $request->setDateRanges([$dateRange]);

            // ─── Dimensions ────────────────────────────────────────────────
            if (!empty($dimensions)) {
                $apiDimensions = $this->normalizeDimensions($dimensions);

                $dimensionObjects = array_map(function ($dim) {
                    $d = new Dimension();
                    $d->setName($dim);
                    return $d;
                }, $apiDimensions);

                $request->setDimensions($dimensionObjects);
            }

            // ─── Metrics ──────────────────────────────────────────────────
            $metricObjects = array_map(function ($metric) {
                $m = new Metric();
                $m->setName($metric);
                return $m;
            }, $metrics);

            $request->setMetrics($metricObjects);

            // ─── Filters ──────────────────────────────────────────────────
            // 1. Event name filter (e.g., asset_download)
            $eventFilterExpr = new FilterExpression();
            $eventFilterExpr->setFilter(
                $this->createStringFilter('eventName', $eventName)
            );

            // 2. Additional dimension filters
            $extraFilters = [];

            foreach ($filters as $field => $value) {
                $apiField = $this->normalizeDimensionName($field);

                $expr = new FilterExpression();
                $expr->setFilter(
                    $this->createStringFilter($apiField, $value)
                );

                $extraFilters[] = $expr;
            }

            // Combine all filters with AND logic.
            if (!empty($extraFilters)) {
                $allFilters = array_merge([$eventFilterExpr], $extraFilters);
                $andGroup = new \Google\Service\AnalyticsData\FilterExpressionList();
                $andGroup->setExpressions($allFilters);

                $finalFilter = new FilterExpression();
                $finalFilter->setAndGroup($andGroup);
                $request->setDimensionFilter($finalFilter);
            } else {
                $request->setDimensionFilter($eventFilterExpr);
            }

            // ─── Ordering ──────────────────────────────────────────────────
            if (!empty($metrics)) {
                $order = new OrderBy();
                $metricOrder = new MetricOrderBy();
                $metricOrder->setMetricName($metrics[0]);
                $order->setMetric($metricOrder);
                $order->setDesc(true);
                $request->setOrderBys([$order]);
            }

            // ─── Execute report ────────────────────────────────────────────
            try {
                // Page through the report. GA4 returns at most `limit` rows per
                // request (10,000 by default) and silently drops the rest, which
                // would under-count downloads once date x asset x service x
                // program x session x page combinations pass that size.
                $pageSize = 100000;
                $offset   = 0;
                $parsed   = [];

                $request->setLimit($pageSize);

                do {
                    $request->setOffset($offset);

                    $response = $this->analytics->properties->runReport(
                        'properties/' . config('services.ga4.property_id'),
                        $request
                    );

                    $pageRows = $this->parseReportResponse(
                        $response,
                        $dimensions,
                        $metrics
                    );

                    $parsed   = array_merge($parsed, $pageRows);
                    $offset  += $pageSize;
                    $rowCount = (int) $response->getRowCount();
                } while (count($pageRows) === $pageSize && $offset < $rowCount);

                Log::debug('GA4 report completed', [
                    'dimensions_requested' => $dimensions,
                    'dimensions_sent'      => $this->normalizeDimensions($dimensions),
                    'metrics_requested'    => $metrics,
                    'event_name'           => $eventName,
                    'filters_requested'    => $filters,
                    'rows_returned'        => count($parsed),
                ]);

                return $parsed;
            } catch (\Exception $e) {
                Log::error('GA4 API request failed: ' . $e->getMessage());
                throw $e;
            }
        };

        // Controlled full rebuilds must never reuse a stale one-hour GA4 cache entry.
        if ($bypassCache) {
            Cache::forget($cacheKey);
            return $fetchReport();
        }

        return Cache::remember($cacheKey, 3600, $fetchReport);
    }

    /**
     * Fetch total unique users (activeUsers) grouped by a dimension.
     *
     * @param string $startDate
     * @param string $endDate
     * @param array  $dimensions  e.g. ['country', 'city']
     * @param array  $filters     Optional dimension filters
     * @param bool   $bypassCache Whether to force a fresh GA4 request.
     * @return array
     */
    public function getUniqueUsersByDimension(
        string $startDate,
        string $endDate,
        array $dimensions = [],
        array $filters = [],
        bool $bypassCache = false
    ) {
        return $this->getDownloads(
            $startDate,
            $endDate,
            $dimensions,
            ['activeUsers'],
            'asset_download',
            $filters,
            $bypassCache
        );
    }

    /**
     * De-duplicated unique users (activeUsers) who downloaded ONE asset type.
     *
     * Counts a user once per asset type no matter how many rows GA4 would
     * split them across, and attributes events whose `asset_type` dimension is
     * blank to the right asset using the page they were on (the same rule the
     * local sync uses), so no "Uncategorised" bucket is needed.
     *
     * Matching events are:
     *   asset_type IN (canonical value + aliases)
     *   OR ( asset_type is blank AND pagePath matches the asset's page rule )
     *
     * @param string $startDate  YYYY-MM-DD
     * @param string $endDate    YYYY-MM-DD
     * @param string $assetType  Canonical type: sermon_notes|blessing|quote|prophecy
     * @param array  $filters    Optional dimension filters (field => value)
     * @param bool   $bypassCache
     * @return int
     */
    public function getUniqueUsersForAssetType(
        string $startDate,
        string $endDate,
        string $assetType,
        array $filters = [],
        bool $bypassCache = false
    ): int {
        $cacheKey = 'ga4_unique_asset_' . md5(
            $startDate . $endDate . $assetType . json_encode($filters)
        );

        $fetch = function () use ($startDate, $endDate, $assetType, $filters): int {
            $conditions = [
                $this->stringExpr('eventName', 'EXACT', 'asset_download'),
            ];

            foreach ($filters as $field => $value) {
                $conditions[] = $this->stringExpr($field, 'EXACT', (string) $value);
            }

            $options = [
                $this->inListExpr('asset_type', AnalyticsLabels::assetValuesFor($assetType)),
            ];

            $pathExprs = array_map(
                fn (array $rule) => $this->stringExpr('pagePath', $rule[0], $rule[1]),
                AnalyticsLabels::assetPathRules($assetType)
            );

            if ($pathExprs !== []) {
                $options[] = $this->groupExpr('and', [
                    $this->inListExpr('asset_type', AnalyticsLabels::blankValues()),
                    count($pathExprs) > 1 ? $this->groupExpr('or', $pathExprs) : $pathExprs[0],
                ]);
            }

            $conditions[] = count($options) > 1 ? $this->groupExpr('or', $options) : $options[0];

            $dateRange = new DateRange();
            $dateRange->setStartDate($startDate);
            $dateRange->setEndDate($endDate);

            $metric = new Metric();
            $metric->setName('activeUsers');

            $request = new RunReportRequest();
            $request->setDateRanges([$dateRange]);
            $request->setMetrics([$metric]);
            $request->setDimensionFilter($this->groupExpr('and', $conditions));

            try {
                $response = $this->analytics->properties->runReport(
                    'properties/' . config('services.ga4.property_id'),
                    $request
                );
            } catch (\Exception $e) {
                Log::error('GA4 unique users by asset failed: ' . $e->getMessage(), [
                    'asset_type' => $assetType,
                ]);
                throw $e;
            }

            $rows = $response->getRows() ?? [];

            if ($rows === []) {
                return 0;
            }

            $values = $rows[0]->getMetricValues();

            return (int) ($values[0]->getValue() ?? 0);
        };

        if ($bypassCache) {
            Cache::forget($cacheKey);
            return $fetch();
        }

        return Cache::remember($cacheKey, 3600, $fetch);
    }

    /** FilterExpression wrapping a single string-match filter on a (normalised) field. */
    private function stringExpr(string $field, string $matchType, string $value): FilterExpression
    {
        $string = new StringFilter();
        $string->setValue($value);
        $string->setMatchType($matchType);

        $filter = new Filter();
        $filter->setFieldName($this->normalizeDimensionName($field));
        $filter->setStringFilter($string);

        $expr = new FilterExpression();
        $expr->setFilter($filter);

        return $expr;
    }

    /** FilterExpression wrapping a case-insensitive IN (...) filter. */
    private function inListExpr(string $field, array $values): FilterExpression
    {
        $in = new InListFilter();
        $in->setValues(array_values($values));
        $in->setCaseSensitive(false);

        $filter = new Filter();
        $filter->setFieldName($this->normalizeDimensionName($field));
        $filter->setInListFilter($in);

        $expr = new FilterExpression();
        $expr->setFilter($filter);

        return $expr;
    }

    /** AND / OR group of filter expressions. */
    private function groupExpr(string $type, array $expressions): FilterExpression
    {
        $list = new FilterExpressionList();
        $list->setExpressions(array_values($expressions));

        $expr = new FilterExpression();

        if ($type === 'or') {
            $expr->setOrGroup($list);
        } else {
            $expr->setAndGroup($list);
        }

        return $expr;
    }

    /**
     * Diagnostic: inspect asset_download events and their custom dimensions.
     *
     * The returned dimensions are normalized back to application-level names
     * by parseReportResponse().
     *
     * @param string $startDate
     * @param string $endDate
     * @return array
     */
    public function diagnoseAssetDownloads(
        string $startDate,
        string $endDate
    ): array {
        $dimensions = [
            'eventName',
            'customEvent:asset_type',
            'customEvent:service_type',
            'customEvent:program',
            'customEvent:session',
        ];

        $metrics = [
            'eventCount',
        ];

        $request = new RunReportRequest();
        $request->setProperty(
            'properties/' . config('services.ga4.property_id')
        );

        // Date range
        $dateRange = new DateRange();
        $dateRange->setStartDate($startDate);
        $dateRange->setEndDate($endDate);
        $request->setDateRanges([$dateRange]);

        // Dimensions
        $dimensionObjects = array_map(function ($dim) {
            $d = new Dimension();
            $d->setName($dim);
            return $d;
        }, $dimensions);

        $request->setDimensions($dimensionObjects);

        // Metrics
        $metricObjects = array_map(function ($metric) {
            $m = new Metric();
            $m->setName($metric);
            return $m;
        }, $metrics);

        $request->setMetrics($metricObjects);

        // Only asset_download events
        $eventFilter = new FilterExpression();
        $eventFilter->setFilter(
            $this->createStringFilter(
                'eventName',
                'asset_download'
            )
        );

        $request->setDimensionFilter($eventFilter);

        // Execute
        $response = $this->analytics->properties->runReport(
            'properties/' . config('services.ga4.property_id'),
            $request
        );

        return $this->parseReportResponse(
            $response,
            $dimensions,
            $metrics
        );
    }

    /**
     * Parse the GA4 report response into a simple associative array.
     *
     * GA4 custom event dimensions are returned with the `customEvent:` prefix.
     * This method removes that prefix so the rest of the application works with
     * stable application-level names.
     *
     * @param mixed $response The Google service response.
     * @param array $dimensions List of dimension names.
     * @param array $metrics    List of metric names.
     * @return array
     */
    protected function parseReportResponse(
        $response,
        array $dimensions,
        array $metrics
    ) {
        $rows = $response->getRows();

        $dimensionHeaders = array_map(
            fn($h) => $h->getName(),
            $response->getDimensionHeaders()
        );

        $metricHeaders = array_map(
            fn($h) => $h->getName(),
            $response->getMetricHeaders()
        );

        $result = [];

        foreach ($rows as $row) {
            $item = [];

            // ---------------------------------------------------------
            // Dimensions
            // ---------------------------------------------------------
            foreach ($row->getDimensionValues() as $i => $value) {
                $key = $this->denormalizeDimensionName(
                    $dimensionHeaders[$i]
                );

                $item[$key] = $value->getValue();
            }

            // ---------------------------------------------------------
            // Metrics
            // ---------------------------------------------------------
            foreach ($row->getMetricValues() as $i => $value) {
                $item[$metricHeaders[$i]] = $value->getValue();
            }

            $result[] = $item;
        }

        return $result;
    }

    /**
     * Get total downloads (single number) for a given period.
     *
     * @param string $startDate YYYY-MM-DD
     * @param string $endDate   YYYY-MM-DD
     * @return int
     */
    public function getTotalDownloads($startDate, $endDate)
    {
        $data = $this->getDownloads(
            $startDate,
            $endDate,
            [],
            ['eventCount']
        );

        return (int) ($data[0]['eventCount'] ?? 0);
    }

    /**
     * Get downloads grouped by a single dimension (e.g., 'asset_type').
     *
     * @param string $dimension The dimension name.
     * @param string $startDate YYYY-MM-DD
     * @param string $endDate   YYYY-MM-DD
     * @return array
     */
    public function getDownloadsByDimension(
        $dimension,
        $startDate,
        $endDate
    ) {
        return $this->getDownloads(
            $startDate,
            $endDate,
            [$dimension],
            ['eventCount']
        );
    }

    /**
     * Get daily time series for a given dimension (or none).
     *
     * @param string $startDate YYYY-MM-DD
     * @param string $endDate   YYYY-MM-DD
     * @param array  $additionalDimensions Extra dimensions to group by.
     * @return array
     */
    public function getDailyDownloads(
        $startDate,
        $endDate,
        array $additionalDimensions = []
    ) {
        $dimensions = array_merge(
            ['date'],
            $additionalDimensions
        );

        return $this->getDownloads(
            $startDate,
            $endDate,
            $dimensions,
            ['eventCount']
        );
    }
}
