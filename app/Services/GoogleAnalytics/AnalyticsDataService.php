<?php

namespace App\Services\GoogleAnalytics;

use Google\Analytics\Data\V1beta\Client\BetaAnalyticsDataClient;
use Google\Analytics\Data\V1beta\GetMetadataRequest;
use Google\Analytics\Data\V1beta\DimensionMetadata;

class AnalyticsDataService
{
    /**
     * Get reporting metadata for a GA4 property.
     */
    public function getMetadata(string $propertyId): mixed
    {
        $client = new BetaAnalyticsDataClient();

        try {
            $request = (new GetMetadataRequest())
                ->setName("properties/{$propertyId}/metadata");

            return $client->getMetadata($request);
        } finally {
            $client->close();
        }
    }

    /**
     * Get all custom dimensions that are currently
     * available for reporting.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getReportableCustomDimensions(
        string $propertyId
    ): array {
        $metadata = $this->getMetadata($propertyId);

        $dimensions = [];

        foreach ($metadata->getDimensions() as $dimension) {
            if (!$dimension->getCustomDefinition()) {
                continue;
            }

            $dimensions[] = [
                'api_name' => $dimension->getApiName(),
                'ui_name' => $dimension->getUiName(),
                'description' => $dimension->getDescription(),
                'custom_definition' => true,
            ];
        }

        return $dimensions;
    }

    /**
     * Check whether a particular API dimension name
     * is currently usable in reporting.
     */
    public function isReportable(
        string $propertyId,
        string $apiName
    ): bool {
        $metadata = $this->getMetadata($propertyId);

        foreach ($metadata->getDimensions() as $dimension) {
            if ($dimension->getApiName() === $apiName) {
                return true;
            }
        }

        return false;
    }
}