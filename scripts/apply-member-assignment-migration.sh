#!/bin/bash

# Script to apply the assigned_to migration to Supabase
# Usage: ./scripts/apply-member-assignment-migration.sh

set -e

echo "🔧 ChronoSnap Member Assignment Migration"
echo "=========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found."
    echo "Please create .env.local with your Supabase credentials."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""
echo "📋 About to apply migration: prisma/add-assigned-to.sql"
echo ""
echo "This migration will:"
echo "  • Add 'assigned_to' column to booths table (if not exists)"
echo "  • Create foreign key to users table"
echo "  • Add index for performance"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "🚀 Applying migration..."
echo ""

# Read the migration file and execute it
MIGRATION_FILE="prisma/add-assigned-to.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# Get Supabase connection details from .env.local
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f 2)
SUPABASE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d '=' -f 2)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Supabase credentials not found in .env.local"
    echo "Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    exit 1
fi

# Use Node.js to run the migration (since we have the client in the project)
node << 'EOF'
const fs = require('fs');
const path = require('path');

// Load the migration SQL
const migrationPath = path.join(process.cwd(), 'prisma/add-assigned-to.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Get credentials from .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);

if (!urlMatch || !keyMatch) {
  console.error('❌ Could not read Supabase credentials from .env.local');
  process.exit(1);
}

const url = urlMatch[1].trim();
const key = keyMatch[1].trim();

// Use node-fetch or the Supabase client
const createClient = require('@supabase/supabase-js').createClient;
const supabase = createClient(url, key);

// Run migration
async function runMigration() {
  try {
    console.log('📡 Connecting to Supabase...');
    
    // Execute raw SQL via Supabase RPC or use the REST API
    // We'll split by semicolons and run statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\n▶️  Statement ${i + 1}/${statements.length}...`);
      
      // Use the Supabase query API
      const { data, error } = await supabase.rpc('sql', { query: statement }).single();
      
      if (error && error.code !== 'PGRST301') { // Ignore "not found" errors
        throw new Error(`${error.message}`);
      }
      
      console.log('✅ Executed');
    }
    
    console.log('\n✅ Migration applied successfully!');
    console.log('\n📝 What was added:');
    console.log('  • assigned_to column (nullable text)');
    console.log('  • Foreign key constraint to users table');
    console.log('  • Index on assigned_to for performance');
    
  } catch (error) {
    // If RPC doesn't work, provide manual instructions
    console.log('\n⚠️  Could not run migration via RPC.');
    console.log('\n📋 Manual Steps:');
    console.log('1. Go to https://app.supabase.com');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Click "New Query"');
    console.log('5. Paste the contents of prisma/add-assigned-to.sql');
    console.log('6. Click "Run"');
    process.exit(1);
  }
}

runMigration();
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed!"
    echo ""
    echo "Next steps:"
    echo "1. Restart your dev server (if running)"
    echo "2. Open the Booth Management page"
    echo "3. Create a new booth and assign it to a member"
    echo ""
else
    echo ""
    echo "⚠️  Migration step encountered an issue."
    echo "Please manually run the migration:"
    echo ""
    echo "1. Open Supabase dashboard"
    echo "2. Go to SQL Editor"
    echo "3. Copy contents of: prisma/add-assigned-to.sql"
    echo "4. Paste and Run"
fi
