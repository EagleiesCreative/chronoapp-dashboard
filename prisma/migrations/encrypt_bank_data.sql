-- Migration: Encrypt bank account data
-- This adds encrypted columns and keeps last4 for display purposes

-- Add new encrypted columns to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS account_number_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS account_holder_name_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS account_number_last4 VARCHAR(4);

-- Add new encrypted columns to organization_memberships
ALTER TABLE organization_memberships 
  ADD COLUMN IF NOT EXISTS bank_account_number_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_holder_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_last4 VARCHAR(4);

-- Add new encrypted columns to withdrawals
ALTER TABLE withdrawals 
  ADD COLUMN IF NOT EXISTS account_number_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS account_holder_name_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS account_number_last4 VARCHAR(4);

-- Add comments for documentation
COMMENT ON COLUMN users.account_number_encrypted IS 'AES-256-GCM encrypted bank account number';
COMMENT ON COLUMN users.account_holder_name_encrypted IS 'AES-256-GCM encrypted account holder name';
COMMENT ON COLUMN users.account_number_last4 IS 'Last 4 digits for display purposes';

COMMENT ON COLUMN organization_memberships.bank_account_number_encrypted IS 'AES-256-GCM encrypted bank account number';
COMMENT ON COLUMN organization_memberships.bank_account_holder_encrypted IS 'AES-256-GCM encrypted account holder name';
COMMENT ON COLUMN organization_memberships.bank_account_last4 IS 'Last 4 digits for display purposes';

COMMENT ON COLUMN withdrawals.account_number_encrypted IS 'AES-256-GCM encrypted bank account number at time of withdrawal';
COMMENT ON COLUMN withdrawals.account_holder_name_encrypted IS 'AES-256-GCM encrypted account holder name at time of withdrawal';
COMMENT ON COLUMN withdrawals.account_number_last4 IS 'Last 4 digits for display purposes';

-- Note: After running this migration, you need to:
-- 1. Add ENCRYPTION_KEY to your .env.local (min 32 characters)
-- 2. Run a data migration script to encrypt existing plain text data
-- 3. Eventually drop the old plain text columns (account_number, account_holder_name)
