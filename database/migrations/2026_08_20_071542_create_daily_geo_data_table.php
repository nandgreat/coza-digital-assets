<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_geo_data', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('country', 100);
            $table->integer('unique_users')->unsigned()->default(0);
            $table->timestamps();

            $table->unique(['date', 'country']);
            $table->index('date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_geo_data');
    }
};