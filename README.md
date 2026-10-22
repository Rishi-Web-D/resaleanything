# resaleanything

An original classifieds marketplace for pre-owned goods, as **two separate apps in one repo**:

| | Stack | Port | Role |
|---|---|---|---|
| [`backend/`](backend) | Node.js, **Express 5**, **Mongoose** + **MongoDB**, TypeScript | 4000 | REST API: accounts, ads, photos, favourites, chat |
| [`frontend/`](frontend) | **Next.js 16**, React 19, Tailwind 4, TypeScript | 3000 | UI only: no database or business logic |

It is a clean-room build based on publicly visible marketplace patterns. It contains no code, branding or assets from any other classifieds site.

```
browser ──► Next.js :3000 ──(pages: server components call the API with the visitor's cookie)──┐
               │ rewrites /api/*                                                                ▼
               └────────────────────────────────────────────────────────────────────────► Express :4000 ──► MongoDB (+ uploads/ on disk)
```

The browser only ever talks to the Next.js origin. Next proxies `/api/*` to Express, so the session cookie is first-party and no CORS is needed. Server-rendered pages call Express directly and forward the cookie.

## Quick start
You need a MongoDB: a free [Atlas M0](https://www.mongodb.com/atlas) cluster works (create a database user and add your IP under *Network Access*), or run one locally (`docker run -p 27017:27017 mongo:8`, or any `mongod`).
```bash
npm run install:all      # root tools + backend + frontend
export MONGODB_URI='mongodb+srv://<user>:<password>@<cluster>.mongodb.net/resaleanything'   # omit for local mongodb://127.0.0.1:27017
npm run dev              # Express on :4000 and Next on :3000, with reload
# open http://localhost:3000
```
Production (`MONGODB_URI` is required when `NODE_ENV=production`):
```bash
npm run build
npm start                # set INSECURE_COOKIES=1 for the backend only if you serve over plain HTTP
```
Run them individually with `npm run dev --prefix backend` / `npm run dev --prefix frontend`.

## Configuration
Backend (`backend/.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` / `HOST` | `4000` / `127.0.0.1` | listen address. Keep it on loopback or a private network: the API trusts the forwarded client IP set by the Next proxy |
| `APP_ORIGIN` | `http://localhost:3000` | browser origin(s) allowed to make state-changing requests (comma separated) |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/resaleanything` | connection string (**required in production**). Include the database name in the path |
| `MONGODB_DB` | – | database name, only if the URI has none |
| `DATA_DIR` | `backend/data` | photo uploads (`uploads/`), git-ignored |
| `INSECURE_COOKIES` | unset | `1` allows the session cookie over HTTP in production mode |
| `AUTH_RATE_MAX` | `10` | login / register attempts per window per IP |

Frontend: `BACKEND_URL` (default `http://127.0.0.1:4000`) is read at **build** time for the `/api` rewrite and at runtime for server-side calls.

## Backend overview
- **Accounts:** scrypt password hashes; random session tokens stored hashed; `HttpOnly`, `SameSite=Lax` cookie; login and register are rate-limited; expired sessions are deleted by a MongoDB TTL index.
- **Ads:** create with up to 4 photos, edit, mark sold, delete (owner only). Photos are validated by magic bytes (JPEG/PNG/WebP, 3 MB each) and served from `/api/uploads/*`.
- **Search:** keyword, category, city, condition, price range, sort, pagination. Keyword search is an escaped, case-insensitive substring match, so regex characters are plain text.
- **Favourites** are stored per account. **Chat** is buyer ↔ seller per ad, with polling; only the two participants can read a thread.
- **Privacy:** a seller's phone number is only returned to logged-in users.
- Security middleware: `helmet`, a same-origin check on writes, JSON body limit, uniform JSON errors.
- Seeded with 26 demo ads on first start (seed sellers cannot log in).

Layout: `backend/src/{app,server,config,db,auth,middleware}.ts`, `routes/`, `services/`. `db.ts` holds the Mongoose schemas and indexes (unique constraints, session TTL), so they are created on startup.

IDs are MongoDB ObjectIds (24-character hex strings). Chat messages carry a per-conversation sequence number, which the client uses to poll for new messages (`?after=`). Inputs are always coerced to strings, so operators such as `{"$gt": ""}` in a body or query string cannot reach a query.

### API
| Method & path | Auth | Notes |
|---|---|---|
| `POST /api/auth/register`, `/login`, `/logout`; `GET /api/auth/me` | – | |
| `GET /api/ads?q&category&city&condition&min&max&sort&limit&offset` | – | `?ids=1,2` fetches specific ads |
| `POST /api/ads` | ✔ | JSON or `multipart/form-data` with `images` |
| `GET /api/ads/:id`, `GET /api/ads/:id/related` | – | |
| `PATCH` / `DELETE /api/ads/:id` | owner | |
| `GET /api/ads/:id/phone` | ✔ | |
| `GET /api/my/ads` | ✔ | includes sold ads |
| `GET /api/favorites`, `PUT` / `DELETE /api/favorites/:adId` | ✔ | |
| `GET` / `POST /api/conversations`, `GET` / `POST /api/conversations/:id/messages?after=` | ✔ | participants only |
| `GET /api/uploads/:file`, `GET /api/health` | – | |

## Tests
```bash
# API suite (59 checks): needs a MongoDB and a database it can treat as empty (it expects the 26 seed ads)
cd backend && npm run build && MONGODB_URI=mongodb://127.0.0.1:27017/ra_test DATA_DIR=/tmp/ra-test PORT=4000 \
  AUTH_RATE_MAX=1000 NODE_ENV=production INSECURE_COOKIES=1 node dist/server.js &
npm run test:api        # then drop the ra_test database before the next run

# Browser suite (13 flows) through the whole stack: start both apps, then
npm i -D playwright && npm run test:ui
```

## Known limits
- Photo uploads are stored on the backend's local disk, which is lost on hosts with ephemeral storage. Move them to object storage (or GridFS) before deploying there.
- Atlas M0 is capped at 512 MB and a small number of connections (the pool is limited to 10); search is a regex scan, which is fine for a small catalogue. Add a text index if it grows.
- The rate limiter is in-memory per process; there is no email verification, password reset or moderation yet.
- Category, city and condition lists exist in both `backend/src/constants.ts` and `frontend/lib/`; keep them in sync.
