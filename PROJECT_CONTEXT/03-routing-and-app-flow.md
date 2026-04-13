# Routing and Application Flow

## Route Structure Overview

```
/                           # Homepage → Storefront
├── checkout                # Checkout wizard
├── order/success/[code]    # Order confirmation page
│
├── services/
│   ├── delivery            # Delivery request form
│   ├── gcash               # GCash service form
│   └── printing            # Printing service form
│
└── admin/
    ├── login               # Admin authentication
    └── (protected)/        # Route group (requires auth)
        ├──                 # Dashboard (index)
        ├── products        # Product management
        ├── orders          # Order management
        ├── inventory-management
        │   └── receive     # Inventory receiving
        ├── reports         # Analytics reports
        ├── settings        # App configuration
        ├── deliveries      # Delivery admin
        ├── gcash           # GCash admin
        ├── printing        # Printing admin
        └── expenses        # Expense tracking
```

## Route Groups

### Public Routes (No Auth Required)
| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Storefront with product catalog |
| `/checkout` | `app/checkout/page.tsx` | Checkout wizard |
| `/order/success/[code]` | `app/order/success/[code]/page.tsx` | Order confirmation |
| `/services/delivery` | `app/services/delivery/page.tsx` | Delivery request |
| `/services/gcash` | `app/services/gcash/page.tsx` | GCash service |
| `/services/printing` | `app/services/printing/page.tsx` | Printing service |

### Authentication Route
| Route | File | Purpose |
|-------|------|---------|
| `/admin/login` | `app/admin/login/page.tsx` | Admin login form |

### Protected Routes (Admin Only)
**Route Group**: `app/admin/(protected)/`
**Protection**: `layout.tsx` checks `profiles.is_admin`

| Route | File | Purpose |
|-------|------|---------|
| `/admin` | `app/admin/(protected)/page.tsx` | Dashboard with KPIs |
| `/admin/products` | `app/admin/(protected)/products/page.tsx` | Product CRUD |
| `/admin/orders` | `app/admin/(protected)/orders/page.tsx` | Order management |
| `/admin/inventory-management` | `app/admin/(protected)/inventory-management/page.tsx` | Inventory view |
| `/admin/inventory-management/receive` | `app/admin/(protected)/inventory-management/receive/page.tsx` | Receive stock |
| `/admin/reports` | `app/admin/(protected)/reports/page.tsx` | Analytics |
| `/admin/settings` | `app/admin/(protected)/settings/page.tsx` | App settings |
| `/admin/deliveries` | `app/admin/(protected)/deliveries/page.tsx` | Delivery admin |
| `/admin/gcash` | `app/admin/(protected)/gcash/page.tsx` | GCash admin |
| `/admin/printing` | `app/admin/(protected)/printing/page.tsx` | Printing admin |
| `/admin/expenses` | `app/admin/(protected)/expenses/page.tsx` | Expense tracking |

## Layout Hierarchy

```
Root Layout (app/layout.tsx)
├── Metadata: "FDS - Final Destination Services"
├── Font: Inter (via @fontsource/inter)
├── Global gradient background
│
├── / (Homepage)
│   └── Storefront component
│       └── Full-width header with categories
│       └── Product grid
│       └── Cart sidebar (desktop) / modal (mobile)
│
├── /checkout
│   └── CheckoutClient
│       └── 5-step wizard UI
│
├── /order/success/[code]
│   └── Order success card
│
├── /services/*
│   └── Service-specific client components
│
└── /admin
    ├── /login
    │   └── Login form (unstyled directly)
    │
    └── /(protected)
        └── Protected Layout (app/admin/(protected)/layout.tsx)
            ├── Auth check: session + is_admin
            ├── Redirects to /admin/login if unauthorized
            │
            └── AdminShell (client component)
                ├── Sidebar navigation
                ├── Logout button
                └── Main content area
```

## Authentication Flow

### Login Flow
1. User visits `/admin/login`
2. Enters email/password
3. `supabaseBrowser().auth.signInWithPassword()` called
4. On success: `router.push("/admin")`
5. Protected layout verifies `profiles.is_admin`

### Auth Protection
```typescript
// app/admin/(protected)/layout.tsx
const { data: sessionData } = await supabase.auth.getSession();
const user = sessionData.session?.user;
if (!user) redirect("/admin/login");

const { data: profile } = await supabase
  .from("profiles")
  .select("is_admin")
  .eq("id", user.id)
  .single();

if (!profile?.is_admin) redirect("/admin/login");
```

### Client-Side Auth Check
```typescript
// AdminShell.tsx
useEffect(() => {
  async function checkAuth() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      router.replace("/admin/login");
    }
  }
  checkAuth();
}, []);
```

## Navigation Patterns

### Public Navigation
- **Storefront header**: Category pills, service links
- **Hamburger menu**: Mobile navigation drawer
- **Footer**: Links to terms, privacy, contact, admin

### Admin Navigation (AdminShell)
**Main Navigation:**
- Dashboard
- Products
- Inventory
- Orders
- Reports
- Settings

**Service Navigation:**
- 🖨️ Printing
- 💳 GCash
- 🚚 Delivery

## Server/Client Boundary Patterns

### Server Components (Data Fetching)
```typescript
// Pattern: async function, use supabaseServer()
export default async function Page() {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("products").select();
  return <ClientComponent initialData={data} />;
}
```

Used in:
- `app/page.tsx`
- `app/admin/(protected)/page.tsx`
- `app/admin/(protected)/products/page.tsx`
- `app/admin/(protected)/orders/page.tsx`
- `app/order/success/[code]/page.tsx`

### Client Components (Interactivity)
```typescript
// Pattern: "use client", use supabaseBrowser()
"use client";
export default function ClientComponent({ initialData }) {
  const [data, setData] = useState(initialData);
  const supabase = useMemo(() => supabaseBrowser(), []);
  // ... interactive logic
}
```

Used in:
- `Storefront.tsx`
- `CheckoutClient.tsx`
- `ProductsClient.tsx`
- `OrdersClient.tsx`
- `AdminShell.tsx`

### Dynamic Export Pattern
Many admin pages export:
```typescript
export const dynamic = "force-dynamic";
```
This prevents static generation and ensures fresh data on each request.

## Data Flow Patterns

### Checkout Flow
```
1. Customer adds items → localStorage (fds_cart_v1)
2. Clicks checkout → /checkout
3. CheckoutClient loads cart from localStorage
4. Customer fills info (name, pickup, payment)
5. Submit → supabase.rpc("place_order_atomic")
6. Success → redirect to /order/success/{code}
7. Cart cleared from localStorage
```

### Order Management Flow
```
1. Admin views /admin/orders
2. Server fetches orders + payments + items
3. OrdersClient displays with real-time updates
4. Admin updates status → RPC call or direct update
5. UI refreshes via RealtimeAdminRefresh component
```

### Inventory Flow
```
1. Admin navigates to /admin/inventory-management/receive
2. Scans/enters batch code and products
3. Submit → supabase.rpc("receive_inventory_batch_atomic")
4. Updates inventory_lots table
5. FIFO consumption happens automatically on order placement
```

## Middleware/Proxy Logic

**No Next.js middleware file detected** (`middleware.ts` not present)

Auth protection is handled at:
1. Layout level (`app/admin/(protected)/layout.tsx`)
2. Client level (`AdminShell.tsx` useEffect)

## API Routes

| Route | File | Purpose |
|-------|------|---------|
| `POST /api/admin/reports` | `app/api/admin/reports/route.ts` | Generate filtered reports |

Request body shape (ReportParams):
- `date_range`: today, yesterday, last_7_days, etc.
- `start_at`/`end_at`: ISO dates for custom range
- `fulfillment`: all, pickup, delivery
- `payment_method`: all, cod, gcash
- `status`: order status filter
- `paid_only`: boolean
- `top_n`: number of top clients/products

## Notable Routing Decisions

1. **Route Group for Protection**: `(protected)` keeps URL clean while sharing layout
2. **Dynamic Order Success**: `[code]` param for order lookup
3. **Service Separation**: Each service has its own route under `/services/`
4. **No API-First**: Most data operations use Server Components or Server Actions, not REST API
5. **RPC Over Direct SQL**: Complex operations use PostgreSQL functions
