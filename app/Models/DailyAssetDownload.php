<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DailyAssetDownload extends Model
{
    use HasFactory;

    protected $fillable = [
        'date',
        'asset_type',
        'service_type',
        'program',
        'session',
        'downloads',
    ];

    // Optionally cast date
    protected $casts = [
        'date' => 'date',
    ];
}