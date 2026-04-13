-- Create delivery_requests table
CREATE TABLE IF NOT EXISTS delivery_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Student Info
  student_name TEXT NOT NULL,
  student_contact TEXT NOT NULL,
  
  -- Delivery Details
  item_description TEXT NOT NULL,
  store_location TEXT,
  
  -- Payment
  payment_method TEXT NOT NULL CHECK (payment_method IN ('prepaid', 'cod')),
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  payment_proof_url TEXT,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid')),
  
  -- Status & Assignment
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'out_for_delivery', 'completed', 'cancelled')),
  rider_name TEXT,
  admin_notes TEXT
);

-- Create indexes
CREATE INDEX idx_delivery_requests_status ON delivery_requests(status);
CREATE INDEX idx_delivery_requests_created_at ON delivery_requests(created_at DESC);
CREATE INDEX idx_delivery_requests_student_contact ON delivery_requests(student_contact);

-- Enable Row Level Security
ALTER TABLE delivery_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert
CREATE POLICY "Allow public insert" ON delivery_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to read all
CREATE POLICY "Allow authenticated read" ON delivery_requests
  FOR SELECT TO authenticated
  USING (true);

-- Policy: Allow authenticated users to update
CREATE POLICY "Allow authenticated update" ON delivery_requests
  FOR UPDATE TO authenticated
  USING (true);

-- Create storage bucket for delivery payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for delivery-proofs
CREATE POLICY "Allow public delivery proof uploads" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'delivery-proofs');

CREATE POLICY "Allow public delivery proof reads" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'delivery-proofs');

-- Trigger to auto-update updated_at
CREATE TRIGGER update_delivery_requests_updated_at
  BEFORE UPDATE ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
