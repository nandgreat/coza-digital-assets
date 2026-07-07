<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlessingImage;
use App\Models\Program;
use App\Models\ProgramSession;
use App\Models\ProphecyImage;
use App\Models\QuoteImage;
use App\Services\ImageCompressor;
use App\Support\FileStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        $session->load(['program.serviceType', 'quoteImages', 'prophecyImages', 'blessingImages']);

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
                'sermonNotesUrl' => FileStore::url($session->sermon_notes_path),
                'blessings' => $session->blessingImages->map(fn (BlessingImage $b) => [
                    'id' => $b->id,
                    'url' => FileStore::url($b->image_path),
                ]),
                'quotes' => $session->quoteImages->map(fn (QuoteImage $q) => [
                    'id' => $q->id,
                    'url' => FileStore::url($q->image_path),
                ]),
                'prophecies' => $session->prophecyImages->map(fn (ProphecyImage $p) => [
                    'id' => $p->id,
                    'url' => FileStore::url($p->image_path),
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
        FileStore::delete($session->sermon_notes_path);
        foreach ($session->blessingImages as $blessing) {
            FileStore::delete($blessing->image_path);
        }
        foreach ($session->quoteImages as $quote) {
            FileStore::delete($quote->image_path);
        }
        foreach ($session->prophecyImages as $prophecy) {
            FileStore::delete($prophecy->image_path);
        }

        $session->delete();

        return redirect()->route('admin.dashboard')->with('success', 'Session deleted.');
    }

    public function uploadSermonNotes(Request $request, ProgramSession $session): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:20480'],
        ]);

        $file = $request->file('file');

        FileStore::delete($session->sermon_notes_path);
        $session->update([
            'sermon_notes_path' => FileStore::put(
                $this->key($session, 'notes', 'pdf'),
                file_get_contents($file->getRealPath()),
                'application/pdf'
            ),
        ]);

        return back()->with('success', 'Sermon notes uploaded.');
    }

    public function deleteSermonNotes(ProgramSession $session): RedirectResponse
    {
        FileStore::delete($session->sermon_notes_path);
        $session->update(['sermon_notes_path' => null]);

        return back()->with('success', 'Sermon notes removed.');
    }

    public function uploadBlessings(Request $request, ProgramSession $session): RedirectResponse
    {
        $request->validate([
            'images' => ['required', 'array', 'min:1'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:30720'],
        ]);

        $next = ($session->blessingImages()->max('sort_order') ?? 0) + 1;

        foreach ($request->file('images') as $image) {
            $processed = $this->compressor->process($image);
            $session->blessingImages()->create([
                'image_path' => FileStore::put(
                    $this->key($session, 'blessings', $processed['extension']),
                    $processed['contents'],
                    $processed['mime']
                ),
                'sort_order' => $next++,
            ]);
        }

        return back()->with('success', "Our Father's Blessing uploaded.");
    }

    public function deleteBlessing(ProgramSession $session, BlessingImage $blessing): RedirectResponse
    {
        abort_unless((int) $blessing->program_session_id === (int) $session->id, 404);

        FileStore::delete($blessing->image_path);
        $blessing->delete();

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
            $processed = $this->compressor->process($image);
            $session->quoteImages()->create([
                'image_path' => FileStore::put(
                    $this->key($session, 'quotes', $processed['extension']),
                    $processed['contents'],
                    $processed['mime']
                ),
                'sort_order' => $next++,
            ]);
        }

        return back()->with('success', 'Sermon quotes uploaded.');
    }

    public function deleteQuote(ProgramSession $session, QuoteImage $quote): RedirectResponse
    {
        abort_unless((int) $quote->program_session_id === (int) $session->id, 404);

        FileStore::delete($quote->image_path);
        $quote->delete();

        return back()->with('success', 'Quote removed.');
    }

    public function uploadProphecies(Request $request, ProgramSession $session): RedirectResponse
    {
        $request->validate([
            'images' => ['required', 'array', 'min:1'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:30720'],
        ]);

        $next = ($session->prophecyImages()->max('sort_order') ?? 0) + 1;

        foreach ($request->file('images') as $image) {
            $processed = $this->compressor->process($image);
            $session->prophecyImages()->create([
                'image_path' => FileStore::put(
                    $this->key($session, 'prophecies', $processed['extension']),
                    $processed['contents'],
                    $processed['mime']
                ),
                'sort_order' => $next++,
            ]);
        }

        return back()->with('success', '7DG Prophecies uploaded.');
    }

    public function deleteProphecy(ProgramSession $session, ProphecyImage $prophecy): RedirectResponse
    {
        abort_unless((int) $prophecy->program_session_id === (int) $session->id, 404);

        FileStore::delete($prophecy->image_path);
        $prophecy->delete();

        return back()->with('success', 'Prophecy removed.');
    }

    /** Build a unique storage key for a session's file. */
    private function key(ProgramSession $session, string $folder, string $extension): string
    {
        return "sessions/{$session->id}/{$folder}/".Str::random(40).".{$extension}";
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
