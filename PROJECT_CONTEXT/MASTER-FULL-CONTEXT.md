# MASTER FULL CONTEXT

## Executive Summary

**Final Destination Services (FDS)** is a production-ready campus convenience ordering platform built with Next.js 16, React 19, TypeScript, and Supabase. It enables students to browse products, place orders for pickup at designated dorm locations, and request auxiliary services (printing, GCash, delivery).

**Maturity Level**: Production-ready with sophisticated inventory management (FIFO cost tracking) and profit analytics.

**Architecture**: Next.js App Router with hybrid rendering (Server Components for data, Client Components for interactivity), Supabase PostgreSQL for data with RPC functions for atomic operations.

---

## Known Facts from Code

### Tech Stack (Confirmed)
- **Framework**: Next.js 16.0.10 with App Router
- **UI Library**: React 19.0.1
- **Language**: TypeScript 5.9.3
- **Styling**: Tailwind CSS 3.4.16 + shadcn/ui (New York style)
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth with custom `profiles.is_admin` role
- **Icons**: Lucide React
- **Font**: Inter (via @fontsource)

### Database Schema (Confirmed)
**Core Tables:**
- `products` - Catalog with stock tracking
- `orders` / `order_items` - Order management with snapshots
- `payments` - Payment records (GCash/COD)
- `inventory_batches` / `inventory_lots` - FIFO inventory tracking
- `order_item_lot_allocations` - Cost allocation for profit calculations
- `profiles` - User profiles with admin flag
- `app_settings` - Configuration store

**Key Views:**
- `daily_profit_realized` / `daily_profit_pipeline` - Revenue analytics
- `order_profit_realized` - Per-order profit
- `inventory_batches_admin` - Batch management

**Key RPC Functions:**
- `place_order_atomic` - Order placement with inventory consumption
- `receive_inventory_batch_atomic` - Inventory receiving
- `consume_inventory_fifo` - FIFO stock allocation

### Route Structure (Confirmed)
```
/                           - Storefront (public)
/checkout                   - 5-step checkout (public)
/order/success/[code]       - Order confirmation (public)
/services/*                 - Service requests (public)
/admin/login                - Admin auth
/admin/(protected)/*        - Admin dashboard (protected)
/api/admin/reports          - Analytics API (protected)
```

### Critical Configuration
- **Currency**: Cents-based (PHP)
- **Timezone**: Hardcoded to Asia/Manila
- **Pickup Locations**: Boys Dorm (Room 411), Girls Dorm (Room 206)
- **Payment Methods**: GCash, Cash on Pickup
- **Build**: TypeScript and ESLint errors suppressed in production

### File Locations (Key)
| Purpose | Path |
|---------|------|
| Storefront | `components/store/Storefront.tsx` (886 lines) |
| Checkout | `app/checkout/CheckoutClient.tsx` (846 lines) |
| Admin Layout | `app/admin/(protected)/AdminShell.tsx` |
| Supabase Types | `lib/supabase.ts` (~1000 lines) |
| Server Client | `lib/supabaseServer.ts` |
| Browser Client | `lib/supabase/browser.ts` |
| Design Tokens | `app/globals.css` |

---

## Assumptions Requiring Verification

### Schema Assumptions
1. **Expenses Table**: Components exist but table not confirmed in schema file
2. **Service Request Tables**: Printing/GCash/Delivery forms exist but storage mechanism unclear
3. **RLS Policies**: Assumed standard Supabase policies but not verified

### Business Logic Assumptions
1. **Single Campus**: Hardcoded dorm locations suggest single deployment
2. **Philippines Only**: PHP currency, Manila timezone, GCash payment
3. **Admin-Managed**: No self-service for customers beyond ordering

### Technical Assumptions
1. **Supabase Project**: Requires `NEXT_PUBLIC_SUPABASE_URL` and `ANON_KEY`
2. **Storage Bucket**: `product-images` bucket for product photos
3. **No CDN**: Images served directly from Supabase Storage

---

## Recommended Safe Workflow for Future Implementation

### Before Starting Any Work
1. **Read Risk Notes**: Check `09-risk-notes-and-codebase-observations.md`
2. **Verify Database**: Confirm schema matches `lib/supabase.ts`
3. **Test Current Flow**: Place test order, verify inventory updates
4. **Backup First**: Export data before schema changes

### For UI Changes
```
1. Reference design system (07-styling-and-design-system.md)
2. Use existing color palette (amber + stone)
3. Follow responsive patterns (mobile-first)
4. Test on 320px width minimum
5. Preserve existing animations/interactions
```

### For Database Changes
```
1. Check affected RPC functions
2. Test FIFO logic if inventory-related
3. Verify views still return correct data
4. Consider migration strategy
5. Update types in lib/supabase.ts
```

### For New Features
```
1. Copy pattern from similar existing feature
2. Use Server Components where possible
3. Add to AdminShell nav if admin feature
4. Follow naming conventions
5. Update this documentation
```

### Testing Checklist
- [ ] Mobile viewport (320px - 428px)
- [ ] Desktop viewport (1024px+)
- [ ] Order placement flow
- [ ] Admin login and navigation
- [ ] Inventory update reflects in storefront
- [ ] Profit calculations correct

---

## Cross-Reference Index

| Topic | Document |
|-------|----------|
| Business purpose | `00-project-overview.md` |
| Directory structure | `01-project-structure.md` |
| Dependencies | `02-tech-stack-and-config.md` |
| Routing patterns | `03-routing-and-app-flow.md` |
| Feature details | `04-feature-module-inventory.md` |
| Component catalog | `05-components-hooks-utils-inventory.md` |
| Database deep dive | `06-database-and-backend-notes.md` |
| Design tokens | `07-styling-and-design-system.md` |
| Screen inventory | `08-pages-and-screen-map.md` |
| Known issues | `09-risk-notes-and-codebase-observations.md` |
| Quick reference | `10-ai-handoff-summary.md` |
| File listing | `11-file-index.csv` |

---

## Critical Reminders

### 🛑 Never Modify Without Testing
- `place_order_atomic` RPC function
- `consume_inventory_fifo` logic
- Profit calculation views
- Auth flow and admin checks

### ⚠️ Verify Before Changing
- Cart localStorage keys (currently inconsistent)
- Peso formatting (duplicated across files)
- Hardcoded locations/timezone

### ✅ Safe to Extend
- New `app_settings` entries
- New admin pages following patterns
- New KPI cards on dashboard
- New report filters/metrics

---

## Quick Start for New AI Sessions

1. **Read**: `10-ai-handoff-summary.md` for quick context
2. **Understand**: Check `04-feature-module-inventory.md` for relevant module
3. **Implement**: Follow patterns in existing similar files
4. **Test**: Verify against risk notes and checklist
5. **Document**: Update relevant context files

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-04-09 | 1.0 | Initial context pack creation |

---

## Contact / Maintenance

This context pack is maintained in `PROJECT_CONTEXT/` directory. Update when:
- Major features added/removed
- Database schema changes
- Architecture patterns change
- New risks identified

**Generated**: 2026-04-09  
**Generator**: Kimi Code CLI
