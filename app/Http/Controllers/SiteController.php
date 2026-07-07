<?php

namespace App\Http\Controllers;

use App\Models\Program;
use App\Models\ProgramSession;
use App\Models\ProphecyImage;
use App\Models\QuoteImage;
use App\Models\ServiceType;
use App\Support\FileStore;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class SiteController extends Controller
{
    public function home(): Response
    {
        return Inertia::render('Home', [
            'serviceTypes' => ServiceType::orderBy('sort_order')->get()
                ->map(fn (ServiceType $type) => [
                    'slug' => $type->slug,
                    'name' => $type->name,
                    'subtitle' => $type->subtitle,
                    'icon' => $type->icon,
                ]),
        ]);
    }

    public function serviceType(ServiceType $serviceType): Response
    {
        return Inertia::render('ServiceType', [
            'serviceType' => [
                'name' => $serviceType->name,
                'pageTitle' => $serviceType->edition_label ?? $serviceType->name,
                'icon' => $serviceType->icon,
            ],
            'programs' => $serviceType->programs()->withCount('sessions')->get()
                ->map(fn (Program $program) => [
                    'slug' => $program->slug,
                    'name' => $program->name,
                    'subtitle' => $program->subtitle,
                    'icon' => $program->icon,
                    'sessionCount' => $program->sessions_count,
                ]),
        ]);
    }

    public function program(Program $program): Response
    {
        $program->load('serviceType');

        return Inertia::render('Program', [
            'program' => [
                'name' => $program->name,
                'subtitle' => $program->subtitle,
                'serviceType' => [
                    'slug' => $program->serviceType->slug,
                    'pageTitle' => $program->serviceType->edition_label ?? $program->serviceType->name,
                ],
            ],
            'sessions' => $program->sessions()->get()
                ->map(fn (ProgramSession $session) => [
                    'slug' => $session->slug,
                    'name' => $session->name,
                    'subtitle' => $session->subtitle,
                    'dayLabel' => $session->day_label,
                    'dateLabel' => $session->date_label,
                    'minister' => $session->minister,
                    'icon' => $session->icon,
                ]),
        ]);
    }

    public function session(ProgramSession $session): Response
    {
        $session->load(['program.serviceType', 'quoteImages', 'prophecyImages']);

        $resources = [];

        if ($session->sermon_notes_path) {
            $resources[] = [
                'type' => 'download',
                'assetType' => 'sermon_notes',
                'title' => 'Sermon Notes',
                'description' => "Full written notes from today's message",
                'icon' => '📖',
                'url' => FileStore::url($session->sermon_notes_path),
                'downloadUrl' => route('sessions.download.notes', $session),
            ];
        }

        if ($session->blessings_path) {
            $resources[] = [
                'type' => 'download',
                'assetType' => 'blessing',
                'title' => "Our Father's Blessings",
                'description' => 'Declarations and blessings from the service',
                'icon' => '🙏',
                'url' => FileStore::url($session->blessings_path),
                'downloadUrl' => route('sessions.download.blessings', $session),
            ];
        }

        if ($session->quoteImages->isNotEmpty()) {
            $resources[] = [
                'type' => 'quotes',
                'title' => 'Sermon Quotes',
                'description' => 'Key quotes and highlights to reflect on',
                'icon' => '💬',
                'url' => route('sessions.quotes', $session),
            ];
        }

        if ($session->prophecyImages->isNotEmpty()) {
            $resources[] = [
                'type' => 'prophecies',
                'title' => '7DG Prophecies',
                'description' => 'Prophetic words released during the service',
                'icon' => '🕊️',
                'url' => route('sessions.prophecies', $session),
            ];
        }

        return Inertia::render('Session', [
            'session' => $this->sessionPayload($session),
            'resources' => $resources,
        ]);
    }

    public function quotes(ProgramSession $session): Response
    {
        $session->load(['program.serviceType', 'quoteImages']);

        return Inertia::render('Quotes', [
            'session' => $this->sessionPayload($session),
            'quotes' => $session->quoteImages->values()
                ->map(fn ($quote, $index) => [
                    'url' => FileStore::url($quote->image_path),
                    'downloadUrl' => route('sessions.download.quote', [$session, $quote->id]),
                    'title' => 'Sermon Quote '.($index + 1),
                    'downloadName' => 'coza-quote-'.($index + 1).'.jpeg',
                ]),
        ]);
    }

    public function prophecies(ProgramSession $session): Response
    {
        $session->load(['program.serviceType', 'prophecyImages']);

        return Inertia::render('Prophecies', [
            'session' => $this->sessionPayload($session),
            'prophecies' => $session->prophecyImages->values()
                ->map(fn ($prophecy, $index) => [
                    'url' => FileStore::url($prophecy->image_path),
                    'downloadUrl' => route('sessions.download.prophecy', [$session, $prophecy->id]),
                    'title' => '7DG Prophecy '.($index + 1),
                    'downloadName' => 'coza-prophecy-'.($index + 1).'.jpeg',
                ]),
        ]);
    }

    public function downloadSermonNotes(ProgramSession $session): HttpResponse
    {
        return FileStore::download(
            $session->sermon_notes_path,
            "{$session->slug}-sermon-notes.".FileStore::extension($session->sermon_notes_path)
        );
    }

    public function downloadBlessings(ProgramSession $session): HttpResponse
    {
        return FileStore::download(
            $session->blessings_path,
            "{$session->slug}-blessing.".FileStore::extension($session->blessings_path)
        );
    }

    public function downloadQuote(ProgramSession $session, QuoteImage $quote): HttpResponse
    {
        abort_unless((int) $quote->program_session_id === (int) $session->id, 404);

        return FileStore::download(
            $quote->image_path,
            "{$session->slug}-quote-{$quote->id}.".FileStore::extension($quote->image_path)
        );
    }

    public function downloadProphecy(ProgramSession $session, ProphecyImage $prophecy): HttpResponse
    {
        abort_unless((int) $prophecy->program_session_id === (int) $session->id, 404);

        return FileStore::download(
            $prophecy->image_path,
            "{$session->slug}-prophecy-{$prophecy->id}.".FileStore::extension($prophecy->image_path)
        );
    }

    private function sessionPayload(ProgramSession $session): array
    {
        return [
            'slug' => $session->slug,
            'name' => $session->name,
            'subtitle' => $session->subtitle,
            'dayLabel' => $session->day_label,
            'dateLabel' => $session->date_label,
            'minister' => $session->minister,
            'editionTag' => $session->edition_tag,
            'serviceType' => $session->program->serviceType->name,
            'program' => [
                'slug' => $session->program->slug,
                'name' => $session->program->name,
            ],
        ];
    }
}
