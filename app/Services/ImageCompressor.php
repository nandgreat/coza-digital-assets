<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Drivers\Imagick\Driver as ImagickDriver;
use Intervention\Image\EncodedImage;
use Intervention\Image\Encoders\JpegEncoder;
use Intervention\Image\ImageManager;
use Intervention\Image\Interfaces\ImageInterface;
use Throwable;

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
     * Prepare an uploaded image for storage.
     *
     * When an image library (GD or Imagick) is available the image is compressed
     * to a <= 2 MB JPEG. If none is available — or compression fails for any
     * reason — the original file is returned unchanged so the upload still
     * succeeds (the failure is logged).
     *
     * @return array{contents: string, extension: string, mime: string}
     */
    public function process(UploadedFile $file): array
    {
        $manager = $this->imageManager();

        if ($manager !== null) {
            try {
                $image = $manager->decodePath($file->getRealPath());
                $image->scaleDown(width: self::MAX_DIMENSION, height: self::MAX_DIMENSION);

                return [
                    'contents' => (string) $this->encodeUnderLimit($image),
                    'extension' => 'jpg',
                    'mime' => 'image/jpeg',
                ];
            } catch (Throwable $e) {
                report($e);
                // fall through to storing the original file untouched
            }
        }

        return [
            'contents' => (string) file_get_contents($file->getRealPath()),
            'extension' => strtolower($file->getClientOriginalExtension() ?: 'jpg'),
            'mime' => $file->getMimeType() ?: 'application/octet-stream',
        ];
    }

    /** Whether image compression is available in this environment. */
    public function canCompress(): bool
    {
        return $this->imageManager() !== null;
    }

    protected function imageManager(): ?ImageManager
    {
        if (extension_loaded('gd')) {
            return new ImageManager(GdDriver::class);
        }

        if (extension_loaded('imagick')) {
            return new ImageManager(ImagickDriver::class);
        }

        return null;
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
