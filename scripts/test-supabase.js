#!/usr/bin/env node

/**
 * Supabase Connection Test
 * Run this to verify your Supabase setup is correct
 */

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n');

  // Check environment variables
  console.log('📋 Checking environment variables:');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.log('❌ SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL not found');
    console.log('   Add to .env.local: NEXT_PUBLIC_SUPABASE_URL=your_url');
    process.exit(1);
  }
  console.log(`✅ Supabase URL: ${supabaseUrl.substring(0, 30)}...`);

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    console.log('   Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your_key');
    process.exit(1);
  }
  console.log(`✅ Service Role Key: ${supabaseKey.substring(0, 20)}...`);

  // Test connection
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('\n🔌 Testing connection...');
    const { data, error } = await supabase.from('booths').select('count', { count: 'exact', head: true });

    if (error) {
      if (error.message.includes('relation "booths" does not exist')) {
        console.log('❌ Table "booths" does not exist');
        console.log('\n📝 Next steps:');
        console.log('   1. Go to Supabase Dashboard → SQL Editor');
        console.log('   2. Run the migration from: prisma/booths_table.sql');
        console.log('   3. Run this script again to verify');
        process.exit(1);
      }
      throw error;
    }

    console.log('✅ Connection successful!');
    console.log(`✅ Table "booths" exists`);
    console.log(`\n🎉 Supabase is ready to use!\n`);

  } catch (err) {
    console.log('❌ Connection failed:', err.message);
    console.log('\n📝 Troubleshooting:');
    console.log('   1. Verify your Supabase credentials in .env.local');
    console.log('   2. Check that your Supabase project is active');
    console.log('   3. Ensure you have network access to Supabase');
    process.exit(1);
  }
}

testConnection();
