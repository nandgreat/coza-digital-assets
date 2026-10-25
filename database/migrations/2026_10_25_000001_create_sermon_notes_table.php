<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sermon_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_session_id')->constrained()->cascadeOnDelete();
            $table->string('file_path');
            $table->string('original_name')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Carry each session's existing single sermon-notes PDF into the new
        // multi-file table so nothing is lost.
        $now = now();

        DB::table('program_sessions')
            ->whereNotNull('sermon_notes_path')
            ->orderBy('id')
            ->get(['id', 'sermon_notes_path'])
            ->each(function ($session) use ($now) {
                DB::table('sermon_notes')->insert([
                    'program_session_id' => $session->id,
                    'file_path' => $session->sermon_notes_path,
                    'original_name' => null,
                    'sort_order' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('sermon_notes');
    }
};
