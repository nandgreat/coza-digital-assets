<?php

namespace App\Data\Analytics;

/**
 * ============================================================
 * DTO: AnalyticsFilterOptionsData
 * ============================================================
 *
 * Canonical filter-option contract shared by the Inertia dashboard and
 * compatibility JSON consumers. Keeping this payload typed prevents the
 * controller from owning reporting queries or response-shape decisions.
 */
final readonly class AnalyticsFilterOptionsData
{
    /**
     * @param array<int, string> $serviceTypes
     * @param array<int, string> $programs
     */
    public function __construct(
        public array $serviceTypes,
        public array $programs,
    ) {
    }

    /**
     * Convert the contract to the stable frontend payload shape.
     *
     * @return array{serviceTypes: array<int, string>, programs: array<int, string>}
     */
    public function toArray(): array
    {
        return [
            'serviceTypes' => array_values($this->serviceTypes),
            'programs'     => array_values($this->programs),
        ];
    }
}
