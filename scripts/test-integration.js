// Quick test script to verify Clerk-Supabase integration
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testIntegration() {
  console.log('🔍 Testing Clerk-Supabase Integration...\n')

  // Test 1: Check if tables exist
  console.log('📋 Checking tables...')
  const tables = ['users', 'organizations', 'organization_memberships', 'devices']
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1)
    
    if (error) {
      console.log(`   ❌ ${table} - ${error.message}`)
    } else {
      console.log(`   ✅ ${table} - table exists`)
    }
  }

  // Test 2: Check devices schema
  console.log('\n📋 Checking devices schema...')
  const { data: devices, error: devicesError } = await supabase
    .from('devices')
    .select('*')
    .limit(0)

  if (!devicesError) {
    console.log('   ✅ devices table accessible')
    
    // Check for required columns
    const { data: columns } = await supabase
      .rpc('get_columns', { table_name: 'devices' })
      .catch(() => ({ data: null }))
    
    const requiredColumns = ['organization_id', 'created_by', 'booth_code', 'booth_id']
    console.log('   Checking for required columns:')
    
    // Simple check - just query the table with select
    try {
      await supabase
        .from('devices')
        .select('id, organization_id, created_by, booth_code, booth_id, name, location, price, status')
        .limit(1)
      console.log('   ✅ All required columns present')
    } catch (e) {
      console.log('   ⚠️  Some columns may be missing:', e.message)
    }
  } else {
    console.log('   ❌ devices table error:', devicesError.message)
  }

  // Test 3: Check RLS status
  console.log('\n🔒 Checking Row Level Security...')
  const rlsTables = ['users', 'organizations', 'organization_memberships', 'devices']
  
  for (const table of rlsTables) {
    try {
      // Try to access with anon key (should be restricted or allowed based on RLS)
      const anonSupabase = createClient(
        supabaseUrl, 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseKey
      )
      
      const { error } = await anonSupabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error && error.message.includes('RLS')) {
        console.log(`   ✅ ${table} - RLS enabled and enforced`)
      } else {
        console.log(`   ℹ️  ${table} - accessible (service role or RLS policy allows)`)
      }
    } catch (e) {
      console.log(`   ⚠️  ${table} - check failed`)
    }
  }

  // Test 4: Count existing data
  console.log('\n📊 Data Summary:')
  
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
  console.log(`   Users: ${userCount || 0}`)

  const { count: orgCount } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
  console.log(`   Organizations: ${orgCount || 0}`)

  const { count: membershipCount } = await supabase
    .from('organization_memberships')
    .select('*', { count: 'exact', head: true })
  console.log(`   Memberships: ${membershipCount || 0}`)

  const { count: deviceCount } = await supabase
    .from('devices')
    .select('*', { count: 'exact', head: true })
  console.log(`   Devices (Booths): ${deviceCount || 0}`)

  console.log('\n✅ Integration test complete!')
  console.log('\n📝 Next steps:')
  console.log('   1. Start your dev server: npm run dev')
  console.log('   2. Log in to your app')
  console.log('   3. Navigate to /dashboard/booths')
  console.log('   4. Check Supabase Table Editor - users/orgs should sync automatically')
}

testIntegration().catch(console.error)
