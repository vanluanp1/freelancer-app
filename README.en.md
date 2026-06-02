# FreelanceHub

**English** | [Tiếng Việt](README.md)

A personal productivity app for freelancers with Google login, per-account cloud sync, and Progressive Web App (PWA) support.

## Demo

- Website: [freelancer-app-one.vercel.app](https://freelancer-app-one.vercel.app/)
- Repository: [github.com/vanluanp1/freelancer-app](https://github.com/vanluanp1/freelancer-app)

## Features

- Dashboard with deadline priorities, Pomodoro status, and project workload.
- Kanban task management with priorities, deadlines, and projects.
- Monthly calendar: drag and drop tasks onto dates to update deadlines.
- Project tracking, habits, work journal, and personal finance statistics.
- Deadline and Pomodoro reminders using the Notification API.
- Manual JSON export and daily internal snapshots.
- Automatic backup sync to Supabase after local changes.
- Automatic restore when a newer cloud backup exists on another device.
- Installable PWA with basic offline access.

## Security

- Google login through Supabase Auth is required before accessing the app.
- Local data is scoped by the authenticated user ID.
- Row Level Security (RLS) is enabled for the Supabase backup table.
- Each account can only read, write, and delete its own backup.
- The frontend only uses a Supabase Publishable Key.
- CSP and security headers are configured in [`vercel.json`](vercel.json).

Never commit a `service_role` key, Google Client Secret, or any backend secret to the frontend or GitHub.

## Tech Stack

- HTML, CSS, and vanilla JavaScript
- Supabase Auth, Database, and RLS
- Google OAuth 2.0
- Vercel
- Service Worker and Web App Manifest

## Run Locally

This project is a static site. Start it with any static web server:

```powershell
npx serve .
```

Then open the local URL printed in the terminal.

## Configure Supabase

1. Create a project on [Supabase](https://supabase.com/).
2. Open the SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql).
3. Add the Project URL and Publishable Key to [`js/config.js`](js/config.js).
4. In Authentication > URL Configuration, add the production URL to Redirect URLs.
5. In Authentication > Providers, enable the Google provider.

## Configure Google OAuth

1. Create a Web application OAuth Client ID in the [Google Cloud Console](https://console.cloud.google.com/).
2. Add the Supabase callback URL to Authorized redirect URIs:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

3. Add the Google Client ID and Client Secret to the Google provider in Supabase.

Store the Client Secret in the Supabase Dashboard only. Do not add it to the source code.

## Deploy to Vercel

Import the repository into [Vercel](https://vercel.com/) as a static site, or run:

```powershell
npx vercel --prod
```

After receiving the production domain, update Redirect URLs in Supabase Auth.

## Quick Check

Run the smoke test on Windows:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\tests\smoke-check.ps1
```

Check JavaScript syntax:

```powershell
node --check .\js\app.js
node --check .\js\cloud.js
node --check .\sw.js
```

## Project Structure

```text
.
|-- index.html
|-- style.css
|-- manifest.webmanifest
|-- sw.js
|-- js/
|   |-- app.js
|   |-- cloud.js
|   |-- store.js
|   `-- pages/
|-- supabase/
|   `-- schema.sql
`-- tests/
    `-- smoke-check.ps1
```

## License

No license has been declared. All rights are reserved by the author by default.
