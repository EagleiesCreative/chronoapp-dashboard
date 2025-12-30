-- Add payment information columns to users table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bank_code text,
ADD COLUMN IF NOT EXISTS account_number text,
ADD COLUMN IF NOT EXISTS account_holder_name text,
ADD COLUMN IF NOT EXISTS payment_info_updated_at timestamptz;

-- Add index for faster payment info lookups
CREATE INDEX IF NOT EXISTS idx_users_payment_info ON public.users (id) 
WHERE bank_code IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.users.bank_code IS 'Bank or e-wallet code for withdrawals (e.g., BCA, BNI, MANDIRI)';
COMMENT ON COLUMN public.users.account_number IS 'Bank account or e-wallet number for withdrawals';
COMMENT ON COLUMN public.users.account_holder_name IS 'Account holder name as registered with bank/e-wallet';
COMMENT ON COLUMN public.users.payment_info_updated_at IS 'Last time payment info was updated - used for 14-day edit restriction';
