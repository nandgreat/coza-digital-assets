/**
 * ============================================================
 * Custom Hook: useAnalyticsRefresh
 * ============================================================
 *
 * Encapsulates the asynchronous analytics refresh lifecycle so the main
 * dashboard hook remains focused on filter state and dataset orchestration.
 *
 * Transport design:
 * - Dashboard/filter reads use Inertia.
 * - Refresh start/status use native fetch because the existing Laravel refresh
 *   endpoints intentionally return JSON while the queue job is running.
 * - The underlying RefreshAnalyticsData job remains untouched.
 */

import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  getExportUrl,
  getRefreshStatus,
  postLogout,
  postRefresh,
} from '@/services/api';

/**
 * Coordinate analytics refresh, status polling, export and logout actions.
 *
 * @param {Object} options Hook configuration.
 * @param {Function} options.buildParams Returns current dashboard query params.
 * @param {boolean} options.refreshing Current refresh state.
 * @param {Function} options.setRefreshing React state setter.
 * @param {Function} options.setRefreshStatus React state setter.
 * @param {Function} options.onRefreshComplete Optional callback after refresh completes.
 * @returns {Object} Refresh state actions.
 */
export function useAnalyticsRefresh({
  buildParams,
  refreshing,
  setRefreshing,
  setRefreshStatus,
  onRefreshComplete,
}) {
  const refreshTimerRef = useRef(null);

  /**
   * Stop the active refresh-status polling timer.
   *
   * @returns {void}
   */
  const stopRefreshPolling = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  /**
   * Poll the server until the existing queue refresh completes or fails.
   *
   * @returns {Promise<void>}
   */
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
          onRefreshComplete?.();
          window.setTimeout(() => setRefreshStatus('idle'), 3000);
          return;
        }

        if (status === 'failed') {
          stopRefreshPolling();
          setRefreshing(false);
          setRefreshStatus('idle');
          toast.error(res?.data?.message || 'Analytics refresh failed.');
          return;
        }

        if (status !== 'in_progress' || attempts >= maxAttempts) {
          stopRefreshPolling();
          setRefreshing(false);
          setRefreshStatus('idle');

          if (attempts >= maxAttempts) {
            toast.error('Analytics refresh timed out.');
          }

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
  }, [buildParams, onRefreshComplete, setRefreshStatus, setRefreshing, stopRefreshPolling]);

  /**
   * Start the existing asynchronous analytics refresh job.
   *
   * @returns {Promise<void>}
   */
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
  }, [buildParams, pollRefreshStatus, refreshing, setRefreshStatus, setRefreshing, stopRefreshPolling]);

  /**
   * Open the current dashboard export in a new browser tab.
   *
   * @returns {void}
   */
  const handleExport = useCallback(() => {
    window.open(getExportUrl(buildParams()), '_blank', 'noopener,noreferrer');
  }, [buildParams]);

  /**
   * Log out the analytics session and return to the login screen.
   *
   * @returns {Promise<void>}
   */
  const handleLogout = useCallback(async () => {
    try {
      await postLogout();
      window.location.href = '/analytics/login';
    } catch (error) {
      toast.error('Logout failed.');
    }
  }, []);

  /**
   * Stop polling whenever the dashboard component unmounts.
   */
  useEffect(() => () => stopRefreshPolling(), [stopRefreshPolling]);

  return {
    handleRefresh,
    handleExport,
    handleLogout,
  };
}
