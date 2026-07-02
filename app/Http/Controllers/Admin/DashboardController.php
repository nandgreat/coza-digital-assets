<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ServiceType;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $serviceTypes = ServiceType::orderBy('sort_order')
            ->with(['programs.sessions'])
            ->get()
            ->map(fn (ServiceType $type) => [
                'id' => $type->id,
                'slug' => $type->slug,
                'name' => $type->name,
                'subtitle' => $type->subtitle,
                'icon' => $type->icon,
                'editionLabel' => $type->edition_label,
                'programs' => $type->programs->map(fn ($program) => [
                    'id' => $program->id,
                    'slug' => $program->slug,
                    'name' => $program->name,
                    'subtitle' => $program->subtitle,
                    'icon' => $program->icon,
                    'sessions' => $program->sessions->map(fn ($session) => [
                        'id' => $session->id,
                        'slug' => $session->slug,
                        'name' => $session->name,
                        'subtitle' => $session->subtitle,
                        'dayLabel' => $session->day_label,
                        'dateLabel' => $session->date_label,
                    ]),
                ]),
            ]);

        return Inertia::render('Admin/Dashboard', [
            'serviceTypes' => $serviceTypes,
        ]);
    }
}
