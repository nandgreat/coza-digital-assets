<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop the table if it exists (to start fresh)
        // Schema::dropIfExists('daily_asset_downloads');

        // Create the table with the correct structure
        Schema::create('daily_asset_downloads', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('asset_type')->nullable();
            $table->string('service_type')->nullable();
            $table->string('program')->nullable();
            $table->string('session')->nullable();
            $table->unsignedInteger('downloads')->default(0);
            $table->timestamps();

            // Indexes for common query patterns
            $table->index(['date', 'service_type', 'program'], 'idx_date_service_program');
            $table->index(['service_type', 'asset_type'], 'idx_service_asset');
            $table->index('session', 'idx_session');

            // Optional: set table engine to InnoDB (default anyway)
            $table->engine = 'InnoDB';
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Simply drop the table on rollback
        Schema::dropIfExists('daily_asset_downloads');
    }
};