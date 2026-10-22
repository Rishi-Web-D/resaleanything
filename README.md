# resaleanything

An original classifieds marketplace for pre-owned goods: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 on the front, a **Sequelize + SQLite** backend behind a REST API.

It is a clean-room build based on publicly visible marketplace patterns. It contains no code, branding or assets from any other classifieds site.

## Features
- **Accounts:** register / login / logout. Passwords are hashed with scrypt, sessions are random tokens stored hashed in the DB and sent as `HttpOnly`, `SameSite=Lax` cookies. Auth endpoints are rate-limited.
- **Ads:** create with up to 4 photos, edit, mark sold, delete (owner only). Photos are validated by magic bytes, stored on disk and served from `/api/uploads/*`.
- **Search:** keyword, category, city, condition, price range, sort, pagination.
- **Favourites:** saved per account in the database.
- **Chat:** buyer ↔ seller conversations per ad, with polling for new messages. Only the two participants can read a thread.
- **Privacy:** a seller's phone number is only returned to logged-in users.
- Seeded with 26 demo ads (seed sellers cannot log in).

## Run
```bash
npm install
npm run dev              # http://localhost:3000
npm run build && npm start
```
Data is stored in `./data/` (`resale.db` plus `uploads/`) and is git-ignored. Tables are created automatically on first start with `sequelize.sync()`.

Environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `DATA_DIR` | `./data` | where the database and uploads live |
| `DB_STORAGE` | `$DATA_DIR/resale.db` | SQLite file path |
| `INSECURE_COOKIES` | unset | set to `1` to allow session cookies over plain HTTP in a production build |

## Layout
- `lib/server/db.ts` — Sequelize models and associations (User, Session, Ad, AdImage, Favorite, Conversation, Message), boot and seed
- `lib/server/ads.ts`, `chat.ts`, `auth.ts`, `http.ts` — services, sessions, route wrapper (auth, origin check, error mapping)
- `app/api/**` — REST endpoints
- `app/**/page.tsx`, `components/` — UI

## API
| Method & path | Auth | Notes |
|---|---|---|
| `POST /api/auth/register`, `/login`, `/logout`; `GET /api/auth/me` | – | |
| `GET /api/ads?q&category&city&condition&min&max&sort&limit&offset` | – | `?ids=1,2` fetches specific ads |
| `POST /api/ads` | ✔ | JSON or `multipart/form-data` with `images` |
| `GET/PATCH/DELETE /api/ads/:id` | PATCH/DELETE owner | |
| `GET /api/ads/:id/phone` | ✔ | |
| `GET /api/favorites`, `PUT/DELETE /api/favorites/:adId` | ✔ | |
| `GET/POST /api/conversations`, `GET/POST /api/conversations/:id/messages?after=` | ✔ | participants only |

## Tests
```bash
rm -rf data && INSECURE_COOKIES=1 npm run build && INSECURE_COOKIES=1 npm start &   # fresh DB
BASE_URL=http://localhost:3000 npm run test:api    # 45 API checks
npm i -D playwright && BASE_URL=http://localhost:3000 npm run test:ui   # browser flows
```

## Known limits
- SQLite suits a single server. To scale out, point Sequelize at Postgres/MySQL (install the driver, change the constructor in `lib/server/db.ts`) and store uploads in object storage.
- Rate limiting is in-memory per process.
- No email verification, password reset, or moderation tools yet.
