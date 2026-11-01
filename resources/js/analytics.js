/**
 * ============================================================
 * Google Analytics 4 Tracking – COZA Digital Assets
 * ============================================================
 *
 * This module provides functions to send GA4 events for asset
 * downloads and shares. It gracefully handles cases where GA4
 * is not loaded (e.g., ad blockers, missing measurement ID).
 *
 * All custom dimensions use application-level names (asset_type,
 * service_type, program, session). The backend normalizes these
 * to `customEvent:` format for GA4 reporting.
 * ============================================================
 */

import { cleanParam } from './utils/labels.js';

/**
 * Drop params that are blank or placeholder strings. A missing dimension is
 * left out of the event (GA4 reports it as "(not set)", which the backend can
 * recover from the page path) instead of being sent as the literal 'unknown'.
 */
function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => cleanParam(value) !== undefined)
  );
}

/**
 * Send a Google Analytics 4 event, if GA is loaded.
 *
 * This function safely checks for the presence of the `gtag`
 * function before sending the event. If GA4 is blocked or not
 * loaded, the event is silently ignored.
 *
 * @param {string} name - The event name (e.g., 'asset_download').
 * @param {Object} params - Event parameters (e.g., { asset_type: 'sermon_notes' }).
 * @returns {void}
 */
export function trackEvent(name, params = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  if (typeof window.gtag === 'function') {
    try {
      window.gtag('event', name, params);
    } catch (error) {
      // Silently fail – tracking should never break the UI.
      console.debug('GA4 event failed:', error);
    }
  }
}

/**
 * Track an asset download event.
 *
 * This function sends the `asset_download` event with all relevant
 * custom dimensions. The parameters must match the custom dimensions
 * registered in GA4.
 *
 * @param {Object} options - Download tracking options.
 * @param {string} options.assetType - Asset category (sermon_notes, blessing, quote, prophecy).
 * @param {string} [options.assetTitle] - Optional descriptive title of the asset.
 * @param {string} options.serviceType - Service type (e.g., 'COZA Sundays', '7DG').
 * @param {string} options.program - Program name (e.g., 'Sunday Services 2026').
 * @param {string} options.session - Session title (e.g., 'Evening Service • Jul 28').
 * @returns {void}
 *
 * @example
 * trackDownload({
 *   assetType: 'sermon_notes',
 *   assetTitle: 'Sunday Service Notes',
 *   serviceType: 'COZA Sundays',
 *   program: 'Sunday Services 2026',
 *   session: 'Evening Service • Jul 28',
 * });
 */
export function trackDownload({
  assetType,
  assetTitle,
  serviceType,
  program,
  session,
}) {
  // Guard against missing required parameters.
  if (!assetType) {
    console.warn('trackDownload: assetType is required.');
  }

  trackEvent('asset_download', compactParams({
    asset_type: assetType,
    asset_title: assetTitle,
    service_type: serviceType,
    program,
    session,
  }));
}

/**
 * Track an asset share event.
 *
 * @param {Object} options - Share tracking options.
 * @param {string} options.assetType - Asset category.
 * @param {string} [options.assetTitle] - Optional descriptive title.
 * @param {string} options.serviceType - Service type.
 * @param {string} options.program - Program name.
 * @param {string} options.session - Session title.
 * @param {('image'|'link'|'copy')} options.method - How the asset was shared.
 * @returns {void}
 *
 * @example
 * trackShare({
 *   assetType: 'blessing',
 *   serviceType: 'COZA Sundays',
 *   program: 'Sunday Services 2026',
 *   session: 'Evening Service • Jul 28',
 *   method: 'image',
 * });
 */
export function trackShare({
  assetType,
  assetTitle,
  serviceType,
  program,
  session,
  method,
}) {
  if (!assetType) {
    console.warn('trackShare: assetType is required.');
  }

  trackEvent('asset_share', compactParams({
    asset_type: assetType,
    asset_title: assetTitle,
    service_type: serviceType,
    program,
    session,
    share_method: method,
  }));
}