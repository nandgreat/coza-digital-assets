<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class AnalyticsAuth
{
    public function handle(Request $request, Closure $next)
    {
        // Check if the user is logged into analytics
        if (!Session::get('analytics_logged_in')) {
            return redirect()->route('analytics.login');
        }

        return $next($request);
    }
}