#!/usr/bin/env node

/**
 * Automatic Supabase Migration Runner
 * Reads .env.local and runs the booths_table.sql migration
 */

const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Starting Supabase Migration...\n');

  // Load environment variables
  const envPath = path.join(process.cwd(), '.env.local');
  let envVars = {};
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  } catch (err) {
    console.log('❌ Error reading .env.local:', err.message);
    process.exit(1);
  }

  const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || envVars.SUPABASE_URL;
  const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing environment variables:');
    if (!supabaseUrl) console.log('   - SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
    if (!supabaseKey) console.log('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(`   Project: ${supabaseUrl.substring(0, 40)}...\n`);

  // Read migration SQL
  const sqlPath = path.join(process.cwd(), 'prisma', 'booths_table.sql');
  let sql;
  
  try {
    sql = fs.readFileSync(sqlPath, 'utf8');
  } catch (err) {
    console.log('❌ Error reading migration file:', err.message);
    process.exit(1);
  }

  console.log('📝 Running migration SQL...\n');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Split SQL by statements and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing...`);
      
      const { error } = await supabase.rpc('exec', { sql: statement + ';' }).catch(() => {
        // Try direct query approach if rpc fails
        return supabase.from('booths').select('*').limit(0);
      });

      if (error && !error.message.includes('already exists')) {
        console.log(`   ⚠️  ${error.message}`);
      } else {
        console.log(`   ✅ Done`);
      }
    }

    // Verify table exists
    console.log('\n🔍 Verifying table creation...');
    const { data, error: verifyError } = await supabase
      .from('booths')
      .select('*')
      .limit(1);

    if (verifyError) {
      if (verifyError.message.includes('relation "booths" does not exist')) {
        console.log('❌ Table still does not exist. Using alternative method...\n');
        await runMigrationViaREST(supabaseUrl, supabaseKey, sql);
        return;
      }
      throw verifyError;
    }

    console.log('✅ Table "booths" exists!');
    console.log(`✅ Found ${data?.length || 0} booth(s)\n`);
    console.log('🎉 Migration successful!\n');
    console.log('📝 Next steps:');
    console.log('   1. Refresh your browser at http://localhost:3000/dashboard/booths');
    console.log('   2. Try creating a booth');
    console.log('   3. It will now persist to Supabase\n');

  } catch (err) {
    console.log('❌ Migration failed:', err.message, '\n');
    console.log('Trying alternative approach...\n');
    await runMigrationViaREST(supabaseUrl, supabaseKey, sql);
  }
}

async function runMigrationViaREST(supabaseUrl, supabaseKey, sql) {
  try {
    console.log('🔄 Using direct REST API approach...\n');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.log('❌ REST API error:', error);
      console.log('\n📝 Manual fix required:');
      console.log('   1. Go to https://supabase.com/dashboard');
      console.log('   2. Go to SQL Editor');
      console.log('   3. Copy contents of: prisma/booths_table.sql');
      console.log('   4. Run it in the SQL Editor');
      process.exit(1);
    }

    console.log('✅ REST API migration successful!\n');
    console.log('🎉 Table created!\n');
    console.log('📝 Next steps:');
    console.log('   1. Refresh your browser at http://localhost:3000/dashboard/booths');
    console.log('   2. Try creating a booth');
    console.log('   3. It will now persist to Supabase\n');

  } catch (err) {
    console.log('❌ Alternative approach also failed:', err.message);
    console.log('\n📝 Please manually run the migration:');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Go to SQL Editor');
    console.log('   4. Create new query');
    console.log('   5. Copy/paste contents of: prisma/booths_table.sql');
    console.log('   6. Click Run\n');
    process.exit(1);
  }
}

runMigration();
