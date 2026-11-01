<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

/**
 * Application Console Kernel
 *
 * Registers Artisan commands and defines the scheduling for background tasks.
 */
class Kernel extends ConsoleKernel
{
    /**
     * The Artisan commands provided by your application.
     *
     * @var array
     */
    protected $commands = [
        // Commands are auto‑discovered via `load(__DIR__.'/Commands')`
        // but you can list them explicitly if needed:
        // \App\Console\Commands\FetchGAData::class,
    ];

    /**
     * Define the application's route middleware.
     *
     * Here we add our custom middleware for analytics authentication.
     * These middleware may be assigned to groups or used individually.
     *
     * @var array
     */
    protected $routeMiddleware = [
        // ... other middleware (e.g., auth, throttle) are defined in the parent
        'analytics.auth' => \App\Http\Middleware\AnalyticsAuth::class,
    ];

    /**
     * Define the application's command schedule.
     *
     * These tasks are run automatically by the Laravel scheduler.
     * For more info: https://laravel.com/docs/scheduling
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        // Intentionally empty. This project boots through
        // Application::configure() (Laravel 11+), which ignores this method.
        // All schedules live in routes/console.php.
    }

    /**
     * Register the commands for the application.
     *
     * Auto‑discovers commands in the `Commands` directory.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}