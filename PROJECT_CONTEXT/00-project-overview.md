# Project Overview: Final Destination Services (FDS)

## What This Project Is

**Final Destination Services (FDS)** is a campus convenience and snack ordering platform designed for a university/college environment ("Handling things. Quietly"). It provides a complete e-commerce solution with:

- **Public storefront** for browsing products and placing orders
- **Guest checkout** (no account required for customers)
- **Admin dashboard** for managing products, orders, inventory, and viewing analytics
- **Additional services**: Printing, GCash cash-in/cash-out, and off-campus delivery requests

## Apparent Business Purpose

A campus-based convenience service that allows students to:
1. Browse and order snacks, drinks, and convenience items
2. Pick up orders at designated dorm locations (Boys Dorm Room 411, Girls Dorm Room 206)
3. Request printing services
4. Use GCash cash-in/cash-out services
5. Request delivery of off-campus items

## Main User Types

| User Type | Access Level | Key Actions |
|-----------|--------------|-------------|
| **Customers** | Public | Browse products, add to cart, checkout, view order confirmation |
| **Admin Users** | Protected (`profiles.is_admin = true`) | Manage products, process orders, view reports, manage inventory, configure settings |

## Core Workflows

### Customer Flow
1. Visit homepage → browse products by category
2. Add items to cart (stored in localStorage)
3. Proceed to checkout
4. Enter name, select pickup location
5. Choose payment method (GCash or Cash on Pickup)
6. Place order → receive order code
7. View order success page with confirmation

### Admin Flow
1. Login via `/admin/login` (requires `profiles.is_admin = true`)
2. Dashboard shows KPIs: open orders, daily revenue/profit, best sellers, low stock
3. Manage products: CRUD operations, bulk updates
4. Process orders: update status, verify payments
5. Manage inventory: receive batches, track stock via FIFO
6. View reports: detailed analytics with filtering
7. Configure settings: toggle services, set GCash details, category ordering

## Product Shape Summary

| Area | Status | Notes |
|------|--------|-------|
| Storefront | **Mature** | Full-featured with categories, cart, mobile-responsive |
| Checkout | **Mature** | 5-step wizard with name memory, pickup selection |
| Order Success | **Mature** | Shows order details, suggestions box |
| Admin Dashboard | **Mature** | KPI cards, charts, quick actions |
| Products Management | **Mature** | Bulk editing, image upload via Supabase Storage |
| Orders Management | **Mature** | Real-time status updates, payment verification |
| Inventory Management | **Mature** | Batch receiving, FIFO cost tracking |
| Reports | **Mature** | Date-range filtering, trend analysis, top clients/products |
| Services (Printing/GCash/Delivery) | **Partial** | UI present, backend via server actions |

## Implementation Maturity

- **Frontend**: Production-ready with polished UI, animations, mobile-first design
- **Backend**: Robust Supabase integration with RPC functions for atomic operations
- **Database**: Sophisticated schema with views for profit calculations, FIFO inventory tracking
- **Auth**: Supabase Auth with admin role checking
- **Real-time**: Dashboard live refresh component present

## Notable Architectural Traits

1. **Hybrid Rendering**: Strategic use of Server Components for data fetching, Client Components for interactivity
2. **Database-First Logic**: Heavy use of PostgreSQL functions/RPC for atomic operations (`place_order_atomic`, `receive_inventory_batch_atomic`)
3. **FIFO Inventory**: Complex cost tracking via `inventory_lots` and `order_item_lot_allocations`
4. **Profit Tracking**: Materialized-like views (`daily_profit_realized`, `order_profit`) for analytics
5. **Settings-Driven**: Many features toggleable via `app_settings` table
6. **Mobile-First**: Extensive mobile optimizations (pull-to-refresh, touch targets, responsive grids)

## Important Notes for Future Developers

- **Currency**: All prices stored in `cents` (PHP/Philippine Peso)
- **Timezone**: Hardcoded to `Asia/Manila` for date calculations
- **Pickup Locations**: Currently hardcoded to two dorm rooms
- **Payment Methods**: GCash and Cash on Pickup (COD)
- **Order Status Flow**: `pending` → `confirmed` → `preparing` → `ready` → `completed`/`delivered`
- **Build Config**: TypeScript and ESLint errors are ignored during build (`next.config.mjs`)
