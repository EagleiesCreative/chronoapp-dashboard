-- Diagnostic Query - Run this FIRST to see your current schema
-- This will help us understand what tables and columns you already have

-- Check existing tables
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check devices table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'devices'
ORDER BY ordinal_position;

-- Check for foreign keys on devices
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'devices';

-- Count existing records
SELECT 
  'devices' as table_name,
  COUNT(*) as record_count
FROM devices
UNION ALL
SELECT 
  'users' as table_name,
  COUNT(*) as record_count
FROM users
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
UNION ALL
SELECT 
  'organizations' as table_name,
  COUNT(*) as record_count
FROM organizations
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations');
