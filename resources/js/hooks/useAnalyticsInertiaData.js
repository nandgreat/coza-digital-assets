/**
 * ============================================================
 * Hook: useAnalyticsInertiaData
 * ============================================================
 *
 * Synchronizes deferred/partial Inertia analytics props into the existing
 * dashboard state shape. It performs no HTTP calls of its own.
 * ============================================================
 */

import { useEffect } from 'react';
import { isNamedLabel } from '@/utils/labels';

/**
 * Synchronize Inertia-delivered supplementary datasets into local state.
 *
 * @param {Object|null} props
 * @param {Object} setters
 * @returns {void}
 */
export function useAnalyticsInertiaData(props, setters) {
    useEffect(() => {
        if (!props) return;

        if (Object.prototype.hasOwnProperty.call(props, 'assetBreakdown')) {
            const payload = props.assetBreakdown ?? {};
            const rows = Array.isArray(payload.items) ? payload.items : [];
            const normalized = rows.map((row) => ({
                ...row,
                asset_type: row.asset_type || row.assetType || 'Unknown',
                eventCount: Number(row.eventCount ?? row.downloads ?? 0),
            }));
            const offset = Number(payload.offset ?? 0);
            setters.setAssetItems((previous) => (offset > 0 ? [...previous, ...normalized] : normalized));
            setters.setAssetOffset(offset);
            setters.setAssetHasMore(normalized.length === 10);
            setters.setAssetLoadingMore(false);
        }

        if (Object.prototype.hasOwnProperty.call(props, 'serviceBreakdown')) {
            const payload = props.serviceBreakdown ?? {};
            const rows = Array.isArray(payload.items) ? payload.items : [];
            // Blank service types are not services: never show them as "Unknown".
            const normalized = rows
                .map((row) => ({
                    ...row,
                    service_type: row.service_type || row.serviceType || '',
                    eventCount: Number(row.eventCount ?? row.downloads ?? 0),
                }))
                .filter((row) => isNamedLabel(row.service_type));
            const offset = Number(payload.offset ?? 0);
            setters.setServiceItems((previous) => (offset > 0 ? [...previous, ...normalized] : normalized));
            setters.setServiceOffset(offset);
            // Page size is judged on the raw page, not the filtered one.
            setters.setServiceHasMore(rows.length === 10);
            setters.setServiceLoadingMore(false);
        }

        if (Object.prototype.hasOwnProperty.call(props, 'sessionsPage')) {
            const payload = props.sessionsPage ?? {};
            const rows = Array.isArray(payload.data) ? payload.data : [];
            setters.setSessions(rows.map((row) => ({
                ...row,
                program: row.program || 'Unknown',
                session: row.session || 'Unknown',
                eventCount: Number(row.eventCount ?? row.downloads ?? 0),
            })));
            setters.setSessionsTotal(Number(payload.total ?? 0));
            setters.setSessionsOffset(Number(payload.offset ?? 0));
            setters.setSessionsLoading(false);
        }

        if (Object.prototype.hasOwnProperty.call(props, 'uniqueByAssetData')) {
            const rows = Array.isArray(props.uniqueByAssetData) ? props.uniqueByAssetData : [];
            setters.setUniqueByAsset(rows.map((row) => ({
                asset_type: row.asset_type || row.assetType || row.label || row.name || '',
                activeUsers: Number(row.activeUsers ?? row.active_users ?? row.uniqueUsers ?? row.users ?? row.count ?? 0),
            })).filter((row) => row.activeUsers > 0 && isNamedLabel(row.asset_type)));
            setters.setUniqueUsersLoading(false);
        }

        if (Object.prototype.hasOwnProperty.call(props, 'geoData')) {
            setters.setGeoData(props.geoData && typeof props.geoData === 'object' ? props.geoData : {});
            setters.setGeoLoading(false);
        }
    }, [props, setters]);
}
