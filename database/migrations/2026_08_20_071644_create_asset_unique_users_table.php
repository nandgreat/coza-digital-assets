<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_unique_users', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('asset_type', 191)->nullable();
            $table->integer('unique_users')->unsigned()->default(0);
            $table->timestamps();

            $table->unique(['date', 'asset_type']);
            $table->index('date');
            $table->index('asset_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_unique_users');
    }
};