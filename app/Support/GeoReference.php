<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Resolves GA4 region / city names to coordinates from the local GeoNames tables
 * (see the geo:import command). No network calls, no rate limits.
 *
 *  - region: matched by country + normalised name (alternate names included).
 *  - city:   matched by country + normalised name. When GA4's region is known, only
 *            places in that region qualify; the most populous one wins.
 *
 * Returns null when the tables are empty or the place is unknown, so GeoCoder can
 * fall back to Open-Meteo for the leftovers.
 */
final class GeoReference
{
    /**
     * GA4 region names that GeoNames spells differently, as normalised keys per country.
     * (cities*.txt / admin1CodesASCII.txt carry no alternate names for regions.)
     */
    private const REGION_ALIASES = [
        'NG' => [
            'federal capital territory'       => 'fct',
            'abuja federal capital territory' => 'fct',
            'abuja'                           => 'fct',
        ],
    ];

    private static ?bool $available = null;

    /** @var array<string, array<int, object>> */
    private static array $regions = [];

    /** @var array<string, array<int, object>> */
    private static array $places = [];

    public static function available(): bool
    {
        if (self::$available !== null) {
            return self::$available;
        }

        try {
            self::$available = Schema::hasTable('geo_places')
                && Schema::hasTable('geo_regions')
                && DB::table('geo_places')->exists();
        } catch (Throwable) {
            self::$available = false;
        }

        return self::$available;
    }

    /**
     * @param array{name: string, iso2?: ?string, region?: ?string, kind?: string} $place
     * @return array{lat: float, lng: float}|null
     */
    public static function resolve(array $place): ?array
    {
        if (!self::available()) {
            return null;
        }

        $iso2 = strtoupper((string) ($place['iso2'] ?? ''));

        if (preg_match('/^[A-Z]{2}$/', $iso2) !== 1) {
            return null;
        }

        try {
            if (($place['kind'] ?? 'city') === 'region') {
                $region = self::findRegion($iso2, GeoCoder::key($place['name'] ?? '', true));

                return $region ? ['lat' => $region['lat'], 'lng' => $region['lng']] : null;
            }

            return self::findPlace($iso2, $place);
        } catch (Throwable) {
            return null;
        }
    }

    /** @return array{admin1_code: ?string, lat: float, lng: float}|null */
    private static function findRegion(string $iso2, string $key): ?array
    {
        if ($key === '') {
            return null;
        }

        $key = self::REGION_ALIASES[$iso2][$key] ?? $key;

        $exact = null;
        $alt   = null;

        foreach (self::regionsOf($iso2) as $r) {
            if ($r->name_key === $key) {
                if ($exact === null || $r->population > $exact->population) {
                    $exact = $r;
                }
            } elseif ($r->alt_keys !== null && str_contains($r->alt_keys, '|' . $key . '|')) {
                if ($alt === null || $r->population > $alt->population) {
                    $alt = $r;
                }
            }
        }

        $best = $exact ?? $alt;

        return $best
            ? ['admin1_code' => $best->admin1_code, 'lat' => (float) $best->lat, 'lng' => (float) $best->lng]
            : null;
    }

    /** @return array<int, object> */
    private static function regionsOf(string $iso2): array
    {
        return self::$regions[$iso2] ??= DB::table('geo_regions')
            ->where('country_code', $iso2)
            ->get(['admin1_code', 'name_key', 'alt_keys', 'lat', 'lng', 'population'])
            ->all();
    }

    /** @return array{lat: float, lng: float}|null */
    private static function findPlace(string $iso2, array $place): ?array
    {
        $key = GeoCoder::key($place['name'] ?? '');

        if ($key === '') {
            return null;
        }

        $rows = self::placesNamed($iso2, $key);

        if ($rows === []) {
            return null;
        }

        $regionKey = GeoCoder::key($place['region'] ?? '', true);
        $admin1    = $regionKey !== '' ? (self::findRegion($iso2, $regionKey)['admin1_code'] ?? null) : null;

        if ($admin1 !== null) {
            // GA4 told us the region and we know it: only a place inside it is acceptable.
            $rows = array_values(array_filter($rows, static fn ($r) => $r->admin1_code === $admin1));
        }

        if ($rows === []) {
            return null;
        }

        usort($rows, static fn ($a, $b) => $b->population <=> $a->population);

        return ['lat' => (float) $rows[0]->lat, 'lng' => (float) $rows[0]->lng];
    }

    /** @return array<int, object> */
    private static function placesNamed(string $iso2, string $key): array
    {
        $memo = $iso2 . '|' . $key;

        if (isset(self::$places[$memo])) {
            return self::$places[$memo];
        }

        $columns = ['id', 'admin1_code', 'lat', 'lng', 'population'];

        $rows = DB::table('geo_places')
            ->where('country_code', $iso2)
            ->where('name_key', $key)
            ->get($columns)
            ->all();

        // Alternate / English names of the larger places ("Cologne" -> Koeln).
        $ids = DB::table('geo_place_names')
            ->where('country_code', $iso2)
            ->where('name_key', $key)
            ->pluck('place_id')
            ->all();

        if ($ids !== []) {
            $known = array_map(static fn ($r) => (int) $r->id, $rows);
            $extra = array_values(array_diff(array_map('intval', $ids), $known));

            if ($extra !== []) {
                $rows = array_merge($rows, DB::table('geo_places')->whereIn('id', $extra)->get($columns)->all());
            }
        }

        return self::$places[$memo] = $rows;
    }
}
