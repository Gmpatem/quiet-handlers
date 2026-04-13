-- Migration: Checkout Receipt Upload Support
-- Date: 2026-04-09
-- Pack: D1 - Checkout Wizard Improvements

-- Note: This migration enables receipt photo upload for GCash payments
-- The proof_url column already exists in the payments table

-- Storage bucket setup (run in Supabase Dashboard SQL Editor):
-- 1. Create bucket: order-proofs (public)
-- 2. Add RLS policies below

-- ============================================
-- STORAGE BUCKET RLS POLICIES
-- ============================================
-- Run these in Supabase Dashboard > Storage > Policies

-- Policy: Allow authenticated users to upload receipts
-- CREATE POLICY "Allow authenticated uploads" ON storage.objects
--   FOR INSERT TO authenticated 
--   WITH CHECK (bucket_id = 'order-proofs');

-- Policy: Allow public to read receipts (needed for admin display)
-- CREATE POLICY "Allow public reads" ON storage.objects
--   FOR SELECT TO anon, authenticated 
--   USING (bucket_id = 'order-proofs');

-- ============================================
-- VERIFICATION: Check proof_url column exists
-- ============================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payments' AND column_name = 'proof_url';

-- Expected: proof_url | text | YES

-- ============================================
-- INDEX: Add index for faster proof lookups
-- ============================================
-- Note: Only run if not already exists
-- CREATE INDEX IF NOT EXISTS idx_payments_proof_url 
-- ON payments(proof_url) WHERE proof_url IS NOT NULL;

-- ============================================
-- MANUAL SETUP REQUIRED
-- ============================================
-- 1. Go to Supabase Dashboard > Storage
-- 2. Create new bucket named: "order-proofs"
-- 3. Enable "Public bucket" option
-- 4. Add the RLS policies listed above
-- 5. Set file size limit to 5MB
-- 6. Allowed MIME types: image/jpeg, image/png, image/webp
