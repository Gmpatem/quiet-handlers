# Feature Module Inventory

## 1. Storefront Module

**Purpose**: Public-facing product catalog and shopping cart

**Main Files:**
- `app/page.tsx` - Server entry, fetches initial products
- `components/store/Storefront.tsx` - Main storefront UI (886 lines)

**Key Features:**
- Category filtering with pills
- Product grid with stock badges
- Cart management (localStorage-based)
- Pull-to-refresh on mobile
- Mobile-optimized hamburger menu
- Service quick links (Printing, GCash, Delivery)

**Data Dependencies:**
- `products` table (active products)
- `app_settings` (category_order)

**Status**: Mature, production-ready

---

## 2. Checkout Module

**Purpose**: Multi-step order placement without account

**Main Files:**
- `app/checkout/page.tsx` - Server entry
- `app/checkout/CheckoutClient.tsx` - 5-step wizard (846 lines)

**Checkout Steps:**
1. Customer Info (name with autocomplete)
2. Pickup Point (Boys/Girls dorm)
3. Delivery (placeholder - disabled)
4. Payment Method (GCash/Cash on Pickup)
5. Review & Place Order

**Key Features:**
- Name memory (localStorage)
- Pickup point memory
- GCash reference validation
- Order code generation (FDS-XXXXXX)

**Data Dependencies:**
- `app_settings` (GCash details, toggles)
- RPC: `place_order_atomic`

**Status**: Mature, optimized with server-side settings fetch

---

## 3. Order Success Module

**Purpose**: Post-purchase confirmation

**Main Files:**
- `app/order/success/[code]/page.tsx` - Order confirmation display
- `app/order/success/[code]/SuggestionBox.tsx` - Feedback component

**Key Features:**
- Order code display
- Order details summary
- Pickup location info
- Suggestion/feedback form

**Data Dependencies:**
- `orders` table
- `order_items` table

**Status**: Mature

---

## 4. Admin Dashboard Module

**Purpose**: Operational overview and KPIs

**Main Files:**
- `app/admin/(protected)/page.tsx` - Dashboard server component
- `app/admin/(protected)/DashboardLiveRefresh.tsx` - Real-time updates

**Key Metrics:**
- Open orders count
- Today realized revenue/profit
- Today pipeline revenue/profit
- 7-day realized/pipeline totals
- Best sellers (last 7 days)
- Low stock alerts
- Order status breakdown

**Data Dependencies:**
- `orders` table
- `daily_profit_realized` view
- `daily_profit_pipeline` view
- `top_products_7d_realized` view
- `products` table

**Status**: Mature, PH timezone-aware

---

## 5. Products Management Module

**Purpose**: Product catalog CRUD and bulk operations

**Main Files:**
- `app/admin/(protected)/products/page.tsx` - Server data fetch
- `app/admin/(protected)/products/ProductsClient.tsx` - Management UI
- `app/admin/(protected)/products/ProductForm.tsx` - Add/edit form
- `app/admin/(protected)/products/ReceiveBatchForm.tsx` - Batch receive

**Key Features:**
- Product grid with filtering
- Bulk activation/deactivation
- Price editing
- Image upload (Supabase Storage)
- Category management
- Direct stock adjustment

**Data Dependencies:**
- `products` table
- Storage bucket: `product-images`

**Status**: Mature with bulk operations

---

## 6. Orders Management Module

**Purpose**: Order processing and workflow management

**Main Files:**
- `app/admin/(protected)/orders/page.tsx` - Server data fetch
- `app/admin/(protected)/orders/OrdersClient.tsx` - Management UI
- `app/admin/(protected)/orders/RealtimeAdminRefresh.tsx` - Live updates

**Key Features:**
- Order list with filters
- Status workflow: pending → confirmed → preparing → ready → completed
- Payment verification
- Order details with items
- Real-time refresh

**Order Statuses:**
- `pending` - New order
- `confirmed` - Accepted by admin
- `preparing` - Being prepared
- `ready` - Ready for pickup
- `out_for_delivery` - In transit
- `completed` / `delivered` - Finished
- `cancelled` - Cancelled

**Data Dependencies:**
- `orders` table
- `order_items` table
- `payments` table
- RPC: `admin_confirm_order`, `admin_set_order_status`, `admin_verify_gcash_paid`

**Status**: Mature with real-time features

---

## 7. Inventory Management Module

**Purpose**: FIFO inventory tracking and batch receiving

**Main Files:**
- `app/admin/(protected)/inventory-management/page.tsx` - Overview
- `app/admin/(protected)/inventory-management/InventoryManagementClient.tsx`
- `app/admin/(protected)/inventory-management/receive/page.tsx` - Receiving
- `app/admin/(protected)/inventory-management/receive/ReceiveInventoryClient.tsx`

**Key Features:**
- Batch receiving with code generation
- FIFO cost tracking
- Lot allocation tracking
- Profit margin calculations

**Database Design:**
- `inventory_batches` - Batch headers
- `inventory_lots` - Individual product lots with cost
- `order_item_lot_allocations` - Which lots were used for each order item

**Data Dependencies:**
- `inventory_batches` table
- `inventory_lots` table
- `products` table
- RPC: `receive_inventory_batch_atomic`, `consume_inventory_fifo`

**Status**: Mature, sophisticated FIFO implementation

---

## 8. Reports Module

**Purpose**: Business analytics and data export

**Main Files:**
- `app/admin/(protected)/reports/page.tsx`
- `app/admin/(protected)/reports/ReportsClient.tsx`
- `app/api/admin/reports/route.ts` - API endpoint

**Report Features:**
- Date range selection (presets + custom)
- Fulfillment filter (all/pickup/delivery)
- Payment method filter
- Status filter
- Paid-only toggle
- KPIs: orders, revenue, items sold, AOV
- Daily trend chart
- Top clients table
- Top products table
- Operational snapshot
- Alerts (stale orders, unpaid confirmed)

**Data Dependencies:**
- `orders` table
- `order_items` table
- `payments` table

**Status**: Mature with comprehensive filtering

---

## 9. Settings Module

**Purpose**: Application configuration

**Main Files:**
- `app/admin/(protected)/settings/page.tsx`
- `app/admin/(protected)/settings/SettingsClient.tsx`

**Configurable Settings:**
- Category order (homepage display)
- GCash account details
- Service toggles (enableDelivery, enablePickup, etc.)
- Delivery fee
- Landing page text

**Data Dependencies:**
- `app_settings` table
- `settings_meta` table

**Status**: Mature

---

## 10. Services Modules

### 10.1 Printing Service
**Files:**
- `app/services/printing/page.tsx`
- `components/printing/PrintingServiceClient.tsx`
- `app/services/printing/actions.ts`

**Purpose**: Request printing services

**Status**: UI present, implementation partial

### 10.2 GCash Service
**Files:**
- `app/services/gcash/page.tsx`
- `components/gcash/GCashServiceClient.tsx`
- `app/services/gcash/actions.ts`

**Purpose**: GCash cash-in/cash-out requests (2% fee)

**Status**: UI present, implementation partial

### 10.3 Delivery Service
**Files:**
- `app/services/delivery/page.tsx`
- `components/delivery/DeliveryRequestClient.tsx`
- `app/services/delivery/actions.ts`

**Purpose**: Request off-campus item delivery

**Status**: UI present, server actions implemented

### 10.4 Admin Service Views
**Files:**
- `app/admin/(protected)/printing/PrintingAdminClient.tsx`
- `app/admin/(protected)/gcash/GCashAdminClient.tsx`
- `app/admin/(protected)/deliveries/DeliveryAdminClient.tsx`

**Purpose**: Admin management of service requests

**Status**: Present but may need completion

---

## 11. Expenses Module

**Purpose**: Track operational expenses

**Main Files:**
- `app/admin/(protected)/expenses/page.tsx`
- `app/admin/(protected)/expenses/actions.ts`
- `components/admin/AddExpenseForm.tsx`
- `components/admin/ExpenseTable.tsx`

**Note**: Expense table structure not confirmed in schema

**Status**: UI present, schema needs verification

---

## Module Dependencies Graph

```
Storefront
├── Checkout
│   └── Order Success
│
Admin (Protected)
├── Dashboard
├── Products
│   └── Inventory Management
├── Orders
├── Reports
├── Settings
├── Services (Printing/GCash/Delivery)
└── Expenses
```

## Module Completion Status Summary

| Module | Status | Risk Level |
|--------|--------|------------|
| Storefront | ✅ Mature | Low |
| Checkout | ✅ Mature | Low |
| Order Success | ✅ Mature | Low |
| Admin Dashboard | ✅ Mature | Low |
| Products | ✅ Mature | Low |
| Orders | ✅ Mature | Low |
| Inventory | ✅ Mature | Medium (complex FIFO) |
| Reports | ✅ Mature | Low |
| Settings | ✅ Mature | Low |
| Services (Public) | ⚠️ Partial | Medium |
| Services (Admin) | ⚠️ Partial | Medium |
| Expenses | ⚠️ Partial | High (schema unclear) |
