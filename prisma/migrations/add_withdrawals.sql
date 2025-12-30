-- Create withdrawals table for tracking payout requests
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS withdrawals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id text NOT NULL,
    user_id text NOT NULL,
    xendit_payout_id text,
    reference_id text UNIQUE NOT NULL,
    amount numeric(15,2) NOT NULL,
    bank_code text NOT NULL,
    account_number text NOT NULL,
    account_holder_name text NOT NULL,
    status text NOT NULL DEFAULT 'PENDING',
    is_admin boolean DEFAULT false,
    failure_reason text,
    -- Approval workflow fields
    approval_status text NOT NULL DEFAULT 'PENDING_APPROVAL',
    approved_by text,
    approved_at timestamptz,
    rejection_reason text,
    batch_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_withdrawals_org ON withdrawals (organization_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals (user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals (status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_approval_status ON withdrawals (approval_status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_reference ON withdrawals (reference_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_batch ON withdrawals (batch_id);

-- Enable RLS
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for API access with service key)
CREATE POLICY "Service role has full access to withdrawals" ON withdrawals
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_withdrawals_updated_at ON withdrawals;
CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON withdrawals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON withdrawals TO service_role;
GRANT SELECT ON withdrawals TO anon, authenticated;

COMMENT ON TABLE withdrawals IS 'Tracks all withdrawal/payout requests via Xendit with approval workflow';
COMMENT ON COLUMN withdrawals.is_admin IS 'True if withdrawal was made by org admin (org earnings), false for member earnings';
COMMENT ON COLUMN withdrawals.approval_status IS 'Approval workflow status: PENDING_APPROVAL, APPROVED, REJECTED, DISBURSED';
COMMENT ON COLUMN withdrawals.approved_by IS 'User ID of admin who approved the withdrawal';
COMMENT ON COLUMN withdrawals.batch_id IS 'Xendit batch disbursement ID if processed in batch';
