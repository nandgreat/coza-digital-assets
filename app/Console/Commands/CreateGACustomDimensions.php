<?php

namespace App\Console\Commands;

use Google\Analytics\Admin\V1beta\Client\AnalyticsAdminServiceClient;
use Google\Analytics\Admin\V1beta\CreateCustomDimensionRequest;
use Google\Analytics\Admin\V1beta\CustomDimension;
use Google\Analytics\Admin\V1beta\CustomDimension\DimensionScope;
use Google\Analytics\Admin\V1beta\ListCustomDimensionsRequest;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CreateGACustomDimensions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ga:create-dimensions
                            {--property= : GA4 property ID, e.g. 123456789}
                            {--dry-run : Show what would be created without actually making changes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create custom dimensions in GA4 programmatically.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $propertyId = $this->option('property') ?? config('services.ga4.property_id');
        if (!$propertyId) {
            $this->error('No property ID provided. Use --property=123456789 or set GA4_PROPERTY_ID in .env');
            return 1;
        }

        $dryRun = $this->option('dry-run');
        if ($dryRun) {
            $this->warn('Dry-run mode: no changes will be made.');
        }

        $this->info("Connecting to GA4 Admin API for property: {$propertyId}");

        try {
            $client = new AnalyticsAdminServiceClient([
                'credentials' => config('services.ga4.service_account_key_path'),
            ]);

            $dimensions = [
                [
                    'parameterName' => 'asset_type',
                    'displayName'   => 'Asset Type',
                    'description'   => 'Type of asset (sermon_notes, blessing, quote, prophecy)',
                    'scope'         => DimensionScope::EVENT,
                ],
                [
                    'parameterName' => 'service_type',
                    'displayName'   => 'Service Type',
                    'description'   => 'Type of service (Sunday Service, Dominion Hour, Tuesday Service, 12DG, 7DG)',
                    'scope'         => DimensionScope::EVENT,
                ],
                [
                    'parameterName' => 'program',
                    'displayName'   => 'Program',
                    'description'   => 'Program name',
                    'scope'         => DimensionScope::EVENT,
                ],
                [
                    'parameterName' => 'session',
                    'displayName'   => 'Session',
                    'description'   => 'Session title (Sunday Morning, Monday Morning, Tuesday Evening)',
                    'scope'         => DimensionScope::EVENT,
                ],
            ];

            foreach ($dimensions as $dimension) {
                $this->createCustomDimension($client, $propertyId, $dimension, $dryRun);
            }

            $this->info('All custom dimensions have been created (or were already present).');
            $this->warn('Note: It may take up to 24 hours for GA4 to make them available in reporting.');
            return 0;
        } catch (\Exception $e) {
            $this->error('Error: ' . $e->getMessage());
            Log::error('CreateGACustomDimensions failed: ' . $e->getMessage());
            return 1;
        }
    }

    /**
     * Create a single custom dimension.
     */
    private function createCustomDimension($client, string $propertyId, array $config, bool $dryRun)
    {
        $parent = "properties/{$propertyId}";
        $parameterName = $config['parameterName'];
        $displayName   = $config['displayName'];
        $description   = $config['description'];
        $scope         = $config['scope'];

        $this->line("Creating dimension: {$displayName} (parameter: {$parameterName}, scope: " . ($scope === DimensionScope::EVENT ? 'EVENT' : 'USER') . ")");

        if ($dryRun) {
            $this->comment("  DRY RUN: Would create dimension with parameter '{$parameterName}'.");
            return;
        }

        // Check if the dimension already exists
        if ($this->findExistingDimension($client, $propertyId, $parameterName)) {
            $this->warn("  Dimension '{$parameterName}' already exists. Skipping.");
            return;
        }

        try {
            $customDimension = new CustomDimension();
            $customDimension->setParameterName($parameterName);
            $customDimension->setDisplayName($displayName);
            $customDimension->setDescription($description);
            $customDimension->setScope($scope);

            $request = new CreateCustomDimensionRequest();
            $request->setParent($parent);
            $request->setCustomDimension($customDimension);

            $response = $client->createCustomDimension($request);
            $this->info("  ✅ Created dimension '{$displayName}' with ID: {$response->getName()}");
        } catch (\Exception $e) {
            $this->error("  ❌ Failed to create '{$displayName}': " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Check if a dimension with the given parameter name already exists.
     */
    private function findExistingDimension($client, string $propertyId, string $parameterName): bool
    {
        $parent = "properties/{$propertyId}";

        try {
            $request = new ListCustomDimensionsRequest();
            $request->setParent($parent);

            $response = $client->listCustomDimensions($request);

            foreach ($response->iterateAllElements() as $dimension) {
                if ($dimension->getParameterName() === $parameterName) {
                    return true;
                }
            }
        } catch (\Exception $e) {
            $this->warn("  Could not list existing dimensions: " . $e->getMessage());
            return false;
        }

        return false;
    }
}