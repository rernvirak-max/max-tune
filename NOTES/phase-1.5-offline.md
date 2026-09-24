# Phase 1.5 ? Offline play (dogfood)

Branch: `feature/phase-1.5-offline`

## What shipped

- IndexedDB audio + metadata (`src/services/offline-db.js`)
- Pinia offline store (`src/stores/offline-store.js`) ? Wi?Fi-only default ON (`maxtune-wifi-only`)
- Player local blob fallback + offline play notify (`src/stores/player-store.js`)
- Connectivity banner (`useConnectivity` + MainLayout) ? browser offline OR engine unreachable
- TrackRow / Now Playing / Playlist download / Library All|Downloaded / Settings storage
- Quasar PWA shell (`src-pwa/register-sw.js` + `manifest.json`) ? **audio stays in IndexedDB**, not SW cache exclusively
- Frozen copy in `src/constants/offline-copy.js`

## Dogfood (Android Chrome + desktop Chromium)

1. Run engine on `:8000` and SPA:
   - `npm run dev` (IndexedDB offline audio works without SW)
   - **or** `npx quasar dev -m pwa` for service worker / installable shell
2. Log in, upload or open owned tracks (not Jamendo link-only / `import_mode=linked`).
3. Make a track available offline (row download icon) or **Download playlist**.
4. Confirm mint `download_done` on row / Now Playing; Settings shows storage used.
5. DevTools ? Network ? Offline (or airplane mode):
   - Slim banner: "You're offline ? Playing downloads only"
   - Library ? **Downloaded** still lists tracks; play works from blob
   - Non-downloaded play ? "Not available offline"
   - Upload / create playlist ? "Connect to do that"
6. Online again: optional "Back online" toast; stream play resumes; auto-fallback if stream fails and local exists.
7. Wi?Fi-only: leave ON; on devices where `navigator.connection.type === 'cellular'`, download should toast and wait.

### PWA note

- Production: `npx quasar build -m pwa` (verified).
- Dev without `-m pwa` still has IndexedDB offline audio; SW shell caching needs PWA mode.
- Icons under `public/icons/` (Quasar PWA set + existing favicons).

### iOS

Best-effort only ? Settings soft note. Not a dogfood blocker.

## Non-goals still out

- Capacitor, Jamendo/link-only offline, fifth mobile tab, STATUS.md merge note (DM after merge)
- Engine changes: none (signed `stream_url` + Sanctum bearer fetch)
