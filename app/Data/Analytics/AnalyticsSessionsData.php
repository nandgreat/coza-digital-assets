<?php

namespace App\Data\Analytics;

/**
 * ============================================================
 * DTO: AnalyticsSessionsData
 * ============================================================
 *
 * Canonical paginated session table contract.
 */
final readonly class AnalyticsSessionsData
{
    /**
     * @param array<int, array<string, mixed>> $data
     * @param int $total
     * @param int $offset
     * @param int $limit
     */
    public function __construct(
        public array $data,
        public int $total,
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
            'data'   => array_values($this->data),
            'total'  => $this->total,
            'offset' => $this->offset,
            'limit'  => $this->limit,
        ];
    }
}
