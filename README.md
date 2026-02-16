# KTK Messenger

```
 _  __ _______ _  __     __  __                             
| |/ /|__   __| |/ /    |  \/  |                            
| ' /    | |  | ' / ___ | \  / | ___  ___ ___  ___ _ __   
|  <     | |  |  < / _ \| |\/| |/ _ \/ __/ __|/ _ \ '__|  
| . \    | |  | . \ (_) | |  | |  __/\__ \__ \  __/ |     
|_|\_\   |_|  |_|\_\___/|_|  |_|\___||___/___/\___|_|     
```

Учебный мессенджер: web + mobile клиенты + backend на Node.js.
Проект создан для практики: от архитектуры до полной реализации.

---

## Содержание

- [Функциональность](#функциональность)
- [Стек](#стек)
- [Запуск проекта (Windows + Docker)](#запуск-проекта-windows--docker)
- [Запуск проекта (macOS/Linux + Docker)](#запуск-проекта-macoslinux--docker)
- [Без Docker (локальная PostgreSQL)](#без-docker-локальная-postgresql)
- [Мобильное приложение (Flutter)](#мобильное-приложение-flutter)
- [Web Push Notifications (Phone + PC)](#web-push-notifications-phone--pc)
- [Адреса](#адреса)
- [Скриншоты / Превью](#скриншоты--превью)
- [Структура проекта](#структура-проекта)
- [FAQ / Частые вопросы](#faq--частые-вопросы)

---

## Функциональность

- Регистрация и авторизация пользователей
- Профиль, поиск, список контактов, диалоги
- Приватные сообщения
- Группы и групповые чаты
- Мобильный клиент (Flutter)
- real-time сообщения (socket.io)
- Web Push уведомления на ПК и телефоны (через браузер)

---

## Стек

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Mobile: Flutter
- Notifications: Web Push + Service Worker + VAPID (`web-push`)

---

## Запуск проекта (Windows + Docker)

### 0) Что потребуется

- Git
- Node.js 18+ (LTS)
- Docker Desktop

### 1) Клонирование

```powershell
git clone https://github.com/dasnai88/KTK-messedger.git
cd KTK-messedger
```

### 2) Поднять PostgreSQL (Docker)

```powershell
docker compose up -d
```

### 3) Создать .env

```powershell
copy server\.env.example server\.env
notepad server\.env
```

Важно: замените значения и добавьте JWT_SECRET в .env.

### 4) Запустить backend

```powershell
cd server
npm install
npm run dev
```

### 5) Применить схему БД (один раз)

```powershell
Get-Content ..\server\src\schema.sql | docker exec -i elia_ktk_db psql -U elia -d elia_messenger
```

### 6) Запустить web-клиент

```powershell
cd ..\client
npm install
npm run dev
```

### 7) Открыть

- http://localhost:5173

---

## Запуск проекта (macOS/Linux + Docker)

```bash
git clone https://github.com/dasnai88/KTK-messedger.git
cd KTK-messedger
docker compose up -d
cp server/.env.example server/.env
cd server && npm install && npm run dev
cat server/src/schema.sql | docker exec -i elia_ktk_db psql -U elia -d elia_messenger
cd ../client && npm install && npm run dev
```

Откройте http://localhost:5173

---

## Без Docker (локальная PostgreSQL)

1) Установить PostgreSQL
2) Создать пользователя и базу

```sql
CREATE USER elia WITH PASSWORD 'elia_pass';
CREATE DATABASE elia_messenger OWNER elia;
```

3) Заполнить server/.env

```
PGHOST=localhost
PGPORT=5432
PGUSER=elia
PGPASSWORD=elia_pass
PGDATABASE=elia_messenger
```

4) Применить схему

```powershell
psql -h localhost -U elia -d elia_messenger -f server/src/schema.sql
```

---

## Мобильное приложение (Flutter)

Папка проекта: `mobile/`

### Требования

- Flutter SDK в PATH
- Android Studio + Android SDK

### Инициализация (один раз)

```powershell
cd mobile
flutter create . --platforms=android,ios
flutter pub get
```

### Запуск на Android эмуляторе

```powershell
flutter run --dart-define API_BASE_URL=http://10.0.2.2:4000/api --dart-define SOCKET_URL=http://10.0.2.2:4000
```

### Запуск на физическом устройстве

1) Узнайте IP адрес ПК в одной сети Wi-Fi
2) Укажите его вместо IP

```powershell
flutter run --dart-define API_BASE_URL=http://YOUR_PC_IP:4000/api --dart-define SOCKET_URL=http://YOUR_PC_IP:4000
```

Примечания:
- 10.0.2.2 — адрес хоста для Android-эмулятора
- Для iOS-эмулятора используйте http://localhost:4000

---

## Web Push Notifications (Phone + PC)

Новая версия веб-клиента поддерживает push-уведомления на телефоне и ПК через браузер.

### 1) Установить переменные в `server/.env`

```env
WEB_PUSH_SUBJECT=mailto:admin@example.com
WEB_PUSH_PUBLIC_KEY=YOUR_PUBLIC_KEY
WEB_PUSH_PRIVATE_KEY=YOUR_PRIVATE_KEY
```

Сгенерировать ключи можно так:

```powershell
npx web-push generate-vapid-keys
```

### 2) Обновить схему БД

В БД добавлена таблица `push_subscriptions`.

```powershell
psql -h localhost -U elia -d elia_messenger -f server/src/schema.sql
```

### 3) Перезапустить backend

```powershell
cd server
npm run dev
```

### 4) Включить уведомления в web-клиенте

1) Войдите в аккаунт в web-версии  
2) Нажмите кнопку `Enable notifications` в верхней панели  
3) Разрешите уведомления в браузере

### Важно

- В production нужен HTTPS (на `localhost` push тоже работает).
- Подписка на push делается отдельно для каждого браузера/устройства.
- Если вкладка активна и открыт нужный чат, система не дублирует push.

---

## Адреса

- Web: http://localhost:5173
- API health: http://localhost:4000/api/health

---

## Скриншоты / Превью

Изображения находятся в `docs/screenshots/` и показаны ниже.

![Web - лента](docs/screenshots/web-feed.png)
![Web - чат](docs/screenshots/web-chats.png)
![Mobile - логин](docs/screenshots/mobile-login.png)
![Mobile - лента](docs/screenshots/mobile-feed.png)
![Mobile - чат](docs/screenshots/mobile-chat.png)

---

## Структура проекта

```
KTK-messedger/
|-- client/           # React + Vite
|-- server/           # Node.js + Express + PostgreSQL
|-- mobile/           # Flutter app
|-- docker-compose.yml
|-- server/uploads/   # загруженные файлы
```

---

## FAQ / Частые вопросы

**Почему порт 4000 занят?**
- Проверьте, нет ли другого процесса, и при необходимости измените PORT в `server/.env`.

**Почему БД не поднимается?**
- Проверьте, что Docker запущен и контейнер PostgreSQL поднят.

**Flutter не подключается к backend**
- Эмулятор: 10.0.2.2
- Телефон: IP вашего ПК
- Проверьте `API_BASE_URL` и `SOCKET_URL`

**Почему push-уведомления не приходят в web-версии?**
- Проверьте, что в `server/.env` заполнены `WEB_PUSH_PUBLIC_KEY` и `WEB_PUSH_PRIVATE_KEY`.
- Убедитесь, что применена схема БД (`server/src/schema.sql`) и backend перезапущен.
- Проверьте разрешение уведомлений в браузере для сайта.
- В production проверьте, что сайт открыт по HTTPS.

**Android SDK / лицензии**

```powershell
flutter doctor --android-licenses
```

---

Если найдете баги или есть предложения — открывайте issue, буду рад.
Если что-то не запускается или есть вопросы — пишите.
