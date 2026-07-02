<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Program;
use App\Models\ServiceType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProgramController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'service_type_id' => ['required', 'exists:service_types,id'],
            'name' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:16'],
        ]);

        $serviceType = ServiceType::findOrFail($data['service_type_id']);

        Program::create([
            'service_type_id' => $serviceType->id,
            'slug' => $this->uniqueSlug($data['name']),
            'name' => $data['name'],
            'subtitle' => $data['subtitle'] ?? null,
            'icon' => $data['icon'] ?: $serviceType->icon,
            'sort_order' => ($serviceType->programs()->max('sort_order') ?? 0) + 1,
        ]);

        return back()->with('success', 'Program created.');
    }

    public function update(Request $request, Program $program): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:16'],
        ]);

        $program->update([
            'name' => $data['name'],
            'subtitle' => $data['subtitle'] ?? null,
            'icon' => $data['icon'] ?: $program->icon,
        ]);

        return back()->with('success', 'Program updated.');
    }

    public function destroy(Program $program): RedirectResponse
    {
        $program->delete();

        return back()->with('success', 'Program deleted.');
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'program';
        $slug = $base;
        $i = 2;

        while (Program::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }
}
