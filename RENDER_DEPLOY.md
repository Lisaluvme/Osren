# Deploy the OSREN backend to Render

This deploys **only the backend** (`backend/`) — the Node.js + Express API that
reads/writes your Google Sheet. Once live, the Android app (and the web app)
talk to it over HTTPS and work on **any phone, anywhere** — no PC required.

> The Node/Express backend can't run *inside* the Android app (no Node runtime
> on a phone, and secret keys must never ship in an APK), so it lives on Render
> and the app calls it. `render.yaml` (repo root) configures it.

---

## 0. Prerequisite: push the repo to GitHub
Render deploys from GitHub. If `D:\MODU\osren-integrated-ops-manager` isn't on
GitHub yet, create a **private** repo and push it.

## 1. Create the service (two ways — pick one)

### Method A — Blueprint (fastest, uses `render.yaml`)
1. **https://dashboard.render.com** → **New +** → **Blueprint**.
2. Select your `osren-integrated-ops-manager` repo. Render detects `render.yaml`.
3. It prompts you for the **secret** variables (`sync: false` ones):
   `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` (+ the optional ones you want).
   Paste the values (see below).
4. **Apply** → Render builds & deploys.

### Method B — Manual web service (no Blueprint)
1. **New +** → **New Web Service** → connect your repo.
2. Set:
   - **Name:** `osren-backend`
   - **Root Directory:** `backend`  ⚠️ critical (else it builds the frontend)
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
3. **Advanced → Health Check Path:** `/api/health`
4. Add the Environment variables (below) → **Create Web Service**.

## 2. Environment variables
(`PORT` is provided by Render automatically — **do not set it yourself**.)

| Variable | Required? | Value / where to get it |
|---|---|---|
| `USE_MOCK_DATA` | ✅ | `false` |
| `GOOGLE_SPREADSHEET_ID` | ✅ | `1EzXFasyQxlhhDUCwTbhSc_Zxdm077xNNVvzznw0gwgk` (your live sheet) |
| `GOOGLE_CLIENT_EMAIL` | ✅ | service-account `client_email` (see below) |
| `GOOGLE_PRIVATE_KEY` | ✅ | service-account `private_key` (see newline note) |
| `GOOGLE_DRIVE_FOLDER_ID` | optional | `1WcpI9VKc9MZ3A-KFs5fgcj3ldYdSWhS3` (only for image uploads) |
| `GEMINI_API_KEY` | optional | only for AI features |
| `STRIPE_SECRET_KEY` | optional | only for payments |
| `STRIPE_WEBHOOK_SECRET` | optional | Stripe webhook signing |
| `FIREBASE_PROJECT_ID` | optional | `osren-becbb` (only for backend Firebase Admin) |
| `FIREBASE_CLIENT_EMAIL` | optional | Firebase service-account email |
| `FIREBASE_PRIVATE_KEY` | optional | Firebase service-account key |

**To get inventory working, you only NEED the four `✅` rows.** The rest enable
payments / AI / Firebase-Admin features.

### `GOOGLE_PRIVATE_KEY` — newline handling
Render's variable editor accepts multi-line values. Paste the key with **real
line breaks** so it starts with `-----BEGIN PRIVATE KEY-----` and ends with
`-----END PRIVATE KEY-----`. The backend also tolerates the single-line form
with literal `\n`, but real line breaks are safest.

### Where to get the Google creds
Your repo already contains the service-account key files — open either in a
text editor and copy the two fields:
- `backend/google-credentials.json`
- `osren-app-22f398982544.json` (repo root)

Copy `client_email` → `GOOGLE_CLIENT_EMAIL`, and `private_key` →
`GOOGLE_PRIVATE_KEY`.

> 🔒 **Security:** those two JSON files are **live secrets committed to git**.
> After deploying, remove them from the repo (add to `.gitignore`) and rotate
> the key in Google Cloud IAM. Anyone with repo read access currently has full
> access to your Google Sheet.

## 3. Verify
Render gives a URL like `https://osren-backend.onrender.com`. Open in a browser:
```
https://osren-backend.onrender.com/api/health         → {"status":"OK",...}
https://osren-backend.onrender.com/api/inventory/list → your items
```
In the Render logs you should see `✅ Inventory routes loaded`,
`Google Sheets service initialized successfully`, then `Server running on port …`.

## 4. Point the app at it
In the **OSREN Ops app → Settings → Backend API URL**, enter:
```
https://osren-backend.onrender.com/api
```
(no trailing slash). Pull-to-refresh — inventory loads over HTTPS from anywhere.

---

## Notes
- **Free plan:** Render free web services **sleep after 15 min of inactivity**
  and take ~30–60 s to wake on the next request (first hit after idle is slow).
  A paid plan ($7/mo "Starter") stays always-on if you need that.
- **Local dev still works** as before: `npm run backend` on your PC +
  `http://10.0.2.2:5000/api` on the emulator. Render is the always-on option.
- **HTTPS:** once on Render's `https://` URL, you could later turn off
  `usesCleartextTraffic` in `mobile/android/app/src/main/AndroidManifest.xml`.
