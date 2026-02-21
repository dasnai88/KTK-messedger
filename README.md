# KTK Messenger

Monorepo for a realtime messenger with web, backend, and Flutter mobile clients.

## Production topology

- Backend: Render (Node.js service)
- Database: Render PostgreSQL
- Web frontend hosting: `https://configcorner.online` (FTP deploy of static `client/dist`)
- Main branch: `main`

Important: backend is production-first on Render. Any backend change must be pushed to GitHub so Render can deploy it.

## Tech stack

- Web: React + Vite + Socket.IO client
- Server: Node.js + Express + Socket.IO + PostgreSQL (`pg`)
- Mobile: Flutter + Dio + Provider + Socket.IO

## Repository layout

```text
client/   React + Vite web app
server/   Express + Socket.IO backend
mobile/   Flutter mobile app
docs/     Screenshots and docs assets
```

## Source of truth files

- DB schema: `server/src/schema.sql`
- Main backend API: `server/src/index.js`
- Web API wrapper: `client/src/api.js`
- Main web UI: `client/src/App.jsx`
- Main web styles: `client/src/index.css`

## Local development

### Prerequisites

- Node.js 18+
- npm
- Docker (optional, for local PostgreSQL)
- Flutter SDK (for mobile)

### 1) Clone and install

```bash
git clone https://github.com/dasnai88/KTK-messedger.git
cd KTK-messedger
cd server && npm install
cd ../client && npm install
cd ../mobile && flutter pub get
```

### 2) Configure backend env

Create `server/.env` from template:

```bash
cp server/.env.example server/.env
```

Set at least:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=strong_secret
CORS_ORIGIN=http://localhost:5173
```

For web push (optional):

```env
WEB_PUSH_SUBJECT=mailto:admin@example.com
WEB_PUSH_PUBLIC_KEY=...
WEB_PUSH_PRIVATE_KEY=...
```

Generate keys:

```bash
npx web-push generate-vapid-keys
```

### 3) Apply database schema

```bash
psql "$DATABASE_URL" -f server/src/schema.sql
```

Or via Docker image:

```bash
cat server/src/schema.sql | docker run --rm -i postgres:16 psql "$DATABASE_URL"
```

### 4) Run backend

```bash
cd server
npm run dev
```

### 5) Run web client

```bash
cd client
npm run dev
```

Web app: `http://localhost:5173`

### 6) Run Flutter client

```bash
cd mobile
flutter run --dart-define API_BASE_URL=http://10.0.2.2:4000/api --dart-define SOCKET_URL=http://10.0.2.2:4000
```

For a physical device, replace `10.0.2.2` with your LAN IP.

## Required verification after code changes

### Always

```bash
cd client && npm run build
```

### If backend or schema changed

```bash
node --check server/src/index.js
```

### Mobile checks (recommended)

```bash
cd mobile && flutter analyze
```

## Deployment workflow

### Backend (Render)

1. Commit changes.
2. Push to `origin/main`.
3. Render auto-deploys from GitHub.
4. Verify health endpoint: `/api/health`.

If deploy fails due schema mismatch, apply `server/src/schema.sql` to Render DB and restart service.

### Frontend (FTP to configcorner.online)

For every frontend change under `client/src/**`:

1. Build latest assets:

```bash
cd client
npm run build
```

2. Upload:
- `client/dist/index.html` -> `/www/configcorner.online/index.html`
- clear remote `/www/configcorner.online/assets/`
- upload all `client/dist/assets/*` -> `/www/configcorner.online/assets/`

3. Verify hashes in remote `index.html` match uploaded files.
4. Open cache-bypass URL:
- `https://configcorner.online/?v=<timestamp>`
- hard refresh (`Ctrl+F5`)

Do not upload to other folders under `/www` unless explicitly requested.

## Common commands

From repo root:

```bash
# frontend build
cd client && npm run build

# backend syntax check
node --check server/src/index.js

# git status
git status --short

# inspect specific diff
git diff -- server/src/index.js
```

## Security and repository hygiene

- Do not commit credentials/tokens/passwords.
- Do not commit local logs:
  - `.devclient.log`
  - `client/.devclient.log`
  - `client/.devclient.err.log`
- Do not commit temporary test uploads from `server/uploads/*`.

## Troubleshooting

### Web UI updated but production shows old version

- Usually stale assets in `/assets/` or browser cache.
- Re-upload `index.html` + full `assets/` set.
- Verify hashed filenames match exactly.

### Backend returns migration errors in production

- Apply `server/src/schema.sql` to Render PostgreSQL.
- Restart Render service.

### Flutter app cannot reach backend

- Emulator uses `10.0.2.2` for host machine.
- Physical device must use machine LAN IP.
- Check `API_BASE_URL` and `SOCKET_URL` values.
