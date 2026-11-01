<?php

use App\Jobs\RefreshAnalyticsData;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Analytics schedule (Laravel 11+: schedules live here, NOT in Kernel.php)
|--------------------------------------------------------------------------
| cPanel cron (one entry, every minute):
|   * * * * * cd /home/USER/your-app && php artisan schedule:run >> /dev/null 2>&1
*/

// Hourly: rebuild the last few days so new service types (e.g. CGLS) and late
// GA4 processing show up without anyone clicking Refresh.
Schedule::call(function () {
    RefreshAnalyticsData::dispatch(
        now()->subDays((int) config('analytics.refresh_recent_days', 3))->toDateString(),
        now()->toDateString(),
        null,
        null,
        true
    );
})->hourly()->name('analytics-refresh-recent')->withoutOverlapping(30);

// Nightly: wider re-sync to catch data GA4 finalised after the fact.
Schedule::call(function () {
    RefreshAnalyticsData::dispatch(
        now()->subDays((int) config('analytics.refresh_backfill_days', 14))->toDateString(),
        now()->toDateString(),
        null,
        null,
        true
    );
})->dailyAt('03:00')->name('analytics-refresh-backfill')->withoutOverlapping(60);

// Shared hosting has no long-running worker: drain the queue every minute.
Schedule::command('queue:work --stop-when-empty --tries=2 --max-time=240')
    ->everyMinute()
    ->name('analytics-queue-drain')
    ->withoutOverlapping(10);
