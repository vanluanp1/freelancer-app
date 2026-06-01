$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$required = @(
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'js/cloud.js',
  'js/notifications.js',
  'js/pages/calendar.js'
)

foreach ($file in $required) {
  if (-not (Test-Path (Join-Path $root $file))) {
    throw "Missing required file: $file"
  }
}

$manifest = Get-Content (Join-Path $root 'manifest.webmanifest') -Raw | ConvertFrom-Json
if ($manifest.start_url -ne '/') { throw 'Unexpected PWA start_url' }

$cloud = Get-Content (Join-Path $root 'js/cloud.js') -Raw
if ($cloud -notmatch 'setTimeout\(\(\) => syncCloudBackup\(\), 15000\)') {
  throw 'Auto-sync debounce is missing'
}

$schema = Get-Content (Join-Path $root 'supabase/schema.sql') -Raw
if ($schema -notmatch 'enable row level security') { throw 'RLS is missing' }
if ($schema -notmatch 'revoke all on table public.user_backups from anon') { throw 'Anon revoke is missing' }

Write-Host 'smoke-check ok'
