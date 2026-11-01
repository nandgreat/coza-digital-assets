<?php

namespace App\Support;

/**
 * Turns one line of the GeoNames "allCountries.txt" dump into a row for
 * geo_regions (ADM1 features) or geo_places (populated places).
 *
 * Columns (tab separated): 0 id, 1 name, 2 asciiname, 3 alternatenames, 4 lat, 5 lng,
 * 6 feature class, 7 feature code, 8 country code, 9 cc2, 10 admin1 code, ... 14 population.
 */
final class GeoNamesParser
{
    /** Populated-place codes that are historical / abandoned / destroyed. */
    private const SKIP_PLACE_CODES = ['PPLH', 'PPLW', 'PPLQ', 'PPLCH'];

    private const MAX_REGION_ALTS = 60;
    private const MAX_PLACE_ALTS = 20;

    /**
     * @return array{table: 'regions'|'places', row: array<string, mixed>, names: array<int, array<string, mixed>>}|null
     */
    public static function parse(string $line, int $altMinPop = 15000): ?array
    {
        $c = explode("\t", rtrim($line, "\r\n"));

        if (count($c) < 15) {
            return null;
        }

        [$id, $name, $ascii, $alts, $lat, $lng, $class, $code, $country] = $c;
        $admin1 = $c[10] !== '' ? $c[10] : null;
        $pop    = (int) $c[14];

        if (!ctype_digit($id) || !is_numeric($lat) || !is_numeric($lng) || !preg_match('/^[A-Z]{2}$/', $country)) {
            return null;
        }

        $base = $ascii !== '' ? $ascii : $name;

        if ($class === 'A' && $code === 'ADM1') {
            $main = GeoCoder::key($base, true);

            if ($main === '') {
                return null;
            }

            $keys = array_diff(
                array_unique(array_merge([GeoCoder::key($name, true)], self::altKeys($alts, self::MAX_REGION_ALTS, true))),
                [$main, '']
            );

            return [
                'table' => 'regions',
                'names' => [],
                'row'   => [
                    'id'           => (int) $id,
                    'country_code' => $country,
                    'admin1_code'  => $admin1,
                    'name'         => mb_substr($name, 0, 200),
                    'name_key'     => $main,
                    'alt_keys'     => $keys !== [] ? '|' . implode('|', $keys) . '|' : null,
                    'lat'          => round((float) $lat, 6),
                    'lng'          => round((float) $lng, 6),
                    'population'   => $pop,
                ],
            ];
        }

        if ($class !== 'P' || in_array($code, self::SKIP_PLACE_CODES, true)) {
            return null;
        }

        $main = GeoCoder::key($base);

        if ($main === '') {
            return null;
        }

        $names = [];

        if ($pop >= $altMinPop) {
            $keys = array_diff(
                array_unique(array_merge([GeoCoder::key($name)], self::altKeys($alts, self::MAX_PLACE_ALTS, false))),
                [$main, '']
            );

            foreach ($keys as $key) {
                $names[] = ['place_id' => (int) $id, 'country_code' => $country, 'name_key' => $key];
            }
        }

        return [
            'table' => 'places',
            'names' => $names,
            'row'   => [
                'id'           => (int) $id,
                'country_code' => $country,
                'admin1_code'  => $admin1,
                'name'         => mb_substr($name, 0, 200),
                'name_key'     => $main,
                'lat'          => round((float) $lat, 6),
                'lng'          => round((float) $lng, 6),
                'population'   => $pop,
                'feature_code' => $code,
            ],
        ];
    }

    /** @return array<int, string> */
    private static function altKeys(string $alts, int $limit, bool $region): array
    {
        if ($alts === '') {
            return [];
        }

        $out = [];

        foreach (explode(',', $alts) as $alt) {
            $key = GeoCoder::key($alt, $region);

            if ($key === '' || isset($out[$key])) {
                continue;
            }

            $out[$key] = true;

            if (count($out) >= $limit) {
                break;
            }
        }

        return array_keys($out);
    }
}
