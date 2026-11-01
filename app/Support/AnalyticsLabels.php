<?php

namespace App\Support;

/**
 * Central place for turning raw GA4 / stored dimension values into the labels
 * the dashboard shows. Used at ingestion (RefreshAnalyticsData), at display time
 * (dashboard services, export) and by the repair command, so every path agrees.
 */
final class AnalyticsLabels
{
    /** Values GA4 or the tracker emit when a dimension is missing. */
    private const BLANK = ['', '(not set)', 'not set', 'unknown', '(unknown)', 'null', 'n/a', 'undefined'];

    /** Alias => canonical stored asset_type. */
    private const ASSET_ALIASES = [
        'sermon_notes' => 'sermon_notes', 'sermon-notes' => 'sermon_notes',
        'sermon notes' => 'sermon_notes', 'notes' => 'sermon_notes',
        'blessing' => 'blessing', 'blessings' => 'blessing',
        'quote' => 'quote', 'quotes' => 'quote',
        'prophecy' => 'prophecy', 'prophecies' => 'prophecy',
    ];

    /** Canonical asset_type => display name. */
    private const ASSET_LABELS = [
        'sermon_notes' => 'Sermon Notes',
        'blessing'     => 'Blessings',
        'quote'        => 'Quotes',
        'prophecy'     => 'Prophecies',
    ];

    /**
     * Restrict a query builder to rows where $column holds a real value
     * (not NULL, not "", not "unknown" / "(not set)" / ...). $column is always
     * an internal column name, never user input.
     *
     * @template T
     * @param  T $query Eloquent or query builder
     * @return T
     */
    public static function whereNamed($query, string $column)
    {
        $blank = self::blankValues();
        $marks = implode(',', array_fill(0, count($blank), '?'));

        return $query
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->whereRaw("LOWER(TRIM({$column})) NOT IN ({$marks})", $blank);
    }

    /**
     * Mirror image of whereNamed(): rows where $column is NULL, "" or a
     * placeholder such as "unknown" / "(not set)". Used to count the downloads
     * that cannot be attributed to a service. $column is an internal column name.
     *
     * @template T
     * @param  T $query
     * @return T
     */
    public static function whereBlank($query, string $column)
    {
        $blank = self::blankValues();
        $marks = implode(',', array_fill(0, count($blank), '?'));

        return $query->where(function ($q) use ($column, $marks, $blank) {
            $q->whereNull($column)
                ->orWhere($column, '')
                ->orWhereRaw("LOWER(TRIM({$column})) IN ({$marks})", $blank);
        });
    }

    /** Canonical asset types the dashboard knows about, in display order. */
    public static function knownAssetTypes(): array
    {
        return array_keys(self::ASSET_LABELS);
    }

    /** Lower-cased "missing value" markers (without the empty string). */
    public static function blankValues(): array
    {
        return array_values(array_filter(self::BLANK, static fn (string $v) => $v !== ''));
    }

    /**
     * Every raw GA4 asset_type value that maps to $canonical (aliases + itself).
     * Used to build exact GA4 filters, so the live query and the local sync agree.
     *
     * @return string[]
     */
    public static function assetValuesFor(string $canonical): array
    {
        $values = [$canonical];

        foreach (self::ASSET_ALIASES as $alias => $target) {
            if ($target === $canonical) {
                $values[] = $alias;
            }
        }

        return array_values(array_unique($values));
    }

    /**
     * GA4 pagePath rules that identify $canonical when the asset_type dimension
     * is blank. Mirrors assetTypeFromPath(). Each rule is [matchType, value].
     *
     * @return array<int, array{0: string, 1: string}>
     */
    public static function assetPathRules(string $canonical): array
    {
        return match ($canonical) {
            'blessing'     => [['CONTAINS', '/blessings']],
            'quote'        => [['CONTAINS', '/quotes']],
            'prophecy'     => [['CONTAINS', '/prophecies']],
            'sermon_notes' => [['CONTAINS', '/sermon-notes'], ['FULL_REGEXP', '/sessions/[^/]+/?']],
            default        => [],
        };
    }

    /** "/sessions/{slug}/quotes" -> "{slug}". */
    public static function sessionSlugFromPath(?string $path): ?string
    {
        if ($path !== null && preg_match('#^/sessions/([^/?\#]+)#i', $path, $m)) {
            return strtolower(urldecode($m[1]));
        }

        return null;
    }

    public static function isBlank(mixed $value): bool
    {
        return in_array(strtolower(trim((string) $value)), self::BLANK, true);
    }

    public static function legacyLabel(): string
    {
        return (string) config('analytics.legacy_7dg.label', '7DG');
    }

    /** True when $date (Y-m-d) falls inside the configured 7DG window. */
    public static function inLegacyWindow(?string $date): bool
    {
        if (!$date) {
            return false;
        }

        $date = substr($date, 0, 10);

        return $date >= config('analytics.legacy_7dg.start', '2026-07-01')
            && $date <= config('analytics.legacy_7dg.end', '2026-07-07');
    }

    /**
     * Normalise a service_type / program / session value.
     * Blank values inside the 7DG window become "7DG"; elsewhere they stay NULL.
     */
    public static function normaliseDimension(mixed $value, ?string $date): ?string
    {
        if (!self::isBlank($value)) {
            return trim((string) $value);
        }

        return self::inLegacyWindow($date) ? self::legacyLabel() : null;
    }

    /** Canonical asset_type, or NULL when blank. */
    public static function canonicalAssetType(mixed $value): ?string
    {
        if (self::isBlank($value)) {
            return null;
        }

        $key = strtolower(trim((string) $value));

        return self::ASSET_ALIASES[$key] ?? $key;
    }

    /** Infer the asset type from the page the download button was clicked on. */
    public static function assetTypeFromPath(?string $path): ?string
    {
        $path = strtolower((string) $path);

        return match (true) {
            str_contains($path, '/blessings')    => 'blessing',
            str_contains($path, '/quotes')       => 'quote',
            str_contains($path, '/prophecies')   => 'prophecy',
            str_contains($path, '/sermon-notes') => 'sermon_notes',
            // A download straight from the session page is the sermon notes.
            (bool) preg_match('#^/sessions/[^/?]+/?(\?.*)?$#', $path) => 'sermon_notes',
            default => null,
        };
    }

    /** Human-friendly asset name; never "Unknown". */
    public static function assetLabel(mixed $value): string
    {
        $canonical = self::canonicalAssetType($value);

        if ($canonical === null) {
            return (string) config('analytics.asset_fallback_label', 'Uncategorised');
        }

        return self::ASSET_LABELS[$canonical] ?? ucwords(str_replace(['_', '-'], ' ', $canonical));
    }
}
