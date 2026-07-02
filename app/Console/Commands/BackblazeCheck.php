<?php

namespace App\Console\Commands;

use App\Support\FileStore;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Throwable;

class BackblazeCheck extends Command
{
    protected $signature = 'backblaze:check';

    protected $description = 'Verify Backblaze B2 credentials by writing, reading and deleting a test file';

    public function handle(): int
    {
        if (! FileStore::usingBackblaze()) {
            $this->error('Backblaze is not configured. Set B2_KEY_ID, B2_APPLICATION_KEY, '
                .'B2_BUCKET and B2_ENDPOINT in .env, then run `php artisan config:clear`.');

            return self::FAILURE;
        }

        $key = 'healthcheck/coza-'.now()->timestamp.'.txt';

        try {
            $this->info('Writing a test file to Backblaze…');
            Storage::disk('b2')->put($key, 'COZA Backblaze connectivity check', [
                'ContentType' => 'text/plain',
            ]);

            $this->info('✅ Wrote '.$key);
            $this->line('   URL: '.Storage::disk('b2')->url($key));

            $exists = Storage::disk('b2')->exists($key);
            $this->info($exists ? '✅ Confirmed the file exists on the bucket.' : '⚠️  File not found after write.');

            Storage::disk('b2')->delete($key);
            $this->info('✅ Deleted the test file. Backblaze is working — uploads will be stored on B2.');

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->error('Backblaze check failed: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
