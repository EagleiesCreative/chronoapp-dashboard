-- ChronoSnap Supabase Schema - SAFE MIGRATION
-- This migration is designed to work with your EXISTING schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- STEP 1: Create Clerk Identity Tables (if they don't exist)
-- ========================================

-- USERS TABLE (synced from Clerk)
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ORGANIZATIONS TABLE (synced from Clerk)
CREATE TABLE IF NOT EXISTS organizations (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations (slug);

-- ORGANIZATION MEMBERSHIPS (synced from Clerk)
CREATE TABLE IF NOT EXISTS organization_memberships (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_org ON organization_memberships (organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON organization_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON organization_memberships (role);

-- ========================================
-- STEP 2: Modify EXISTING devices table
-- ========================================

-- Add new columns to devices table (if they don't exist)
DO $$ 
BEGIN
  -- Add organization_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE devices ADD COLUMN organization_id text;
  END IF;

  -- Add created_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE devices ADD COLUMN created_by text;
  END IF;

  -- Add booth_code column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' AND column_name = 'booth_code'
  ) THEN
    ALTER TABLE devices ADD COLUMN booth_code text;
  END IF;

  -- Add booth_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' AND column_name = 'booth_id'
  ) THEN
    ALTER TABLE devices ADD COLUMN booth_id text;
  END IF;

  -- Add dslrbooth_api column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' AND column_name = 'dslrbooth_api'
  ) THEN
    ALTER TABLE devices ADD COLUMN dslrbooth_api text;
  END IF;

  -- Add dslrbooth_pass column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' AND column_name = 'dslrbooth_pass'
  ) THEN
    ALTER TABLE devices ADD COLUMN dslrbooth_pass text;
  END IF;

  -- Add price column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' AND column_name = 'price'
  ) THEN
    ALTER TABLE devices ADD COLUMN price numeric(10,2) DEFAULT 0;
  END IF;

  -- Add updated_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE devices ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  -- Change client_id to text if it's uuid
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'devices' 
    AND column_name = 'client_id' 
    AND data_type = 'uuid'
  ) THEN
    -- First, convert existing UUID values to text
    ALTER TABLE devices ALTER COLUMN client_id TYPE text USING client_id::text;
  END IF;
END $$;

-- ========================================
-- STEP 3: Add Indexes (safe - IF NOT EXISTS)
-- ========================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_booth_code_unique ON devices (booth_code) WHERE booth_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_organization ON devices (organization_id);
CREATE INDEX IF NOT EXISTS idx_devices_created_by ON devices (created_by);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices (status);
CREATE INDEX IF NOT EXISTS idx_devices_client_id ON devices (client_id);

-- ========================================
-- STEP 4: Add Foreign Keys (only if not exists)
-- ========================================

-- Note: We DON'T add foreign key constraints to existing data to avoid breaking it
-- Instead, we'll rely on application-level validation
-- If you want foreign keys later, you can add them manually after cleaning data

-- ========================================
-- STEP 5: Triggers for updated_at
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
-- STEP 6: Row Level Security (RLS)
-- ========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to users" ON users;
DROP POLICY IF EXISTS "Service role has full access to organizations" ON organizations;
DROP POLICY IF EXISTS "Service role has full access to memberships" ON organization_memberships;
DROP POLICY IF EXISTS "Service role has full access to devices" ON devices;

-- Service role bypass (for API access with service key)
CREATE POLICY "Service role has full access to users" ON users
  FOR ALL USING (true);

CREATE POLICY "Service role has full access to organizations" ON organizations
  FOR ALL USING (true);

CREATE POLICY "Service role has full access to memberships" ON organization_memberships
  FOR ALL USING (true);

CREATE POLICY "Service role has full access to devices" ON devices
  FOR ALL USING (true);

-- ========================================
-- STEP 7: Helper Views
-- ========================================

DROP VIEW IF EXISTS organization_members_view;
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

DROP VIEW IF EXISTS devices_with_org_view;
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
-- STEP 8: Grant Permissions
-- ========================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ========================================
-- SUCCESS!
-- ========================================

-- Add comments
COMMENT ON TABLE users IS 'Synced from Clerk - stores user identity';
COMMENT ON TABLE organizations IS 'Synced from Clerk - stores organization/tenant info';
COMMENT ON TABLE organization_memberships IS 'Synced from Clerk - tracks which users belong to which orgs and their roles';
COMMENT ON COLUMN devices.client_id IS 'Legacy field - use organization_id instead';
COMMENT ON COLUMN devices.organization_id IS 'References organizations.id (Clerk org ID)';
COMMENT ON COLUMN devices.created_by IS 'References users.id (Clerk user ID)';
