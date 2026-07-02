<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Central place for deciding where uploaded files live and how to link to them.
 *
 * A file reference stored in the database is one of:
 *   - "b2:{key}"   → an object on Backblaze B2 (new uploads, when configured)
 *   - "storage/…"  → a local file under public/storage (fallback / older uploads)
 *   - "images/…", "downloads/…" → original seed files bundled in public/
 */
class FileStore
{
    public const B2_PREFIX = 'b2:';

    /** Backblaze is used only when its core credentials are present in .env. */
    public static function usingBackblaze(): bool
    {
        $disk = config('filesystems.disks.b2');

        return ! empty($disk['key'])
            && ! empty($disk['secret'])
            && ! empty($disk['bucket'])
            && ! empty($disk['endpoint']);
    }

    /**
     * Store raw contents and return the database reference for the new file.
     */
    public static function put(string $key, string $contents, string $contentType): string
    {
        if (self::usingBackblaze()) {
            // No ACL/visibility option — Backblaze rejects S3 canned ACLs and
            // serves files publicly based on the bucket's own visibility.
            Storage::disk('b2')->put($key, $contents, ['ContentType' => $contentType]);

            return self::B2_PREFIX.$key;
        }

        Storage::disk('public')->put($key, $contents);

        return 'storage/'.$key;
    }

    /**
     * Delete a stored file. Legacy seed paths (images/…, downloads/…) are left alone.
     */
    public static function delete(?string $reference): void
    {
        if (! $reference) {
            return;
        }

        if (Str::startsWith($reference, self::B2_PREFIX)) {
            Storage::disk('b2')->delete(Str::after($reference, self::B2_PREFIX));

            return;
        }

        if (Str::startsWith($reference, 'storage/')) {
            Storage::disk('public')->delete(Str::after($reference, 'storage/'));
        }
    }

    /** Public URL for a stored file reference. */
    public static function url(?string $reference): ?string
    {
        if (! $reference) {
            return null;
        }

        if (Str::startsWith($reference, self::B2_PREFIX)) {
            return Storage::disk('b2')->url(Str::after($reference, self::B2_PREFIX));
        }

        return asset($reference);
    }
}
