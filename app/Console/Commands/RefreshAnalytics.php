<?php

namespace App\Console\Commands;

use App\Jobs\RefreshAnalyticsData;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RefreshAnalytics extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'analytics:refresh
                            {--start= : Start date (YYYY-MM-DD) – default 30 days ago}
                            {--end= : End date (YYYY-MM-DD) – default today}
                            {--service= : Service type filter}
                            {--program= : Program filter}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Dispatch the RefreshAnalyticsData job to fetch fresh GA4 data.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $start = $this->option('start') ?? now()->subDays(30)->toDateString();
        $end   = $this->option('end') ?? now()->toDateString();
        $service = $this->option('service');
        $program = $this->option('program');

        $this->info("Dispatching refresh job for period {$start} to {$end}");

        RefreshAnalyticsData::dispatch($start, $end, $service, $program);

        $this->info('Job dispatched successfully. Check the queue worker logs for progress.');
        Log::info('Analytics refresh command executed', [
            'start' => $start,
            'end'   => $end,
            'service' => $service,
            'program' => $program,
        ]);

        return Command::SUCCESS;
    }
}