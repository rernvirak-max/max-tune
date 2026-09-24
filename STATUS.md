# MaxTune — Status

Last updated: 2026-09-24

Personal multi-tenant music platform: Quasar SPA (`max-tune`) + Laravel API (`max-tune-engine`) + Sanctum. Private-by-default from day one.

## Where we are

**Phase 0 (shell)** — done  
**Phase 1 online MVP** — done  
**Phase 1.1 Pulse Room UI + background / Media Session** — done (merged PR #1)  
**Phase 1.25 Jamendo catalog** — code done, blocked on Jamendo account approval / `JAMENDO_CLIENT_ID`  
**Phase 1.5 offline** — not started  
**Phase 2 invite** — not started  

---

## Done

### Auth & tenancy
- Sanctum bearer auth (login / register / logout / me)
- `APP_MODE` config (`personal` | `invite` | `public`)
- Multi-tenant ownership on tracks, playlists, likes

### Library & upload
- Upload audio (getID3 metadata + optional cover extract)
- Library list / filter / delete
- Storage abstraction (`MediaStorage`) for local → S3 later
- PHP upload limits raised for large files

### Streaming & player
- Signed Range stream + cover endpoints
- HTML5 player: play/pause, seek, volume, queue next/prev
- Dev proxy: Vite `/engine` → `php artisan serve` (`APP_URL=http://127.0.0.1:8000`)
- **Phase 1.1:** Media Session (lock-screen / OS media hub), singleton `<audio>` across SPA nav, no visibility-pause; `resumeFromMediaSession()` for OS Play (never toggle)
- Glass mini player + **NowPlayingSheet**; theme Dark / Light / System (`maxtune-theme`)

### Playlists
- CRUD playlists
- Add / remove tracks
- Detail page + play-all / play-from-index

### Likes
- Like / unlike tracks
- Liked songs page + Home tiles
- Heart on track rows and player bar

### Catalog (Jamendo) — implemented, needs key
- Search: `GET /api/catalog/jamendo?q=`
- Import linked track: `POST /api/catalog/jamendo/import`
- Search page tabs: **Library** | **Jamendo**
- Linked imports use Jamendo stream/cover URLs (no file download yet)

### UI (Pulse Room)
- Design tokens (mint live + warm coral), Syne + Outfit
- Settings: Appearance + Playback / Media Session copy
- Dogfood bar: Android Chrome + desktop Chromium (iOS best-effort; Capacitor deferred)

### Tooling
- Laravel Boost installed on engine
- Feature tests: playlists, likes, Jamendo catalog (HTTP faked)

---

## Local run (current)

| Piece | How |
| --- | --- |
| API | `php artisan serve` on `127.0.0.1:8000` |
| SPA | Quasar/Vite on `127.0.0.1:9100`, proxy `/engine` → API |
| Herd | Prefer `https://max-tune-engine.test` when healthy; flaky on this machine historically |

Frontend API mode (`src/helpers/api/apiConfig.js`): local uses `/engine/api`.

---

## Blocked / setup needed

### Jamendo
1. Account must be **active/approved** on [devportal.jamendo.com](https://devportal.jamendo.com) (currently: *"isn't active or hasn't been approved yet"*).
2. Create an application → copy `client_id`.
3. In `max-tune-engine/.env`:

```env
JAMENDO_CLIENT_ID=your_client_id
```

4. Restart the API process.

Until then, catalog search returns a clear 502 / config error. Integration code is ready.

---

## API surface (engine)

Authenticated (`auth:sanctum`):
- `auth/*`, `me`
- `tracks` CRUD (upload via POST multipart)
- `playlists` CRUD + attach/detach tracks
- `likes` + `tracks/{id}/like`
- `catalog/jamendo`, `catalog/jamendo/import`

Signed or owner auth:
- `tracks/{id}/cover`
- `tracks/{id}/stream`

---

## SPA routes

| Route | Page |
| --- | --- |
| `/login` | Auth |
| `/` | Home |
| `/library` | Upload + library |
| `/liked` | Liked songs |
| `/playlists`, `/playlists/:id` | Playlists |
| `/search` | Library + Jamendo search |
| `/settings` | Settings (theme + playback notes) |

---

## Next (when you say go)

1. **Unblock Jamendo** — approve account, set `JAMENDO_CLIENT_ID`, smoke-test Search → Jamendo.
2. **Phase 1.5 offline** — cache / download for offline play (PWA or Capacitor path TBD).
3. **Phase 2 invite** — invite codes / approval when leaving personal mode.
4. Optional polish: shuffle/repeat, playlist reorder UI, stored (downloaded) Jamendo imports, Herd restore; logout → `player.clear()`, TrackRow playing naming, artwork MIME, Media Session tests.

---

## Repos

| Repo | Role |
| --- | --- |
| `max-tune` | Quasar Vue 3 SPA |
| `max-tune-engine` | Laravel 13 API |
