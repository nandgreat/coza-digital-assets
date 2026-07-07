<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlessingImage extends Model
{
    protected $guarded = [];

    public function session(): BelongsTo
    {
        return $this->belongsTo(ProgramSession::class, 'program_session_id');
    }
}
