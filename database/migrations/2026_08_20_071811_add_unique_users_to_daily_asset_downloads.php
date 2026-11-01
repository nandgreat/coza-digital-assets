<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_asset_downloads', function (Blueprint $table) {
            if (!Schema::hasColumn('daily_asset_downloads', 'unique_users')) {
                $table->integer('unique_users')->unsigned()->default(0)->after('downloads');
            }
        });
    }

    public function down(): void
    {
        Schema::table('daily_asset_downloads', function (Blueprint $table) {
            $table->dropColumn('unique_users');
        });
    }
};