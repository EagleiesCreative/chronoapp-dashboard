-- Create vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booth_id uuid NOT NULL REFERENCES booths(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT 'fixed', -- 'fixed' or 'percentage'
  max_uses integer, -- NULL means unlimited
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booth_id, code)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_vouchers_booth_id ON vouchers(booth_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);

-- Enable RLS
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow read access to authenticated users who are members of the organization that owns the booth
-- (This is a bit complex to join in RLS, often simplified or handled via app logic if using service role in API)
-- For now, let's allow authenticated users to read/write if they have access to the booth.
-- Since we are using server-side API with service role mostly, we might not strictly need complex RLS for the app to work, 
-- but it's good practice.

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to vouchers" ON vouchers
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
