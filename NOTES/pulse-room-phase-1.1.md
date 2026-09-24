# Pulse Room + Phase 1.1 — implementation notes

Branch: `feature/pulse-room-phase-1.1`
Date: 2026-09-24 (Asia/Bangkok)

## Plan (done)
1. Phase 1.1 `player-store`: Media Session metadata (96–512 artwork entries), play/pause/next/prev/seekto handlers, playbackState + positionState; singleton `<audio>` kept mounted in DOM across SPA nav; **no** pause on visibility/blur/pagehide.
2. UI: light theme tokens + `localStorage` theme (`dark`|`light`|`system`); `NowPlayingSheet.vue`; PlayerBar polish; Settings Appearance/Playback; TrackRow playing + aria; reduced-motion.
3. Engine: signed stream/cover URL TTL already `now()->addHours(6)` — **unchanged**.

## Out of scope
Offline, Capacitor, CarPlay, gapless, Jamendo unblock, shuffle/repeat enable, social.

## Dogfood — Media Session / background
1. Run API (`php artisan serve`) + SPA (`npm run dev` / Quasar on :9100).
2. Sign in, play a library track from Library or Liked.
3. **Desktop Chromium:** lock screen or switch apps; use OS media keys / Chrome media hub — title, artist, artwork, play/pause/next/prev.
4. **Android Chrome:** play, lock phone or switch apps; use lock-screen / notification media controls.
5. While playing, navigate Home → Library → Playlists — audio must not stop.
6. Hide tab only — must **not** pause. Explicit pause (in-app or OS) must pause.
7. Settings → Appearance: toggle Light/Dark/System; Settings → Playback notes for iOS best-effort.

## iOS (honest)
Best-effort only. Do not treat lock-screen parity as a ship gate for Phase 1.1.
