<?php

namespace Database\Seeders;

use App\Models\ServiceType;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── COZA Sundays ──
        $sundays = ServiceType::create([
            'slug' => 'sundays',
            'name' => 'COZA Sundays',
            'subtitle' => 'Sunday Service Resources',
            'icon' => '☀️',
            'sort_order' => 1,
        ]);

        $sundayProgram = $sundays->programs()->create([
            'slug' => 'coza-sundays-2026',
            'name' => 'Sunday Services 2026',
            'subtitle' => 'Weekly Sunday gatherings',
            'icon' => '☀️',
            'sort_order' => 1,
        ]);

        $sundaySession = $sundayProgram->sessions()->create([
            'slug' => 'sunday-service-28-06-2026',
            'name' => 'Sunday Service',
            'session_date' => '2026-06-28',
            'minister' => 'Pastor Modele Fatoyinbo',
            'icon' => '☀️',
            'sermon_notes_path' => 'downloads/Sermon_Note_The_Pattern_of_Prayer.pdf',
            'sort_order' => 1,
        ]);

        // quote1 is a .jpg; the rest are .jpeg
        $sundaySession->quoteImages()->createMany(
            collect(range(1, 18))->map(fn (int $n) => [
                'image_path' => 'images/quotes/quote'.$n.($n === 1 ? '.jpg' : '.jpeg'),
                'sort_order' => $n,
            ])->all()
        );

        // ── COZA Tuesdays ──
        $tuesdays = ServiceType::create([
            'slug' => 'tuesdays',
            'name' => 'COZA Tuesdays',
            'subtitle' => 'Tuesday Service Resources',
            'icon' => '✨',
            'sort_order' => 2,
        ]);

        $tuesdayProgram = $tuesdays->programs()->create([
            'slug' => 'coza-tuesdays-2026',
            'name' => 'Tuesday Services 2026',
            'subtitle' => 'Weekly Tuesday gatherings',
            'icon' => '✨',
            'sort_order' => 1,
        ]);

        $tuesdayProgram->sessions()->create([
            'slug' => 'tuesday-service-30-06-2026',
            'name' => 'COZA Tuesday Service',
            'session_date' => '2026-06-30',
            'minister' => 'Pastor Biodun Fatoyinbo',
            'icon' => '✨',
            'sermon_notes_path' => 'downloads/Sermon_Note_The_Pattern_of_Prayer.pdf',
            'sort_order' => 1,
        ]);

        // ── 7DG ──
        $sevenDg = ServiceType::create([
            'slug' => '7dg',
            'name' => '7DG',
            'subtitle' => '7 Days of Glory',
            'icon' => '🔥',
            'edition_label' => '7DG 2026',
            'sort_order' => 3,
        ]);

        $sevenDgProgram = $sevenDg->programs()->create([
            'slug' => '7dg-2026',
            'name' => '7DG 2026',
            'subtitle' => '7 Days of Glory · 2026 Edition',
            'icon' => '🔥',
            'sort_order' => 1,
        ]);

        $sevenDgProgram->sessions()->create([
            'slug' => '7dg-day1-evening',
            'name' => 'Evening Service',
            'subtitle' => 'Victory Night',
            'day_label' => 'Day 1',
            'icon' => '🌙',
            'sort_order' => 1,
        ]);
    }
}
