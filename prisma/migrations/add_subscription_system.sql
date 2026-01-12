-- Add subscription system to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'basic';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_booths INTEGER DEFAULT 1;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'IDR',
  max_booths INTEGER,
  features JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (id, name, price, max_booths, features) VALUES
('basic', 'Basic', 0, 1, '{
  "vouchers": false,
  "multiprint": false,
  "paper_tracking": false,
  "priority_support": false,
  "custom_branding": false,
  "advanced_analytics": false
}'),
('pro', 'Pro', 299000, 5, '{
  "vouchers": true,
  "multiprint": true,
  "paper_tracking": true,
  "priority_support": true,
  "custom_branding": true,
  "advanced_analytics": true
}')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  max_booths = EXCLUDED.max_booths,
  features = EXCLUDED.features;

-- Create subscription history table for audit trail
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id VARCHAR(20) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'created', 'upgraded', 'downgraded', 'cancelled', 'renewed'
  previous_plan VARCHAR(20),
  amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  payment_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_plan ON organizations(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_subscription_history_org ON subscription_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created ON subscription_history(created_at DESC);

-- Add comments
COMMENT ON COLUMN organizations.subscription_plan IS 'Current subscription plan (basic, pro)';
COMMENT ON COLUMN organizations.subscription_status IS 'Subscription status (active, cancelled, expired, past_due)';
COMMENT ON COLUMN organizations.subscription_expires_at IS 'When the current subscription period ends';
COMMENT ON COLUMN organizations.max_booths IS 'Maximum number of booths allowed for this organization';
