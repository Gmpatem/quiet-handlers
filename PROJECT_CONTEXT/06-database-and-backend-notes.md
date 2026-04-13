# Database and Backend Notes

## Database Platform

**Supabase PostgreSQL** with the following characteristics:
- Row Level Security (RLS) enabled (standard Supabase pattern)
- Real-time subscriptions available (used in dashboard refresh)
- Storage buckets for file uploads

## Connection Pattern

Two client types based on execution context:

| Context | Client | Location |
|---------|--------|----------|
| Server Components | `supabaseServer()` | `lib/supabaseServer.ts` |
| Client Components | `supabaseBrowser()` | `lib/supabase/browser.ts` |

## Schema Overview

### Core Tables

#### 1. `products`
Product catalog with inventory tracking.

```typescript
{
  id: string;
  name: string;
  category: string;
  price_cents: number;      // Selling price
  cost_cents: number;       // Average cost (for simple tracking)
  stock_qty: number;        // Current available stock
  is_active: boolean;       // Show in storefront
  photo_url: string | null; // Supabase Storage URL
  created_at: string;
  updated_at: string;
}
```

#### 2. `orders`
Order header information.

```typescript
{
  id: string;
  order_code: string;       // Human-readable (FDS-XXXXXX)
  customer_name: string;
  contact: string;
  fulfillment: 'pickup' | 'delivery';
  pickup_location: string | null;   // 'boys_411' | 'girls_206'
  delivery_location: string | null;
  delivery_fee_cents: number;
  payment_method: 'gcash' | 'cod';
  subtotal_cents: number;
  total_cents: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 
          'out_for_delivery' | 'completed' | 'delivered' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

#### 3. `order_items`
Line items for each order (denormalized).

```typescript
{
  id: string;
  order_id: string;
  product_id: string;
  qty: number;
  name_snapshot: string;        // Product name at time of order
  category_snapshot: string;    // Category at time of order
  unit_price_cents: number;     // Price at time of order
  unit_cost_cents: number;      // Cost at time of order (for profit calc)
  line_total_cents: number;
  created_at: string;
}
```

#### 4. `payments`
Payment records linked to orders.

```typescript
{
  id: string;
  order_id: string;
  method: 'gcash' | 'cod';
  amount_cents: number;
  status: 'pending' | 'verified' | 'rejected' | 'completed' | 'paid';
  reference_number: string | null;  // GCash ref
  gcash_ref: string | null;
  proof_url: string | null;         // Screenshot upload
  paid_at: string | null;
  verified_by: string | null;       // Admin user ID
  created_at: string;
}
```

#### 5. `inventory_batches`
Batch receiving headers.

```typescript
{
  id: string;
  batch_code: string;       // Auto-generated (B-YYYYMMDD-XXX)
  note: string | null;
  created_by: string | null; // Admin user ID
  created_at: string;
}
```

#### 6. `inventory_lots`
FIFO inventory tracking (the heart of cost tracking).

```typescript
{
  id: string;
  batch_id: string;
  product_id: string;
  qty_received: number;     // Original quantity
  qty_remaining: number;    // Available for allocation
  unit_cost_cents: number;  // Cost per unit
  created_at: string;
}
```

#### 7. `order_item_lot_allocations`
Links order items to specific inventory lots (FIFO consumption).

```typescript
{
  id: string;
  order_id: string;
  order_item_id: string;
  lot_id: string;
  product_id: string;
  qty: number;              // Quantity from this lot
  unit_cost_cents: number;  // Cost from lot
  created_at: string;
}
```

#### 8. `profiles`
User profiles extending Supabase Auth.

```typescript
{
  id: string;               // Links to auth.users
  full_name: string | null;
  is_admin: boolean;        // Access control flag
  created_at: string;
}
```

#### 9. `app_settings`
Key-value configuration store.

```typescript
{
  key: string;
  value: Json;              // Any JSON value
  updated_at: string;
}
```

#### 10. `settings_meta`
UI metadata for settings (labels, types, sections).

```typescript
{
  key: string;
  label: string;
  input_type: string;       // 'text', 'number', 'toggle', etc.
  section: string;          // Grouping
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
```

#### 11. `order_suggestions`
Customer feedback after order.

```typescript
{
  id: string;
  order_id: string | null;
  order_code: string | null;
  customer_name: string | null;
  contact: string | null;
  message: string;
  source: string;
  created_at: string;
}
```

#### 12. `featured_products`
Homepage featured items.

```typescript
{
  id: string;
  product_id: string;
  sort_order: number;
  is_active: boolean;
}
```

---

## Database Views (Analytics)

### Profit Views

| View | Purpose |
|------|---------|
| `daily_profit` | Aggregated daily profit (all orders) |
| `daily_profit_realized` | Daily profit for paid/completed orders only |
| `daily_profit_pipeline` | Daily profit for all orders (projected) |
| `order_profit` | Per-order profit calculation |
| `order_profit_realized` | Per-order profit for realized orders |
| `batch_profit_realized` | Per-batch profit analysis |

### Inventory Views

| View | Purpose |
|------|---------|
| `inventory_batches_admin` | Batch list with aggregates (count, cost) |
| `inventory_batch_lines_admin` | Line-level batch details |

### Status Views

| View | Purpose |
|------|---------|
| `order_status_counts` | Count by status (all time) |
| `order_status_counts_today` | Count by status (today only) |

### Sales Views

| View | Purpose |
|------|---------|
| `v_daily_sales` | Daily sales aggregates |
| `v_fulfillment_split` | Orders by fulfillment type |
| `v_payment_split` | Orders by payment method |
| `v_top_products` | All-time top products |
| `top_products_7d_realized` | 7-day best sellers (paid only) |
| `top_products_7d_pipeline` | 7-day best sellers (all) |

---

## RPC Functions (Stored Procedures)

### Order Management

| Function | Purpose | Location in Code |
|----------|---------|------------------|
| `place_order_atomic` | Atomic order creation with inventory consumption | `CheckoutClient.tsx` |
| `admin_confirm_order` | Confirm pending order | Orders management |
| `admin_set_order_status` | Update order status | Orders management |
| `create_order` | Legacy order creation | (deprecated) |

### Payment Management

| Function | Purpose |
|----------|---------|
| `admin_verify_gcash_paid` | Verify GCash payment |
| `admin_verify_gcash_paid_v2` | Verify with reference number |
| `admin_verify_payment` | General payment verification |
| `mark_payment_paid` | Mark order as paid |
| `verify_gcash_payment` | Legacy verification |
| `sync_payment_for_order` | Sync payment status |

### Inventory Management

| Function | Purpose | Location |
|----------|---------|----------|
| `receive_inventory_batch_atomic` | Receive inventory batch | `ReceiveInventoryClient.tsx` |
| `consume_inventory_fifo` | Consume stock via FIFO | Called by `place_order_atomic` |
| `gen_batch_code` | Generate batch code | Internal |

### Product Management

| Function | Purpose |
|----------|---------|
| `admin_bulk_update_products` | Bulk product updates |

### Utility Functions

| Function | Purpose |
|----------|---------|
| `is_admin` | Check if current user is admin |
| `get_payment_status_enum` | Get valid payment statuses |

---

## Enums

### `fulfillment_type`
- `pickup`
- `delivery`

### `order_status_type`
- `pending`
- `confirmed`
- `preparing`
- `ready`
- `out_for_delivery`
- `completed`
- `delivered`
- `cancelled`

### `payment_method_type`
- `gcash`
- `cod`

### `payment_status_type`
- `pending`
- `verified`
- `rejected`
- `completed`
- `paid`

---

## Data Access Patterns

### Reads

**Server Components:**
```typescript
const supabase = await supabaseServer();
const { data, error } = await supabase
  .from("table")
  .select("...")
  .eq("field", value)
  .order("created_at", { ascending: false });
```

**Client Components:**
```typescript
const supabase = useMemo(() => supabaseBrowser(), []);
const { data } = await supabase.from("table").select();
```

### Writes

**Direct Insert/Update:**
```typescript
await supabase.from("table").insert({ ... });
await supabase.from("table").update({ ... }).eq("id", id);
```

**RPC for Atomic Operations:**
```typescript
await supabase.rpc("place_order_atomic", {
  p_customer_name: name,
  p_items: items,
  // ...
});
```

---

## Multi-Tenant Considerations

**Current State:** Single-tenant application
- No `tenant_id` columns in schema
- Admin access controlled by `profiles.is_admin`
- All users share same product catalog

**Future Considerations:**
If multi-tenant support needed, would require:
- `tenant_id` on: products, orders, settings
- RLS policies updated to check tenant
- Subdomain or path-based tenant routing

---

## Data Integrity Patterns

### 1. FIFO Inventory (Critical)

**Receiving Flow:**
1. Create `inventory_batches` record
2. Create `inventory_lots` for each product
3. Update `products.stock_qty`

**Consumption Flow:**
1. Customer places order
2. `place_order_atomic` calls `consume_inventory_fifo`
3. System allocates from oldest lots first
4. Creates `order_item_lot_allocations` records
5. Updates `inventory_lots.qty_remaining`
6. Updates `products.stock_qty`

**Profit Calculation:**
- Uses actual lot costs from `order_item_lot_allocations`
- Real-time via views joining orders → items → lot allocations

### 2. Snapshot Pattern

Order items store snapshots:
- `name_snapshot` - Product name at order time
- `category_snapshot` - Category at order time
- `unit_price_cents` - Price at order time
- `unit_cost_cents` - Cost at order time

This ensures historical accuracy even if product changes.

### 3. Denormalized Aggregates

Order header stores:
- `subtotal_cents` - Sum of line items
- `total_cents` - Including delivery fee

These are calculated at order time and stored for quick retrieval.

---

## Security Notes

### RLS Policies (Assumed Standard)

Based on Supabase patterns, likely policies include:

**Products:**
- SELECT: Public (for active products)
- INSERT/UPDATE/DELETE: Admin only

**Orders:**
- SELECT: Admin only (or by order_code for customers)
- INSERT: Public (via RPC)
- UPDATE: Admin only

**Profiles:**
- SELECT: Own profile only
- UPDATE: Own profile only
- `is_admin` check for elevated operations

### Critical Constraints

1. **Order Status Transitions**: Should be validated (some via DB, some via app)
2. **Stock Levels**: Should never go negative (enforced by `consume_inventory_fifo`)
3. **Payment Verification**: Admin-only operation
4. **Inventory Lots**: `qty_remaining` should never exceed `qty_received`

---

## Backend Work to Preserve

### Must Not Break
1. **FIFO Logic**: `consume_inventory_fifo` function
2. **Atomic Order Placement**: `place_order_atomic` function
3. **Profit Calculations**: Views `daily_profit_realized`, `order_profit`
4. **Inventory Receiving**: `receive_inventory_batch_atomic`

### Safe to Extend
1. New settings in `app_settings`
2. New product fields (if nullable)
3. New order statuses (if handled in UI)
4. New views for analytics

### Schema Gaps (Needs Verification)
1. **Expenses Table**: Referenced in code but not confirmed in schema
2. **Service Requests**: Tables for printing/gcash/delivery requests not confirmed
3. **Audit Logs**: No explicit audit trail table visible
