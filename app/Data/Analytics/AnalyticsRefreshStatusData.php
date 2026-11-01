<?php

namespace App\Data\Analytics;

/**
 * ============================================================
 * DTO: AnalyticsRefreshStatusData
 * ============================================================
 *
 * Transport-neutral representation of the asynchronous refresh state.
 */
final readonly class AnalyticsRefreshStatusData
{
    /**
     * @param string $status idle|in_progress|refreshing|done|failed
     * @param string|null $message Optional human-readable status message.
     * @param array<string, mixed>|null $data Optional refreshed dashboard data.
     */
    public function __construct(
        public string $status,
        public ?string $message = null,
        public ?array $data = null,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return array_filter([
            'status'  => $this->status,
            'message' => $this->message,
            'data'    => $this->data,
        ], static fn ($value) => $value !== null);
    }
}
