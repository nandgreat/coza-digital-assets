<?php

namespace App\Support;

use App\Models\Program;
use App\Models\ProgramSession;

/**
 * Re-derives service type / program / session from the admin catalog.
 *
 * GA4 sometimes has no custom-dimension values on an `asset_download` event
 * (events sent before the dimensions were registered, or by an older client).
 * Every download page URL carries the session slug (/sessions/{slug}/...), and
 * the catalog knows which program and service type that session belongs to, so
 * a blank value can be recovered accurately instead of showing as "Unknown".
 *
 * Loaded lazily and once per instance (one sync = two small queries).
 */
final class CatalogResolver
{
    /** @var array<string, array{service: ?string, program: ?string, session: ?string}>|null */
    private ?array $sessions = null;

    /** @var array<string, ?string>|null  lower-cased program name => service name (null if ambiguous) */
    private ?array $programs = null;

    /**
     * @return array{service: ?string, program: ?string, session: ?string}|null
     */
    public function fromPath(?string $path): ?array
    {
        $slug = AnalyticsLabels::sessionSlugFromPath($path);

        if ($slug === null) {
            return null;
        }

        $this->load();

        return $this->sessions[$slug] ?? null;
    }

    public function serviceForProgram(?string $program): ?string
    {
        if ($program === null || AnalyticsLabels::isBlank($program)) {
            return null;
        }

        $this->load();

        return $this->programs[strtolower(trim($program))] ?? null;
    }

    private function load(): void
    {
        if ($this->sessions !== null) {
            return;
        }

        $this->sessions = [];
        $this->programs = [];

        ProgramSession::with('program.serviceType')->get()->each(function (ProgramSession $session) {
            $this->sessions[strtolower($session->slug)] = [
                'service' => $session->program?->serviceType?->name,
                'program' => $session->program?->name,
                'session' => $session->name,
            ];
        });

        Program::with('serviceType')->get()->each(function (Program $program) {
            $key = strtolower(trim($program->name));
            $service = $program->serviceType?->name;

            // A program name shared by two service types cannot be resolved safely.
            $this->programs[$key] = array_key_exists($key, $this->programs) && $this->programs[$key] !== $service
                ? null
                : $service;
        });
    }
}
