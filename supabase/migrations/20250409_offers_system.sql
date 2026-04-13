-- Migration: Offers System Foundation
-- Date: 2026-04-09
-- Pack: E - Offers System

-- ============================================
-- TABLE: offers
-- ============================================
-- Purpose: Store all offer types with shared metadata

-- Precheck: Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'offers'
);

-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('combo', 'threshold', 'loyalty', 'service', 'website_only', 'scheduled')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'paused', 'scheduled', 'expired', 'draft')),
  description TEXT,
  badge_text TEXT,
  
  -- Lifecycle
  is_active BOOLEAN DEFAULT false,
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  
  -- Display
  priority INTEGER DEFAULT 0,
  visibility_scope TEXT DEFAULT 'public' CHECK (visibility_scope IN ('public', 'website_only', 'in_store_only')),
  is_featured BOOLEAN DEFAULT false,
  
  -- Offer-specific config (JSONB for flexibility)
  config JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add comments
COMMENT ON TABLE offers IS 'Central offers/promotions table supporting 6 offer types';
COMMENT ON COLUMN offers.type IS 'combo|threshold|loyalty|service|website_only|scheduled';
COMMENT ON COLUMN offers.status IS 'active|paused|scheduled|expired|draft';
COMMENT ON COLUMN offers.config IS 'Flexible JSON config based on offer type';

-- ============================================
-- TABLE: offer_products (for combo offers)
-- ============================================
CREATE TABLE IF NOT EXISTS offer_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty INTEGER DEFAULT 1,
  special_price_cents INTEGER, -- Override price for this product in combo
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
-- Active offers lookup
CREATE INDEX IF NOT EXISTS idx_offers_active_lookup 
ON offers(is_active, status, start_at, end_at) 
WHERE is_active = true;

-- Type filter
CREATE INDEX IF NOT EXISTS idx_offers_type ON offers(type);

-- Priority ordering
CREATE INDEX IF NOT EXISTS idx_offers_priority ON offers(priority DESC, created_at DESC);

-- Offer products lookup
CREATE INDEX IF NOT EXISTS idx_offer_products_offer ON offer_products(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_products_product ON offer_products(product_id);

-- ============================================
-- FUNCTION: Update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for offers
DROP TRIGGER IF EXISTS update_offers_updated_at ON offers;
CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE CONFIG STRUCTURES (for reference)
-- ============================================
/*
-- Combo offer config:
{
  "combo_price_cents": 15000,
  "savings_cents": 3000,
  "products": [...]
}

-- Threshold offer config:
{
  "threshold_cents": 50000,
  "reward_type": "discount_percent|discount_fixed|free_item|free_service",
  "reward_value": 10,
  "reward_product_id": null
}

-- Loyalty offer config:
{
  "points_required": 100,
  "reward_type": "discount|free_item",
  "reward_value": 5000
}

-- Service-linked offer config:
{
  "service_type": "printing|gcash|delivery",
  "discount_percent": 10,
  "voucher_code": "PRINT10"
}

-- Scheduled/time-based config:
{
  "recurring": false,
  "exam_week": true,
  "special_event": "Exam Week"
}
*/

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'offers table created' AS result;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'offers';
