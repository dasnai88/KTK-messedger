# KTK Messenger Mobile (Flutter)

This folder contains a Flutter client for the existing Node.js API.

## Prereqs
- Flutter SDK in PATH (`flutter --version`)
- Running backend (`server/`) on your machine

## Run
From repo root:

```powershell
cd mobile
flutter create . --platforms=android,ios
flutter pub get

# Android emulator (default)
flutter run --dart-define API_BASE_URL=http://10.0.2.2:4000/api --dart-define SOCKET_URL=http://10.0.2.2:4000

# iOS simulator
# flutter run --dart-define API_BASE_URL=http://localhost:4000/api --dart-define SOCKET_URL=http://localhost:4000

# Physical device (replace with your PC LAN IP)
# flutter run --dart-define API_BASE_URL=http://192.168.1.10:4000/api --dart-define SOCKET_URL=http://192.168.1.10:4000
```

If Flutter warns about existing files, keep the current `lib/` and `pubspec.yaml` from this repo.

## Features
- Auth (login/register)
- Feed (posts, likes, reposts, comments)
- Chats (1:1 + group), realtime via Socket.IO
- Profile edit + avatar/banner upload
- Admin panel (ban/unban, warn, moderator)

## Notes
- Audio calls (WebRTC) are not implemented in the mobile client yet.
- Server uploads are limited to images (jpg/png/webp).
