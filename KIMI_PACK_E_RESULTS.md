# Pack E Results: Offers System Foundation

**Date:** 2026-04-09  
**Status:** COMPLETED  
**Scope:** Offers system, storefront surfacing, GCash validation improvement

---

## Offers System Design

### Core Design Decision
A single `offers` table with shared metadata and flexible JSONB config for type-specific rules.

### Supported Offer Types
| Type | Description | Config Structure |
|------|-------------|------------------|
| **combo** | Bundle products at fixed price | `combo_price_cents`, `savings_cents` |
| **threshold** | Spend X get Y reward | `threshold_cents`, `reward_type`, `reward_value` |
| **loyalty** | Points-based rewards | `points_required`, `reward_type` |
| **service** | Service-linked perks | `service_type`, `discount_percent`, `voucher_code` |
| **website_only** | Web exclusives | website-only flag |
| **scheduled** | Time-based (Exam Week) | `recurring`, `exam_week`, `special_event` |

### Shared Metadata
- `name`, `description`, `badge_text`
- `status`: active|paused|scheduled|expired|draft
- `is_active`, `start_at`, `end_at` - lifecycle
- `priority` - display order
- `visibility_scope`: public|website_only|in_store_only
- `is_featured` - highlight important offers
- `config` - JSONB for type-specific rules

---

## Files Changed

| File | Changes |
|------|---------|
| `supabase/migrations/20250409_offers_system.sql` | NEW - Offers table schema |
| `lib/supabase.ts` | Added offers + offer_products tables |
| `lib/pricing.ts` | NEW - Pricing engine foundation |
| `components/store/OffersStrip.tsx` | NEW - Subtle storefront offer strip |
| `components/store/Storefront.tsx` | Added OffersStrip import and placement |
| `app/admin/(protected)/offers/page.tsx` | NEW - Admin offers management |
| `app/admin/(protected)/page.tsx` | Added Offers link to dashboard |
| `app/checkout/CheckoutClient.tsx` | GCash validation improvement |

---

## Admin Offers Page Features

### List View
- Filter by type (Combo, Threshold, Loyalty, Service, Web Exclusive, Scheduled)
- Filter by status (Active, Paused, Scheduled, Expired, Draft)
- Stats cards: Total, Active, Scheduled, Expired
- Expandable offer cards with full details

### Actions
- Activate/Pause toggle
- Delete offer
- Expand to see config JSON
- Create new offer (modal)

### Create Offer Modal
- Name, Type, Description
- Start/End dates
- Featured toggle
- Website-only toggle

---

## Storefront Offer Surfacing

### OffersStrip Component
- Subtle colored strip below header
- Shows featured offers first, then regular
- Dismissible per offer (saved to localStorage)
- "More" button to cycle through offers
- Color-coded by offer type
- Mobile-friendly

### Design Principles
- **Subtle**: Doesn't overpower products
- **Dismissible**: User can hide offers
- **Limited**: Max 5 offers shown
- **Color-coded**: Visual distinction by type

---

## Pricing Engine Foundation

### `lib/pricing.ts`
- `calculateSubtotal()` - base cart calculation
- `calculatePricing()` - main pricing with offer support structure
- `checkComboQualification()` - combo detection
- `checkThresholdQualification()` - threshold detection
- `previewComboPrice()` - combo price preview

### Future Expansion Ready
- Structure supports applied offers array
- Discount and savings tracking
- Formatted display helpers

---

## GCash Validation Improvement

### Old Behavior
- GCash reference number **required**
- Receipt upload **optional**
- Error: "Please enter GCash reference number"

### New Behavior
- **At least one** of reference OR receipt required
- Reference only = Valid
- Receipt only = Valid  
- Both = Valid
- Neither = Invalid

### UX Updates
- Clear messaging: "Provide at least one: Reference number OR Receipt"
- Visual indicators: Checkmarks when one is provided
- Review step shows both fields clearly
- Error message updated

---

## SQL Editor Scripts

Run in Supabase Dashboard > SQL Editor:

```sql
-- Full offers system schema
-- File: supabase/migrations/20250409_offers_system.sql

-- 1. Create offers table
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('combo', 'threshold', 'loyalty', 'service', 'website_only', 'scheduled')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'paused', 'scheduled', 'expired', 'draft')),
  description TEXT,
  badge_text TEXT,
  is_active BOOLEAN DEFAULT false,
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  priority INTEGER DEFAULT 0,
  visibility_scope TEXT DEFAULT 'public' CHECK (visibility_scope IN ('public', 'website_only', 'in_store_only')),
  is_featured BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Create offer_products table (for combos)
CREATE TABLE IF NOT EXISTS offer_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty INTEGER DEFAULT 1,
  special_price_cents INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_offers_active_lookup 
ON offers(is_active, status, start_at, end_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_offers_type ON offers(type);
CREATE INDEX IF NOT EXISTS idx_offers_priority ON offers(priority DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_products_offer ON offer_products(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_products_product ON offer_products(product_id);

-- 4. Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_offers_updated_at ON offers;
CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Test Checklist

### Offers System
- [ ] Create combo offer in admin
- [ ] Create threshold offer
- [ ] Toggle offer active/paused
- [ ] View offer in storefront strip
- [ ] Dismiss offer (stays dismissed)

### GCash Validation
- [ ] GCash with reference only - should work
- [ ] GCash with receipt only - should work
- [ ] GCash with both - should work
- [ ] GCash with neither - should show error
- [ ] Copy button works on mobile

### Pricing Engine
- [ ] calculateSubtotal works correctly
- [ ] Structure ready for future offers

---

## Remaining Limitations / V2

### Offers System
- ⏳ Full combo price application at checkout
- ⏳ Threshold reward auto-calculation
- ⏳ Loyalty points tracking
- ⏳ Service offer integration
- ⏳ Scheduled offer auto-activation

### Pricing Engine
- ⏳ Real-time offer fetching
- ⏳ Automatic discount application
- ⏳ Savings display in cart/checkout

---

## Build Status

✅ Clean build - no errors

---

## Ready for Next Pack

✅ YES

Offers foundation is ready. System supports:
- Admin offer creation and management
- 6 offer types with metadata
- Subtle storefront surfacing
- Pricing engine foundation
- Improved GCash checkout validation
