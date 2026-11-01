<?php

namespace App\Console\Commands;

use App\Jobs\RefreshAnalyticsData;
use App\Models\DailyAssetDownload;
use App\Support\AnalyticsLabels;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * One-off repair of rows already stored in daily_asset_downloads.
 *
 *  1. Blank service_type / program / session inside the 7DG window -> "7DG",
 *     merging rows that now share the same key.
 *  2. Re-syncs from GA4 so blank asset types AND blank service types / programs /
 *     sessions are re-derived from the page path and the catalog (GA4 still
 *     holds the raw events; the local table does not). The re-sync covers the
 *     whole stored history by default, not just the 7DG window.
 *
 *   php artisan analytics:repair-labels --dry-run
 *   php artisan analytics:repair-labels
 *   php artisan analytics:repair-labels --no-resync
 *   php artisan analytics:repair-labels --from=2026-07-01
 */
class RepairAnalyticsLabels extends Command
{
    protected $signature = 'analytics:repair-labels {--dry-run : Show what would change} {--no-resync : Skip the GA4 re-sync} {--from= : First day to re-sync (default: earliest stored day)}';
    protected $description = 'Merge Unknown/Not set values in the 7DG window into "7DG" and re-derive asset types.';

    public function handle(): int
    {
        $start = config('analytics.legacy_7dg.start');
        $end   = config('analytics.legacy_7dg.end');

        $rows = DailyAssetDownload::whereBetween('date', [$start, $end])->get();
        $this->info("Rows in {$start} .. {$end}: {$rows->count()}");

        $merged = [];

        foreach ($rows as $row) {
            $date = $row->date->toDateString();

            $asset   = AnalyticsLabels::canonicalAssetType($row->asset_type);
            $service = AnalyticsLabels::normaliseDimension($row->service_type, $date);
            $program = AnalyticsLabels::normaliseDimension($row->program, $date);
            $session = AnalyticsLabels::normaliseDimension($row->session, $date);

            $key = implode('|', [$date, $asset, $service, $program, $session]);

            $merged[$key] ??= [
                'date' => $date, 'asset_type' => $asset, 'service_type' => $service,
                'program' => $program, 'session' => $session, 'downloads' => 0,
            ];
            $merged[$key]['downloads'] += (int) $row->downloads;
        }

        $this->info('Rows after merge: ' . count($merged));

        if ($this->option('dry-run')) {
            $this->warn('Dry run - nothing written.');
            return self::SUCCESS;
        }

        $now = now();

        DB::transaction(function () use ($start, $end, $merged, $now) {
            DailyAssetDownload::whereBetween('date', [$start, $end])->delete();

            foreach (array_chunk(array_values($merged), 500) as $chunk) {
                DailyAssetDownload::insert(array_map(
                    fn ($r) => $r + ['created_at' => $now, 'updated_at' => $now],
                    $chunk
                ));
            }
        });

        $this->info('7DG labels merged.');

        if (!$this->option('no-resync')) {
            $from = $this->option('from') ?: (DailyAssetDownload::min('date') ?: $start);
            $from = substr((string) $from, 0, 10);
            $to   = now()->toDateString();

            $this->info("Re-syncing {$from} .. {$to} from GA4 to resolve asset and service types ...");
            RefreshAnalyticsData::dispatchSync($from, $to, null, null, true);
        }

        $this->info('Done.');

        return self::SUCCESS;
    }
}
