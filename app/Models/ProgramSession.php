<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProgramSession extends Model
{
    protected $guarded = [];

    protected $casts = [
        'session_date' => 'date',
    ];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function quoteImages(): HasMany
    {
        return $this->hasMany(QuoteImage::class)->orderBy('sort_order');
    }

    /** e.g. "28th June, 2026" */
    public function getDateLabelAttribute(): ?string
    {
        return $this->session_date?->format('jS F, Y');
    }

    /** e.g. "🔥 7DG 2026 · Day 1" when the session belongs to a labelled edition */
    public function getEditionTagAttribute(): ?string
    {
        $serviceType = $this->program?->serviceType;

        if (! $this->day_label || ! $serviceType?->edition_label) {
            return null;
        }

        return "{$serviceType->icon} {$serviceType->edition_label} · {$this->day_label}";
    }
}
