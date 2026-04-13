# Tech Stack and Configuration

## Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.0.10 | React framework with App Router |
| **React** | 19.0.1 | UI library |
| **React DOM** | 19.0.1 | DOM renderer |
| **TypeScript** | 5.9.3 | Type safety |

## UI and Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 3.4.16 | Utility-first CSS |
| **Tailwind Merge** | 3.4.0 | Class merging |
| **Tailwind Animate** | 1.0.7 | Animations plugin |
| **class-variance-authority** | 0.7.1 | Component variants |
| **clsx** | 2.1.1 | Conditional classes |
| **@fontsource/inter** | 5.2.8 | Inter font |

## UI Components (shadcn/ui)

Based on `components.json`:
- **Style**: new-york
- **Base Color**: slate
- **CSS Variables**: Enabled
- **Icon Library**: lucide-react

Installed components (from `components/ui/`):
- `badge.tsx` - Status badges
- `button.tsx` - Button variants
- `card.tsx` - Card containers
- `separator.tsx` - Dividers
- `skeleton.tsx` - Loading states

Additional Radix UI primitives:
- `@radix-ui/react-separator` - Accessible separators
- `@radix-ui/react-slot` - Composition primitive

## Backend and Data

| Technology | Version | Purpose |
|------------|---------|---------|
| **Supabase JS Client** | 2.49.1 | Database/Auth client |
| **Supabase SSR** | 0.8.0 | Server-side auth |

### Database: Supabase PostgreSQL

Key tables (from `lib/supabase.ts`):
- `products` - Product catalog
- `orders` - Order headers
- `order_items` - Order line items
- `payments` - Payment records
- `inventory_batches` - Inventory receiving batches
- `inventory_lots` - FIFO inventory tracking
- `profiles` - User profiles with admin flag
- `app_settings` - Application configuration
- `settings_meta` - Setting definitions
- `order_suggestions` - Customer feedback
- `featured_products` - Homepage featured items

Key views:
- `daily_profit_realized` / `daily_profit_pipeline` - Revenue analytics
- `order_profit` / `order_profit_realized` - Per-order profit
- `inventory_batches_admin` - Batch management view
- `top_products_7d_realized` - Best sellers

Key RPC functions:
- `place_order_atomic` - Atomic order placement
- `receive_inventory_batch_atomic` - Batch receiving
- `admin_confirm_order` - Order confirmation
- `admin_set_order_status` - Status updates
- `admin_verify_gcash_paid` - Payment verification
- `consume_inventory_fifo` - FIFO stock consumption

## Icons

- **lucide-react** 0.563.0 - Icon library

## Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | 9.39.2 | Linting |
| **eslint-config-next** | 16.1.1 | Next.js ESLint rules |
| **PostCSS** | 8.4.49 | CSS processing |
| **Autoprefixer** | 10.4.20 | CSS vendor prefixes |
| **@types/node** | 22.10.2 | Node.js types |
| **@types/react** | 19.0.2 | React types |

## Important Configuration Files

### next.config.mjs
```javascript
{
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }]
  },
  typescript: { ignoreBuildErrors: true },  // ⚠️ Build continues despite TS errors
  eslint: { ignoreDuringBuilds: true }      // ⚠️ Build continues despite ESLint errors
}
```

### tailwind.config.ts
- Content paths: `app/**/*`, `components/**/*`
- Dark mode: `class`
- Theme extensions: Custom colors (HSL CSS variables), border radius
- Plugins: `tailwindcss-animate`

### tsconfig.json
- Target: ES2017
- Strict mode: Enabled
- Path alias: `@/*` maps to `./*`
- Module resolution: bundler

### components.json (shadcn/ui)
```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

## Environment Variables

### Required
| Variable | Purpose | Used In |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `lib/supabase/browser.ts`, `lib/supabaseServer.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `lib/supabase/browser.ts`, `lib/supabaseServer.ts` |

### Optional (Inferred)
Based on code patterns, these may be expected:
| Variable | Purpose | Likely Used For |
|----------|---------|-----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Admin operations | Server-side privileged actions |

## Package Manager

- **npm** (evidenced by `package-lock.json`)

## Scripts (package.json)

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

## Deployment Notes

- Build errors are suppressed (TypeScript and ESLint)
- Images served from `**.supabase.co` domains
- Server-side rendering with dynamic exports on key pages
- Static export not configured (full Next.js server)

## Data Flow Architecture

1. **Server Components**: Fetch data via `supabaseServer()`
2. **Client Components**: Use `supabaseBrowser()` for real-time needs
3. **Server Actions**: Used in services (`app/services/*/actions.ts`)
4. **API Routes**: Reports endpoint (`app/api/admin/reports/route.ts`)
5. **Database**: PostgreSQL with Row Level Security (RLS) implied by Supabase usage
