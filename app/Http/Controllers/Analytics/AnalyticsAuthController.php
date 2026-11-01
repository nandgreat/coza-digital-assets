<?php

namespace App\Http\Controllers\Analytics;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Session;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\GoogleAnalytics\CustomDimensionStatusService;

/**
 * Analytics Authentication Controller
 *
 * Handles login/logout for the standalone analytics dashboard.
 * Uses a single password stored in .env (ANALYTICS_PASSWORD).
 */
class AnalyticsAuthController extends Controller
{
    /**
     * Show the login form.
     */
    public function showLoginForm(): Response
    {
    $username = env('ANALYTICS_USERNAME', 'Analytics Admin');
    return Inertia::render('Analytics/Login', [
        'username' => $username,
    ]);
    }

    /**
     * Handle login attempt.
     */
    public function login(Request $request): RedirectResponse
    {
        // Validate only the password field (no username)
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        // Get the expected password from .env
        $expectedPassword = env('ANALYTICS_PASSWORD');

        // If password not set, deny access
        if (empty($expectedPassword)) {
            return back()->withErrors([
                'password' => 'System configuration error: analytics password not set.',
            ]);
        }

        // Timing-attack safe comparison
        if (hash_equals($expectedPassword, $request->input('password'))) {
            Session::put('analytics_logged_in', true);
            return redirect()->route('analytics.dashboard');
        }

        return back()->withErrors([
            'password' => 'Invalid password.',
        ]);
    }

    /**
     * Logout the user.
     */
    public function logout(Request $request): RedirectResponse
    {
        Session::forget('analytics_logged_in');
        return redirect()->route('analytics.login');
    }
}