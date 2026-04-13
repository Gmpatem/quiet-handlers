-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Expense Details
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'Others',
  
  -- Optional Batch Reference
  batch_id UUID REFERENCES inventory_batches(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX idx_expenses_created_at ON expenses(created_at DESC);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_batch_id ON expenses(batch_id);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert" ON expenses
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to read all
CREATE POLICY "Allow authenticated read" ON expenses
  FOR SELECT TO authenticated
  USING (true);

-- Policy: Allow authenticated users to update
CREATE POLICY "Allow authenticated update" ON expenses
  FOR UPDATE TO authenticated
  USING (true);

-- Policy: Allow authenticated users to delete
CREATE POLICY "Allow authenticated delete" ON expenses
  FOR DELETE TO authenticated
  USING (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
