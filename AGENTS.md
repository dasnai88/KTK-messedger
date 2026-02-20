# AGENTS.md

## Deployment and Git Workflow

- Backend is hosted on Render.
- GitHub repository: `https://github.com/dasnai88/KTK-messedger`.

After any code change, always do all steps below:

1. Run build check for frontend:
   - `cd client`
   - `npm run build`
2. Create a git commit with a clear message.
3. Push the commit to GitHub (`origin`).

If database schema was changed, apply `server/src/schema.sql` to the Render PostgreSQL database before/with deploy.

Do not commit local logs, temporary files, or uploaded test media from `server/uploads`.
