<?php

namespace App\Console\Commands;

use App\Jobs\RefreshAnalyticsData;
use Illuminate\Console\Command;

/**
 * Retained for backwards compatibility. It now delegates to RefreshAnalyticsData
 * so there is exactly ONE GA4 -> local-table persistence path (the old copy
 * stopped at yesterday, stored raw Ymd dates and read through the GA cache).
 */
class FetchGAData extends Command
{
    protected $signature = 'fetch:ga-data {--days=60 : Number of past days to fetch}';
    protected $description = 'Rebuild the last N days of GA4 download data (delegates to RefreshAnalyticsData).';

    public function handle(): int
    {
        $start = now()->subDays((int) $this->option('days'))->toDateString();
        $end   = now()->toDateString();

        $this->info("Rebuilding GA data from {$start} to {$end} ...");

        RefreshAnalyticsData::dispatchSync($start, $end, null, null, true);

        $this->info('Done.');

        return self::SUCCESS;
    }
}
