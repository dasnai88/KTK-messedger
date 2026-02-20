# AGENTS.md

This file is the project playbook for all future coding agents and models.
Follow it strictly for every task in this repository.

## 1) Project Reality

- Repository: `https://github.com/dasnai88/KTK-messedger`
- Main branch: `main`
- Backend runtime: Render (Node.js service)
- Database: Render PostgreSQL (external DB URL)
- Web client: React + Vite (`client/`)
- Server: Express + Socket.IO (`server/`)
- Mobile client: Flutter (`mobile/`)

Key rule:
- Backend is not local-first anymore; production backend lives on Render.
- Any backend change must be committed and pushed so Render can deploy it.

## 2) Source of Truth

- Database schema source of truth: `server/src/schema.sql`
- API/server source of truth: `server/src/index.js`
- Web API wrapper: `client/src/api.js`
- Main web UI: `client/src/App.jsx`
- Main web styles: `client/src/index.css`

Never invent parallel schema files or ad-hoc SQL migrations outside `server/src/schema.sql` unless explicitly requested.

## 3) Mandatory Workflow After Every Code Change

Always do the full sequence below:

1. Make code changes.
2. Run frontend build check:
   - `cd client`
   - `npm run build`
3. If backend/schema touched, perform a quick syntax sanity check when possible:
   - from repo root: `node --check server/src/index.js`
4. Commit with a clear message.
5. Push to GitHub `origin` (usually `main`).
6. If frontend (`client/`) was changed, immediately deploy `client/dist` to production FTP (`configcorner.online`) right after push.

No exceptions unless the user explicitly asks not to commit/push.

## 4) Git Rules

- Keep commits focused and readable.
- Use clear commit messages, for example:
  - `feat: add message reactions menu and realtime sync`
  - `fix: correct context menu position near cursor`
  - `refactor: extract message reaction helpers`
- Push after each completed task so state is reproducible.
- Do not rewrite remote history unless the user asks.
- Do not commit generated logs, temporary artifacts, or random upload files.

Do not commit these kinds of files:
- `.devclient.log`
- `client/.devclient.log`
- `client/.devclient.err.log`
- Temporary test media in `server/uploads/*` unless explicitly requested

## 5) Database Change Policy

When changing DB structure:

1. Update `server/src/schema.sql`.
2. Keep SQL idempotent when possible (`create table if not exists`, safe `DO $$ BEGIN ... EXCEPTION ... END $$;` blocks).
3. Apply schema to Render PostgreSQL.
4. Verify expected tables/columns exist.
5. Push code changes.

Render DB apply examples:

### CMD + Docker (Windows)

```bat
cd /d C:\Users\Ilshat\Documents\Elia
set "DB_URL=postgresql://<user>:<pass>@<host>/<db>?sslmode=require"
type server\src\schema.sql | docker run --rm -i postgres:16 psql "%DB_URL%"
docker run --rm postgres:16 psql "%DB_URL%" -c "select now();"
```

### PowerShell + Docker (Windows)

```powershell
Set-Location C:\Users\Ilshat\Documents\Elia
$DB_URL = "postgresql://<user>:<pass>@<host>/<db>?sslmode=require"
Get-Content -Raw .\server\src\schema.sql | docker run --rm -i postgres:16 psql "$DB_URL"
docker run --rm postgres:16 psql "$DB_URL" -c "select now();"
```

Security note:
- Never paste real credentials into committed files.
- If credentials were exposed in chat/logs, rotate password in Render and update environment variables.

## 6) Render Deployment Notes

- Render deploys from GitHub push.
- After push, ensure Render service restarts and deploy is healthy.
- Health endpoint (typical): `/api/health`
- If feature depends on schema and backend returns migration errors, apply `server/src/schema.sql` to Render DB and redeploy/restart service.

## 6.1) Frontend Hosting (REG.RU / ISPmanager)

Current production web domain:
- `configcorner.online`

Current hosting setup (frontend static files):
- FTP host: `31.31.196.45`
- FTP port: `21`
- FTP user: `u3046522_gpt`
- Document root for this site: `/www/configcorner.online/`

Critical boundary:
- Deploy only `configcorner.online`.
- Do not touch other folders under `/www` unless explicitly requested.

Security:
- Never store FTP passwords/tokens in git.
- Read credentials from user input or secure env vars at runtime.
- If credentials were shared in chat, recommend rotating them after deployment.

### Frontend Deploy Procedure (must follow exactly)

1. Build latest frontend:
   - `cd client`
   - `npm run build`
2. Upload `client/dist/index.html` to `/www/configcorner.online/index.html`.
3. Clear old remote bundle files in `/www/configcorner.online/assets/`.
4. Upload fresh files from `client/dist/assets/*` to `/www/configcorner.online/assets/`.
5. Verify remote `index.html` references the same uploaded hashed files in `/assets/`.
6. Validate in browser with cache-bypass:
   - Open `https://configcorner.online/?v=<timestamp>`
   - Hard refresh (`Ctrl+F5`)
   - DevTools -> Network -> `Disable cache` during verification.

If UI changes are not visible after deploy:
- Most likely old cached assets or wrong document root.
- Confirm domain points to `/www/configcorner.online/` in ISPmanager.
- Confirm remote `index.html` script/link hashes match uploaded files in `/assets/`.

### Frontend Deploy Policy (strict)

- Any task that changes frontend behavior or styles (`client/src/**`) must end with FTP deploy to `configcorner.online`.
- Do not wait for an extra user prompt like "залей на хостинг" after frontend changes.
- Deploy sequence is mandatory:
  1. `npm run build` in `client/`
  2. upload `dist/index.html`
  3. replace all files in remote `/assets/` with current `dist/assets/*`
  4. verify hashes in remote `index.html` match uploaded assets

## 7) Coding Standards for This Repo

- Keep changes minimal and local to affected modules.
- Prefer explicit, readable code over clever abstractions.
- Avoid large unrelated refactors in feature/fix tasks.
- Reuse existing patterns already present in `App.jsx` and `server/src/index.js`.
- When adding UI behavior:
  - preserve existing visual language;
  - ensure mobile/responsive behavior still works.
- For realtime features:
  - update both API response shape and socket events consistently.
  - keep client-side normalization helpers near related message logic.

## 8) Quality Checklist Before Commit

- Feature works in UI.
- No obvious regressions in chat flow.
- `npm run build` passes in `client/`.
- Server file syntax valid (`node --check server/src/index.js`) when server touched.
- `git diff` contains only intended files.
- No secrets added.
- No accidental binary noise/log files staged.

## 9) Collaboration Contract for Future Models

When asked to "do X":

- Execute changes end-to-end (not only suggest).
- Run required checks.
- Commit and push unless user blocks it.
- Report exactly what changed and where.
- Mention if any manual step is still required (for example applying schema to Render DB).

When user gives infra context (Render URLs, DB info, deployment constraints), treat it as high-priority operating context for all future tasks.

## 10) Quick Command Reference

From repo root:

```bash
# frontend build check
cd client && npm run build

# server syntax check
node --check server/src/index.js

# inspect git state
git status --short
git diff -- <file>

# commit and push
git add <files>
git commit -m "feat: <message>"
git push origin main
```

## 11) Definition of Done

A task is done only when all are true:

1. Requested behavior is implemented.
2. Build check passed (`client`).
3. Commit created.
4. Commit pushed to GitHub.
5. If schema changed: schema applied to Render PostgreSQL or clear manual command provided.
