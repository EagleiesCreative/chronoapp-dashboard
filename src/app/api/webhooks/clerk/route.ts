import { NextRequest, NextResponse } from 'next/server'
import { handleClerkWebhook } from '@/lib/clerk-sync'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

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
