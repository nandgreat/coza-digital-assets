<?php

namespace App\Providers;

use Aws\CommandInterface;
use Aws\Middleware;
use Aws\S3\S3Client;
use Illuminate\Filesystem\AwsS3V3Adapter as LaravelS3Adapter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\ServiceProvider;
use League\Flysystem\AwsS3V3\AwsS3V3Adapter as FlysystemS3Adapter;
use League\Flysystem\Filesystem;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Schema::defaultStringLength(191);

        $this->registerBackblazeDisk();
    }

    /**
     * Backblaze B2's S3-compatible API rejects the "x-amz-acl" header unless its
     * value matches the bucket's visibility. To stay bucket-agnostic we register
     * a custom disk driver whose S3 client strips the ACL from every request, so
     * access is governed purely by the bucket's own Public/Private setting.
     */
    private function registerBackblazeDisk(): void
    {
        Storage::extend('b2-s3', function ($app, array $config) {
            $client = new S3Client([
                'version' => 'latest',
                'region' => $config['region'] ?? 'us-east-005',
                'endpoint' => $config['endpoint'] ?? null,
                'use_path_style_endpoint' => $config['use_path_style_endpoint'] ?? false,
                'credentials' => [
                    'key' => $config['key'] ?? null,
                    'secret' => $config['secret'] ?? null,
                ],
            ]);

            // Remove the ACL parameter from every command before it is sent.
            $client->getHandlerList()->appendInit(
                Middleware::mapCommand(function (CommandInterface $command) {
                    unset($command['ACL']);

                    return $command;
                }),
                'b2-strip-acl'
            );

            $root = (string) ($config['root'] ?? '');
            $adapter = new FlysystemS3Adapter($client, $config['bucket'], $root);

            return new LaravelS3Adapter(
                new Filesystem($adapter, $config),
                $adapter,
                $config,
                $client
            );
        });
    }
}
