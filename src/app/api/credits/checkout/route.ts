import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { CREDIT_PACKS } from '@/lib/plans'
import {
  LEMONSQUEEZY_API_KEY,
  LEMONSQUEEZY_STORE_ID,
  LEMONSQUEEZY_STARTER_VARIANT_ID,
  LEMONSQUEEZY_STANDARD_VARIANT_ID,
  LEMONSQUEEZY_PRO_VARIANT_ID,
  NEXT_PUBLIC_APP_URL,
} from '@/lib/env'

const VARIANT_MAP: Record<string, string | undefined> = {
  starter:  LEMONSQUEEZY_STARTER_VARIANT_ID,
  standard: LEMONSQUEEZY_STANDARD_VARIANT_ID,
  pro:      LEMONSQUEEZY_PRO_VARIANT_ID,
}

export async function POST(req: NextRequest) {
  if (!LEMONSQUEEZY_API_KEY || !LEMONSQUEEZY_STORE_ID) {
    return NextResponse.json({ error: 'Payments not configured', code: 'NOT_CONFIGURED' }, { status: 503 })
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { packId } = await req.json()
    const variantId = VARIANT_MAP[packId]
    if (!variantId) return NextResponse.json({ error: 'Invalid pack', code: 'BAD_REQUEST' }, { status: 400 })

    const pack = CREDIT_PACKS.find(p => p.id === packId)
    if (!pack) return NextResponse.json({ error: 'Invalid pack', code: 'BAD_REQUEST' }, { status: 400 })

    // Prefer the explicit app URL env var — req.nextUrl.origin can resolve to an
    // internal hostname when running behind a reverse proxy or CDN.
    const appUrl = NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin

    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              custom: {
                // Only identity/context here. The credit amount is derived
                // server-side in the webhook from the order's variant_id —
                // custom_data is never trusted for amounts.
                user_id: user.id,
                pack_id: packId,
              },
            },
            product_options: {
              redirect_url: `${appUrl}/credits?success=true`,
            },
          },
          relationships: {
            store: { data: { type: 'stores', id: LEMONSQUEEZY_STORE_ID } },
            variant: { data: { type: 'variants', id: variantId } },
          },
        },
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('[checkout] Lemon Squeezy error:', data)
      return NextResponse.json({ error: 'Failed to create checkout', code: 'EXTERNAL_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ checkoutUrl: data.data.attributes.url })
  } catch (err) {
    console.error('[credits/checkout POST]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
