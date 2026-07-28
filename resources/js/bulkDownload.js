const MIME_EXT = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
};

/**
 * Download a list of images one after the other, keeping each file's real
 * format. Each item is fetched from its same-origin download route (so there's
 * no cross-origin CORS block), saved via a temporary object URL, then the next
 * one begins after a short pause.
 *
 * @param {Array<{url:string, downloadUrl?:string, downloadName?:string}>} items
 * @param {{ onProgress?: (done:number, total:number) => void, delayMs?: number }} [options]
 */
export async function downloadAll(items, { onProgress, delayMs = 700 } = {}) {
    const total = items.length;

    for (let i = 0; i < total; i++) {
        const item = items[i];
        try {
            const res = await fetch(item.downloadUrl ?? item.url);
            if (res.ok) {
                const blob = await res.blob();
                saveBlob(blob, filenameFor(res, blob, item, i + 1));
            }
        } catch {
            // skip this file, keep going with the rest
        }

        onProgress?.(i + 1, total);

        // Pause so the browser processes the downloads one after another.
        if (i < total - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
}

function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function filenameFor(res, blob, item, index) {
    // Prefer the server's Content-Disposition filename — it already carries the
    // file's real extension.
    const disposition = res.headers.get('content-disposition') || '';
    const match = /filename\*?=(?:UTF-8'')?["']?([^"';\r\n]+)/i.exec(disposition);
    if (match && match[1]) {
        try {
            return decodeURIComponent(match[1]);
        } catch {
            return match[1];
        }
    }

    // Fall back to the blob's MIME type so the format is still retained.
    const ext = MIME_EXT[blob.type] || 'jpg';
    const base = (item.downloadName || `image-${index}`).replace(/\.[^.]+$/, '');
    return `${base}.${ext}`;
}
