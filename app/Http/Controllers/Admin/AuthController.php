<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('Admin/Login', [
            'username' => config('admin.username'),
        ]);
    }

    public function login(Request $request): RedirectResponse
    {
        $length = config('admin.password_length');

        $credentials = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string', "size:{$length}"],
        ]);

        $expectedPassword = (string) config('admin.password');

        $usernameOk = hash_equals(
            (string) config('admin.username'),
            (string) $credentials['username']
        );

        $passwordOk = $expectedPassword !== ''
            && hash_equals($expectedPassword, (string) $credentials['password']);

        if (! $usernameOk || ! $passwordOk) {
            throw ValidationException::withMessages([
                'password' => 'Invalid credentials.',
            ]);
        }

        $request->session()->regenerate();
        $request->session()->put('is_admin', true);

        return redirect()->intended(route('admin.dashboard'));
    }

    public function logout(Request $request): RedirectResponse
    {
        $request->session()->forget('is_admin');
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }
}
