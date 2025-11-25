-- ChronoSnap Supabase Schema with Clerk Integration
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- USERS TABLE (synced from Clerk)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,  -- Clerk user ID (e.g., user_xxx)
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ========================================
-- ORGANIZATIONS TABLE (synced from Clerk)
-- ========================================
CREATE TABLE IF NOT EXISTS organizations (
  id text PRIMARY KEY,  -- Clerk org ID (e.g., org_xxx)
  name text NOT NULL,
  slug text UNIQUE,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations (slug);

-- ========================================
-- ORGANIZATION MEMBERSHIPS (synced from Clerk)
-- ========================================
CREATE TABLE IF NOT EXISTS organization_memberships (
  id text PRIMARY KEY,  -- Clerk membership ID
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,  -- 'org:admin' or 'org:member'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_memberships_org ON organization_memberships (organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON organization_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON organization_memberships (role);

-- ========================================
-- DEVICES TABLE (booths - updated schema)
-- ========================================
-- First, check if devices table exists and alter it, or create new
DO $$ 
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'devices') THEN
    
    -- Alter existing table to add missing columns
    -- Change client_id to text if it's uuid
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'devices' 
      AND column_name = 'client_id' 
      AND data_type = 'uuid'
    ) THEN
      ALTER TABLE devices ALTER COLUMN client_id TYPE text USING client_id::text;
    END IF;

    -- Add organization_id if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'devices' AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE devices ADD COLUMN organization_id text REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;

    -- Add created_by if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'devices' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE devices ADD COLUMN created_by text REFERENCES users(id);
    END IF;

    -- Ensure booth_code exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'devices' AND column_name = 'booth_code'
    ) THEN
      ALTER TABLE devices ADD COLUMN booth_code text;
    END IF;

    -- Ensure booth_id exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'devices' AND column_name = 'booth_id'
    ) THEN
      ALTER TABLE devices ADD COLUMN booth_id text;
    END IF;

  ELSE
    -- Create new devices table
    CREATE TABLE devices (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      created_by text REFERENCES users(id),
      name text NOT NULL,
      location text NOT NULL,
      booth_id text NOT NULL,
      booth_code text NOT NULL,
      dslrbooth_api text,
      dslrbooth_pass text,
      price numeric(10,2) NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'active',
      active_layout_id uuid,
      client_id text,  -- Legacy field, will map to organization_id
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Add unique constraint on booth_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_booth_code_unique ON devices (booth_code);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_devices_organization ON devices (organization_id);
CREATE INDEX IF NOT EXISTS idx_devices_created_by ON devices (created_by);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices (status);
CREATE INDEX IF NOT EXISTS idx_devices_client_id ON devices (client_id);

-- ========================================
-- SYNC client_id to organization_id
-- ========================================
-- Update existing rows to sync client_id with organization_id
UPDATE devices 
SET organization_id = client_id 
WHERE organization_id IS NULL AND client_id IS NOT NULL;

-- ========================================
-- UPDATED_AT TRIGGER FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_memberships_updated_at ON organization_memberships;
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON organization_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for API access with service key)
CREATE POLICY "Service role has full access to users" ON users
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to organizations" ON organizations
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to memberships" ON organization_memberships
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to devices" ON devices
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ========================================
-- HELPER VIEWS
-- ========================================

-- View to get organization members with user details
CREATE OR REPLACE VIEW organization_members_view AS
SELECT 
  om.id,
  om.organization_id,
  om.user_id,
  om.role,
  u.email,
  u.first_name,
  u.last_name,
  u.image_url,
  o.name as organization_name,
  om.created_at,
  om.updated_at
FROM organization_memberships om
JOIN users u ON om.user_id = u.id
JOIN organizations o ON om.organization_id = o.id;

-- View to get devices with organization info
CREATE OR REPLACE VIEW devices_with_org_view AS
SELECT 
  d.*,
  o.name as organization_name,
  o.slug as organization_slug,
  u.email as created_by_email,
  u.first_name as created_by_first_name,
  u.last_name as created_by_last_name
FROM devices d
LEFT JOIN organizations o ON d.organization_id = o.id
LEFT JOIN users u ON d.created_by = u.id;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant permissions on all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Grant permissions on sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON TABLE users IS 'Synced from Clerk - stores user identity';
COMMENT ON TABLE organizations IS 'Synced from Clerk - stores organization/tenant info';
COMMENT ON TABLE organization_memberships IS 'Synced from Clerk - tracks which users belong to which orgs and their roles';
COMMENT ON TABLE devices IS 'Photo booth devices/stations managed by organizations';

COMMENT ON COLUMN devices.client_id IS 'Legacy field - use organization_id instead';
COMMENT ON COLUMN devices.organization_id IS 'References organizations.id (Clerk org ID)';
COMMENT ON COLUMN devices.created_by IS 'References users.id (Clerk user ID)';
