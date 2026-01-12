-- Drop existing broadcasts table and recreate with correct schema
-- This will delete any existing broadcast data

DROP TABLE IF EXISTS broadcast_reads CASCADE;
DROP TABLE IF EXISTS broadcasts CASCADE;

-- Create broadcasts table with correct schema
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR(255) NOT NULL,
  sender_id VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create broadcast_reads table
CREATE TABLE broadcast_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  organization_id VARCHAR(255) NOT NULL,
  read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(broadcast_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_broadcasts_org ON broadcasts(organization_id);
CREATE INDEX idx_broadcasts_created ON broadcasts(created_at DESC);
CREATE INDEX idx_broadcasts_priority ON broadcasts(priority);
CREATE INDEX idx_broadcast_reads_broadcast ON broadcast_reads(broadcast_id);
CREATE INDEX idx_broadcast_reads_user ON broadcast_reads(user_id);
CREATE INDEX idx_broadcast_reads_org ON broadcast_reads(organization_id);

-- Enable Row Level Security
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_reads ENABLE ROW LEVEL SECURITY;

-- Create policies to deny public access (service role bypasses these)
CREATE POLICY "Deny public access" ON broadcasts FOR ALL USING (false);
CREATE POLICY "Deny public access" ON broadcast_reads FOR ALL USING (false);

-- Add comments
COMMENT ON TABLE broadcasts IS 'Organization broadcast messages/announcements';
COMMENT ON COLUMN broadcasts.organization_id IS 'Clerk organization ID';
COMMENT ON COLUMN broadcasts.subject IS 'Broadcast subject/title';
COMMENT ON COLUMN broadcasts.message IS 'Broadcast message content';
COMMENT ON COLUMN broadcasts.priority IS 'Message priority: low, normal, or high';
COMMENT ON TABLE broadcast_reads IS 'Tracks which users have read which broadcasts';
