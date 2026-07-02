<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectIfAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->session()->get('is_admin')) {
            return redirect()->route('admin.dashboard');
        }

        return $next($request);
    }
}
