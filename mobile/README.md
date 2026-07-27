# OSREN Ops Mobile

A **Flutter / Android** companion app for the OSREN integrated operations
manager. It mirrors the modules of the React web app and talks to the **same
Node/Express backend** — no separate API is required.

## What's included

| Module | Screens | Backend |
|---|---|---|
| **Login** | Email/password, JWT session, quick demo logins | `POST /api/auth/login` |
| **Dashboard** | KPIs, low-stock list, recent orders | `/api/inventory/summary`, `/api/orders` |
| **Inventory** | List, search, low-stock filter, detail, quick stock adjust | `/api/inventory/*` |
| **Sales & Orders** | List, status filter, lifecycle actions, create order | `/api/orders` |
| **Warehouse Ops** | Goods-received (GRN), stock transfers, stock-take | `/api/inventory/grn`, `/stock-transfer`, `/stock-take` |
| **Accounts (AP/AR)** | Supplier invoices, payment vouchers, receipt collections | `/api/finance/*` |
| **Notifications** | List, unread badge, mark-all-read | `/api/notifications` |
| **Settings** | Profile, runtime API URL, change password, sign out | `/api/auth/me` |

Navigation is **role-aware** (`admin`, `sales`, `driver`, `finance`,
`warehouse`) — each user only sees the modules their role permits, matching the
web app's `MENU_ITEMS`.

## Project structure

```
lib/
  config/        API base URL + persisted keys
  models/        Dart data classes mirrored from the web app's types.ts
  services/      ApiClient (envelope + Bearer auth) + one service per domain
  providers/     ChangeNotifier state (auth, inventory, orders, finance, ...)
  theme/         Material 3 theme
  widgets/       Shared UI (StatCard, StatusChip, EmptyState, ...)
  screens/       Login, MainShell (drawer nav) + each module
  main.dart      Entry point
  app.dart       Providers + auth gate
```

## Getting started

### 1. Prerequisites
- Flutter 3.44+ (Dart 3.12+). This project was created with Flutter 3.44.7.
- Android SDK (API 36 works). Accept licenses once:
  `flutter doctor --android-licenses`.
- A JDK 17+ for Gradle. Android Studio's bundled JBR (21) works:
  `flutter config --jdk-dir "C:\Program Files\Android\Android Studio\jbr"`.

### 2. Install packages
```bash
flutter pub get
```

### 3. Point the app at the backend
The backend must be running (the existing app's `backend/` on port 5000).
Configure the base URL **in the app**: sign in → Settings → *Backend API URL*.

| Where you're running | Base URL |
|---|---|
| Android emulator | `http://10.0.2.2:5000/api` (default) |
| Physical device (same Wi-Fi as the PC) | `http://<your-pc-lan-ip>:5000/api` |

`android:usesCleartextTraffic` is enabled so plain HTTP works during
development. For production, put the backend behind HTTPS and disable it.

### 4. Run / build
```bash
flutter run                       # on a connected device/emulator
flutter build apk --debug         # produces a debug APK
flutter build apk --release       # release build (needs signing config)
```

Demo logins (if seeded by the backend's `create_users.js`):
`admin@osren.com`, `sales@osren.com`, `warehouse@osren.com`,
`finance@osren.com`, `driver@osren.com` — password `Password123`.

## Known backend gaps (affect both web and mobile)

These are pre-existing in the web app's backend and surfaced here so nothing
fails silently:

1. **`/api/finance` is not mounted.** `backend/routes/finance.js` exists but
   `server.js` doesn't `app.use('/api/finance', ...)`. To make the Accounts
   screen live, add this one line to `backend/server.js`:
   ```js
   app.use('/api/finance', require('./routes/finance'));
   ```
   Until then, the Accounts screen shows a clear 404 banner.
2. **`GET /api/orders/stats` is shadowed** by `GET /api/orders/:id` (declared
   after it) and returns 404. This app avoids `/stats`; the dashboard derives
   its metrics from `/orders` and `/inventory/summary` instead.
3. The demo `LoginPage` on the web doesn't call the API; the mobile app uses
   the **real** `/api/auth/login` flow.

## Notes
- State management: `provider`. HTTP: `http`. Persistence: `shared_preferences`.
- Money is formatted as `RM` (the web app's default Stripe currency).
