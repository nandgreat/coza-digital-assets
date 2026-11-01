<?php

namespace App\Services\GoogleAnalytics;

class CustomDimensionStatusService
{
    public function __construct(
        private readonly AnalyticsAdminService $admin,
        private readonly AnalyticsDataService $data,
    ) {
    }

    /**
     * Get the reporting status of every custom dimension
     * registered on a property.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getStatuses(
        string $propertyId
    ): array {
        /*
         * 1. Get what GA4 says is registered.
         */
        $registered = $this->admin->getCustomDimensions(
            $propertyId
        );

        /*
         * 2. Get what the Data API says is currently
         *    available for reporting.
         */
        $reportable = $this->data->getReportableCustomDimensions(
            $propertyId
        );

        /*
         * Turn reportable dimensions into a lookup map.
         */
        $reportableMap = [];

        foreach ($reportable as $dimension) {
            $reportableMap[$dimension['api_name']] = $dimension;
        }

        /*
         * 3. Compare the two sets.
         */
        return array_map(
            function (array $dimension) use ($reportableMap) {
                $apiName = $this->getApiName(
                    $dimension['parameter_name'],
                    $dimension['scope']
                );

                $isReportable = isset(
                    $reportableMap[$apiName]
                );

                return [
                    'name' => $dimension['name'],
                    'display_name' => $dimension['display_name'],
                    'description' => $dimension['description'],
                    'parameter_name' => $dimension['parameter_name'],
                    'scope' => $dimension['scope'],

                    'api_name' => $apiName,

                    'registered' => true,
                    'reportable' => $isReportable,

                    'status' => $isReportable
                        ? 'available'
                        : 'pending',
                ];
            },
            $registered
        );
    }

    /**
     * Get the API name used by the Data API.
     */
    private function getApiName(
        string $parameterName,
        string $scope
    ): string {
        return match ($scope) {
            'event' => "customEvent:{$parameterName}",
            'user' => "customUser:{$parameterName}",
            'item' => "customItem:{$parameterName}",

            default => throw new \RuntimeException(
                "Unknown custom dimension scope: {$scope}"
            ),
        };
    }
}