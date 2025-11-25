#!/usr/bin/env node

/**
 * Quick diagnostic script to check Supabase setup
 */

console.log('🔍 Checking Supabase Setup...\n');

// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });

  Object.keys(envVars).forEach(key => {
    process.env[key] = envVars[key];
  });
} catch (err) {
  console.log('⚠️  Could not load .env.local');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 Environment Variables:');
if (supabaseUrl) {
  console.log(`✅ Supabase URL: ${supabaseUrl.substring(0, 40)}...`);
} else {
  console.log('❌ Supabase URL not found');
}

if (supabaseKey) {
  console.log(`✅ Service Role Key: ${supabaseKey.substring(0, 25)}...`);
} else {
  console.log('❌ Service Role Key not found');
}

if (!supabaseUrl || !supabaseKey) {
  console.log('\n❌ Missing environment variables. Cannot test connection.\n');
  process.exit(1);
}

// Test Supabase connection
async function testSupabase() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('\n🔌 Testing Supabase Connection...');
    
    // Try to query the booths table
    const { data, error } = await supabase
      .from('booths')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('relation "booths" does not exist') || 
          error.code === '42P01') {
        console.log('❌ Table "booths" does NOT exist\n');
        console.log('📝 ACTION REQUIRED:');
        console.log('   1. Go to https://supabase.com/dashboard');
        console.log('   2. Select your project');
        console.log('   3. Go to SQL Editor');
        console.log('   4. Run the SQL from: prisma/booths_table.sql\n');
        process.exit(1);
      }
      
      if (error.message.includes('permission denied') || error.code === '42501') {
        console.log('❌ Permission denied - RLS may be blocking access\n');
        console.log('📝 ACTION REQUIRED:');
        console.log('   Disable Row Level Security on booths table:');
        console.log('   ALTER TABLE booths DISABLE ROW LEVEL SECURITY;\n');
        process.exit(1);
      }
      
      throw error;
    }

    console.log('✅ Connection successful!');
    console.log('✅ Table "booths" exists');
    console.log(`✅ Found ${data?.length || 0} booth(s)`);
    console.log('\n🎉 Your Supabase setup is working!\n');
    
  } catch (err) {
    console.log(`❌ Error: ${err.message}\n`);
    console.log('📝 Check:');
    console.log('   - Supabase project is active');
    console.log('   - Network connection is working');
    console.log('   - Credentials are correct\n');
    process.exit(1);
  }
}

testSupabase();
