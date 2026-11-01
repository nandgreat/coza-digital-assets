<?php

namespace App\Support;

use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Resolves region / city names (as GA4 reports them) to coordinates.
 *
 * GA4's Data API returns place NAMES only (country, region, city) - never
 * latitude / longitude - so the map needs a geocoder to pin them. This uses the
 * free Open-Meteo geocoding API (no key) and caches every answer, so each place
 * is looked up at most once:
 *   - hits are cached forever,
 *   - "not found" is cached for 3 days,
 *   - network / HTTP failures are NOT cached (retried on the next load).
 *
 * When the local GeoNames tables are imported (php artisan geo:import), App\Support\GeoReference
 * answers first, with no network. Open-Meteo is then only the fallback for places it does not know.
 *
 * Lookups run concurrently (Http::pool) and at most MAX_LOOKUPS_PER_CALL are
 * made per call, so a first load never blocks for long; the rest are resolved
 * on later loads.
 */
final class GeoCoder
{
    private const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';
    private const MAX_LOOKUPS_PER_CALL = 60;
    private const MISS_TTL_DAYS = 3;

    /**
     * @param array<string, array{name: string, iso2: ?string, region?: ?string, kind?: string}> $places
     *        Keyed by a caller-chosen id. kind: "city" (default) or "region".
     * @return array<string, array{lat: float, lng: float}|null> Same keys; null = not located (yet).
     */
    public static function locate(array $places): array
    {
        $result  = [];
        $pending = [];

        $reference = GeoReference::available();

        foreach ($places as $key => $place) {
            // 1) Local GeoNames tables (instant, no network) when they have been imported.
            $local = $reference ? GeoReference::resolve($place) : null;

            if ($local !== null) {
                $result[$key] = $local;
                continue;
            }

            // A region the reference table does not know stays unlocated: a name search returns an
            // arbitrary place inside it (e.g. Toronto for Ontario), and the dashboard pins the
            // region from its located cities instead.
            if ($reference && ($place['kind'] ?? 'city') === 'region') {
                $result[$key] = null;
                continue;
            }

            // 2) Open-Meteo answers cached from earlier loads.
            $cached = Cache::get(self::cacheKey($place));

            if (is_array($cached)) {
                $result[$key] = isset($cached['lat'], $cached['lng'])
                    ? ['lat' => (float) $cached['lat'], 'lng' => (float) $cached['lng']]
                    : null;
                continue;
            }

            $pending[$key] = $place;
            $result[$key]  = null; // until resolved below
        }

        $pending = array_slice($pending, 0, self::MAX_LOOKUPS_PER_CALL, true);

        if ($pending === []) {
            return $result;
        }

        // Round 1 searches the cleaned name ("Ogun State" -> "Ogun", "Federal Capital Territory" -> "Abuja").
        // Round 2 retries the raw GA4 name for anything that came back empty.
        $answers = self::search($pending, false);
        $retry   = [];

        foreach ($pending as $key => $place) {
            if (($answers[$key] ?? null) === null) {
                continue; // transport failure: not cached, retried on the next load
            }

            $hit = self::pick($answers[$key], $place);

            if ($hit !== null) {
                Cache::forever(self::cacheKey($place), $hit);
                $result[$key] = $hit;
            } elseif (self::queryName($place) !== trim((string) $place['name'])) {
                $retry[$key] = $place;
            } else {
                Cache::put(self::cacheKey($place), ['miss' => true], now()->addDays(self::MISS_TTL_DAYS));
            }
        }

        if ($retry !== []) {
            $answers = self::search($retry, true);

            foreach ($retry as $key => $place) {
                if (($answers[$key] ?? null) === null) {
                    continue;
                }

                $hit = self::pick($answers[$key], $place);

                if ($hit !== null) {
                    Cache::forever(self::cacheKey($place), $hit);
                    $result[$key] = $hit;
                } else {
                    Cache::put(self::cacheKey($place), ['miss' => true], now()->addDays(self::MISS_TTL_DAYS));
                }
            }
        }

        return $result;
    }

    /**
     * Run one concurrent batch of searches.
     *
     * @param array<string, array<string, mixed>> $places
     * @return array<string, array<int, array<string, mixed>>|null> results per key; null = transport failure
     */
    private static function search(array $places, bool $rawName): array
    {
        $answers = [];

        try {
            $responses = Http::pool(function (Pool $pool) use ($places, $rawName) {
                $requests = [];

                foreach ($places as $key => $place) {
                    // Open-Meteo's documented filter is `countryCode`. (An earlier version sent
                    // `country_code`, which the API ignores, so "Lagos" could resolve to Portugal.)
                    // Results are also re-checked against their own country_code in pick().
                    $name  = $rawName ? trim((string) $place['name']) : self::queryName($place);
                    $query = ['name' => $name, 'count' => 20, 'language' => 'en', 'format' => 'json'];

                    if (self::validIso2($place['iso2'] ?? null)) {
                        $query['countryCode'] = strtoupper($place['iso2']);
                    }

                    $requests[] = $pool->as((string) $key)->timeout(6)->acceptJson()->get(self::ENDPOINT, $query);
                }

                return $requests;
            });
        } catch (\Throwable $e) {
            Log::warning('GeoCoder pool failed', ['error' => $e->getMessage()]);

            return array_fill_keys(array_keys($places), null);
        }

        $failures = 0;
        $firstError = null;

        foreach ($places as $key => $place) {
            $response = $responses[(string) $key] ?? null;

            // Connection errors (e.g. cURL 60 SSL, timeouts) come back as objects, not exceptions.
            // They are transient so they are not cached, but they must not be invisible.
            if (!$response instanceof Response || !$response->successful()) {
                $failures++;
                $firstError ??= $response instanceof \Throwable
                    ? $response->getMessage()
                    : ($response instanceof Response ? 'HTTP ' . $response->status() : 'no response');
                $answers[$key] = null;
                continue;
            }

            $answers[$key] = $response->json('results') ?? [];
        }

        if ($failures > 0) {
            Log::warning('GeoCoder lookups failed', [
                'failed' => $failures,
                'of'     => count($places),
                'first'  => $firstError,
            ]);
        }

        return $answers;
    }

    /** GA4 names that the geocoder only knows under another name. */
    private const ALIASES = [
        'federal capital territory' => 'Abuja',
    ];

    /**
     * Name to search for: known alias, else the GA4 name without generic suffixes
     * ("Ogun State" -> "Ogun"). Falls back to the raw name if stripping empties it.
     */
    private static function queryName(array $place): string
    {
        $raw = trim((string) $place['name']);

        // Cities are searched exactly as GA4 names them ("Free State Road" stays intact).
        if (($place['kind'] ?? 'city') !== 'region') {
            return $raw;
        }

        $alias = self::ALIASES[Str::lower(Str::ascii($raw))] ?? null;

        if ($alias !== null) {
            return $alias;
        }

        $clean = trim(preg_replace('/\b(state|province|region|county|prefecture|governorate|district)\b/i', '', $raw) ?? $raw);

        return $clean !== '' ? $clean : $raw;
    }

    /**
     * Choose the best geocoder result: prefer the one whose admin1 (state /
     * province) matches the GA4 region; for a region lookup prefer ADM1 features.
     *
     * @param array<int, array<string, mixed>> $results
     * @return array{lat: float, lng: float}|null
     */
    private static function pick(array $results, array $place): ?array
    {
        $results = array_values(array_filter(
            $results,
            static fn ($r) => is_array($r) && isset($r['latitude'], $r['longitude'])
        ));

        // Never accept a place outside the country GA4 reported it in.
        if (self::validIso2($place['iso2'] ?? null)) {
            $iso2    = strtolower($place['iso2']);
            $results = array_values(array_filter(
                $results,
                static fn ($r) => !isset($r['country_code']) || strtolower((string) $r['country_code']) === $iso2
            ));
        }

        if ($results === []) {
            return null;
        }

        $region = self::normalise($place['region'] ?? '');
        $kind   = $place['kind'] ?? 'city';

        // A region lookup must land on that region: either an ADM1 feature, or a place whose
        // admin1 is the region. Otherwise a same-named village elsewhere in the country wins
        // ("Ogun" the village in Delta instead of Ogun State). Better unlocated than mis-pinned:
        // the dashboard then pins the region from its located cities.
        if ($kind === 'region') {
            $expected = $region !== '' ? $region : self::normalise($place['name'] ?? '');

            // Aliased regions (Federal Capital Territory -> Abuja) are the one case where the
            // geocoder's own admin1 label can differ from GA4's, so accept the alias target by name.
            $aliasTarget = self::ALIASES[Str::lower(Str::ascii(trim((string) ($place['name'] ?? ''))))] ?? null;
            $aliasName   = $aliasTarget !== null ? self::normalise($aliasTarget) : null;

            $results = array_values(array_filter($results, static function ($r) use ($expected, $aliasName) {
                $admin1 = self::normalise($r['admin1'] ?? '');
                $isAdm1 = str_starts_with((string) ($r['feature_code'] ?? ''), 'ADM1');
                $named  = $expected !== '' && $admin1 !== ''
                    && ($admin1 === $expected || str_contains($admin1, $expected) || str_contains($expected, $admin1));
                // Alias targets are capitals (Federal Capital Territory -> Abuja), so require the
                // capital feature (PPLC). Open-Meteo labels this state "FCT", and a village also
                // called Abuja exists in Borno State.
                $alias  = $aliasName !== null
                    && self::normalise($r['name'] ?? '') === $aliasName
                    && ($r['feature_code'] ?? '') === 'PPLC';

                return $isAdm1 || $named || $alias;
            }));

            if ($results === []) {
                return null;
            }

            $region = $expected;
        }

        $best   = null;
        $bestScore = -1;

        foreach ($results as $index => $r) {
            $score = 0;
            $admin1 = self::normalise($r['admin1'] ?? '');

            if ($region !== '' && $admin1 !== '' && ($admin1 === $region || str_contains($admin1, $region) || str_contains($region, $admin1))) {
                $score += 10;
            }

            if ($kind === 'region' && str_starts_with((string) ($r['feature_code'] ?? ''), 'ADM1')) {
                $score += 5;
            }

            // Same-name candidates (Springfield, Hamilton...): prefer the bigger place, then the API's order.
            $score += log10(1 + max(0.0, (float) ($r['population'] ?? 0))) * 0.1;
            $score -= $index * 0.01;

            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $r;
            }
        }

        return ['lat' => (float) $best['latitude'], 'lng' => (float) $best['longitude']];
    }

    /**
     * Normalised lookup key shared by the importer and the lookups: ASCII, lower case,
     * punctuation collapsed. For regions the generic suffix words are dropped as well, so
     * GA4 "Ogun State" and GeoNames "Ogun" produce the same key.
     */
    public static function key(?string $value, bool $region = false): string
    {
        $v = Str::lower(Str::ascii(trim((string) $value)));
        $v = preg_replace('/[^a-z0-9]+/', ' ', $v) ?? $v;

        if ($region) {
            $v = preg_replace('/\b(state|province|region|county|prefecture|governorate)\b/', '', $v) ?? $v;
        }

        return mb_substr(trim(preg_replace('/\s+/', ' ', $v) ?? $v), 0, 100);
    }

    private static function normalise(?string $value): string
    {
        $value = Str::lower(Str::ascii(trim((string) $value)));

        return trim(preg_replace('/\b(state|province|region|county|prefecture|governorate)\b/', '', $value) ?? $value);
    }

    private static function validIso2(?string $code): bool
    {
        return $code !== null && preg_match('/^[A-Za-z]{2}$/', $code) === 1;
    }

    private static function cacheKey(array $place): string
    {
        return 'geocode:v7:' . md5(implode('|', [
            strtolower((string) ($place['kind'] ?? 'city')),
            strtolower((string) ($place['iso2'] ?? '')),
            self::normalise($place['region'] ?? ''),
            strtolower(trim((string) $place['name'])),
        ]));
    }
}
