-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  xendit_id text UNIQUE NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL,
  payment_method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payments_organization ON payments (organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_xendit_id ON payments (xendit_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "Service role has full access to payments" ON payments
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Organization members can view payments
CREATE POLICY "Organization members can view payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_memberships
      WHERE organization_id = payments.organization_id
      AND user_id = auth.uid()::text
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
