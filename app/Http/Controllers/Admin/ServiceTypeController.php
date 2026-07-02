<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ServiceType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ServiceTypeController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:16'],
            'edition_label' => ['nullable', 'string', 'max:255'],
        ]);

        ServiceType::create([
            'slug' => $this->uniqueSlug($data['name']),
            'name' => $data['name'],
            'subtitle' => $data['subtitle'] ?? null,
            'icon' => $data['icon'] ?: '✨',
            'edition_label' => $data['edition_label'] ?? null,
            'sort_order' => (ServiceType::max('sort_order') ?? 0) + 1,
        ]);

        return back()->with('success', 'Service type created.');
    }

    public function update(Request $request, ServiceType $serviceType): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:16'],
            'edition_label' => ['nullable', 'string', 'max:255'],
        ]);

        $serviceType->update([
            'name' => $data['name'],
            'subtitle' => $data['subtitle'] ?? null,
            'icon' => $data['icon'] ?: '✨',
            'edition_label' => $data['edition_label'] ?? null,
        ]);

        return back()->with('success', 'Service type updated.');
    }

    public function destroy(ServiceType $serviceType): RedirectResponse
    {
        $serviceType->delete();

        return back()->with('success', 'Service type deleted.');
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'service-type';
        $slug = $base;
        $i = 2;

        while (ServiceType::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }
}
