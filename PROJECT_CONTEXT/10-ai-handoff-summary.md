# AI Handoff Summary

## Quick Project Brief

**Final Destination Services (FDS)** is a campus convenience ordering platform built with Next.js 16 + React 19 + TypeScript + Supabase. It serves students who want to order snacks/items for pickup at designated dorm locations.

**Key Characteristics:**
- Guest checkout (no accounts for customers)
- Admin dashboard for order/inventory management
- FIFO inventory tracking with profit calculations
- Mobile-first responsive design
- Philippine Peso currency, Manila timezone

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App Router                       │
├─────────────────────────────────────────────────────────────┤
│  Server Components         │  Client Components             │
│  - Data fetching           │  - Storefront (browse/cart)    │
│  - Page shells             │  - Checkout (5-step wizard)    │
│  - Auth checks             │  - Admin UIs                   │
├─────────────────────────────────────────────────────────────┤
│  Supabase PostgreSQL                                       │
│  - Tables: products, orders, inventory_batches/lots, etc.  │
│  - Views: daily_profit_realized, order_profit, etc.        │
│  - RPC: place_order_atomic, receive_inventory_batch_atomic │
└─────────────────────────────────────────────────────────────┘
```

---

## Where Key Logic Lives

### Order Placement
**File**: `app/checkout/CheckoutClient.tsx`  
**Key Function**: `placeOrder()` → calls `supabase.rpc("place_order_atomic")`  
**Flow**: Cart from localStorage → RPC call → redirect to success page

### Inventory Management
**Receiving**: `app/admin/(protected)/inventory-management/receive/ReceiveInventoryClient.tsx`  
**Consumption**: Database RPC `consume_inventory_fifo` (called by `place_order_atomic`)  
**Cost Tracking**: `inventory_lots` + `order_item_lot_allocations` tables

### Profit Calculation
**Real-time Views**: `daily_profit_realized`, `order_profit_realized`  
**Data Source**: `order_item_lot_allocations` (actual lot costs)

### Authentication
**Login**: `app/admin/login/page.tsx`  
**Protection**: `app/admin/(protected)/layout.tsx` (server) + `AdminShell.tsx` (client)  
**Requirement**: `profiles.is_admin = true`

---

## Where Key Routes Live

| Purpose | Route | File |
|---------|-------|------|
| Storefront | `/` | `app/page.tsx` |
| Checkout | `/checkout` | `app/checkout/page.tsx` |
| Order Success | `/order/success/[code]` | `app/order/success/[code]/page.tsx` |
| Admin Dashboard | `/admin` | `app/admin/(protected)/page.tsx` |
| Products | `/admin/products` | `app/admin/(protected)/products/page.tsx` |
| Orders | `/admin/orders` | `app/admin/(protected)/orders/page.tsx` |
| Reports | `/admin/reports` | `app/admin/(protected)/reports/page.tsx` |
| Settings | `/admin/settings` | `app/admin/(protected)/settings/page.tsx` |
| API Reports | `POST /api/admin/reports` | `app/api/admin/reports/route.ts` |

---

## What Must Be Preserved

### Critical Business Logic (Don't Break)
1. **FIFO Inventory**: `consume_inventory_fifo` function
2. **Atomic Order Placement**: `place_order_atomic` function
3. **Profit Calculations**: Database views `daily_profit_realized`, `order_profit`
4. **Stock Management**: `inventory_lots.qty_remaining` updates

### Critical User Flows (Don't Disrupt)
1. **Storefront → Cart → Checkout → Success**
2. **Admin Login → Dashboard → Orders → Status Updates**
3. **Inventory Receiving → Stock Updates**

### Database Constraints
- All prices in `cents` (integer)
- Timezone: `Asia/Manila`
- Currency: PHP (Philippine Peso)
- Order codes: `FDS-XXXXXX` format

---

## Recommended Safe Workflow

### For UI Changes
1. Check design system in `PROJECT_CONTEXT/07-styling-and-design-system.md`
2. Use existing color palette: amber primary, stone secondary
3. Use `rounded-xl` or `rounded-2xl` for containers
4. Test mobile viewport (320px minimum)
5. Follow existing responsive patterns (`sm:`, `lg:`)

### For New Features
1. Copy existing pattern from similar feature
2. Use Server Components for data fetching where possible
3. Use `supabaseServer()` for server, `supabaseBrowser()` for client
4. Add to AdminShell navigation if admin feature
5. Update this documentation

### For Database Changes
1. **ALWAYS** check RPC functions that might be affected
2. Test FIFO logic if touching inventory tables
3. Verify profit views still work
4. Consider if migration needed for existing data

---

## Best Entry Points

### For UI Work
1. **Storefront polish**: `components/store/Storefront.tsx`
2. **Admin dashboard enhancements**: `app/admin/(protected)/page.tsx`
3. **New admin pages**: Copy pattern from `app/admin/(protected)/reports/`

### For Backend Work
1. **New settings**: `app/admin/(protected)/settings/SettingsClient.tsx`
2. **New reports**: `app/api/admin/reports/route.ts`
3. **Database functions**: Check `lib/supabase.ts` for function signatures

### For Debugging
1. **Check data**: Use Supabase dashboard
2. **Check logs**: Browser console for client, Vercel/terminal for server
3. **Check types**: `lib/supabase.ts` has full schema
4. **Common issues**: Cart localStorage key mismatch (see risk notes)

---

## Key Configuration Files

| File | Purpose |
|------|---------|
| `next.config.mjs` | Build config (ignores TS/ESLint errors) |
| `tailwind.config.ts` | Design tokens, colors |
| `app/globals.css` | CSS variables, custom utilities |
| `components.json` | shadcn/ui configuration |
| `.env.local` | Supabase URL and keys (not in repo) |

---

## Quick Commands

```bash
# Development
npm run dev          # Start dev server on localhost:3000

# Build
npm run build        # Production build

# Lint (currently suppressed in build)
npm run lint         # Check ESLint
```

---

## Troubleshooting Quick Reference

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| Cart not persisting | Key mismatch | Check `fds_cart_v1` vs `tenpesorun_cart_v1` |
| Images not loading | Wrong bucket | Use `product-images` bucket |
| Auth fails | Not admin | Check `profiles.is_admin` |
| Profit shows wrong | FIFO issue | Check `inventory_lots` allocations |
| Build fails | TS errors | Suppressed in config, check locally |

---

## File Paths Quick Reference

**Always use `@/` alias for imports:**
```typescript
// ✅ Good
import { supabaseServer } from "@/lib/supabaseServer";
import { Button } from "@/components/ui/button";

// ❌ Avoid
import { supabaseServer } from "../../../lib/supabaseServer";
```

---

## Need More Detail?

See the other files in `PROJECT_CONTEXT/`:
- `00-project-overview.md` - Business context
- `01-project-structure.md` - Directory layout
- `02-tech-stack-and-config.md` - Dependencies and config
- `03-routing-and-app-flow.md` - Navigation patterns
- `04-feature-module-inventory.md` - Feature details
- `05-components-hooks-utils-inventory.md` - Component catalog
- `06-database-and-backend-notes.md` - Database deep dive
- `07-styling-and-design-system.md` - Design tokens
- `08-pages-and-screen-map.md` - Screen inventory
- `09-risk-notes-and-codebase-observations.md` - Known issues
- `11-file-index.csv` - Complete file listing

---

## Contact Points

**If something breaks:**
1. Check risk notes in `09-risk-notes-and-codebase-observations.md`
2. Verify database schema matches `lib/supabase.ts`
3. Check for hardcoded values that should be settings
4. Test both mobile and desktop

**Last Updated**: 2026-04-09  
**Context Pack Version**: 1.0
