<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Program;
use App\Models\ProgramSession;
use App\Models\QuoteImage;
use App\Services\ImageCompressor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SessionController extends Controller
{
    public function __construct(private readonly ImageCompressor $compressor)
    {
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'program_id' => ['required', 'exists:programs,id'],
            'name' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'day_label' => ['nullable', 'string', 'max:255'],
            'session_date' => ['nullable', 'date'],
            'minister' => ['nullable', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:16'],
        ]);

        $program = Program::findOrFail($data['program_id']);

        $session = ProgramSession::create([
            'program_id' => $program->id,
            'slug' => $this->uniqueSlug($data['name']),
            'name' => $data['name'],
            'subtitle' => $data['subtitle'] ?? null,
            'day_label' => $data['day_label'] ?? null,
            'session_date' => $data['session_date'] ?? null,
            'minister' => $data['minister'] ?? null,
            'icon' => $data['icon'] ?: $program->icon,
            'sort_order' => ($program->sessions()->max('sort_order') ?? 0) + 1,
        ]);

        return redirect()
            ->route('admin.sessions.edit', $session)
            ->with('success', 'Session created — now add its resources.');
    }

    public function edit(ProgramSession $session): Response
    {
        $session->load(['program.serviceType', 'quoteImages']);

        return Inertia::render('Admin/Session', [
            'session' => [
                'id' => $session->id,
                'slug' => $session->slug,
                'name' => $session->name,
                'subtitle' => $session->subtitle,
                'dayLabel' => $session->day_label,
                'sessionDate' => $session->session_date?->format('Y-m-d'),
                'minister' => $session->minister,
                'icon' => $session->icon,
                'sermonNotesUrl' => $session->sermon_notes_path ? asset($session->sermon_notes_path) : null,
                'blessingsUrl' => $session->blessings_path ? asset($session->blessings_path) : null,
                'quotes' => $session->quoteImages->map(fn (QuoteImage $q) => [
                    'id' => $q->id,
                    'url' => asset($q->image_path),
                ]),
                'program' => [
                    'name' => $session->program->name,
                    'serviceType' => $session->program->serviceType->name,
                ],
                'publicUrl' => route('sessions.show', $session),
            ],
        ]);
    }

    public function update(Request $request, ProgramSession $session): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'day_label' => ['nullable', 'string', 'max:255'],
            'session_date' => ['nullable', 'date'],
            'minister' => ['nullable', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:16'],
        ]);

        $session->update([
            'name' => $data['name'],
            'subtitle' => $data['subtitle'] ?? null,
            'day_label' => $data['day_label'] ?? null,
            'session_date' => $data['session_date'] ?? null,
            'minister' => $data['minister'] ?? null,
            'icon' => $data['icon'] ?: $session->icon,
        ]);

        return back()->with('success', 'Session details updated.');
    }

    public function destroy(ProgramSession $session): RedirectResponse
    {
        $this->deleteFile($session->sermon_notes_path);
        $this->deleteFile($session->blessings_path);
        foreach ($session->quoteImages as $quote) {
            $this->deleteFile($quote->image_path);
        }

        $session->delete();

        return redirect()->route('admin.dashboard')->with('success', 'Session deleted.');
    }

    public function uploadSermonNotes(Request $request, ProgramSession $session): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:20480'],
        ]);

        $this->deleteFile($session->sermon_notes_path);
        $session->update([
            'sermon_notes_path' => $this->storeFile($request->file('file'), $session, 'notes'),
        ]);

        return back()->with('success', 'Sermon notes uploaded.');
    }

    public function deleteSermonNotes(ProgramSession $session): RedirectResponse
    {
        $this->deleteFile($session->sermon_notes_path);
        $session->update(['sermon_notes_path' => null]);

        return back()->with('success', 'Sermon notes removed.');
    }

    public function uploadBlessings(Request $request, ProgramSession $session): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:30720'],
        ]);

        $this->deleteFile($session->blessings_path);
        $session->update([
            'blessings_path' => $this->compressor->compressAndStore(
                $request->file('file'),
                "sessions/{$session->id}/blessings"
            ),
        ]);

        return back()->with('success', "Our Father's Blessing uploaded.");
    }

    public function deleteBlessings(ProgramSession $session): RedirectResponse
    {
        $this->deleteFile($session->blessings_path);
        $session->update(['blessings_path' => null]);

        return back()->with('success', "Our Father's Blessing removed.");
    }

    public function uploadQuotes(Request $request, ProgramSession $session): RedirectResponse
    {
        $request->validate([
            'images' => ['required', 'array', 'min:1'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:30720'],
        ]);

        $next = ($session->quoteImages()->max('sort_order') ?? 0) + 1;

        foreach ($request->file('images') as $image) {
            $session->quoteImages()->create([
                'image_path' => $this->compressor->compressAndStore(
                    $image,
                    "sessions/{$session->id}/quotes"
                ),
                'sort_order' => $next++,
            ]);
        }

        return back()->with('success', 'Sermon quotes uploaded.');
    }

    public function deleteQuote(ProgramSession $session, QuoteImage $quote): RedirectResponse
    {
        abort_unless($quote->program_session_id === $session->id, 404);

        $this->deleteFile($quote->image_path);
        $quote->delete();

        return back()->with('success', 'Quote removed.');
    }

    private function storeFile($file, ProgramSession $session, string $folder): string
    {
        $path = $file->store("sessions/{$session->id}/{$folder}", 'public');

        // Stored web-relative so asset() resolves it (public disk is symlinked to public/storage).
        return 'storage/'.$path;
    }

    private function deleteFile(?string $webPath): void
    {
        if (! $webPath || ! Str::startsWith($webPath, 'storage/')) {
            return;
        }

        Storage::disk('public')->delete(Str::after($webPath, 'storage/'));
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'session';
        $slug = $base;
        $i = 2;

        while (ProgramSession::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }
}
