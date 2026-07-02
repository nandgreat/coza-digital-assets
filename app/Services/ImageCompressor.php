<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\EncodedImage;
use Intervention\Image\Encoders\JpegEncoder;
use Intervention\Image\ImageManager;
use Intervention\Image\Interfaces\ImageInterface;

class ImageCompressor
{
    /** Hard ceiling for a stored image. */
    private const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

    /** Longest edge is scaled down to at most this before encoding. */
    private const MAX_DIMENSION = 2500;

    /** Never shrink narrower than this while chasing the size limit. */
    private const MIN_DIMENSION = 700;

    /** JPEG qualities tried from best to worst. */
    private const QUALITIES = [82, 72, 62, 52, 42];

    /**
     * Compress an uploaded image to at most 2 MB and store it on the public disk.
     * Returns the web-relative path (e.g. "storage/sessions/3/quotes/ab…jpg").
     */
    public function compressAndStore(UploadedFile $file, string $directory): string
    {
        $path = trim($directory, '/').'/'.Str::random(40).'.jpg';
        Storage::disk('public')->put($path, $this->compress($file));

        return 'storage/'.$path;
    }

    /**
     * Compress an uploaded image to at most 2 MB and return the raw JPEG bytes.
     */
    public function compress(UploadedFile $file): string
    {
        $manager = new ImageManager(Driver::class);

        $image = $manager->decodePath($file->getRealPath());
        $image->scaleDown(width: self::MAX_DIMENSION, height: self::MAX_DIMENSION);

        return (string) $this->encodeUnderLimit($image);
    }

    private function encodeUnderLimit(ImageInterface $image): EncodedImage
    {
        while (true) {
            $encoded = null;

            foreach (self::QUALITIES as $quality) {
                $encoded = $image->encode(new JpegEncoder(quality: $quality));

                if (strlen((string) $encoded) <= self::MAX_BYTES) {
                    return $encoded;
                }
            }

            // Still over the limit at the lowest quality. Shrink and retry,
            // unless we've already reached the minimum width.
            if ($image->width() <= self::MIN_DIMENSION) {
                return $encoded;
            }

            $image->scaleDown(width: (int) ($image->width() * 0.8));
        }
    }
}
