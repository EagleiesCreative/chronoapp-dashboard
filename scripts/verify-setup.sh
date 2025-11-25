#!/bin/bash

# Clerk + Supabase Integration Setup Verification
# This script checks if you've completed all the setup steps

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  ChronoSnap - Clerk + Supabase Integration Checker           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Check 1: Environment Variables
echo "📋 Checking environment variables..."
if [ -f .env.local ]; then
    echo "   ✅ .env.local file exists"
    
    # Check Supabase URL
    if grep -q "SUPABASE_URL\|NEXT_PUBLIC_SUPABASE_URL" .env.local; then
        echo "   ✅ Supabase URL configured"
    else
        echo -e "   ${RED}❌ Supabase URL missing${NC}"
        ERRORS=$((ERRORS+1))
    fi
    
    # Check Supabase Service Role Key
    if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local; then
        echo "   ✅ Supabase Service Role Key configured"
    else
        echo -e "   ${RED}❌ Supabase Service Role Key missing${NC}"
        ERRORS=$((ERRORS+1))
    fi
    
    # Check Clerk Keys
    if grep -q "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" .env.local; then
        echo "   ✅ Clerk Publishable Key configured"
    else
        echo -e "   ${RED}❌ Clerk Publishable Key missing${NC}"
        ERRORS=$((ERRORS+1))
    fi
    
    if grep -q "CLERK_SECRET_KEY" .env.local; then
        echo "   ✅ Clerk Secret Key configured"
    else
        echo -e "   ${RED}❌ Clerk Secret Key missing${NC}"
        ERRORS=$((ERRORS+1))
    fi
else
    echo -e "   ${RED}❌ .env.local file not found${NC}"
    ERRORS=$((ERRORS+1))
fi

echo ""

# Check 2: Required Files
echo "📋 Checking required files..."
FILES=(
    "prisma/schema.sql"
    "src/lib/clerk-sync.ts"
    "src/app/api/booths/route.ts"
    "scripts/test-integration.js"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
    else
        echo -e "   ${RED}❌ $file missing${NC}"
        ERRORS=$((ERRORS+1))
    fi
done

echo ""

# Check 3: Node Modules
echo "📋 Checking dependencies..."
if [ -d "node_modules/@supabase/supabase-js" ]; then
    echo "   ✅ @supabase/supabase-js installed"
else
    echo -e "   ${YELLOW}⚠️  @supabase/supabase-js not installed${NC}"
    echo "      Run: npm install @supabase/supabase-js"
fi

if [ -d "node_modules/@clerk/nextjs" ]; then
    echo "   ✅ @clerk/nextjs installed"
else
    echo -e "   ${RED}❌ @clerk/nextjs not installed${NC}"
    ERRORS=$((ERRORS+1))
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "🚀 Next Steps:"
    echo ""
    echo "1️⃣  Run the Database Migration:"
    echo "   → Open: https://supabase.com/dashboard"
    echo "   → Go to SQL Editor → New Query"
    echo "   → Copy contents of prisma/schema.sql"
    echo "   → Paste and RUN"
    echo ""
    echo "2️⃣  Test the Integration:"
    echo "   → Run: node scripts/test-integration.js"
    echo ""
    echo "3️⃣  Start Development Server:"
    echo "   → Run: npm run dev"
    echo "   → Visit: http://localhost:3000"
    echo ""
    echo "📚 Documentation:"
    echo "   Quick Start: INTEGRATION_QUICKSTART.md"
    echo "   Visual Guide: INTEGRATION_VISUAL_GUIDE.md"
else
    echo -e "${RED}❌ Found $ERRORS error(s)${NC}"
    echo ""
    echo "Please fix the errors above before proceeding."
    echo "See DO_THIS_NOW_INTEGRATION.md for setup instructions."
fi

echo "═══════════════════════════════════════════════════════════════"
