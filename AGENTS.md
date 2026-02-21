# AGENTS.md

Operational playbook for coding agents working in this repository.
Follow these rules on every task unless user explicitly overrides.

## 1) Project reality

- Repository: `https://github.com/dasnai88/KTK-messedger`
- Main branch: `main`
- Backend runtime: Render (Node.js service)
- Database: Render PostgreSQL
- Web client: React + Vite (`client/`)
- Server: Express + Socket.IO (`server/`)
- Mobile client: Flutter (`mobile/`)

Critical rule:
- Backend is production-first on Render. Backend changes are not complete until committed and pushed.

## 2) Source of truth

- DB schema: `server/src/schema.sql`
- Backend API: `server/src/index.js`
- Web API wrapper: `client/src/api.js`
- Main web UI: `client/src/App.jsx`
- Main web styles: `client/src/index.css`

Do not create parallel schema files or ad-hoc SQL migrations outside `server/src/schema.sql` unless explicitly requested.

## 3) Mandatory workflow after every code change

1. Implement requested changes.
2. Run frontend build check:
   - `cd client`
   - `npm run build`
3. If backend/schema touched, run syntax sanity check:
   - from repo root: `node --check server/src/index.js`
4. Commit with clear message.
5. Push to `origin` (`main` by default).
6. If frontend changed (`client/src/**`), deploy `client/dist` to `configcorner.online` via FTP immediately after push.

No exceptions unless user explicitly says not to commit/push/deploy.

## 4) Git rules

- Keep commits focused and readable.
- Use clear commit messages, for example:
  - `feat: add message reactions menu and realtime sync`
  - `fix: correct context menu position near cursor`
  - `refactor: extract message reaction helpers`
- Push after each completed task.
- Do not rewrite remote history unless asked.
- Do not commit logs, temporary uploads, or random artifacts.

Never commit:
- `.devclient.log`
- `client/.devclient.log`
- `client/.devclient.err.log`
- temporary media under `server/uploads/*` (unless explicitly requested)

## 5) Database change policy

When DB structure changes:

1. Update `server/src/schema.sql`.
2. Keep SQL idempotent where possible (`create table if not exists`, safe `DO $$ ... EXCEPTION ... END $$;`).
3. Apply schema to Render PostgreSQL.
4. Verify expected columns/tables exist.
5. Commit + push.

### Apply schema (PowerShell + Docker)

```powershell
Set-Location C:\Users\Ilshat\Documents\Elia
$DB_URL = "postgresql://<user>:<pass>@<host>/<db>?sslmode=require"
Get-Content -Raw .\server\src\schema.sql | docker run --rm -i postgres:16 psql "$DB_URL"
docker run --rm postgres:16 psql "$DB_URL" -c "select now();"
```

Security:
- Never commit credentials.
- If credentials leaked in logs/chat, rotate them and update env vars.

## 6) Render deployment notes

- Render deploys on GitHub push.
- After push, verify service health (`/api/health`).
- If feature depends on schema and migration errors appear, apply `server/src/schema.sql`, then restart/redeploy service.

## 6.1) Frontend hosting (REG.RU / ISPmanager)

Production domain:
- `configcorner.online`

Hosting target:
- FTP host: `31.31.196.45`
- FTP port: `21`
- FTP user: `u3046522_gpt`
- Document root: `/www/configcorner.online/`

Boundary:
- Deploy only `configcorner.online`.
- Do not change other `/www/*` folders unless user explicitly requests it.

Security:
- Never store FTP password/token in git.
- Read credentials from runtime input/env.
- If credentials were shared in plaintext, recommend rotation after deploy.

### Frontend deploy procedure (strict)

1. Build frontend:
   - `cd client`
   - `npm run build`
2. Upload `client/dist/index.html` to `/www/configcorner.online/index.html`.
3. Remove old files from `/www/configcorner.online/assets/`.
4. Upload new `client/dist/assets/*` to `/www/configcorner.online/assets/`.
5. Verify remote `index.html` references the uploaded hashed assets.
6. Validate with cache bypass:
   - `https://configcorner.online/?v=<timestamp>`
   - hard refresh (`Ctrl+F5`)
   - verify with DevTools network (`Disable cache`).

If UI is not updated:
- check remote hashes in `index.html` vs `/assets/`
- check correct document root mapping in ISPmanager
- clear browser cache and retry

## 7) Coding standards

- Keep changes minimal and targeted.
- Prefer explicit readability over clever abstraction.
- Avoid unrelated refactors.
- Reuse existing patterns in `App.jsx` and `server/src/index.js`.
- For UI changes, keep responsive behavior stable.
- For realtime features, keep API payloads and socket events aligned.

## 8) Quality checklist before commit

- Feature works in UI.
- No obvious regressions in chat flow.
- `client` build passes (`npm run build`).
- Backend syntax check passes when touched (`node --check server/src/index.js`).
- `git diff` contains only intended files.
- No secrets added.
- No accidental binary/log file staging.

## 9) Collaboration contract

When user asks to implement something:

- Execute end-to-end (not just suggestions).
- Run required checks.
- Commit and push unless blocked by user.
- Report exact files changed.
- Mention remaining manual infra steps (for example schema apply on Render DB).

## 10) Quick command reference

From repo root:

```bash
# frontend build check
cd client && npm run build

# backend syntax check
node --check server/src/index.js

# inspect git state
git status --short
git diff -- <file>

# commit and push
git add <files>
git commit -m "feat: <message>"
git push origin main
```

## 11) Definition of done

Task is done only when all are true:

1. Requested behavior implemented.
2. Build check passed (`client`).
3. Commit created.
4. Commit pushed to GitHub.
5. If schema changed: schema applied to Render PostgreSQL, or exact manual apply command provided.

## 12) Session notes (2026-02-22)

Use this section as recent context before making new UI/chat edits.

### 12.1 Mobile chats: back behavior and panel state

- Mobile chat behavior now uses a dedicated pane state:
  - `chatMobilePane: 'list' | 'chat'` in `client/src/App.jsx`.
  - Do not clear `activeConversation` on mobile back.
  - Back button should switch pane to `'list'`.
- Chat open actions must switch pane to `'chat'`:
  - chat list click
  - start conversation from search
  - create group
  - open chat from profile actions
  - push-notification conversation intent

Why: clearing `activeConversation` caused chat list/view regressions on phones.

### 12.2 Mobile chats: visibility regression fix

- On small screens, chat list was visually "empty" because vertical space collapsed.
- Fixes in `client/src/index.css`:
  - in mobile media block, `.chat-list` no longer has restrictive `max-height`.
  - `.chat-list` has safe minimum height.
  - `.chat-items` has minimum height so conversation rows remain visible.

If this bug returns, inspect mobile rules around:
- `.chat-layout`
- `.chat-list`
- `.chat-items`
- `.chat-layout-mobile-active`

### 12.3 Profile achievements redesign

- Achievements were changed from simple "filled profile fields" to merit-based rules.
- Logic lives in `buildProfileAchievements(...)` in `client/src/App.jsx`.
- Current behavior:
  - first achievement is always granted for registration.
  - all other achievements unlock only by measurable activity (posts, followers, tracks, showcase depth, account consistency, high-tier profile metrics).
- UI in profile now shows:
  - unlocked/total counter
  - progress bar
  - unlocked cards + a few locked goals as next targets

### 12.4 Touch context menus (phone support)

- Context menu now opens on phone via long-press (messages and feed posts).
- Implemented in `client/src/App.jsx` with touch timer/move-threshold guard:
  - `TOUCH_CONTEXT_MENU_DELAY_MS = 360`
  - `TOUCH_CONTEXT_MENU_MOVE_THRESHOLD = 12`
- Touch hooks added to:
  - message rows in chat
  - feed cards in feed/profile
- To reduce UX conflict with native iOS/Android menu, coarse-pointer CSS disables native touch callout/user-select for those blocks in `client/src/index.css`.

### 12.5 Reference commits from this session

- `93a43ea` - mobile back navigation no longer hides chats incorrectly
- `e057f4c` - achievements revamp (merit tiers + redesigned card)
- `ed12cc2` - mobile chat list visibility restore
- `a249cef` - touch long-press context menus
- `e66a9f6` - touch context menu UX polish (faster trigger, reduced native callout conflict)
