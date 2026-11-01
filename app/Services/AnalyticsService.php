<?php
namespace App\Services;

use Google\Analytics\Data\V1beta\Client\BetaAnalyticsDataClient;
use Google\Analytics\Data\V1beta\DateRange;
use Google\Analytics\Data\V1beta\Dimension;
use Google\Analytics\Data\V1beta\Metric;
use Google\Analytics\Data\V1beta\RunReportRequest;
use Google\Analytics\Data\V1beta\FilterExpression;
use Google\Analytics\Data\V1beta\FilterExpressionList;
use Google\Analytics\Data\V1beta\Filter;
use Google\Analytics\Data\V1beta\Filter\StringFilter;
use Illuminate\Support\Facades\Cache;

class AnalyticsService
{
    public function getAssetDownloads(int $days = 30): array
    {
        $propertyId = env('GA_PROPERTY_ID');
        $client = new BetaAnalyticsDataClient();

        // We only want the custom 'asset_download' event
        $eventFilter = new FilterExpression([
            'filter' => new Filter([
                'field_name' => 'eventName',
                'string_filter' => new StringFilter([
                    'value' => 'asset_download'
                ])
            ])
        ]);

        $request = (new RunReportRequest())
            ->setProperty('properties/' . $propertyId)
            ->setDateRanges([
                new DateRange([
                    'start_date' => $days . 'daysAgo',
                    'end_date' => 'today',
                ]),
            ])
            ->setDimensions([
                new Dimension(['name' => 'customEvent:asset_type']),
                new Dimension(['name' => 'customEvent:service_type']),
            ])
            ->setMetrics([
                new Metric(['name' => 'eventCount']),
            ])
            ->setDimensionFilter($eventFilter);

        $response = $client->runReport($request);
        $data = [];

        foreach ($response->getRows() as $row) {
            $data[] = [
                'asset_type' => $row->getDimensionValues()[0]->getValue(),
                'service_type' => $row->getDimensionValues()[1]->getValue(),
                'downloads' => (int) $row->getMetricValues()[0]->getValue(),
            ];
        }

        return $data;
    }
}