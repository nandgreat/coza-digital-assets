<?php

namespace App\Data\Analytics;

use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * ============================================================
 * DTO: AnalyticsFiltersData
 * ============================================================
 *
 * Canonical server-side representation of the filters accepted by the
 * analytics dashboard. Keeping this contract independent of the HTTP Request
 * means controllers, services, exports and Inertia payload builders all use
 * the same normalized values.
 */
final readonly class AnalyticsFiltersData
{
    /**
     * The dashboard's "All Time" baseline start date.
     *
     * BUG FIX: this must stay in lockstep with `getDefaultDateRange()` in
     * `resources/js/utils/dateHelpers.js` (frontend `DATE_PRESETS` key
     * `'default'` / label "All Time"). Previously `fromRequest()` fell back
     * to `now()->subDays(30)` when no `start_date` was supplied, while the
     * frontend's own default state — shown as the active "All Time" preset
     * in FilterBar before any request round-trip — assumed this fixed
     * baseline. On first page load (and on every hard refresh), Inertia's
     * initial props come from exactly that no-params server request, so the
     * KPI cards silently rendered a rolling 30-day figure while the UI
     * displayed "All Time" as selected. Selecting *any* preset — including
     * re-selecting "All Time" — always sent explicit `start_date`/`end_date`
     * query params and therefore self-corrected, which is why the mismatch
     * only ever showed up right after a fresh load.
     *
     * Keeping the two defaults defined by the same literal value (rather
     * than, say, the frontend calling an endpoint for it) is intentional
     * for now to avoid a larger contract change — but if this baseline
     * date ever needs to move, it must be updated in both places.
     */
    private const DEFAULT_START_DATE = '2026-07-03';

    /**
     * Create a normalized analytics filter DTO.
     *
     * @param string $startDate Inclusive start date (YYYY-MM-DD).
     * @param string $endDate Inclusive end date (YYYY-MM-DD).
     * @param string|null $serviceType Optional service type filter.
     * @param string|null $program Optional program filter.
     */
    public function __construct(
        public string $startDate,
        public string $endDate,
        public ?string $serviceType = null,
        public ?string $program = null,
    ) {
        if ($this->startDate > $this->endDate) {
            throw new \InvalidArgumentException(
                'The start date cannot be later than the end date.'
            );
        }
    }

    /**
     * Build the DTO from an incoming dashboard request.
     *
     * @param Request $request
     * @return self
     */
    public static function fromRequest(Request $request): self
    {
        $start = Carbon::parse(
            $request->input('start_date', self::DEFAULT_START_DATE)
        )->toDateString();

        $end = Carbon::parse(
            $request->input('end_date', now()->toDateString())
        )->toDateString();

        return new self(
            $start,
            $end,
            self::nullableString($request->input('service_type')),
            self::nullableString($request->input('program')),
        );
    }

    /**
     * Return query-string-compatible values for Inertia visits and downloads.
     *
     * Empty optional filters are omitted to keep URLs canonical.
     *
     * @return array<string, string>
     */
    public function toQueryParams(): array
    {
        return array_filter([
            'start_date'   => $this->startDate,
            'end_date'     => $this->endDate,
            'service_type' => $this->serviceType,
            'program'      => $this->program,
        ], static fn ($value) => $value !== null && $value !== '');
    }

    /**
     * Return a stable array representation for transport/storage.
     *
     * @return array<string, string|null>
     */
    public function toArray(): array
    {
        return [
            'start_date'   => $this->startDate,
            'end_date'     => $this->endDate,
            'service_type' => $this->serviceType,
            'program'      => $this->program,
        ];
    }

    /**
     * Normalize an optional request value to either a string or null.
     *
     * @param mixed $value
     * @return string|null
     */
    private static function nullableString(mixed $value): ?string
    {
        $value = trim((string) $value);

        return $value !== '' ? $value : null;
    }
}
