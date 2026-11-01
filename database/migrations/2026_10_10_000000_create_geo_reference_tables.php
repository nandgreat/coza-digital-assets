<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Local GeoNames reference tables used by App\Support\GeoReference.
 * Filled by: php artisan geo:import <path to allCountries.txt>
 */
return new class extends Migration
{
    public function up(): void
    {
        // ADM1 level: states / provinces / regions.
        Schema::create('geo_regions', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();          // GeoNames id
            $table->char('country_code', 2);
            $table->string('admin1_code', 20)->nullable();
            $table->string('name', 200);
            $table->string('name_key', 100);                       // normalised (suffix words stripped)
            $table->text('alt_keys')->nullable();                  // |key|key| alternate names
            $table->decimal('lat', 9, 6);
            $table->decimal('lng', 9, 6);
            $table->unsignedBigInteger('population')->default(0);

            $table->index(['country_code', 'name_key']);
            $table->index(['country_code', 'admin1_code']);
        });

        // Every populated place (city, town, village, neighbourhood).
        Schema::create('geo_places', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();          // GeoNames id
            $table->char('country_code', 2);
            $table->string('admin1_code', 20)->nullable();
            $table->string('name', 200);
            $table->string('name_key', 100);
            $table->decimal('lat', 9, 6);
            $table->decimal('lng', 9, 6);
            $table->unsignedBigInteger('population')->default(0);
            $table->string('feature_code', 10)->nullable();

            $table->index(['country_code', 'name_key', 'population'], 'geo_places_lookup');
        });

        // Alternate / English names for the larger places (see --alt-min-pop).
        Schema::create('geo_place_names', function (Blueprint $table) {
            $table->unsignedBigInteger('place_id');
            $table->char('country_code', 2);
            $table->string('name_key', 100);

            $table->index(['country_code', 'name_key'], 'geo_place_names_lookup');
            $table->index('place_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('geo_place_names');
        Schema::dropIfExists('geo_places');
        Schema::dropIfExists('geo_regions');
    }
};
