-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product-images
-- Allow public read access
CREATE POLICY "Allow public product image reads" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

-- Allow authenticated users (admins) to upload
CREATE POLICY "Allow authenticated product image uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- Allow authenticated users (admins) to update
CREATE POLICY "Allow authenticated product image updates" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');

-- Allow authenticated users (admins) to delete
CREATE POLICY "Allow authenticated product image deletes" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');
