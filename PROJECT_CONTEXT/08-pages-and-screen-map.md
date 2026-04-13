# Pages and Screen Map

## Public Screens

### 1. Homepage (Storefront)

**Route**: `/`  
**File**: `app/page.tsx` → `components/store/Storefront.tsx`

**Purpose**: Browse products and add to cart

**Key Components:**
- Full-width header with FDS branding
- Service quick links (Printing, GCash, Delivery)
- Category filter pills
- Product grid (responsive: 2-5 columns)
- Cart sidebar (desktop) / floating button (mobile)
- Pull-to-refresh (mobile)
- Hamburger menu with navigation

**Data Dependencies:**
- `products` table (active products)
- `app_settings.category_order`

**User Audience**: All customers (guest checkout)

**Completion State**: ✅ Mature

---

### 2. Checkout

**Route**: `/checkout`  
**File**: `app/checkout/page.tsx` → `app/checkout/CheckoutClient.tsx`

**Purpose**: 5-step order placement wizard

**Steps:**
1. **Customer Info** - Name entry with autocomplete
2. **Pickup Point** - Boys Dorm (411) or Girls Dorm (206)
3. **Delivery** - Placeholder (disabled)
4. **Payment** - GCash or Cash on Pickup
5. **Review** - Order summary and confirmation

**Key Features:**
- Progress bar (25% → 50% → 75% → 100%)
- Name memory (localStorage)
- Pickup point memory
- GCash reference validation
- Order total calculation

**Data Dependencies:**
- `app_settings` (GCash details, toggles)
- RPC: `place_order_atomic`

**User Audience**: Customers with items in cart

**Completion State**: ✅ Mature

---

### 3. Order Success

**Route**: `/order/success/[code]`  
**File**: `app/order/success/[code]/page.tsx`

**Purpose**: Order confirmation and details

**Displays:**
- Order code (prominent)
- Customer name
- Pickup location
- Payment method
- Item list with quantities
- Order total
- Suggestion text area (optional feedback)
- "Continue Shopping" button

**Data Dependencies:**
- `orders` table (by order_code)
- `order_items` table

**User Audience**: Customers who just placed an order

**Completion State**: ✅ Mature

---

### 4. Printing Service Request

**Route**: `/services/printing`  
**File**: `app/services/printing/page.tsx` → `components/printing/PrintingServiceClient.tsx`

**Purpose**: Request printing services

**Fields (assumed from pattern):**
- Document upload/specifications
- Print options (color, quantity, etc.)
- Contact information

**Data Dependencies:**
- Server action: `submitPrintRequest`

**User Audience**: Customers needing printing

**Completion State**: ⚠️ UI present, implementation partial

---

### 5. GCash Service Request

**Route**: `/services/gcash`  
**File**: `app/services/gcash/page.tsx` → `components/gcash/GCashServiceClient.tsx`

**Purpose**: GCash cash-in/cash-out requests

**Fields:**
- Transaction type (cash-in/cash-out)
- Amount
- Contact info
- 2% fee calculation

**Data Dependencies:**
- Server action: `submitGCashRequest`

**User Audience**: Customers needing GCash services

**Completion State**: ⚠️ UI present, implementation partial

---

### 6. Delivery Service Request

**Route**: `/services/delivery`  
**File**: `app/services/delivery/page.tsx` → `components/delivery/DeliveryRequestClient.tsx`

**Purpose**: Request off-campus item delivery

**Fields:**
- Item description
- Pickup location
- Delivery location
- Contact information

**Data Dependencies:**
- Server action: `submitDeliveryRequest`

**User Audience**: Customers needing delivery

**Completion State**: ✅ Implemented (server actions present)

---

## Admin Screens

### 7. Admin Login

**Route**: `/admin/login`  
**File**: `app/admin/login/page.tsx`

**Purpose**: Administrator authentication

**Fields:**
- Email
- Password

**Features:**
- FDS branding
- Form validation
- Error display
- Redirect to `/admin` on success

**Data Dependencies:**
- Supabase Auth
- `profiles.is_admin` check

**User Audience**: Admin users only

**Completion State**: ✅ Mature

---

### 8. Admin Dashboard

**Route**: `/admin`  
**File**: `app/admin/(protected)/page.tsx`

**Purpose**: Operational overview and KPIs

**Sections:**
1. **Header** - Title + quick action buttons
2. **KPI Cards** - Open orders, realized revenue, pipeline revenue
3. **7-Day Summary** - Realized vs Pipeline
4. **Order Status Grid** - Count by status
5. **Best Sellers Table** - Top 5 products (7 days)
6. **Low Stock Table** - Products needing attention
7. **Quick Links** - Products, Orders, Settings

**Data Dependencies:**
- `orders` (open orders)
- `daily_profit_realized` view
- `daily_profit_pipeline` view
- `top_products_7d_realized` view
- `products` (low stock)

**User Audience**: Admins

**Completion State**: ✅ Mature

---

### 9. Products Management

**Route**: `/admin/products`  
**File**: `app/admin/(protected)/products/page.tsx` → `ProductsClient.tsx`

**Purpose**: Manage product catalog

**Features:**
- Product grid with filtering
- Bulk actions (activate/deactivate)
- Inline price editing
- Stock adjustment
- Image upload (via Supabase Storage)
- Category assignment
- Add new product modal
- Receive batch modal

**Data Dependencies:**
- `products` table
- Storage bucket: `product-images`

**User Audience**: Admins

**Completion State**: ✅ Mature

---

### 10. Orders Management

**Route**: `/admin/orders`  
**File**: `app/admin/(protected)/orders/page.tsx` → `OrdersClient.tsx`

**Purpose**: Process and track orders

**Features:**
- Order list with filters
- Status workflow controls
- Payment verification
- Order detail modal
- Real-time updates (polling)
- Search by order code/customer

**Order Actions:**
- Confirm order
- Update status (confirmed → preparing → ready → completed)
- Verify GCash payment
- View order items

**Data Dependencies:**
- `orders` table
- `order_items` table
- `payments` table
- RPC: `admin_confirm_order`, `admin_set_order_status`, etc.

**User Audience**: Admins

**Completion State**: ✅ Mature

---

### 11. Inventory Management

**Route**: `/admin/inventory-management`  
**File**: `app/admin/(protected)/inventory-management/page.tsx`

**Purpose**: View inventory status

**Features:**
- Batch list view
- Lot allocations
- Stock levels
- Cost tracking

**Related Page:**
- `/admin/inventory-management/receive` - Receive new inventory

**Data Dependencies:**
- `inventory_batches` table
- `inventory_lots` table
- Views: `inventory_batches_admin`, `inventory_batch_lines_admin`

**User Audience**: Admins

**Completion State**: ✅ Mature

---

### 12. Inventory Receiving

**Route**: `/admin/inventory-management/receive`  
**File**: `app/admin/(protected)/inventory-management/receive/page.tsx`

**Purpose**: Receive new inventory batches

**Features:**
- Batch code generation
- Product selection
- Quantity input
- Cost per unit input
- Note field
- Submit to `receive_inventory_batch_atomic`

**Data Dependencies:**
- `products` table
- RPC: `receive_inventory_batch_atomic`

**User Audience**: Admins

**Completion State**: ✅ Mature

---

### 13. Reports

**Route**: `/admin/reports`  
**File**: `app/admin/(protected)/reports/page.tsx` → `ReportsClient.tsx`

**Purpose**: Business analytics

**Features:**
- Date range picker (presets + custom)
- Filters: fulfillment, payment method, status
- KPIs: orders, revenue, items, AOV
- Daily trend chart
- Top clients table
- Top products table
- Operational snapshot
- Alerts (stale orders, unpaid confirmed)
- CSV export

**Data Dependencies:**
- API: `POST /api/admin/reports`
- Aggregates from: `orders`, `order_items`, `payments`

**User Audience**: Admins

**Completion State**: ✅ Mature

---

### 14. Settings

**Route**: `/admin/settings`  
**File**: `app/admin/(protected)/settings/page.tsx` → `SettingsClient.tsx`

**Purpose**: Configure application

**Settings Categories:**
1. **Storefront** - Category order, featured products
2. **Checkout** - Service toggles (delivery, pickup, GCash, COD)
3. **GCash** - Account name, number, instructions
4. **Delivery** - Fee amount

**Data Dependencies:**
- `app_settings` table
- `settings_meta` table (for UI labels)

**User Audience**: Admins

**Completion State**: ✅ Mature

---

### 15. Admin Service Views

#### 15a. Printing Admin
**Route**: `/admin/printing`  
**File**: `app/admin/(protected)/printing/page.tsx`

**Purpose**: Manage printing requests

**Status**: ⚠️ Partial

#### 15b. GCash Admin
**Route**: `/admin/gcash`  
**File**: `app/admin/(protected)/gcash/page.tsx`

**Purpose**: Manage GCash requests

**Status**: ⚠️ Partial

#### 15c. Deliveries Admin
**Route**: `/admin/deliveries`  
**File**: `app/admin/(protected)/deliveries/page.tsx`

**Purpose**: Manage delivery requests

**Status**: ⚠️ Partial

---

### 16. Expenses

**Route**: `/admin/expenses`  
**File**: `app/admin/(protected)/expenses/page.tsx`

**Purpose**: Track operational expenses

**Features:**
- Add expense form
- Expense list/table
- Category tagging

**Data Dependencies:**
- Expense table (schema not confirmed)

**User Audience**: Admins

**Completion State**: ⚠️ Partial (UI present, schema unclear)

---

## Screen Summary Table

| # | Screen | Route | Status | Priority |
|---|--------|-------|--------|----------|
| 1 | Storefront | `/` | ✅ Mature | Critical |
| 2 | Checkout | `/checkout` | ✅ Mature | Critical |
| 3 | Order Success | `/order/success/[code]` | ✅ Mature | Critical |
| 4 | Printing Service | `/services/printing` | ⚠️ Partial | Medium |
| 5 | GCash Service | `/services/gcash` | ⚠️ Partial | Medium |
| 6 | Delivery Service | `/services/delivery` | ✅ Mature | Medium |
| 7 | Admin Login | `/admin/login` | ✅ Mature | Critical |
| 8 | Admin Dashboard | `/admin` | ✅ Mature | Critical |
| 9 | Products | `/admin/products` | ✅ Mature | Critical |
| 10 | Orders | `/admin/orders` | ✅ Mature | Critical |
| 11 | Inventory | `/admin/inventory-management` | ✅ Mature | High |
| 12 | Receive Inventory | `/admin/inventory-management/receive` | ✅ Mature | High |
| 13 | Reports | `/admin/reports` | ✅ Mature | High |
| 14 | Settings | `/admin/settings` | ✅ Mature | High |
| 15 | Services Admin | `/admin/*` | ⚠️ Partial | Low |
| 16 | Expenses | `/admin/expenses` | ⚠️ Partial | Medium |

---

## Navigation Flow Diagram

```
┌─────────────────┐
│   Storefront    │◄────────────────────┐
│       /         │                     │
└────────┬────────┘                     │
         │                             │
         │ Add to cart                 │
         ▼                             │
┌─────────────────┐     ┌──────────────┴───┐
│    Checkout     │────►│  Order Success   │
│   /checkout     │     │/order/success/xxx│
└─────────────────┘     └──────────────────┘
         │
         │ Services menu
         ▼
┌─────────────────┬─────────────────┬─────────────────┐
│    Printing     │     GCash       │    Delivery     │
│/services/printing│/services/gcash │/services/delivery│
└─────────────────┴─────────────────┴─────────────────┘

┌─────────────────┐
│   Admin Login   │
│  /admin/login   │
└────────┬────────┘
         │ Success + is_admin
         ▼
┌─────────────────────────────────────────────────────┐
│                   Admin Dashboard                    │
│                      /admin                          │
└────────┬────────┬────────┬────────┬────────┬────────┘
         │        │        │        │        │
         ▼        ▼        ▼        ▼        ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │Products│ │ Orders │ │Inventory│ │ Reports│ │Settings│
    │/products││ /orders│ │/inventory││/reports│ │/settings│
    └────────┘ └────────┘ └────┬───┘ └────────┘ └────────┘
                               │
                               ▼
                         ┌──────────┐
                         │ Receive  │
                         │/receive  │
                         └──────────┘
```
