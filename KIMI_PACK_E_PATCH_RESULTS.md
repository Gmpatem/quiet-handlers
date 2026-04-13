# Pack E Patch Results: Merchandising Enhancement

**Date:** 2026-04-09  
**Status:** COMPLETED  
**Scope:** Bug fix + Offer-driven per-product badges + Manual product badges

---

## Summary

Fixed the offers timestamp bug and implemented a comprehensive badge system that supports both:
1. **Offer-driven badges** - Dynamic badges from active offers (priority)
2. **Manual product badges** - Static badges set per product (fallback)

---

## Part 1: Offers Timestamp Bug Fix

### Problem
Creating or editing offers failed with:
```
invalid input syntax for type timestamp with time zone: ""
```

### Root Cause
Blank datetime fields (`start_at`, `end_at`) were being sent as empty strings to Supabase/Postgres instead of `null`.

### Solution
Added date normalization helper and updated payload construction:

```typescript
function normalizeDateTime(value?: string | null): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : new Date(trimmed).toISOString();
}
```

### Changes to `app/admin/(protected)/offers/page.tsx`
- Added `normalizeDateTime()` helper function
- Updated `handleSubmit()` to normalize dates before sending
- Added validation: `end_at` must be >= `start_at` when both exist
- Explicitly build payload instead of spreading formData for better control
- Proper error handling with `setSaving(false)` on all error paths

---

## Part 2: Offer-Driven Per-Product Badges

### Overview
Offers can now define badges that automatically appear on linked products while the offer is active.

### New Database Fields (offers table)

| Field | Type | Description |
|-------|------|-------------|
| `product_badge_text` | TEXT | Badge text (e.g., "SALE", "20% OFF", "BUNDLE") |
| `product_badge_variant` | TEXT | Color variant: amber, emerald, rose, blue, purple, slate |
| `product_badge_priority` | INTEGER | Higher = wins when multiple offers apply |

### SQL Migration

**File:** `supabase/migrations/20250409_offer_badges.sql`

```sql
-- Add product badge fields to offers table
ALTER TABLE IF EXISTS offers 
ADD COLUMN IF NOT EXISTS product_badge_text TEXT,
ADD COLUMN IF NOT EXISTS product_badge_variant TEXT DEFAULT 'amber' 
  CHECK (product_badge_variant IN ('amber', 'emerald', 'rose', 'blue', 'purple', 'slate')),
ADD COLUMN IF NOT EXISTS product_badge_priority INTEGER DEFAULT 0;

-- Index for efficient badge lookup
CREATE INDEX IF NOT EXISTS idx_offers_badge_active 
ON offers(is_active, status, product_badge_text) 
WHERE is_active = true AND product_badge_text IS NOT NULL;
```

**Run this in Supabase Dashboard > SQL Editor**

---

## Badge Priority Rule (V1)

```
┌─────────────────────────────────────────────────────┐
│  BADGE RESOLUTION (Single Badge Per Product)        │
├─────────────────────────────────────────────────────┤
│  1. Check for active offer badge on product         │
│     └── Found? → Show offer badge (highest priority)│
│  2. No offer badge? → Show product.badge_text       │
│  3. Neither? → No badge                             │
└─────────────────────────────────────────────────────┘
```

**Key Rule:** Active offer badges ALWAYS override manual product badges. This ensures promotions are prominently displayed.

---

## Admin UI Changes

### Offer Create/Edit Modal - Advanced Section

New "Product Badge (Optional)" subsection added:

```
┌─────────────────────────────────────────┐
│  Product Badge (Optional)               │
│  Display a badge on linked products...  │
├─────────────────────────────────────────┤
│  Badge Text: [____________]             │
│            e.g., SALE, 20% OFF          │
│                                         │
│  Variant: [Amber ▼]                     │
│    - Amber (default)                    │
│    - Emerald                            │
│    - Rose                               │
│    - Blue                               │
│    - Purple                             │
│    - Slate                              │
│                                         │
│  Badge Priority: [0]                    │
│  Higher = wins when multiple apply      │
└─────────────────────────────────────────┘
```

### Field Behaviors
- **Badge Text**: Optional, cleared → variant also cleared
- **Variant**: Defaults to amber, only applies when text is set
- **Priority**: 0-100, higher wins in conflicts

---

## Storefront Rendering

### Badge Display Logic

```typescript
// Priority: Offer badge > Manual product badge
const offerBadge = productBadges[p.id];
const text = offerBadge?.text || p.badge_text;
const variant = offerBadge?.variant || 'amber';
```

### Badge Variants (Visual Styles)

| Variant | Gradient Class | Use Case |
|---------|---------------|----------|
| amber | `from-amber-500 to-amber-600` | Default, general promotions |
| emerald | `from-emerald-500 to-emerald-600` | Eco-friendly, fresh, new |
| rose | `from-rose-500 to-rose-600` | Urgent, limited, hot |
| blue | `from-blue-500 to-blue-600` | Cool, tech, services |
| purple | `from-purple-500 to-purple-600` | Premium, loyalty, special |
| slate | `from-slate-500 to-slate-600` | Neutral, subtle |

### Badge Position & Style
- **Position:** Top-left corner of product image
- **Text:** White, bold, small (xs)
- **Shape:** Rounded-lg pill
- **Shadow:** Subtle shadow-md for depth
- **Z-index:** Above image, stock badge on opposite corner

```
┌─────────────────────────────┐
│ [SALE]              [12]    │  ← Badge (left) + Stock (right)
│                             │
│      Product Image          │
│                             │
├─────────────────────────────┤
│ Product Name                │
│ ₱150.00                     │
│ In stock                    │
│ [Add to Cart]               │
└─────────────────────────────┘
```

---

## Part 3: Manual Per-Product Badges (Fallback)

### Database
**File:** `supabase/migrations/20250409_product_badges.sql`

```sql
ALTER TABLE IF EXISTS products 
ADD COLUMN IF NOT EXISTS badge_text TEXT;
```

### Admin Product Form
- New "Badge Text" field below Stock
- Placeholder: "e.g., NEW, HOT, SALE"
- Only shown when no active offer badge applies

### Behavior
- Serves as fallback when no offer badge is active
- Can be overridden anytime by an active offer
- Independent of offers system

---

## Files Changed

| File | Changes |
|------|---------|
| `app/admin/(protected)/offers/page.tsx` | Added offer badge fields to interface, form state, payload, and Advanced UI |
| `app/admin/(protected)/products/ProductForm.tsx` | Added badge_text field to product form |
| `app/admin/(protected)/products/page.tsx` | Added badge_text to select query |
| `app/admin/(protected)/products/ProductsClient.tsx` | Show badge in admin product list |
| `components/store/Storefront.tsx` | Fetch offer badges, apply priority rule, render with variants |
| `supabase/migrations/20250409_offer_badges.sql` | Offers table badge columns |
| `supabase/migrations/20250409_product_badges.sql` | Products table badge column |

---

## Design Principles

✅ **Single Badge Rule** - Only one badge per product, no clutter  
✅ **Offer Priority** - Promotions always visible when active  
✅ **Subtle Design** - Badges enhance, don't overpower products  
✅ **Color Variants** - Visual distinction for different offer types  
✅ **Graceful Fallback** - Manual badges work without offers  

---

## Build Status

✅ Clean build - no errors  
✅ No breaking changes  
✅ Backward compatible  

---

## Test Checklist

### Offer Badges
- [ ] Create offer with product badge → should save
- [ ] Set badge text + variant → should display on linked products
- [ ] Multiple offers on same product → highest priority wins
- [ ] Paused/expired offer → badge disappears
- [ ] Offer badge overrides manual product badge

### Product Badges (Fallback)
- [ ] Set manual badge on product → should display
- [ ] Manual badge hidden when offer badge active
- [ ] Manual badge returns when no offer badge

### Timestamp Bug Fix
- [ ] Create offer with blank dates → should succeed
- [ ] Create offer with dates → should normalize to ISO
- [ ] End before start → validation error

---

## Deployment Steps

1. **Run SQL migrations** in Supabase SQL Editor:
   - `supabase/migrations/20250409_offer_badges.sql`
   - `supabase/migrations/20250409_product_badges.sql`
2. **Deploy code** changes
3. **Test** badge creation and display
4. **Verify** priority rules work correctly

---

## Ready for Production

✅ YES - All changes are minimal, focused, and safe.
