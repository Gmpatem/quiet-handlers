# Components, Hooks, and Utilities Inventory

## Shared UI Components (shadcn/ui)

Located in `components/ui/`

| Component | File | Purpose | Dependencies |
|-----------|------|---------|--------------|
| Badge | `badge.tsx` | Status labels, tags | `class-variance-authority`, `cn` |
| Button | `button.tsx` | Action buttons | `class-variance-authority`, `cn`, `@radix-ui/react-slot` |
| Card | `card.tsx` | Content containers | `cn`, `@radix-ui/react-slot` |
| Separator | `separator.tsx` | Visual dividers | `@radix-ui/react-separator`, `cn` |
| Skeleton | `skeleton.tsx` | Loading placeholders | `cn`, `class-variance-authority` |

**Note**: These follow shadcn/ui patterns with `class-variance-authority` for variants.

---

## Layout Components

| Component | File | Purpose |
|-----------|------|---------|
| AdminShell | `app/admin/(protected)/AdminShell.tsx` | Admin layout with sidebar nav |

**AdminShell Features:**
- Sidebar navigation with active state
- Service navigation section
- Logout functionality
- Client-side auth verification
- Responsive grid layout

---

## Feature Components

### Store Components

| Component | File | Purpose | Size |
|-----------|------|---------|------|
| Storefront | `components/store/Storefront.tsx` | Main storefront | 886 lines |

**Storefront Capabilities:**
- Category pill navigation
- Product grid with responsive columns
- Cart management (sidebar on desktop, modal on mobile)
- Pull-to-refresh (mobile)
- Hamburger menu with navigation
- LocalStorage cart persistence
- Stock badges (in stock/low stock/out of stock)

### Admin Components

| Component | File | Purpose |
|-----------|------|---------|
| AddExpenseForm | `components/admin/AddExpenseForm.tsx` | Expense entry |
| ExpenseTable | `components/admin/ExpenseTable.tsx` | Expense list |

### Service Components

| Component | File | Purpose |
|-----------|------|---------|
| DeliveryRequestClient | `components/delivery/DeliveryRequestClient.tsx` | Delivery form |
| GCashServiceClient | `components/gcash/GCashServiceClient.tsx` | GCash form |
| PrintingServiceClient | `components/printing/PrintingServiceClient.tsx` | Printing form |

### Auth Components

| Component | File | Purpose |
|-----------|------|---------|
| AuthHeal | `components/AuthHeal.tsx` | Token healing utility |
| AuthSessionGuard | `components/AuthSessionGuard.tsx` | Session protection |

---

## Page-Specific Client Components

Located alongside their pages in `app/`

| Component | File | Purpose |
|-----------|------|---------|
| CheckoutClient | `app/checkout/CheckoutClient.tsx` | 5-step checkout | 846 lines |
| ProductsClient | `app/admin/(protected)/products/ProductsClient.tsx` | Product management |
| ProductForm | `app/admin/(protected)/products/ProductForm.tsx` | Add/edit product |
| ReceiveBatchForm | `app/admin/(protected)/products/ReceiveBatchForm.tsx` | Batch receive |
| OrdersClient | `app/admin/(protected)/orders/OrdersClient.tsx` | Order management |
| RealtimeAdminRefresh | `app/admin/(protected)/orders/RealtimeAdminRefresh.tsx` | Live updates |
| InventoryManagementClient | `app/admin/(protected)/inventory-management/InventoryManagementClient.tsx` | Inventory view |
| ReceiveInventoryClient | `app/admin/(protected)/inventory-management/receive/ReceiveInventoryClient.tsx` | Receive UI |
| ReportsClient | `app/admin/(protected)/reports/ReportsClient.tsx` | Reports dashboard |
| SettingsClient | `app/admin/(protected)/settings/SettingsClient.tsx` | Settings editor |
| DeliveryAdminClient | `app/admin/(protected)/deliveries/DeliveryAdminClient.tsx` | Delivery admin |
| GCashAdminClient | `app/admin/(protected)/gcash/GCashAdminClient.tsx` | GCash admin |
| PrintingAdminClient | `app/admin/(protected)/printing/PrintingAdminClient.tsx` | Printing admin |
| DashboardLiveRefresh | `app/admin/(protected)/DashboardLiveRefresh.tsx` | Dashboard updates |

---

## Utilities

### Core Utilities (`lib/utils.ts`)

| Function | Purpose |
|----------|---------|
| `cn(...inputs)` | Tailwind class merging with `clsx` + `tailwind-merge` |
| `formatPeso(cents)` | Format cents to PHP currency string |
| `formatMargin(margin)` | Format margin to percentage |

### Cart Utilities (`lib/cart.ts`)

| Function | Purpose |
|----------|---------|
| `loadCart()` | Load cart from localStorage |
| `saveCart(items)` | Save cart to localStorage |
| `clearCart()` | Remove cart from localStorage |
| `cartSubtotalCents(items)` | Calculate subtotal |
| `upsertCartItem(items, product, delta)` | Add/update/remove items |

**Storage Key**: `tenpesorun_cart_v1` (in `lib/cart.ts`) or `fds_cart_v1` (in Storefront)

### Money Utilities (`lib/money.ts`)
Currency formatting (appears minimal/superseded by `utils.ts`)

### Settings Utilities

| File | Function | Purpose |
|------|----------|---------|
| `lib/publicSettings.ts` | `getPublicSettings()` | Server-side settings fetch |
| `lib/settings.ts` | `getAppSettings(keys)` | Client-side settings fetch |

---

## Supabase Clients

### Browser Client (`lib/supabase/browser.ts`)

| Export | Purpose |
|--------|---------|
| `supabaseBrowser()` | Returns browser Supabase client |
| `healInvalidRefreshToken()` | Self-heals stale auth tokens |

**Features:**
- Singleton pattern (caches client)
- Custom cookie parsing for SSR compatibility
- Token healing for "Invalid Refresh Token" errors

### Server Client (`lib/supabase/server.ts`)

| Export | Purpose |
|--------|---------|
| `createClient()` | Returns server Supabase client |

### Legacy/Compatibility (`lib/supabaseServer.ts`)
Re-exports server client for backward compatibility.

---

## Type Definitions

### Database Types (`lib/supabase.ts`)

**Generated Supabase types** - ~1000 lines defining:
- All tables (Row/Insert/Update types)
- All views
- All RPC functions
- All enums (`fulfillment_type`, `order_status_type`, `payment_method_type`, `payment_status_type`)
- Helper types: `Tables<>`, `TablesInsert<>`, `TablesUpdate<>`, `Enums<>`

### App Types (`lib/types.ts`)

| Type | Definition |
|------|------------|
| `Product` | Simplified product type |
| `CartItem` | Cart item with product + qty |

---

## Server Actions

Located in `app/services/*/actions.ts`

| File | Actions | Purpose |
|------|---------|---------|
| `app/services/delivery/actions.ts` | `submitDeliveryRequest` | Process delivery requests |
| `app/services/gcash/actions.ts` | `submitGCashRequest` | Process GCash requests |
| `app/services/printing/actions.ts` | `submitPrintRequest` | Process printing requests |
| `app/admin/(protected)/expenses/actions.ts` | `addExpense` | Add expense record |

---

## Custom Hooks

**No dedicated `hooks/` directory found.**

Hooks are used inline in components:
- `useState`, `useEffect`, `useMemo`, `useTransition` from React
- `useRouter`, `usePathname` from Next.js navigation

---

## Constants and Configuration

### Cart Constants
| Location | Constant | Value |
|----------|----------|-------|
| `lib/cart.ts` | `KEY` | `"tenpesorun_cart_v1"` |
| `components/store/Storefront.tsx` | `CART_KEY` | `"fds_cart_v1"` |
| `app/checkout/CheckoutClient.tsx` | `CART_KEY` | `"fds_cart_v1"` |

### Customer Memory
| Location | Constant | Purpose |
|----------|----------|---------|
| `app/checkout/CheckoutClient.tsx` | `CUSTOMER_MEMORY_KEY` | `"tenpesorun_customer_memory"` |
| `app/checkout/CheckoutClient.tsx` | `PICKUP_MEMORY_KEY` | `"tenpesorun_pickup_point"` |

### Order Codes
- Format: `FDS-XXXXXX` (6 alphanumeric characters)
- Characters: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no ambiguous chars)

---

## Formatting Patterns

### Currency
```typescript
// Standard pattern found throughout
function peso(cents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format((cents ?? 0) / 100);
}
```

### Dates
- Timezone: Hardcoded to `Asia/Manila`
- Format: `YYYY-MM-DD` for database queries
- Helper: `ymdInTZ()` function in dashboard

---

## Duplication and Overlap

### Identified Duplications

1. **Cart Key Inconsistency**:
   - `lib/cart.ts`: `"tenpesorun_cart_v1"`
   - `Storefront.tsx` & `CheckoutClient.tsx`: `"fds_cart_v1"`
   - **Risk**: Cart persistence may not work between pages

2. **Peso Formatting**:
   - `lib/utils.ts`: `formatPeso()`
   - Multiple inline `peso()` functions in components
   - **Recommendation**: Standardize on `formatPeso` import

3. **Supabase Client Exports**:
   - `lib/supabase/server.ts`: `createClient()`
   - `lib/supabaseServer.ts`: Re-exports
   - **Pattern**: Multiple import paths available

4. **Type Definitions**:
   - `lib/types.ts`: `Product`, `CartItem`
   - `lib/supabase.ts`: Full generated types
   - **Pattern**: Simplified types for convenience

---

## Icon Usage

All icons from `lucide-react`:

| Icon | Common Usage |
|------|--------------|
| `ShoppingCart` | Cart, checkout |
| `Package` | Products, orders |
| `CheckCircle`/`CheckCircle2` | Success states |
| `AlertCircle` | Errors, warnings |
| `Menu` | Hamburger navigation |
| `X` | Close buttons |
| `ChevronRight` | Navigation arrows |
| `Settings` | Admin, configuration |
| `Printer` | Printing service |
| `Home` | Navigation home |
| `User` | Customer info |
| `History` | Order history |
| `MapPin` | Location/pickup |
| `CreditCard` | Payment |
| `ArrowLeft` | Back navigation |
| `ShoppingBag` | Checkout header |
| `Info` | Information |
| `Home`/`Building` | Location types |
| `Shield` | Security/payment |
