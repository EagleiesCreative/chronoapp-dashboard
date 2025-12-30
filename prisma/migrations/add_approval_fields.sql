-- Migration to add approval workflow fields to existing withdrawals table
-- Run this in your Supabase SQL Editor

-- Add new columns for approval workflow
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'PENDING_APPROVAL',
ADD COLUMN IF NOT EXISTS approved_by text,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS batch_id text;

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_withdrawals_approval_status ON withdrawals (approval_status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_batch ON withdrawals (batch_id);

-- Update existing withdrawals to have approval_status based on their current status
UPDATE withdrawals 
SET approval_status = CASE 
    WHEN status IN ('SUCCEEDED', 'PENDING', 'ACCEPTED') THEN 'DISBURSED'
    WHEN status = 'FAILED' THEN 'REJECTED'
    WHEN status = 'CANCELLED' THEN 'REJECTED'
    ELSE 'PENDING_APPROVAL'
END
WHERE approval_status = 'PENDING_APPROVAL';

-- Update comments
COMMENT ON TABLE withdrawals IS 'Tracks all withdrawal/payout requests via Xendit with approval workflow';
COMMENT ON COLUMN withdrawals.approval_status IS 'Approval workflow status: PENDING_APPROVAL, APPROVED, REJECTED, DISBURSED';
COMMENT ON COLUMN withdrawals.approved_by IS 'User ID of admin who approved the withdrawal';
COMMENT ON COLUMN withdrawals.batch_id IS 'Xendit batch disbursement ID if processed in batch';
