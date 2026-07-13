import { trackShare } from './analytics';

/**
 * Share an image.
 *
 * Prefers sharing the actual image FILE via the Web Share API (so it lands in
 * WhatsApp/Instagram/etc. as an image, not just a link). The file is fetched
 * through our same-origin download route, which sidesteps the cross-origin CORS
 * block that a direct Backblaze fetch would hit.
 *
 * Falls back to sharing the link, then copying it, on browsers without file
 * sharing (most desktops).
 *
 * @param {{url:string, downloadUrl?:string, downloadName?:string, title?:string}} item
 * @param {{onToast?:(msg:string)=>void, context?:object}} [options]
 */
export async function shareImage(item, { onToast, context } = {}) {
    const linkUrl = item.url;
    const fileUrl = item.downloadUrl ?? item.url;
    const filename = item.downloadName ?? 'coza-image.jpg';

    // 1) Best: share the actual image file (Web Share API Level 2).
    if (typeof navigator.canShare === 'function' && typeof navigator.share === 'function') {
        let file = null;
        try {
            const res = await fetch(fileUrl);
            if (res.ok) {
                const blob = await res.blob();
                file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
            }
        } catch {
            file = null; // fetch failed → fall back to link sharing
        }

        if (file && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: item.title, text: item.title });
                if (context) trackShare({ ...context, method: 'image' });
            } catch {
                // user dismissed the share sheet — nothing to do
            }
            return;
        }
    }

    // 2) Fall back to sharing the link.
    if (typeof navigator.share === 'function') {
        try {
            await navigator.share({ title: item.title, text: item.title, url: linkUrl });
            if (context) trackShare({ ...context, method: 'link' });
        } catch {
            // dismissed
        }
        return;
    }

    // 3) Fall back to copying the link.
    if (navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(linkUrl);
            onToast?.('Link copied to clipboard');
            if (context) trackShare({ ...context, method: 'copy' });
        } catch {
            onToast?.('Unable to copy link');
        }
        return;
    }

    onToast?.('Sharing not supported on this browser');
}
