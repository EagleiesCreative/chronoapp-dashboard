-- Add priority column to broadcasts table
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'low';

-- Add check constraint for priority (optional, but good for data integrity)
-- Note: Supabase/Postgres might require a separate command or different syntax depending on version, 
-- but this is standard.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'broadcasts_priority_check') THEN
        ALTER TABLE broadcasts ADD CONSTRAINT broadcasts_priority_check CHECK (priority IN ('low', 'medium', 'high'));
    END IF;
END $$;

-- Create broadcast_reads table to track which users have read which broadcasts
CREATE TABLE IF NOT EXISTS broadcast_reads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    broadcast_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- Clerk User ID
    organization_id TEXT NOT NULL, -- To easily filter by org
    read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(broadcast_id, user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_broadcast_reads_user_org ON broadcast_reads(user_id, organization_id);
