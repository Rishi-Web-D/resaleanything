# resaleanything

An original classifieds marketplace for pre-owned goods, built with Next.js 16 (App Router), React 19, TypeScript and Tailwind 4.

It is a clean-room build based on publicly visible marketplace patterns. It contains no code, branding or assets from any other classifieds site.

## Features
- Home page with category grid and latest ads
- Search with keyword, category, city, condition, price range and sort (server-rendered, URL-driven)
- Ad detail page with phone reveal, chat-box stub and similar ads
- Post-an-ad form validated by a server action
- Favourites saved in `localStorage`
- JSON API: `GET /api/ads?q=&category=&city=&condition=&min=&max=&sort=` and `?ids=1000,1001`

## Run
```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Notes
- Data lives in memory (`lib/store.ts`, seeded from `lib/seed.ts`) and resets on restart. Replace the functions in `lib/store.ts` with a real database to persist.
- Auth, image upload, real chat and payments are not implemented.
- Next 16 has cache components enabled, so dynamic pages call `await connection()`.
