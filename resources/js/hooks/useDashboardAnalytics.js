/**
 * ============================================================
 * Custom Hook: useDashboardAnalytics
 * ============================================================
 *
 * Orchestrates filter debouncing, compatibility state, async refresh polling,
 * and UI actions. Ordinary analytics reads now travel through Inertia props/
 * visits; Axios is isolated to operations intentionally retained as HTTP calls.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { router } from '@inertiajs/react';
import { useAnalyticsInertiaData } from '@/hooks/useAnalyticsInertiaData';
import { ANALYTICS_DASHBOARD_ROUTE } from '@/utils/analyticsRoutes';
import toast from 'react-hot-toast';
import { getDatePresetRange } from '@/utils/dateHelpers';
import { rememberPreset, seedDashboardFilters } from '@/utils/dashboardFilterSeed';
import { isNamedLabel } from '@/utils/labels';
import {
  postRefresh,
  getRefreshStatus,
  getExportUrl,
  postLogout,
} from '@/services/api';


/**
 * Custom hook for managing COZA Analytics dashboard state and API interactions.
 *
 * @param {Object|null} initialProps - Initial Inertia SSR page props
 * @returns {Object} Dashboard state objects and event action handlers
 */
export function useDashboardAnalytics(initialProps = null) {
  const initialData =
    initialProps?.analyticsDashboard ??
    (initialProps?.totalDownloads !== undefined || initialProps?.data?.totalDownloads !== undefined
      ? initialProps.data ?? initialProps
      : null);

  // Filter state starts from the filters the server actually applied (see dashboardFilterSeed.js),
  // not from "All Time", so a remount never highlights a preset that did not produce the data.
  const seededFilters = useRef(seedDashboardFilters(initialData)).current;

  // ─── Request Generation Counters (Race Guarding) ────────────────
  const dashboardGenRef = useRef(0);
  const breakdownAssetGenRef = useRef(0);
  const breakdownServiceGenRef = useRef(0);
  const sessionsGenRef = useRef(0);
  const uniqueGeoGenRef = useRef(0);
  const refreshTimerRef = useRef(null);
  const isMounted = useRef(false);

  // ─── Filter State ───────────────────────────────────────────────
  const [filterOptions, setFilterOptions] = useState({
    serviceTypes: [],
    programs: [],
  });

  const [activePreset, setActivePreset] = useState(seededFilters.activePreset);
  const [startDate, setStartDate] = useState(seededFilters.startDate);
  const [endDate, setEndDate] = useState(seededFilters.endDate);
  const [debouncedStartDate, setDebouncedStartDate] = useState(seededFilters.startDate);
  const [debouncedEndDate, setDebouncedEndDate] = useState(seededFilters.endDate);
  const [serviceType, setServiceType] = useState(seededFilters.serviceType);
  const [program, setProgram] = useState(seededFilters.program);

  // ─── Analytics Dataset States ──────────────────────────────────
  const [dashboardData, setDashboardData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState('idle');

  const [assetItems, setAssetItems] = useState([]);
  const [assetOffset, setAssetOffset] = useState(0);
  const [assetHasMore, setAssetHasMore] = useState(true);
  const [assetLoadingMore, setAssetLoadingMore] = useState(false);

  const [serviceItems, setServiceItems] = useState([]);
  const [serviceOffset, setServiceOffset] = useState(0);
  const [serviceHasMore, setServiceHasMore] = useState(true);
  const [serviceLoadingMore, setServiceLoadingMore] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [sessionsOffset, setSessionsOffset] = useState(0);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  // `sessionsPage` is a deferred Inertia prop, like `uniqueByAssetData` / `geoData` below: it is absent
  // from the first page payload and arrives in a follow-up request. Until it does (and again on every
  // filter visit) the Top Sessions table must show its skeleton. This used to start as `false` and was
  // only switched on by the Previous/Next pager, so the skeleton never appeared on load or filter change.
  const [sessionsLoading, setSessionsLoading] = useState(
    () => !Object.prototype.hasOwnProperty.call(initialProps ?? {}, 'sessionsPage')
  );
  const sessionsLimit = 10;

  const [uniqueUsersData, setUniqueUsersData] = useState([]);
  const [uniqueByAsset, setUniqueByAsset] = useState([]);
  const [geoData, setGeoData] = useState({});
  // `uniqueByAssetData` is a deferred Inertia prop: it is absent from the first page payload and
  // arrives in a follow-up request. Until it does (and again on every filter visit) the Unique Users
  // cards must show their skeletons. This used to start as `!initialData`, which is false whenever the
  // main dashboard payload is present, so the skeletons never appeared.
  const [uniqueUsersLoading, setUniqueUsersLoading] = useState(
    () => !Object.prototype.hasOwnProperty.call(initialProps ?? {}, 'uniqueByAssetData')
  );
  // Same deferred-prop pattern as `uniqueByAssetData` above, for `geoData`.
  const [geoLoading, setGeoLoading] = useState(
    () => !Object.prototype.hasOwnProperty.call(initialProps ?? {}, 'geoData')
  );

  // Never leave a skeleton up forever if a deferred request is lost.
  useEffect(() => {
    if (!uniqueUsersLoading) return undefined;

    const timer = setTimeout(() => setUniqueUsersLoading(false), 60000);

    return () => clearTimeout(timer);
  }, [uniqueUsersLoading]);

  useEffect(() => {
    if (!geoLoading) return undefined;

    const timer = setTimeout(() => setGeoLoading(false), 60000);

    return () => clearTimeout(timer);
  }, [geoLoading]);

  useEffect(() => {
    if (!sessionsLoading) return undefined;

    const timer = setTimeout(() => setSessionsLoading(false), 60000);

    return () => clearTimeout(timer);
  }, [sessionsLoading]);

  // ─── Debounce Filter Parameters ────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStartDate(startDate);
      setDebouncedEndDate(endDate);
    }, 400);

    return () => clearTimeout(timer);
  }, [startDate, endDate]);

  const buildParams = useCallback(() => {
    const params = {
      start_date: debouncedStartDate,
      end_date: debouncedEndDate,
    };
    if (serviceType) params.service_type = serviceType;
    if (program) params.program = program;
    return params;
  }, [debouncedStartDate, debouncedEndDate, serviceType, program]);

  // ─── Data Normalization ─────────────────────────────────────────
  const targetData = dashboardData?.data ?? dashboardData ?? {};
  const normalizedDashboardData =
    targetData && Object.keys(targetData).length > 0
      ? {
          ...targetData,
          totalDownloads: Number(targetData.totalDownloads ?? targetData.total_downloads ?? 0),
          totalUniqueUsers: Number(targetData.totalUniqueUsers ?? targetData.total_unique_users ?? 0),
          totalChange: Number(targetData.totalChange ?? targetData.total_change ?? 0),
          totalPercent: Number(targetData.totalPercent ?? targetData.total_percent ?? 0),
          assetTotalCount: Number(targetData.assetTotalCount ?? targetData.asset_total_count ?? 0),
          serviceTotalCount: Number(targetData.serviceTotalCount ?? targetData.service_total_count ?? 0),

          dailyTrend: Array.isArray(targetData.dailyTrend ?? targetData.daily_trend)
            ? (targetData.dailyTrend ?? targetData.daily_trend).map((row) => ({
                ...row,
                eventCount: Number(row.eventCount ?? row.downloads ?? 0),
              }))
            : [],

          dailyUniqueUsers: Array.isArray(targetData.dailyUniqueUsers ?? targetData.daily_unique_users)
            ? (targetData.dailyUniqueUsers ?? targetData.daily_unique_users).map((row) => ({
                ...row,
                uniqueUsers: Number(row.uniqueUsers ?? row.unique_users ?? 0),
              }))
            : [],

          byAssetType: Array.isArray(targetData.byAssetType ?? targetData.by_asset_type)
            ? (targetData.byAssetType ?? targetData.by_asset_type).map((row) => ({
                ...row,
                asset_type: row.asset_type || row.assetType || 'Unknown',
                eventCount: Number(row.eventCount ?? row.downloads ?? 0),
              }))
            : [],

          // A blank service type is not a service: drop it rather than label it "Unknown".
          byServiceType: Array.isArray(targetData.byServiceType ?? targetData.by_service_type)
            ? (targetData.byServiceType ?? targetData.by_service_type)
                .map((row) => ({
                  ...row,
                  service_type: row.service_type || row.serviceType || '',
                  eventCount: Number(row.eventCount ?? row.downloads ?? 0),
                }))
                .filter((row) => isNamedLabel(row.service_type))
            : [],

          topSessions: Array.isArray(targetData.topSessions ?? targetData.top_sessions)
            ? (targetData.topSessions ?? targetData.top_sessions).map((row) => ({
                ...row,
                program: row.program || 'Unknown',
                session: row.session || 'Unknown',
                eventCount: Number(row.eventCount ?? row.downloads ?? 0),
              }))
            : [],
        }
      : null;

  const totalUniqueUsers = Number(normalizedDashboardData?.totalUniqueUsers ?? 0);
  const dashboardIsEmpty = Boolean(normalizedDashboardData) && normalizedDashboardData.totalDownloads === 0;

  // ─── API Fetch Handlers with Race Guarding ──────────────────────
  /**
   * Request the dashboard through the canonical Inertia page route.
   *
   * Partial reloads keep the visit focused on the dashboard and filter props.
   * The existing analytics JSON endpoint therefore remains available without
   * being part of ordinary React dashboard reads.
   *
   * @param {Object} params
   * @returns {void}
   */
  const visitDashboard = useCallback((params) => {
    router.get(ANALYTICS_DASHBOARD_ROUTE, params, {
      only: [
        'analyticsDashboard',
        'analyticsFilters',
        'assetBreakdown',
        'serviceBreakdown',
        'sessionsPage',
        'uniqueByAssetData',
        'geoData',
      ],
      preserveState: true,
      preserveScroll: true,
      replace: true,
      onStart: () => {
        setLoading(true);
        // Cleared by useAnalyticsInertiaData once the new `uniqueByAssetData` / `geoData` / `sessionsPage` are applied.
        setUniqueUsersLoading(true);
        setGeoLoading(true);
        setSessionsLoading(true);
      },
      onError: () => {
        setUniqueUsersLoading(false);
        setGeoLoading(false);
        setSessionsLoading(false);
        toast.error('Failed to load dashboard data.');
      },
      onFinish: () => setLoading(false),
    });
  }, []);

  const resetPaginatedState = useCallback(() => {
    setAssetOffset(0);
    setAssetItems([]);
    setAssetHasMore(true);

    setServiceOffset(0);
    setServiceItems([]);
    setServiceHasMore(true);

    setSessions([]);
    setSessionsOffset(0);
    setSessionsTotal(0);
  }, []);

  // ─── Inertia Supplementary Visits ──────────────────────────────
  /**
   * Request a paginated breakdown through the canonical analytics page route.
   *
   * @param {'asset'|'service'} type
   * @param {number} offset
   * @returns {void}
   */
  const visitBreakdown = useCallback((type, offset = 0) => {
    const prop = type === 'asset' ? 'assetBreakdown' : 'serviceBreakdown';

    router.get(ANALYTICS_DASHBOARD_ROUTE, {
      ...buildParams(),
      ...(type === 'asset' ? { asset_offset: offset } : { service_offset: offset }),
    }, {
      only: [prop],
      preserveState: true,
      preserveScroll: true,
      replace: true,
      onStart: () => type === 'asset' ? setAssetLoadingMore(true) : setServiceLoadingMore(true),
      onError: () => toast.error(`Failed to load ${type} breakdown.`),
      onFinish: () => type === 'asset' ? setAssetLoadingMore(false) : setServiceLoadingMore(false),
    });
  }, [buildParams]);

  /**
   * Request the next/previous sessions page through the canonical analytics page route.
   *
   * @param {number} offset
   * @returns {void}
   */
  const visitSessions = useCallback((offset = 0) => {
    router.get(ANALYTICS_DASHBOARD_ROUTE, {
      ...buildParams(),
      sessions_offset: offset,
      sessions_limit: sessionsLimit,
    }, {
      only: ['sessionsPage'],
      preserveState: true,
      preserveScroll: true,
      replace: true,
      onStart: () => setSessionsLoading(true),
      onError: () => toast.error('Failed to load sessions.'),
      onFinish: () => setSessionsLoading(false),
    });
  }, [buildParams]);

  // ─── Inertia Supplementary Dataset Synchronization ─────────────
  const inertiaSetters = useMemo(() => ({
    setAssetItems,
    setAssetOffset,
    setAssetHasMore,
    setAssetLoadingMore,
    setServiceItems,
    setServiceOffset,
    setServiceHasMore,
    setServiceLoadingMore,
    setSessions,
    setSessionsTotal,
    setSessionsOffset,
    setSessionsLoading,
    setUniqueByAsset,
    setUniqueUsersLoading,
    setGeoData,
    setGeoLoading,
  }), []);

  useAnalyticsInertiaData(initialProps, inertiaSetters);

  // ─── Polling Routines & Actions ───────────────────────────────
  const stopRefreshPolling = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const pollRefreshStatus = useCallback(async () => {
    stopRefreshPolling();
    let attempts = 0;
    const maxAttempts = 30;

    const checkStatus = async () => {
      attempts += 1;
      try {
        const res = await getRefreshStatus(buildParams());
        const status = res?.data?.status ?? 'idle';
        setRefreshStatus(status);

        if (status === 'done') {
          stopRefreshPolling();
          setRefreshing(false);
          toast.success('Analytics data refreshed successfully.');
          router.reload({
            only: [
              'analyticsDashboard',
              'analyticsFilters',
              'assetBreakdown',
              'serviceBreakdown',
              'sessionsPage',
              'uniqueByAssetData',
              'geoData',
            ],
            preserveState: true,
            preserveScroll: true,
          });
          window.setTimeout(() => setRefreshStatus('idle'), 3000);
          return;
        }

        if (status === 'failed') {
          stopRefreshPolling();
          setRefreshing(false);
          toast.error(res?.data?.message || 'Analytics refresh failed.');
          return;
        }

        if (status !== 'in_progress' || attempts >= maxAttempts) {
          stopRefreshPolling();
          setRefreshing(false);
          setRefreshStatus('idle');
          if (attempts >= maxAttempts) toast.error('Analytics refresh timed out.');
          return;
        }

        refreshTimerRef.current = window.setTimeout(checkStatus, 2000);
      } catch (error) {
        stopRefreshPolling();
        setRefreshing(false);
        setRefreshStatus('idle');
        toast.error('Error checking analytics refresh status.');
      }
    };

    await checkStatus();
  }, [buildParams, stopRefreshPolling, visitDashboard]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    stopRefreshPolling();
    setRefreshing(true);
    setRefreshStatus('in_progress');

    try {
      await postRefresh(buildParams());
      toast.success('Refresh started. Updating analytics data…');
      await pollRefreshStatus();
    } catch (error) {
      setRefreshing(false);
      setRefreshStatus('idle');
      if (error?.response?.status === 409) {
        toast.error('A refresh operation is already in progress.');
      } else {
        toast.error('Failed to start analytics refresh.');
      }
    }
  }, [buildParams, pollRefreshStatus, refreshing, stopRefreshPolling]);

  const handleApplyPreset = useCallback((presetKey) => {
    const range = getDatePresetRange(presetKey);
    rememberPreset(presetKey, range.startDate, range.endDate);
    setActivePreset(presetKey);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }, []);

  const handleStartDateChange = useCallback(
    (newStartDate) => {
      if (endDate && new Date(newStartDate) > new Date(endDate)) {
        toast.error('Start date cannot be after the end date.');
        setEndDate(newStartDate);
      }
      setActivePreset('custom');
      setStartDate(newStartDate);
    },
    [endDate]
  );

  const handleEndDateChange = useCallback(
    (newEndDate) => {
      if (startDate && new Date(newEndDate) < new Date(startDate)) {
        toast.error('End date cannot be before the start date.');
        setStartDate(newEndDate);
      }
      setActivePreset('custom');
      setEndDate(newEndDate);
    },
    [startDate]
  );

  const loadMoreAsset = useCallback(() => {
    const next = assetOffset + 10;
    visitBreakdown('asset', next);
  }, [assetOffset, visitBreakdown]);

  const loadMoreService = useCallback(() => {
    const next = serviceOffset + 10;
    visitBreakdown('service', next);
  }, [serviceOffset, visitBreakdown]);

  const handlePreviousPage = useCallback(() => {
    const newOffset = Math.max(0, sessionsOffset - sessionsLimit);
    visitSessions(newOffset);
  }, [sessionsOffset, sessionsLimit, visitSessions]);

  const handleNextPage = useCallback(() => {
    const newOffset = sessionsOffset + sessionsLimit;
    if (newOffset < sessionsTotal) visitSessions(newOffset);
  }, [sessionsOffset, sessionsTotal, sessionsLimit, visitSessions]);

  const handleExport = useCallback(() => {
    window.open(getExportUrl(buildParams()), '_blank', 'noopener,noreferrer');
  }, [buildParams]);

  const handleLogout = useCallback(async () => {
    try {
      await postLogout();
      window.location.href = '/analytics/login';
    } catch (error) {
      toast.error('Logout failed.');
    }
  }, []);

  // ─── Lifecycle Operations ──────────────────────────────────────
  /**
   * Synchronize the canonical Inertia dashboard/filter props into the existing
   * local state shape consumed by the widgets.
   */
  useEffect(() => {
    const nextDashboard = initialProps?.analyticsDashboard;
    const nextFilters = initialProps?.analyticsFilters;

    if (nextDashboard && typeof nextDashboard === 'object') {
      setDashboardData(nextDashboard);
      const rawUniqueTrend = nextDashboard.dailyUniqueUsers ?? nextDashboard.daily_unique_users ?? [];
      if (Array.isArray(rawUniqueTrend)) {
        setUniqueUsersData(rawUniqueTrend.map((row) => ({
          ...row,
          uniqueUsers: Number(row.uniqueUsers ?? row.unique_users ?? 0),
        })));
      }
      setLoading(false);
    }

    if (nextFilters && typeof nextFilters === 'object') {
      setFilterOptions({
        serviceTypes: Array.isArray(nextFilters.serviceTypes) ? nextFilters.serviceTypes : [],
        programs: Array.isArray(nextFilters.programs) ? nextFilters.programs : [],
      });
    }
  }, [initialProps?.analyticsDashboard, initialProps?.analyticsFilters]);

  /**
   * Filter changes use a same-page Inertia visit. The requested dashboard and
   * supplementary props are merged into the current page without Axios.
   */
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    visitDashboard(buildParams());
  }, [debouncedStartDate, debouncedEndDate, serviceType, program, buildParams, visitDashboard]);

  useEffect(() => {
    return () => stopRefreshPolling();
  }, [stopRefreshPolling]);

  return {
    state: {
      dashboardData,
      normalizedDashboardData,
      totalUniqueUsers,
      dashboardIsEmpty,
      loading,
      refreshing,
      refreshStatus,
      filterOptions,
      activePreset,
      startDate,
      endDate,
      debouncedStartDate,
      debouncedEndDate,
      serviceType,
      program,
      assetItems,
      assetHasMore,
      assetLoadingMore,
      serviceItems,
      serviceHasMore,
      serviceLoadingMore,
      sessions,
      sessionsOffset,
      sessionsTotal,
      sessionsLimit,
      sessionsLoading,
      uniqueUsersData,
      uniqueByAsset,
      geoData,
      uniqueUsersLoading,
      geoLoading,
    },
    actions: {
      setServiceType,
      setProgram,
      handleApplyPreset,
      handleStartDateChange,
      handleEndDateChange,
      handleRefresh,
      loadMoreAsset,
      loadMoreService,
      handlePreviousPage,
      handleNextPage,
      handleExport,
      handleLogout,
    },
  };
}