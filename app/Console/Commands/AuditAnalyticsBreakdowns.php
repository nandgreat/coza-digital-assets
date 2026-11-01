<?php

namespace App\Console\Commands;

use App\Models\DailyAssetDownload;
use App\Services\GoogleAnalyticsService;
use App\Support\AnalyticsLabels;
use Illuminate\Console\Command;

/**
 * Read-only check of the dashboard numbers against GA4.
 *
 *   php artisan analytics:audit --from=2026-07-01 --to=2026-10-09
 *
 * Prints, for the period:
 *   - GA4 asset_download events by service_type (raw, as GA4 reports them)
 *   - the local daily_asset_downloads totals the dashboard reads
 *   - the downloads that still have no service type after the catalog lookup
 *   - GA4 unique users per asset type (de-duplicated, same query as the dashboard)
 */
class AuditAnalyticsBreakdowns extends Command
{
    protected $signature = 'analytics:audit {--from= : Start date (default: 30 days ago)} {--to= : End date (default: today)}';
    protected $description = 'Compare dashboard breakdowns with GA4 and list downloads that have no service type.';

    public function handle(GoogleAnalyticsService $ga): int
    {
        $from = $this->option('from') ?: now()->subDays(30)->toDateString();
        $to   = $this->option('to') ?: now()->toDateString();

        $this->info("Period: {$from} .. {$to}");

        // ── GA4 downloads by service type (raw) ───────────────────────────
        $rows = $ga->getDownloads($from, $to, ['service_type'], ['eventCount'], 'asset_download', [], true);
        $ga4Total = 0;
        $ga4ByService = [];

        foreach ($rows as $row) {
            $label = AnalyticsLabels::isBlank($row['service_type'] ?? null)
                ? '(blank in GA4)'
                : trim($row['service_type']);

            $ga4ByService[$label] = ($ga4ByService[$label] ?? 0) + (int) $row['eventCount'];
            $ga4Total += (int) $row['eventCount'];
        }

        // ── Local table ────────────────────────────────────────────────
        $local = DailyAssetDownload::whereBetween('date', [$from, $to])
            ->selectRaw('service_type, SUM(downloads) as total')
            ->groupBy('service_type')
            ->get();

        $localByService = [];
        $localTotal = 0;

        foreach ($local as $row) {
            $label = AnalyticsLabels::isBlank($row->service_type) ? '(no service type)' : $row->service_type;
            $localByService[$label] = ($localByService[$label] ?? 0) + (int) $row->total;
            $localTotal += (int) $row->total;
        }

        $labels = array_unique(array_merge(array_keys($ga4ByService), array_keys($localByService)));
        sort($labels);

        $table = [];
        foreach ($labels as $label) {
            $table[] = [$label, $ga4ByService[$label] ?? '-', $localByService[$label] ?? '-'];
        }
        $table[] = ['TOTAL', $ga4Total, $localTotal];

        $this->table(['Service type', 'GA4 raw', 'Local (dashboard)'], $table);

        $unresolved = $localByService['(no service type)'] ?? 0;
        $this->line("Downloads still without a service type after the catalog lookup: {$unresolved}");
        $this->line('These are hidden from "Downloads by Service Type" but still counted in the total downloads KPI.');

        if ($ga4Total !== $localTotal) {
            $this->warn('GA4 total and local total differ - run: php artisan analytics:repair-labels');
        }

        // ── Downloads by asset type: GA4 raw vs local ─────────────────────
        $ga4Assets = [];
        foreach ($ga->getDownloads($from, $to, ['asset_type'], ['eventCount'], 'asset_download', [], true) as $row) {
            $label = AnalyticsLabels::assetLabel($row['asset_type'] ?? null);
            $label = AnalyticsLabels::isBlank($row['asset_type'] ?? null) ? '(blank in GA4 - recovered from page path locally)' : $label;
            $ga4Assets[$label] = ($ga4Assets[$label] ?? 0) + (int) $row['eventCount'];
        }

        $localAssets = [];
        foreach (DailyAssetDownload::whereBetween('date', [$from, $to])
            ->selectRaw('asset_type, SUM(downloads) as total')->groupBy('asset_type')->get() as $row) {
            $label = AnalyticsLabels::assetLabel($row->asset_type);
            $localAssets[$label] = ($localAssets[$label] ?? 0) + (int) $row->total;
        }

        $assetRows = [];
        foreach (array_unique(array_merge(array_keys($ga4Assets), array_keys($localAssets))) as $label) {
            $assetRows[] = [$label, $ga4Assets[$label] ?? '-', $localAssets[$label] ?? '-'];
        }
        $this->table(['Asset type (downloads)', 'GA4 raw', 'Local (dashboard)'], $assetRows);

        if (!isset($ga4Assets['Prophecies']) && !isset($localAssets['Prophecies'])) {
            $this->warn('No Prophecies downloads in this period - the card cannot show it until a prophecy file is downloaded.');
        }

        // ── GA4 unique users per asset type ──────────────────────────────
        $users = [];
        foreach (AnalyticsLabels::knownAssetTypes() as $type) {
            $users[] = [
                AnalyticsLabels::assetLabel($type),
                $ga->getUniqueUsersForAssetType($from, $to, $type, [], true),
            ];
        }

        $this->table(['Asset type', 'GA4 unique users'], $users);

        return self::SUCCESS;
    }
}
