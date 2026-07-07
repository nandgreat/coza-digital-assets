<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blessing_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_session_id')->constrained()->cascadeOnDelete();
            $table->string('image_path');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Carry existing single "Our Father's Blessing" images into the new
        // multi-image table so nothing is lost.
        $now = now();

        DB::table('program_sessions')
            ->whereNotNull('blessings_path')
            ->orderBy('id')
            ->get(['id', 'blessings_path'])
            ->each(function ($session) use ($now) {
                DB::table('blessing_images')->insert([
                    'program_session_id' => $session->id,
                    'image_path' => $session->blessings_path,
                    'sort_order' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('blessing_images');
    }
};
