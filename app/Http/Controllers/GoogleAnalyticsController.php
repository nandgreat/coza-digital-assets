<?php

namespace App\Http\Controllers;

use App\Services\GoogleAnalytics\CustomDimensionStatusService;
use Illuminate\Http\JsonResponse;

class GoogleAnalyticsController extends Controller
{
    public function customDimensionStatuses(
        string $propertyId,
        CustomDimensionStatusService $service,
    ): JsonResponse {
        return response()->json([
            'property_id' => $propertyId,
            'dimensions' => $service->getStatuses($propertyId),
        ]);
    }
}