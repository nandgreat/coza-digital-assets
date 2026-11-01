/**
 * ============================================================
 * Bulk Image Download Utility – COZA Digital Assets
 * ============================================================
 *
 * This module provides a robust utility for downloading multiple
 * images sequentially. It includes:
 * - MIME‑type detection for proper file extensions.
 * - Content‑Disposition parsing for server-provided filenames.
 * - Progress tracking for UI feedback.
 * - Integrated GA4 tracking for each downloaded asset.
 *
 * Each download is fetched via the same‑origin download route,
 * avoiding CORS issues. Downloads are spaced with a configurable
 * delay to prevent browser throttling.
 * ============================================================
 */

import { trackDownload } from './analytics.js';

/**
 * MIME type to file extension mapping.
 * Used as a fallback when Content-Disposition is not provided.
 */
const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/json': 'json',
};

/**
 * Default delay between downloads in milliseconds.
 * Prevents browser throttling and ensures sequential processing.
 */
const DEFAULT_DELAY_MS = 700;

/**
 * Download a list of images one after the other.
 *
 * Each item is fetched from its same-origin download route,
 * saved via a temporary object URL, then the next download
 * begins after a short pause.
 *
 * For each successful download, a GA4 `asset_download` event
 * is triggered with the asset's dimensions.
 *
 * @param {Array<Object>} items - List of download items.
 * @param {string} items[].url - The URL of the asset (for display/fallback).
 * @param {string} [items[].downloadUrl] - The download endpoint URL.
 * @param {string} [items[].downloadName] - Suggested filename (without extension).
 * @param {string} [items[].assetType] - Asset category for tracking (sermon_notes, blessing, etc.).
 * @param {string} [items[].serviceType] - Service type for tracking.
 * @param {string} [items[].program] - Program name for tracking.
 * @param {string} [items[].session] - Session title for tracking.
 * @param {Object} [options] - Download options.
 * @param {Function} [options.onProgress] - Callback when each item downloads.
 * @param {number} [options.delayMs] - Delay between downloads (default: 700ms).
 * @param {boolean} [options.trackDownloads] - Whether to send GA4 events (default: true).
 * @param {Object} [options.context] - Page-level tracking values applied to every item that does not carry its own
 *   (assetType, serviceType, program, session).
 * @returns {Promise<void>}
 *
 * @example
 * await downloadAll(
 *   [
 *     {
 *       url: '/images/asset1.jpg',
 *       downloadUrl: '/download/1',
 *       assetType: 'sermon_notes',
 *       serviceType: 'COZA Sundays',
 *       program: 'Sunday Services 2026',
 *       session: 'Evening Service • Jul 28',
 *     },
 *   ],
 *   {
 *     onProgress: (done, total) => console.log(`${done}/${total}`),
 *     delayMs: 500,
 *   }
 * );
 */
export async function downloadAll(
  items,
  { onProgress, delayMs = DEFAULT_DELAY_MS, trackDownloads = true, context = {} } = {}
) {
  // Guard against invalid input.
  if (!items || !Array.isArray(items) || items.length === 0) {
    console.warn('downloadAll: No items provided.');
    return;
  }

  const total = items.length;

  for (let i = 0; i < total; i++) {
    const item = items[i];

    try {
      // ─── Send GA4 tracking event (before download) ──────────────────
      if (trackDownloads) {
        // Each item's own values win; `context` supplies the page-level ones
        // (service type, program, session). Missing values are simply left out
        // of the event - never sent as the literal string 'unknown'.
        trackDownload({
          assetType: item.assetType ?? context.assetType,
          assetTitle: item.downloadName ?? item.title ?? context.assetTitle,
          serviceType: item.serviceType ?? context.serviceType,
          program: item.program ?? context.program,
          session: item.session ?? context.session,
        });
      }

      // ─── Fetch the file ──────────────────────────────────────────────
      const response = await fetch(item.downloadUrl ?? item.url);

      if (!response.ok) {
        console.warn(
          `downloadAll: Failed to fetch ${item.url}: ${response.status} ${response.statusText}`
        );
        continue;
      }

      const blob = await response.blob();

      // ─── Extract filename from Content-Disposition or use fallback ──
      const filename = getFilenameFromResponse(response, blob, item, i + 1);

      // ─── Save the file ──────────────────────────────────────────────
      saveBlob(blob, filename);

      // ─── Notify progress ────────────────────────────────────────────
      if (typeof onProgress === 'function') {
        onProgress(i + 1, total);
      }
    } catch (error) {
      // Skip this file and continue with the rest.
      console.warn(`downloadAll: Error downloading ${item.url}:`, error);
    }

    // ─── Pause between downloads ──────────────────────────────────────
    // This prevents the browser from throttling simultaneous downloads.
    if (i < total - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Save a blob as a file download.
 *
 * Creates a temporary object URL, triggers a download via a hidden
 * anchor element, and cleans up the URL after a short delay.
 *
 * @param {Blob} blob - The file blob to save.
 * @param {string} filename - The filename to use for the download.
 * @returns {void}
 */
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();

  // Clean up after a short delay to ensure the download starts.
  setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Extract the filename from the server response.
 *
 * The server's Content-Disposition header is preferred because it
 * carries the file's real extension. If not available, the blob's
 * MIME type is used to infer a suitable extension.
 *
 * @param {Response} response - The fetch response object.
 * @param {Blob} blob - The downloaded blob.
 * @param {Object} item - The original download item.
 * @param {number} index - The 1-based index of the download.
 * @returns {string} The determined filename.
 */
function getFilenameFromResponse(response, blob, item, index) {
  // ─── Prefer Content-Disposition from the server ──────────────────
  const disposition = response.headers.get('content-disposition') || '';
  const match = /filename\*?=(?:UTF-8'')?["']?([^"';\r\n]+)/i.exec(disposition);

  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  // ─── Fallback: Use blob MIME type to determine extension ──────────
  const extension = MIME_EXT[blob.type] || 'jpg';

  // ─── Build the base filename ──────────────────────────────────────
  const base = (item.downloadName || `image-${index}`).replace(/\.[^.]+$/, '');

  return `${base}.${extension}`;
}