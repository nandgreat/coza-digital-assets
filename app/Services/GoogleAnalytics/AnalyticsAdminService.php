<?php

namespace App\Services\GoogleAnalytics;

use Google\Analytics\Admin\V1beta\Client\AnalyticsAdminServiceClient;
use Google\Analytics\Admin\V1beta\ListCustomDimensionsRequest;

class AnalyticsAdminService
{
    /**
     * Get all custom dimensions registered on a GA4 property.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getCustomDimensions(
        string $propertyId
    ): array {
        $client = new AnalyticsAdminServiceClient();

        try {
            $request = (new ListCustomDimensionsRequest())
                ->setParent("properties/{$propertyId}");

            $response = $client->listCustomDimensions($request);

            $dimensions = [];

            foreach ($response as $dimension) {
                $dimensions[] = [
                    'name' => $dimension->getName(),
                    'display_name' => $dimension->getDisplayName(),
                    'description' => $dimension->getDescription(),
                    'parameter_name' => $dimension->getParameterName(),
                    'scope' => $this->getScopeName(
                        $dimension->getScope()
                    ),
                ];
            }

            return $dimensions;
        } finally {
            $client->close();
        }
    }

    /**
     * Convert Google's enum value to a simple string.
     */
    private function getScopeName(int $scope): string
    {
        return match ($scope) {
            \Google\Analytics\Admin\V1beta\CustomDimension\DimensionScope::EVENT
                => 'event',

            \Google\Analytics\Admin\V1beta\CustomDimension\DimensionScope::USER
                => 'user',

            \Google\Analytics\Admin\V1beta\CustomDimension\DimensionScope::ITEM
                => 'item',

            default => 'unknown',
        };
    }
}