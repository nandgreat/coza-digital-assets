<?php

use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\ProgramController;
use App\Http\Controllers\Admin\ServiceTypeController;
use App\Http\Controllers\Admin\SessionController;
use App\Http\Controllers\SiteController;
use Illuminate\Support\Facades\Route;

/*
| Public site
*/
Route::get('/', [SiteController::class, 'home'])->name('home');
Route::get('/service-types/{serviceType}', [SiteController::class, 'serviceType'])->name('serviceTypes.show');
Route::get('/programs/{program}', [SiteController::class, 'program'])->name('programs.show');
Route::get('/sessions/{session}', [SiteController::class, 'session'])->name('sessions.show');
Route::get('/sessions/{session}/quotes', [SiteController::class, 'quotes'])->name('sessions.quotes');

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
    Route::delete('sessions/{session}/blessings', [SessionController::class, 'deleteBlessings'])->name('sessions.blessings.destroy');

    Route::post('sessions/{session}/quotes', [SessionController::class, 'uploadQuotes'])->name('sessions.quotes.store');
    Route::delete('sessions/{session}/quotes/{quote}', [SessionController::class, 'deleteQuote'])->name('sessions.quotes.destroy');
});
