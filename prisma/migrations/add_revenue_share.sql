-- Create a separate table for member revenue share settings
-- This works independently of Clerk's membership management
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS member_revenue_shares (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id text NOT NULL,
  user_id text NOT NULL,
  revenue_share_percent INTEGER NOT NULL DEFAULT 80,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_revenue_shares_org ON member_revenue_shares (organization_id);
CREATE INDEX IF NOT EXISTS idx_revenue_shares_user ON member_revenue_shares (user_id);

-- Enable RLS
ALTER TABLE member_revenue_shares ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for API access with service key)
CREATE POLICY "Service role has full access to revenue shares" ON member_revenue_shares
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_revenue_shares_updated_at ON member_revenue_shares;
CREATE TRIGGER update_revenue_shares_updated_at BEFORE UPDATE ON member_revenue_shares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON member_revenue_shares TO service_role;
GRANT SELECT ON member_revenue_shares TO anon, authenticated;

COMMENT ON TABLE member_revenue_shares IS 'Stores revenue share percentage settings for organization members';
COMMENT ON COLUMN member_revenue_shares.revenue_share_percent IS 'Client revenue share percentage (0-100). Default 80 means client gets 80%, org gets 20%';
