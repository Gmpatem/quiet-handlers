-- Pack E Enhancement: Offer-Driven Per-Product Badges
-- Adds badge fields to offers table for dynamic product merchandising

-- 1. Add product badge fields to offers table
ALTER TABLE IF EXISTS offers 
ADD COLUMN IF NOT EXISTS product_badge_text TEXT,
ADD COLUMN IF NOT EXISTS product_badge_variant TEXT DEFAULT 'amber' CHECK (product_badge_variant IN ('amber', 'emerald', 'rose', 'blue', 'purple', 'slate')),
ADD COLUMN IF NOT EXISTS product_badge_priority INTEGER DEFAULT 0;

-- 2. Documentation comments
COMMENT ON COLUMN offers.product_badge_text IS 'Badge text shown on linked products when offer is active (e.g., SALE, 20% OFF, BUNDLE)';
COMMENT ON COLUMN offers.product_badge_variant IS 'Badge color variant: amber (default), emerald, rose, blue, purple, slate';
COMMENT ON COLUMN offers.product_badge_priority IS 'Higher priority badges win when multiple offers apply to same product';

-- 3. Index for efficient badge lookup
CREATE INDEX IF NOT EXISTS idx_offers_badge_active 
ON offers(is_active, status, product_badge_text) 
WHERE is_active = true AND product_badge_text IS NOT NULL;
