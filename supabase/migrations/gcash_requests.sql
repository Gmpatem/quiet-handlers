-- Create gcash_requests table
CREATE TABLE IF NOT EXISTS gcash_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Student Info
  student_name TEXT NOT NULL,
  student_contact TEXT NOT NULL,
  
  -- Transaction Details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('cash_in', 'send_money', 'bills_payment', 'buy_load')),
  amount DECIMAL(10,2) NOT NULL,
  service_fee DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Payment Proof
  payment_proof_url TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  admin_notes TEXT
);

-- Create indexes
CREATE INDEX idx_gcash_requests_status ON gcash_requests(status);
CREATE INDEX idx_gcash_requests_created_at ON gcash_requests(created_at DESC);
CREATE INDEX idx_gcash_requests_transaction_type ON gcash_requests(transaction_type);

-- Enable Row Level Security
ALTER TABLE gcash_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert
CREATE POLICY "Allow public insert" ON gcash_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to read all
CREATE POLICY "Allow authenticated read" ON gcash_requests
  FOR SELECT TO authenticated
  USING (true);

-- Policy: Allow authenticated users to update
CREATE POLICY "Allow authenticated update" ON gcash_requests
  FOR UPDATE TO authenticated
  USING (true);

-- Create storage bucket for GCash payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('gcash-proofs', 'gcash-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Allow public gcash proof uploads" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'gcash-proofs');

CREATE POLICY "Allow public gcash proof reads" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'gcash-proofs');

-- Trigger to auto-update updated_at
CREATE TRIGGER update_gcash_requests_updated_at
  BEFORE UPDATE ON gcash_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
