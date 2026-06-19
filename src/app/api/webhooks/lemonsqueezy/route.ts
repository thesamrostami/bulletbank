import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LEMONSQUEEZY_WEBHOOK_SECRET } from '@/lib/env'

export async function POST(req: NextRequest) {
  try {
  const secret = LEMONSQUEEZY_WEBHOOK_SECRET
  if (!secret) {
    console.error('[webhook] LEMONSQUEEZY_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured', code: 'CONFIG_ERROR' }, { status: 500 })
  }

  const body = await req.text()
  const signature = req.headers.get('x-signature') ?? ''

  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex')
  const hmacBuf = Buffer.from(hmac, 'hex')
  const sigBuf  = Buffer.from(signature, 'hex')
  if (
    hmacBuf.length !== sigBuf.length ||
    !crypto.timingSafeEqual(hmacBuf, sigBuf)
  ) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)
  const eventName = event.meta?.event_name

  console.log('[webhook] received event:', eventName)

  if (eventName !== 'order_created') {
    return NextResponse.json({ ok: true })
  }

  // Extract from event.meta.custom_data only — the fallback path via
  // first_order_item.custom_data does not exist in the LS webhook schema.
  const customData = event.meta?.custom_data ?? {}
  if (!customData || !Object.keys(customData).length) {
    console.error('[webhook] custom_data missing; event.meta was:', JSON.stringify(event.meta))
    return NextResponse.json({ error: 'Missing custom_data', code: 'MISSING_DATA' }, { status: 400 })
  }

  const userId  = customData.user_id
  const credits = parseInt(customData.credits, 10)
  const packId  = customData.pack_id
  const orderId = event.data?.id?.toString()

  console.log('[webhook] extracted custom_data:', { userId, credits, packId, orderId })

  if (!userId || !credits || isNaN(credits)) {
    console.error('[webhook] Missing user_id or credits in custom_data:', customData)
    return NextResponse.json({ error: 'Missing data', code: 'MISSING_DATA' }, { status: 400 })
  }

  const supabase = createClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Atomic + idempotent: the balance increment and the ledger insert happen in a
  // single transaction guarded by a unique index on the order ID. A duplicate or
  // concurrent retry is rolled back without double-crediting. See migration 024.
  const { data: rpcData, error: rpcError } = await supabase.rpc('record_purchase_credits', {
    p_user_id: userId,
    p_amount: credits,
    p_order_id: orderId ?? null,
    p_description: `${packId} pack — ${credits} credits`,
  })

  if (rpcError) {
    console.error('[webhook] record_purchase_credits RPC error:', rpcError.message)
    return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 })
  }

  // rpcData is TABLE(processed BOOLEAN, balance INT) — check the row
  const row = Array.isArray(rpcData) ? rpcData[0] : rpcData
  console.log('[webhook] RPC result:', row)

  if (!row?.processed) {
    // processed=false means either: (a) unknown user_id, or (b) duplicate order already recorded
    if ((row?.balance ?? 0) === 0) {
      // Balance is 0 → user_id didn't match any profile (not a duplicate)
      console.error('[webhook] record_purchase_credits: user_id not found in profiles. user_id:', userId, 'order_id:', orderId)
      // Return 500 so Lemon Squeezy retries the webhook delivery
      return NextResponse.json({ error: 'User not found — will retry', code: 'USER_NOT_FOUND' }, { status: 500 })
    }
    // Otherwise it's a duplicate delivery — already processed, safe to ack
    console.log('[webhook] duplicate order detected, already processed. order_id:', orderId)
  } else {
    console.log('[webhook] credits recorded successfully. user_id:', userId, 'credits:', credits, 'new balance:', row.balance)
  }

  return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook/lemonsqueezy POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
