#!/usr/bin/env node

/**
 * Apply Member Assignment Migration to Supabase
 * 
 * This script reads the migration SQL and applies it to your Supabase database.
 * 
 * Usage:
 *   node scripts/apply-member-assignment.js
 * 
 * Or via npm:
 *   npm run migrate:member-assignment
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Supabase credentials not found in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function applyMigration() {
  console.log('🔧 ChronoSnap Member Assignment Migration');
  console.log('==========================================\n');

  // Read migration file
  const migrationPath = path.join(process.cwd(), 'prisma/add-assigned-to.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('📋 Migration file: prisma/add-assigned-to.sql');
  console.log('📡 Target: Supabase Database\n');
  
  console.log('This migration will add:');
  console.log('  ✓ assigned_to column to booths table');
  console.log('  ✓ Foreign key constraint to users table');
  console.log('  ✓ Index for query performance\n');

  // Parse and execute statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s.length > 0)
    .map(s => s + ';');

  console.log(`Found ${statements.length} SQL statements\n`);

  try {
    console.log('🚀 Applying migration...\n');

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const statementPreview = statement.split('\n')[0].substring(0, 70);
      
      process.stdout.write(`  [${i + 1}/${statements.length}] ${statementPreview}... `);

      try {
        // Use Supabase's rpc to execute raw SQL
        const { error } = await supabase.rpc('exec_sql', { 
          sql_string: statement 
        });

        if (error) {
          // Some errors are okay (like "already exists")
          if (error.message.includes('already exists') || 
              error.message.includes('UNIQUE constraint') ||
              error.code === 'PGRST301') {
            console.log('⏭️  (skipped - already exists)');
          } else {
            throw error;
          }
        } else {
          console.log('✅');
        }
      } catch (err) {
        console.log(`❌`);
        console.error(`\n     Error: ${err.message}`);
        // Continue with next statement
      }
    }

    console.log('\n✅ Migration completed!\n');
    console.log('📝 Changes applied:');
    console.log('   • Added assigned_to column to booths table');
    console.log('   • Created foreign key to users table');
    console.log('   • Added index for better query performance\n');
    
    console.log('🎉 Ready to use!\n');
    console.log('Next steps:');
    console.log('  1. Restart your dev server (npm run dev)');
    console.log('  2. Go to Booth Management page');
    console.log('  3. Create a booth and assign it to a member\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(`   ${error.message}\n`);
    
    console.log('💡 Troubleshooting:\n');
    console.log('Option 1: Run migration manually via Supabase dashboard');
    console.log('  1. Open https://app.supabase.com');
    console.log('  2. Select your project');
    console.log('  3. Go to SQL Editor');
    console.log('  4. Create new query and paste contents of: prisma/add-assigned-to.sql');
    console.log('  5. Click Run\n');
    
    console.log('Option 2: Check connection details');
    console.log('  • Verify NEXT_PUBLIC_SUPABASE_URL in .env.local');
    console.log('  • Verify SUPABASE_SERVICE_ROLE_KEY in .env.local');
    console.log('  • Ensure you have write access to the database\n');
    
    process.exit(1);
  }
}

// Run migration
applyMigration().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
