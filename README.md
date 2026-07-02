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

Only a **reference** to each file is stored in the database (in `sermon_notes_path`,
`blessings_path`, and `quote_images.image_path`), never the file itself:

- `b2:{key}` — the file lives on **Backblaze B2** (new uploads, when configured)
- `storage/…` — a local file under `public/storage` (fallback when B2 is off)
- `images/…`, `downloads/…` — original seed files bundled in `public/`

## File storage (Backblaze B2)

When Backblaze credentials are present, every uploaded file (sermon notes PDF,
blessing image, and quote images) is stored on **Backblaze B2 instead of this
server**; images are still compressed to ≤ 2 MB first. If the credentials are
absent, uploads fall back to local `public/storage`, so nothing breaks in
development. Backblaze is used through its S3-compatible API via Laravel's `b2`
disk in [`config/filesystems.php`](config/filesystems.php).

### 👉 Where to put your credentials

All Backblaze keys go in **`.env`** (this is the only place you edit):

```
B2_KEY_ID=            # Backblaze "Application Key ID" (keyID)
B2_APPLICATION_KEY=   # Backblaze "Application Key" secret
B2_REGION=            # e.g. us-west-004
B2_BUCKET=            # your bucket NAME (not the Bucket ID)
B2_ENDPOINT=          # https://s3.<region>.backblazeb2.com
B2_URL=               # optional public base URL (leave blank to auto-build)
```

Getting them from Backblaze:

1. Create a **Bucket** (set it to *Public* so files are viewable by link) — note
   its name and the endpoint shown in the bucket details (e.g.
   `s3.us-west-004.backblazeb2.com`). The region is the middle part
   (`us-west-004`).
2. **App Keys → Add a New Application Key**, scoped to that bucket. Copy the
   **keyID** into `B2_KEY_ID` and the **applicationKey** into
   `B2_APPLICATION_KEY` (the secret is shown only once).
3. Fill in `B2_BUCKET` and `B2_ENDPOINT` (`https://` + the endpoint host).
4. Run `php artisan config:clear`, then verify:

   ```bash
   php artisan backblaze:check    # writes, reads and deletes a test file on B2
   ```

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
