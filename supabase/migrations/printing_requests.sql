-- Create printing_requests table
CREATE TABLE IF NOT EXISTS printing_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Student Info
  student_name TEXT NOT NULL,
  
  -- Service Details
  service_type TEXT NOT NULL CHECK (service_type IN ('print', 'photocopy', 'scan')),
  pdf_url TEXT,
  color_type TEXT CHECK (color_type IN ('bw', 'color')),
  paper_size TEXT CHECK (paper_size IN ('a4', 'letter', 'legal')),
  pages INTEGER NOT NULL DEFAULT 1,
  copies INTEGER NOT NULL DEFAULT 1,
  sided TEXT CHECK (sided IN ('single', 'double')),
  binding BOOLEAN DEFAULT false,
  special_instructions TEXT,
  
  -- Payment
  payment_method TEXT NOT NULL CHECK (payment_method IN ('gcash', 'cash')),
  payment_proof_url TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid')),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'completed', 'cancelled'))
);

-- Create indexes
CREATE INDEX idx_printing_requests_status ON printing_requests(status);
CREATE INDEX idx_printing_requests_created_at ON printing_requests(created_at DESC);
CREATE INDEX idx_printing_requests_service_type ON printing_requests(service_type);

-- Enable Row Level Security
ALTER TABLE printing_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert
CREATE POLICY "Allow public insert" ON printing_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to read all
CREATE POLICY "Allow authenticated read" ON printing_requests
  FOR SELECT TO authenticated
  USING (true);

-- Policy: Allow authenticated users to update
CREATE POLICY "Allow authenticated update" ON printing_requests
  FOR UPDATE TO authenticated
  USING (true);

-- Create storage buckets for printing
INSERT INTO storage.buckets (id, name, public)
VALUES ('printing-pdfs', 'printing-pdfs', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('printing-proofs', 'printing-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for printing-pdfs
CREATE POLICY "Allow public printing pdf uploads" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'printing-pdfs');

CREATE POLICY "Allow public printing pdf reads" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'printing-pdfs');

-- Storage policies for printing-proofs
CREATE POLICY "Allow public printing proof uploads" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'printing-proofs');

CREATE POLICY "Allow public printing proof reads" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'printing-proofs');

-- Trigger to auto-update updated_at
CREATE TRIGGER update_printing_requests_updated_at
  BEFORE UPDATE ON printing_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
