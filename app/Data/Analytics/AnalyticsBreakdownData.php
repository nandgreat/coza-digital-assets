<?php

namespace App\Data\Analytics;

/**
 * ============================================================
 * DTO: AnalyticsBreakdownData
 * ============================================================
 *
 * Canonical paginated breakdown contract for asset/service analytics.
 */
final readonly class AnalyticsBreakdownData
{
    /**
     * @param array<int, array<string, mixed>> $items
     * @param int $offset
     * @param int $limit
     */
    public function __construct(
        public array $items,
        public int $offset,
        public int $limit,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'items'  => array_values($this->items),
            'offset' => $this->offset,
            'limit'  => $this->limit,
        ];
    }
}
