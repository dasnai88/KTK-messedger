# KTK Messenger

Простой мессенджер на React + Node.js + PostgreSQL. Инструкция ниже рассчитана на полного новичка.

## Что внутри
- Личные и групповые чаты
- Лента/посты, реакции, репосты
- Загрузка изображений
- Аудио‑звонки (WebRTC)

## Требования
- Node.js 18+ (лучше LTS)
- Git
- Docker Desktop (рекомендуется для базы данных)

## Быстрый старт (Windows, с Docker) — самый простой путь
1) **Запусти Docker Desktop.**
2) **Клонируй проект:**
   ```powershell
   git clone https://github.com/dasnai88/KTK-messedger.git
   cd KTK-messedger
   ```
3) **Запусти базу данных:**
   ```powershell
   docker compose up -d
   ```
4) **Создай файл настроек:**
   ```powershell
   copy server\.env.example server\.env
   notepad server\.env
   ```
   В `server/.env` обязательно замени `JWT_SECRET` на случайную строку.
5) **Запусти сервер:**
   ```powershell
   cd server
   npm install
   npm run dev
   ```
6) **Примените схему БД (нужно один раз):**
   ```powershell
   Get-Content ..\server\src\schema.sql | docker exec -i elia_ktk_db psql -U elia -d elia_messenger
   ```
7) **Запусти клиент:**
   ```powershell
   cd ..\client
   npm install
   npm run dev
   ```
8) **Открой в браузере:** http://localhost:5173

## Быстрый старт (macOS/Linux)
1) `git clone https://github.com/dasnai88/KTK-messedger.git`
2) `cd KTK-messedger`
3) `docker compose up -d`
4) `cp server/.env.example server/.env` и измени `JWT_SECRET`
5) `cd server && npm install && npm run dev`
6) `cat server/src/schema.sql | docker exec -i elia_ktk_db psql -U elia -d elia_messenger`
7) `cd ../client && npm install && npm run dev`
8) Открой http://localhost:5173

## Если не хочешь Docker (локальная PostgreSQL)
1) Установи PostgreSQL.
2) Создай пользователя и базу (пример):
   ```sql
   CREATE USER elia WITH PASSWORD 'elia_pass';
   CREATE DATABASE elia_messenger OWNER elia;
   ```
3) Проверь `server/.env` (PGUSER/PGPASSWORD/PGDATABASE).
4) Примени схему:
   ```powershell
   psql -h localhost -U elia -d elia_messenger -f server/src/schema.sql
   ```

## Структура проекта
- `client/` — фронтенд (React + Vite)
- `server/` — backend (Node.js + Express + PostgreSQL)
- `docker-compose.yml` — Postgres в Docker
- `server/uploads/` — загруженные файлы

## Полезные адреса
- Клиент: http://localhost:5173
- API health check: http://localhost:4000/api/health

## Настройки (.env)
Главные параметры в `server/.env`:
- `PORT` — порт сервера (по умолчанию 4000)
- `CORS_ORIGIN` — откуда разрешены запросы (обычно http://localhost:5173)
- `JWT_SECRET` — обязательно поменять
- `DATABASE_URL` или `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE`

## Остановка
- Сервер/клиент: `Ctrl + C`
- Docker: `docker compose down`

## Частые проблемы
- **ECONNREFUSED к 5432** — база не запущена. Запусти `docker compose up -d`.
- **dockerDesktopLinuxEngine pipe error** — не запущен Docker Desktop или он в режиме Windows‑контейнеров. Включи Linux containers.
- **Cannot find module 'helmet'** — не установлены зависимости сервера: `cd server && npm install`.
- **CORS ошибки** — проверь `CORS_ORIGIN` в `server/.env`.
- **EADDRINUSE** — порт занят. Закрой лишний процесс или поменяй `PORT`.

## Безопасность
- Никогда не коммить `server/.env` в публичный репозиторий.
- Для продакшена включай HTTPS, используй сильные пароли и отдельную базу.

Если что-то не запускается — открой issue или напиши, помогу.
