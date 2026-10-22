# resaleanything

An original classifieds marketplace for pre-owned goods, as **two separate apps in one repo**:

| | Stack | Port | Role |
|---|---|---|---|
| [`backend/`](backend) | Node.js, **Express 5**, **Sequelize** + SQLite, TypeScript | 4000 | REST API: accounts, ads, photos, favourites, chat |
| [`frontend/`](frontend) | **Next.js 16**, React 19, Tailwind 4, TypeScript | 3000 | UI only: no database or business logic |

It is a clean-room build based on publicly visible marketplace patterns. It contains no code, branding or assets from any other classifieds site.

```
browser ──► Next.js :3000 ──(pages: server components call the API with the visitor's cookie)──┐
               │ rewrites /api/*                                                                ▼
               └────────────────────────────────────────────────────────────────────────► Express :4000 ──► SQLite (+ uploads/)
```

The browser only ever talks to the Next.js origin. Next proxies `/api/*` to Express, so the session cookie is first-party and no CORS is needed. Server-rendered pages call Express directly and forward the cookie.

## Quick start
```bash
npm run install:all      # root tools + backend + frontend
npm run dev              # Express on :4000 and Next on :3000, with reload
# open http://localhost:3000
```
Production:
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
| `DATA_DIR` | `backend/data` | database (`resale.db`) and `uploads/`, git-ignored |
| `DB_STORAGE` | `$DATA_DIR/resale.db` | SQLite file path |
| `INSECURE_COOKIES` | unset | `1` allows the session cookie over HTTP in production mode |
| `AUTH_RATE_MAX` | `10` | login / register attempts per window per IP |

Frontend: `BACKEND_URL` (default `http://127.0.0.1:4000`) is read at **build** time for the `/api` rewrite and at runtime for server-side calls.

## Backend overview
- **Accounts:** scrypt password hashes; random session tokens stored hashed; `HttpOnly`, `SameSite=Lax` cookie; login and register are rate-limited; expired sessions are purged hourly.
- **Ads:** create with up to 4 photos, edit, mark sold, delete (owner only). Photos are validated by magic bytes (JPEG/PNG/WebP, 3 MB each) and served from `/api/uploads/*`.
- **Search:** keyword, category, city, condition, price range, sort, pagination. Keyword search uses `instr()`, so `%` and `_` are plain characters.
- **Favourites** are stored per account. **Chat** is buyer ↔ seller per ad, with polling; only the two participants can read a thread.
- **Privacy:** a seller's phone number is only returned to logged-in users.
- Security middleware: `helmet`, a same-origin check on writes, JSON body limit, uniform JSON errors.
- Seeded with 26 demo ads on first start (seed sellers cannot log in).

Layout: `backend/src/{app,server,config,db,auth,middleware}.ts`, `routes/`, `services/`.

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
# API suite (49 checks): needs an empty database
cd backend && npm run build && DATA_DIR=/tmp/ra-test PORT=4000 AUTH_RATE_MAX=1000 NODE_ENV=production INSECURE_COOKIES=1 node dist/server.js &
npm run test:api

# Browser suite (13 flows) through the whole stack: start both apps, then
npm i -D playwright && npm run test:ui
```

## Known limits
- SQLite suits a single server. To scale out, point Sequelize at Postgres/MySQL (install the driver and change the constructor in `backend/src/db.ts`) and move uploads to object storage.
- The rate limiter is in-memory per process; there is no email verification, password reset or moderation yet.
- Category, city and condition lists exist in both `backend/src/constants.ts` and `frontend/lib/`; keep them in sync.
