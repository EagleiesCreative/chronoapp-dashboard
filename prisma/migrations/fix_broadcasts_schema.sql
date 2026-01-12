-- Add all missing columns to broadcasts table
-- This fixes the schema to match what the application expects

-- Add priority column
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';

-- Add sender_id column (if missing)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS sender_id VARCHAR(255);

-- Add subject column (if missing)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS subject VARCHAR(255);

-- Add message column (if missing)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS message TEXT;

-- Add timestamps (if missing)
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_broadcasts_priority ON broadcasts(priority);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created ON broadcasts(created_at DESC);

-- Add comments
COMMENT ON COLUMN broadcasts.priority IS 'Message priority: low, normal, or high';
COMMENT ON COLUMN broadcasts.organization_id IS 'Clerk organization ID';
