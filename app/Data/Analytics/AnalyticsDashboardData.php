<?php

namespace App\Data\Analytics;

/**
 * ============================================================
 * DTO: AnalyticsDashboardData
 * ============================================================
 *
 * Canonical dashboard aggregate contract shared by the Analytics service,
 * Inertia page props and legacy JSON consumers. The DTO intentionally preserves
 * the existing frontend field names so the refactor does not force a widget
 * rewrite or a backend persistence change.
 */
final readonly class AnalyticsDashboardData
{
    /**
     * Create a normalized dashboard data contract.
     *
     * @param array<string, mixed> $data Existing dashboard aggregate payload.
     */
    public function __construct(private array $data)
    {
    }

    /**
     * Convert the contract into the existing dashboard payload shape.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'totalDownloads'    => (int) ($this->data['totalDownloads'] ?? 0),
            'totalUniqueUsers'  => (int) ($this->data['totalUniqueUsers'] ?? 0),
            'dailyUniqueUsers'  => array_values($this->data['dailyUniqueUsers'] ?? []),
            'byAssetType'       => array_values($this->data['byAssetType'] ?? []),
            'byServiceType'     => array_values($this->data['byServiceType'] ?? []),
            'dailyTrend'        => array_values($this->data['dailyTrend'] ?? []),
            'topSessions'       => array_values($this->data['topSessions'] ?? []),
            'uniqueByAsset'     => array_values($this->data['uniqueByAsset'] ?? []),
            'geoData'           => is_array($this->data['geoData'] ?? null)
                ? $this->data['geoData']
                : [],
            'filters'           => is_array($this->data['filters'] ?? null)
                ? $this->data['filters']
                : [],
            'totalChange'       => (int) ($this->data['totalChange'] ?? 0),
            'totalPercent'      => (float) ($this->data['totalPercent'] ?? 0),
            'assetTotalCount'   => (int) ($this->data['assetTotalCount'] ?? 0),
            'serviceTotalCount' => (int) ($this->data['serviceTotalCount'] ?? 0),
            'unattributedDownloads' => (int) ($this->data['unattributedDownloads'] ?? 0),
        ];
    }
}
