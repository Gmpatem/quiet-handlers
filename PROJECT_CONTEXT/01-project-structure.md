# Project Structure

## Top-Level Directory Tree

```
E:\tenpesorun
├── app/                    # Next.js App Router (main application)
├── components/             # React components
│   ├── admin/             # Admin-specific components
│   ├── delivery/          # Delivery service components
│   ├── gcash/             # GCash service components
│   ├── printing/          # Printing service components
│   ├── store/             # Storefront components
│   └── ui/                # shadcn/ui base components
├── lib/                    # Utility libraries and configs
│   ├── supabase/          # Supabase client configurations
│   └── gcash/             # GCash calculation utilities
├── supabase/              # Supabase migrations
├── types/                 # TypeScript type definitions
├── public/                # Static assets
├── PROJECT_CONTEXT/       # This documentation folder
├── package.json           # Dependencies
├── next.config.mjs        # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── components.json        # shadcn/ui configuration
```

## App Directory Structure (`app/`)

```
app/
├── page.tsx                    # Homepage with Storefront
├── layout.tsx                  # Root layout with fonts, metadata
├── globals.css                 # Global styles, CSS variables
│
├── checkout/
│   ├── page.tsx                # Checkout page (server)
│   └── CheckoutClient.tsx      # 5-step checkout wizard
│
├── order/
│   └── success/
│       └── [code]/
│           └── page.tsx        # Order confirmation page
│
├── services/                   # Service request pages
│   ├── delivery/
│   │   ├── page.tsx
│   │   └── actions.ts          # Server actions for delivery
│   ├── gcash/
│   │   ├── page.tsx
│   │   └── actions.ts          # Server actions for GCash
│   └── printing/
│       ├── page.tsx
│       └── actions.ts          # Server actions for printing
│
├── admin/
│   ├── login/
│   │   └── page.tsx            # Admin login page
│   └── (protected)/            # Protected route group
│       ├── layout.tsx          # Auth check + AdminShell
│       ├── AdminShell.tsx      # Admin navigation shell
│       ├── DashboardLiveRefresh.tsx  # Real-time updates
│       ├── page.tsx            # Dashboard (KPIs, stats)
│       │
│       ├── products/
│       │   ├── page.tsx        # Products list (server)
│       │   ├── ProductsClient.tsx    # Products management UI
│       │   ├── ProductForm.tsx       # Add/edit product form
│       │   └── ReceiveBatchForm.tsx  # Batch receive form
│       │
│       ├── orders/
│       │   ├── page.tsx        # Orders list (server)
│       │   ├── OrdersClient.tsx      # Orders management UI
│       │   └── RealtimeAdminRefresh.tsx
│       │
│       ├── inventory-management/
│       │   ├── page.tsx
│       │   ├── InventoryManagementClient.tsx
│       │   └── receive/
│       │       ├── page.tsx
│       │       └── ReceiveInventoryClient.tsx
│       │
│       ├── reports/
│       │   ├── page.tsx
│       │   └── ReportsClient.tsx
│       │
│       ├── settings/
│       │   ├── page.tsx
│       │   └── SettingsClient.tsx
│       │
│       ├── deliveries/
│       │   ├── page.tsx
│       │   └── DeliveryAdminClient.tsx
│       │
│       ├── gcash/
│       │   ├── page.tsx
│       │   └── GCashAdminClient.tsx
│       │
│       ├── printing/
│       │   ├── page.tsx
│       │   └── PrintingAdminClient.tsx
│       │
│       └── expenses/
│           ├── page.tsx
│           ├── actions.ts
│           ├── AddExpenseForm.tsx
│           └── ExpenseTable.tsx
│
└── api/
    └── admin/
        └── reports/
            └── route.ts        # API endpoint for reports
```

## Components Directory Structure (`components/`)

```
components/
├── admin/
│   ├── AddExpenseForm.tsx      # Expense entry form
│   └── ExpenseTable.tsx        # Expense list display
│
├── delivery/
│   └── DeliveryRequestClient.tsx
│
├── gcash/
│   └── GCashServiceClient.tsx
│
├── printing/
│   └── PrintingServiceClient.tsx
│
├── store/
│   └── Storefront.tsx          # Main storefront component (886 lines)
│
├── ui/                         # shadcn/ui base components
│   ├── badge.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── separator.tsx
│   └── skeleton.tsx
│
├── AuthHeal.tsx                # Auth token healing utility
├── AuthSessionGuard.tsx        # Session protection
└── Catalog.tsx                 # Product catalog display
```

## Library Directory Structure (`lib/`)

```
lib/
├── supabase/
│   ├── browser.ts              # Browser/client Supabase client
│   └── server.ts               # Server Supabase client
│
├── gcash/
│   └── calculations.ts         # Fee calculations
│
├── cart.ts                     # Cart localStorage utilities
├── money.ts                    # Currency formatting
├── publicSettings.ts           # Public settings fetcher
├── settings.ts                 # App settings utilities
├── supabase.ts                 # Main Supabase types
├── supabaseServer.ts           # Server client helper
├── types.ts                    # App TypeScript types
└── utils.ts                    # General utilities (cn, formatPeso)
```

## File Statistics Summary

| Extension | Count | Category |
|-----------|-------|----------|
| .js | 13,513 | Node modules, build output |
| .ts | 3,624 | TypeScript source |
| .json | 1,092 | Config, package locks |
| .md | 651 | Documentation |
| .css | 175 | Stylesheets |
| .tsx | ~100 (estimated) | React components |

## Key Folders Description

| Folder | Purpose | Notes |
|--------|---------|-------|
| `app/admin/(protected)/` | Protected admin routes | Route group for auth-guarded pages |
| `app/services/` | Service request pages | Printing, GCash, Delivery |
| `components/store/` | Storefront components | Main customer-facing UI |
| `components/admin/` | Admin helper components | Expense forms, tables |
| `lib/supabase/` | Supabase clients | Browser vs Server separation |
| `app/api/` | API routes | Reports endpoint |

## Excluded from Tracking

- `node_modules/` - Dependencies (80k+ files)
- `.next/` - Build output
- `backend-map/` - Appears to be legacy/experimental bundle
