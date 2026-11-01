<?php

use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\ProgramController;
use App\Http\Controllers\Admin\ServiceTypeController;
use App\Http\Controllers\Admin\SessionController;
use App\Http\Controllers\Analytics\AnalyticsAuthController;
use App\Http\Controllers\Analytics\AnalyticsController;
use App\Http\Controllers\SiteController;
use Illuminate\Support\Facades\Route;
use App\Http\Middleware\AnalyticsAuth;
use App\Http\Controllers\GoogleAnalyticsController;

/*
| Public site
*/
Route::get('/', [SiteController::class, 'home'])->name('home');
Route::get('/service-types/{serviceType}', [SiteController::class, 'serviceType'])->name('serviceTypes.show');
Route::get('/programs/{program}', [SiteController::class, 'program'])->name('programs.show');
Route::get('/sessions/{session}', [SiteController::class, 'session'])->name('sessions.show');
Route::get('/sessions/{session}/blessings', [SiteController::class, 'blessings'])->name('sessions.blessings');
Route::get('/sessions/{session}/quotes', [SiteController::class, 'quotes'])->name('sessions.quotes');
Route::get('/sessions/{session}/prophecies', [SiteController::class, 'prophecies'])->name('sessions.prophecies');

// Forced-download endpoints (stream files as attachments, same-origin)
Route::get('/sessions/{session}/sermon-notes/download', [SiteController::class, 'downloadSermonNotes'])->name('sessions.download.notes');
Route::get('/sessions/{session}/blessings/{blessing}/download', [SiteController::class, 'downloadBlessing'])->name('sessions.download.blessing');
Route::get('/sessions/{session}/quotes/{quote}/download', [SiteController::class, 'downloadQuote'])->name('sessions.download.quote');
Route::get('/sessions/{session}/prophecies/{prophecy}/download', [SiteController::class, 'downloadProphecy'])->name('sessions.download.prophecy');

/*
| Admin authentication
*/
Route::middleware('guest.admin')->group(function () {
    Route::get('/admin/login', [AuthController::class, 'show'])->name('admin.login');
    Route::post('/admin/login', [AuthController::class, 'login'])->name('admin.login.attempt');
});

Route::post('/admin/logout', [AuthController::class, 'logout'])->name('admin.logout');

/*
| Admin area (protected)
*/
Route::middleware('admin')->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    Route::post('service-types', [ServiceTypeController::class, 'store'])->name('service-types.store');
    Route::put('service-types/{serviceType}', [ServiceTypeController::class, 'update'])->name('service-types.update');
    Route::delete('service-types/{serviceType}', [ServiceTypeController::class, 'destroy'])->name('service-types.destroy');

    Route::post('programs', [ProgramController::class, 'store'])->name('programs.store');
    Route::put('programs/{program}', [ProgramController::class, 'update'])->name('programs.update');
    Route::delete('programs/{program}', [ProgramController::class, 'destroy'])->name('programs.destroy');

    Route::post('sessions', [SessionController::class, 'store'])->name('sessions.store');
    Route::get('sessions/{session}/edit', [SessionController::class, 'edit'])->name('sessions.edit');
    Route::put('sessions/{session}', [SessionController::class, 'update'])->name('sessions.update');
    Route::delete('sessions/{session}', [SessionController::class, 'destroy'])->name('sessions.destroy');

    Route::post('sessions/{session}/sermon-notes', [SessionController::class, 'uploadSermonNotes'])->name('sessions.sermon-notes.store');
    Route::delete('sessions/{session}/sermon-notes', [SessionController::class, 'deleteSermonNotes'])->name('sessions.sermon-notes.destroy');

    Route::post('sessions/{session}/blessings', [SessionController::class, 'uploadBlessings'])->name('sessions.blessings.store');
    Route::delete('sessions/{session}/blessings/{blessing}', [SessionController::class, 'deleteBlessing'])->name('sessions.blessings.destroy');

    Route::post('sessions/{session}/quotes', [SessionController::class, 'uploadQuotes'])->name('sessions.quotes.store');
    Route::delete('sessions/{session}/quotes/{quote}', [SessionController::class, 'deleteQuote'])->name('sessions.quotes.destroy');

    Route::post('sessions/{session}/prophecies', [SessionController::class, 'uploadProphecies'])->name('sessions.prophecies.store');
    Route::delete('sessions/{session}/prophecies/{prophecy}', [SessionController::class, 'deleteProphecy'])->name('sessions.prophecies.destroy');
});

// --- Analytics Standalone Routes ---
Route::prefix('analytics')->name('analytics.')->group(function () {
    
    // Analytics login/logout routes (no auth) | Public facing login routes
    Route::get('/login', [AnalyticsAuthController::class, 'showLoginForm'])->name('login');
    Route::post('/login', [AnalyticsAuthController::class, 'login'])->name('login.attempt');
    // Check the report status of created GA4 Custom Dimensions
    Route::get('/{propertyId}/custom-dimensions', [GoogleAnalyticsController::class, 'customDimensionStatuses']);
    
    // Protected Dashboard Routes
    Route::middleware([AnalyticsAuth::class])->group(function () {
        Route::get('/', [AnalyticsController::class, 'index'])->name('dashboard');
        Route::get('/filters', [AnalyticsController::class, 'filters'])->name('filters');
        Route::get('/export', [AnalyticsController::class, 'export'])->name('export');
        Route::post('/refresh', [AnalyticsController::class, 'refresh'])->name('refresh');
        Route::get('/refresh-status', [AnalyticsController::class, 'refreshStatus'])->name('refresh-status');
        Route::get('/breakdown', [AnalyticsController::class, 'breakdown'])->name('breakdown');
        Route::get('/sessions', [AnalyticsController::class, 'sessions'])->name('sessions');
        Route::get('/geo', [AnalyticsController::class, 'geo'])->name('geo');
        Route::get('/unique-by-asset', [AnalyticsController::class, 'uniqueByAsset'])->name('uniqueByAsset');
        Route::get('/diagnose-google', [AnalyticsController::class, 'diagnoseGoogleAnalytics']);
        // Compatibility aliases retained while ordinary dashboard reads move to Inertia.
        Route::get('/analytics', [AnalyticsController::class, 'index'])->name('legacy.page');

        // Canonical JSON contract retained for external/legacy consumers.
        Route::get('/data', [AnalyticsController::class, 'data'])->name('data');

        Route::post('/logout', [AnalyticsAuthController::class, 'logout'])->name('logout');
    });
});
