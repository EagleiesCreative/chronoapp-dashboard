-- Add assigned_to column to booths table for member assignment
-- Run this in your Supabase SQL Editor

-- Add assigned_to column if it doesn't exist
ALTER TABLE booths ADD COLUMN IF NOT EXISTS assigned_to text;

-- Add foreign key constraint to users table
ALTER TABLE booths ADD CONSTRAINT fk_booths_assigned_to 
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- Create index on assigned_to for faster queries
CREATE INDEX IF NOT EXISTS idx_booths_assigned_to ON booths (assigned_to);

-- Add comment for documentation
COMMENT ON COLUMN booths.assigned_to IS 'User ID of the member this booth is assigned to (from users table/Clerk)';
