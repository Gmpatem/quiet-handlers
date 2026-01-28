# tenpesorun

Campus snack ordering app (guest checkout) powered by Next.js + Supabase.

## Quick start

1) Install deps

```bash
npm install
```

2) Create `.env.local` from `.env.example`

```bash
cp .env.example .env.local
```

Fill in your Supabase URL and anon key.

3) Run

```bash
npm run dev
```

## Pages
- `/` catalog + live cart summary
- `/checkout` checkout wizard (skeleton)
- `/admin/*` admin pages (skeleton)

## Notes
- Product images bucket: `product-images` (public read; admin write)
- Storefront + wizard text controlled via `app_settings` in Supabase
# quiet-handlers
