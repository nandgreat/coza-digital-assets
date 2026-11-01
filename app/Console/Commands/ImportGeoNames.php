<?php

namespace App\Console\Commands;

use App\Support\GeoCoder;
use App\Support\GeoNamesParser;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Loads the GeoNames "allCountries.txt" dump into the local reference tables.
 *
 *   php artisan geo:import C:\geonames\cities500.txt --fresh
 *
 * Works with either dump:
 *  - allCountries.txt: ADM1 rows give the regions (with their own coordinates).
 *  - cities500.txt (or cities1000 / cities5000 / cities15000): no ADM1 rows, so the regions come from
 *    admin1CodesASCII.txt (names only) and each region's pin is the population-weighted centre of its places.
 *
 * Every populated place goes to geo_places. Alternate names are kept for places with
 * population >= --alt-min-pop (geo_place_names).
 * Data: GeoNames (https://www.geonames.org), licensed CC BY 4.0.
 */
class ImportGeoNames extends Command
{
    protected $signature = 'geo:import
        {file : Path to the GeoNames dump (allCountries.txt or cities500.txt)}
        {--admin1= : Path to admin1CodesASCII.txt (default: next to the dump file)}
        {--fresh : Empty the geo tables first}
        {--alt-min-pop=1000 : Keep alternate names for places with at least this population}
        {--batch=2000 : Rows per insert}';

    protected $description = 'Import GeoNames regions and all populated places into the local geo reference tables.';

    public function handle(): int
    {
        $file = (string) $this->argument('file');

        if (!is_file($file) || !is_readable($file)) {
            $this->error("Cannot read file: {$file}");

            return self::FAILURE;
        }

        $altMinPop = max(0, (int) $this->option('alt-min-pop'));
        $batchSize = max(100, (int) $this->option('batch'));

        DB::connection()->disableQueryLog();
        @set_time_limit(0);

        if ($this->option('fresh')) {
            DB::table('geo_place_names')->truncate();
            DB::table('geo_places')->truncate();
            DB::table('geo_regions')->truncate();
            $this->info('Emptied geo tables.');
        }

        $handle = fopen($file, 'rb');

        if ($handle === false) {
            $this->error("Cannot open file: {$file}");

            return self::FAILURE;
        }

        $buffers = ['regions' => [], 'places' => [], 'names' => []];
        $tables  = ['regions' => 'geo_regions', 'places' => 'geo_places', 'names' => 'geo_place_names'];
        $counts  = ['regions' => 0, 'places' => 0, 'names' => 0];
        $lines   = 0;
        $started = microtime(true);

        // Per region "CC|admin1": population-weighted centre, used when the dump has no ADM1 rows.
        $centres = [];

        $flush = function (string $type) use (&$buffers, &$counts, $tables) {
            if ($buffers[$type] === []) {
                return;
            }

            DB::table($tables[$type])->insertOrIgnore($buffers[$type]);
            $counts[$type] += count($buffers[$type]);
            $buffers[$type] = [];
        };

        while (($line = fgets($handle)) !== false) {
            $lines++;

            if ($lines % 500000 === 0) {
                $this->line(sprintf(
                    '  %s lines read - %s places, %s regions (%ds)',
                    number_format($lines),
                    number_format($counts['places']),
                    number_format($counts['regions']),
                    microtime(true) - $started
                ));
            }

            $parsed = GeoNamesParser::parse($line, $altMinPop);

            if ($parsed === null) {
                continue;
            }

            $buffers[$parsed['table']][] = $parsed['row'];

            if ($parsed['table'] === 'places' && $parsed['row']['admin1_code'] !== null) {
                $row = $parsed['row'];
                $id  = $row['country_code'] . '|' . $row['admin1_code'];
                $w   = sqrt($row['population'] + 1);
                $rad = deg2rad($row['lng']);

                $centres[$id] ??= ['w' => 0.0, 'lat' => 0.0, 'x' => 0.0, 'y' => 0.0];
                $centres[$id]['w']   += $w;
                $centres[$id]['lat'] += $w * $row['lat'];
                $centres[$id]['x']   += $w * cos($rad);   // longitude as a vector so Fiji / Chukotka / Alaska average correctly
                $centres[$id]['y']   += $w * sin($rad);
            }

            foreach ($parsed['names'] as $name) {
                $buffers['names'][] = $name;
            }

            foreach (['regions', 'places', 'names'] as $type) {
                if (count($buffers[$type]) >= $batchSize) {
                    $flush($type);
                }
            }
        }

        fclose($handle);

        foreach (['regions', 'places', 'names'] as $type) {
            $flush($type);
        }

        $skippedRegions = $this->importAdminNames($centres, $flush, $buffers, $counts);

        if ($skippedRegions > 0) {
            $this->line(number_format($skippedRegions) . ' regions in the admin1 file have no places in this dump and were skipped.');
        }

        $this->info(sprintf(
            'Done in %ds: %s regions, %s places, %s alternate names.',
            microtime(true) - $started,
            number_format($counts['regions']),
            number_format($counts['places']),
            number_format($counts['names'])
        ));

        return self::SUCCESS;
    }

    /**
     * Regions from admin1CodesASCII.txt ("NG.05<TAB>Lagos<TAB>Lagos<TAB>2332453"), positioned at the
     * weighted centre of their places. Regions already imported from ADM1 rows keep their own coordinates.
     *
     * @param array<string, array{w: float, lat: float, x: float, y: float}> $centres
     * @return int regions skipped because no place belongs to them
     */
    private function importAdminNames(array $centres, \Closure $flush, array &$buffers, array &$counts): int
    {
        $path = (string) ($this->option('admin1') ?: dirname((string) $this->argument('file')) . DIRECTORY_SEPARATOR . 'admin1CodesASCII.txt');

        if (!is_file($path) || !is_readable($path)) {
            $this->warn("admin1CodesASCII.txt not found at {$path}: regions are only imported from ADM1 rows (none in cities*.txt).");

            return 0;
        }

        $skipped = 0;

        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $c = explode("\t", $line);

            if (count($c) < 4 || !preg_match('/^([A-Z]{2})\.(.+)$/', $c[0], $m) || !ctype_digit($c[3])) {
                continue;
            }

            $centre = $centres[$m[1] . '|' . $m[2]] ?? null;

            if ($centre === null || $centre['w'] <= 0) {
                $skipped++;
                continue;
            }

            $name = $c[1];
            $main = GeoCoder::key($c[2] !== '' ? $c[2] : $name, true);

            if ($main === '') {
                continue;
            }

            $buffers['regions'][] = [
                'id'           => (int) $c[3],
                'country_code' => $m[1],
                'admin1_code'  => $m[2],
                'name'         => mb_substr($name, 0, 200),
                'name_key'     => $main,
                'alt_keys'     => null,
                'lat'          => round($centre['lat'] / $centre['w'], 6),
                'lng'          => round(rad2deg(atan2($centre['y'], $centre['x'])), 6),
                'population'   => 0,
            ];
        }

        $flush('regions');

        return $skipped;
    }
}
