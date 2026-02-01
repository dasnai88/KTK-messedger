# KTK Messenger (React + Node.js + PostgreSQL)

Starter project for a college messenger (React + Node.js + PostgreSQL).

## Structure
- client/ - React (Vite)
- server/ - Node.js + Express + PostgreSQL
- docker-compose.yml - local Postgres

## Requirements
- Node.js 18+
- Docker (optional but recommended)

## Quick start
1) Start Postgres:
   docker compose up -d
2) Server:
   cd server
   copy .env.example .env
   npm install
   npm run dev
3) Apply schema (first time only):
   psql -h localhost -U elia -d elia_messenger -f server/src/schema.sql
4) Client:
   cd client
   npm install
   npm run dev

Open http://localhost:5173
Health check: http://localhost:4000/api/health

## Security notes
- Change JWT_SECRET in server/.env
- Passwords are hashed with bcrypt

## Database
See server/src/schema.sql for base tables.