-- Pack E Patch: Product Badges
-- Adds manual per-product badge support for merchandising

-- 1. Add badge_text column to products table
ALTER TABLE IF EXISTS products 
ADD COLUMN IF NOT EXISTS badge_text TEXT;

-- 2. Add comment for documentation
COMMENT ON COLUMN products.badge_text IS 'Optional merchandising badge shown on product cards (e.g., NEW, HOT, SALE)';

-- 3. Index for quick filtering (optional, if you want to filter by badges)
CREATE INDEX IF NOT EXISTS idx_products_badge ON products(badge_text) WHERE badge_text IS NOT NULL;
