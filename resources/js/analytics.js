/**
 * Send a Google Analytics 4 event, if GA is loaded.
 * No-ops when GA_MEASUREMENT_ID isn't configured (window.gtag absent).
 */
export function trackEvent(name, params = {}) {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', name, params);
    }
}

/**
 * Track an asset download. `assetType` is the category
 * (sermon_notes | blessing | quote | prophecy).
 */
export function trackDownload({ assetType, assetTitle, serviceType, program, session }) {
    trackEvent('asset_download', {
        asset_type: assetType,
        asset_title: assetTitle,
        service_type: serviceType,
        program,
        session,
    });
}

/**
 * Track an asset share. `method` is how it was shared
 * (image | link | copy).
 */
export function trackShare({ assetType, assetTitle, serviceType, program, session, method }) {
    trackEvent('asset_share', {
        asset_type: assetType,
        asset_title: assetTitle,
        service_type: serviceType,
        program,
        session,
        share_method: method,
    });
}
