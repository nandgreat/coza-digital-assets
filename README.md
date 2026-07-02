# COZA Digital Service Assets

Full-stack app for COZA service resources — Laravel 13 backend, React 19 frontend via Inertia.js, MySQL database, with a password-gated admin area for managing content and uploading files.

## Requirements

- PHP 8.4+ (on this machine: `/opt/homebrew/opt/php/bin/php`, PHP 8.5)
- Composer
- Node.js 20+
- MySQL running locally (database `coza_digital_assets_db`)

## Setup

```bash
composer install
npm install
# .env already contains the MySQL credentials and the admin login
php artisan migrate:fresh --seed
php artisan storage:link      # already done on first install
npm run build
```

## Running

```bash
php artisan serve
```

Then open http://localhost:8000. The admin area is at http://localhost:8000/admin.

For frontend development with hot reload, run `npm run dev` in a second terminal alongside `php artisan serve`.

> If `php` on your PATH is 8.1, prefix commands with `PATH=/opt/homebrew/opt/php/bin:$PATH`.

## Data model

Content is stored in MySQL as a three-level hierarchy:

| Table | Purpose |
|---|---|
| `service_types` | Top level — COZA Sundays, COZA Tuesdays, 7DG (name, icon, optional edition label) |
| `programs` | A series/edition under a service type (e.g. "7DG 2026", "Sunday Services 2026") |
| `program_sessions` | An individual dated gathering; also holds `sermon_notes_path` and `blessings_path` |
| `quote_images` | Sermon quote images belonging to a session |

Uploaded files are stored on the filesystem (under `storage/app/public/sessions/{id}/…`, exposed via the `public/storage` symlink); only their web-relative paths are kept in the database. Seed data reuses the original files in `public/images/` and `public/downloads/`.

## Admin area

- **URL:** `/admin` (redirects to `/admin/login` when signed out)
- **Username:** always `Asset Admin`
- **Password:** a 64-character password stored in `.env` as `ADMIN_PASSWORD`

In the admin you can:

- Create/delete **Service Types**, **Programs**, and **Program Sessions**
- Per session, upload:
  - **Sermon Notes** — a single PDF
  - **Our Father's Blessing** — a single image
  - **Sermon Quotes** — multiple images (shown in the public gallery)

To change the admin password, edit `ADMIN_PASSWORD` in `.env` (must be exactly 64 characters) and run `php artisan config:clear`.

## Public routes

| URL | Page |
|---|---|
| `/` | Home — service type grid |
| `/service-types/{slug}` | Programs within a service type |
| `/programs/{slug}` | Sessions within a program |
| `/sessions/{slug}` | Session detail with resources |
| `/sessions/{slug}/quotes` | Sermon quotes gallery (lightbox, download, share) |
