<?php

namespace Tests\Feature;

use App\Models\Program;
use App\Models\ProgramSession;
use App\Models\ServiceType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SermonNotesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Keep everything local + in-memory, never touch Backblaze.
        config(['filesystems.disks.b2' => ['key' => null, 'secret' => null, 'bucket' => null, 'endpoint' => null]]);
        Storage::fake('public');
    }

    private function makeSession(): ProgramSession
    {
        $type = ServiceType::create(['slug' => 'coza-sundays', 'name' => 'COZA Sundays']);
        $program = Program::create(['service_type_id' => $type->id, 'slug' => 'nov-2026', 'name' => 'November 2026']);

        return ProgramSession::create(['program_id' => $program->id, 'slug' => 'day-1', 'name' => 'Day 1']);
    }

    private function upload(ProgramSession $session, array $files)
    {
        return $this->withSession(['is_admin' => true])
            ->post("/admin/sessions/{$session->slug}/sermon-notes", ['files' => $files]);
    }

    public function test_admin_can_upload_multiple_sermon_notes(): void
    {
        $session = $this->makeSession();

        $this->upload($session, [
            UploadedFile::fake()->create('part-one.pdf', 120, 'application/pdf'),
            UploadedFile::fake()->create('part-two.pdf', 90, 'application/pdf'),
        ])->assertRedirect();

        $this->assertSame(2, $session->sermonNotes()->count());
        $this->assertDatabaseHas('sermon_notes', ['program_session_id' => $session->id, 'original_name' => 'part-one.pdf']);
        $this->assertDatabaseHas('sermon_notes', ['program_session_id' => $session->id, 'original_name' => 'part-two.pdf']);
    }

    public function test_notes_accumulate_across_uploads_and_only_pdfs_allowed(): void
    {
        $session = $this->makeSession();

        $this->upload($session, [UploadedFile::fake()->create('one.pdf', 10, 'application/pdf')]);
        $this->upload($session, [UploadedFile::fake()->create('two.pdf', 10, 'application/pdf')]);
        $this->assertSame(2, $session->sermonNotes()->count());

        // A non-PDF is rejected and nothing is added.
        $this->upload($session, [UploadedFile::fake()->image('nope.jpg')])
            ->assertSessionHasErrors('files.0');
        $this->assertSame(2, $session->fresh()->sermonNotes()->count());
    }

    public function test_public_session_exposes_each_note_for_download(): void
    {
        $session = $this->makeSession();
        $this->upload($session, [
            UploadedFile::fake()->create('a.pdf', 10, 'application/pdf'),
            UploadedFile::fake()->create('b.pdf', 10, 'application/pdf'),
        ]);

        foreach ($session->sermonNotes as $note) {
            $this->get(route('sessions.download.note', [$session, $note->id]))->assertOk();
        }
    }

    public function test_admin_can_delete_a_single_sermon_note(): void
    {
        $session = $this->makeSession();
        $this->upload($session, [
            UploadedFile::fake()->create('a.pdf', 10, 'application/pdf'),
            UploadedFile::fake()->create('b.pdf', 10, 'application/pdf'),
        ]);
        $this->assertSame(2, $session->sermonNotes()->count());

        $note = $session->sermonNotes()->first();
        $this->withSession(['is_admin' => true])
            ->delete("/admin/sessions/{$session->slug}/sermon-notes/{$note->id}")
            ->assertRedirect();

        $this->assertSame(1, $session->fresh()->sermonNotes()->count());
        $this->assertDatabaseMissing('sermon_notes', ['id' => $note->id]);
    }
}
