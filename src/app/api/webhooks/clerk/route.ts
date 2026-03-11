import { NextRequest, NextResponse } from 'next/server'
import { handleClerkWebhook } from '@/lib/clerk-sync'
import { Webhook } from 'svix'

export async function POST(req: NextRequest) {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
    if (!WEBHOOK_SECRET) {
      throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
    }

    const headerPayload = req.headers
    const svix_id = headerPayload.get("svix-id")
    const svix_timestamp = headerPayload.get("svix-timestamp")
    const svix_signature = headerPayload.get("svix-signature")

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json({ error: 'Error occured -- no svix headers' }, { status: 400 })
    }

    const payload = await req.text()
    const wh = new Webhook(WEBHOOK_SECRET)
    let evt: any

    try {
      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      })
    } catch (err) {
      console.error('Error verifying webhook:', err)
      return NextResponse.json({ error: 'Error occured' }, { status: 400 })
    }

    const body = JSON.parse(payload)

    // Basic verification: Clerk sends a "type" and "data" payload
    if (!body || !body.type) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    // Handle the webhook event
    const result = await handleClerkWebhook(body)

    if (!result.success) {
      console.error('Webhook handler failed', result.error)
      return NextResponse.json({ error: 'Handler error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Failed to process Clerk webhook', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
