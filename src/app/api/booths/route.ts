import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from '@/lib/supabase-server'
import { syncUserToSupabase, syncOrganizationToSupabase } from '@/lib/clerk-sync'

async function ensureUniqueBoothCode(candidate: string): Promise<string> {
  // Check for existing booth_code globally; regenerate up to N times
  let code = candidate
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase
      .from('booths')
      .select('id')
      .eq('booth_code', code)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Supabase error checking booth_code uniqueness', error)
      // If error, try to be conservative and return the candidate (DB may error later)
      return code
    }

    if (!data) return code
    // conflict -> regenerate (simple algorithm: append random 2 chars)
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    let suffix = ''
    for (let j = 0; j < 2; j++) {
      suffix += Math.random() > 0.5 ? letters.charAt(Math.floor(Math.random() * letters.length)) : numbers.charAt(Math.floor(Math.random() * numbers.length))
    }
    code = candidate.slice(0, 4) + '-' + candidate.slice(5, 9) + suffix
  }
  return code
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('orgId')

    // pagination
    const limitParam = Number(searchParams.get('limit') || '10')
    const offsetParam = Number(searchParams.get('offset') || '0')
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 10 : limitParam), 100) // 1..100
    const offset = Math.max(0, isNaN(offsetParam) ? 0 : offsetParam)

    const { userId, orgRole } = await auth()
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 })
    }

    // NOTE: we rely on Clerk webhooks to keep Supabase in sync. Do not sync on every request.

    // Use range for pagination and request an exact count
    const from = offset
    const to = offset + limit - 1

    let query = supabase
      .from('booths')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(from, to)

    // If user is not an admin, only show assigned booths
    if (orgRole !== 'org:admin') {
      query = query.eq('assigned_to', userId)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('/api/booths GET supabase error', error)
      return NextResponse.json({ error: 'Failed to fetch booths' }, { status: 500 })
    }

    return NextResponse.json({ booths: data || [], count: typeof count === 'number' ? count : 0 })
  } catch (err) {
    console.error("/api/booths GET error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orgId, name, location, dslrbooth_api, dslrbooth_pass, price, booth_id, booth_code, assigned_to } = body

    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    if (!orgId || !name || !location || price === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Sync organization to Supabase before creating booth (handles dev vs prod ID differences)
    await syncOrganizationToSupabase(orgId)

    // Check booth limit based on subscription plan
    const { canCreateBooth } = await import('@/lib/features')
    const boothLimit = await canCreateBooth(orgId)

    if (!boothLimit.allowed) {
      return NextResponse.json({
        error: "Booth limit reached",
        details: {
          current: boothLimit.current,
          max: boothLimit.max,
          message: `You have reached your booth limit (${boothLimit.current}/${boothLimit.max}). Upgrade to Pro for up to 5 booths.`
        },
        upgrade_required: true
      }, { status: 403 })
    }

    // Sync current user (creator) to Supabase
    await syncUserToSupabase(userId)

    // Ensure booth_code uniqueness
    const uniqueCode = await ensureUniqueBoothCode(booth_code)

    // Ensure assigned user exists in Supabase
    if (assigned_to) {
      await syncUserToSupabase(assigned_to)
    }

    const { data, error } = await supabase.from('booths').insert([{
      organization_id: orgId,
      created_by: userId,
      client_id: orgId,  // Keep for backward compatibility
      active_layout_id: null,
      name,
      location,
      status: 'active',
      created_at: new Date().toISOString(),
      booth_id,
      dslrbooth_api: dslrbooth_api || '',
      dslrbooth_pass: dslrbooth_pass || '',
      price: parseFloat(price),
      booth_code: uniqueCode,
      assigned_to: assigned_to || null
    }]).select().single()

    if (error) {
      console.error('/api/booths POST supabase error', error)
      return NextResponse.json({
        error: 'Failed to create booth',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("/api/booths POST error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { orgId, boothId, name, location, dslrbooth_api, dslrbooth_pass, price, assigned_to, app_pin } = body
    console.log('Updating booth:', { orgId, boothId, name, location, price, assigned_to })

    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    if (!orgId || !boothId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // We no longer sync Clerk->Supabase on every request. Ensure webhooks are configured for real-time sync.

    const { data: existing, error: fetchErr } = await supabase
      .from('booths')
      .select('*')
      .eq('id', boothId)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (fetchErr) {
      console.error('/api/booths PUT fetch error', fetchErr)
      return NextResponse.json({ error: 'Failed to fetch booth' }, { status: 500 })
    }
    if (!existing) return NextResponse.json({ error: 'Booth not found' }, { status: 404 })

    const updateData: Record<string, unknown> = {
      name,
      location,
      dslrbooth_api: dslrbooth_api || '',
      dslrbooth_pass: dslrbooth_pass || '',
      price: parseFloat(price),
      app_pin: app_pin || null
    }

    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to || null
      if (assigned_to) {
        await syncUserToSupabase(assigned_to)
      }
    }

    const { data, error } = await supabase.from('booths').update(updateData).eq('id', boothId).eq('organization_id', orgId).select().single()

    if (error) {
      console.error('/api/booths PUT supabase error', error)
      return NextResponse.json({ error: 'Failed to update booth', details: error }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("/api/booths PUT error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { orgId, boothId } = body

    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    if (!orgId || !boothId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // We no longer sync Clerk->Supabase on every request. Ensure webhooks are configured for real-time sync.

    const { error } = await supabase
      .from('booths')
      .delete()
      .eq('id', boothId)
      .eq('organization_id', orgId)

    if (error) {
      console.error('/api/booths DELETE supabase error', error)
      return NextResponse.json({ error: 'Failed to delete booth' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("/api/booths DELETE error", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
