// app/api/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const PRICE_ID = process.env.STRIPE_PRICE_ID; // Monthly sub price ID

// Create checkout session
export async function POST(req: NextRequest) {
  const { action } = await req.json();

  if (action === 'checkout') {
    const user = await verifyToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'line_items[0][price]': PRICE_ID || '',
        'line_items[0][quantity]': '1',
        'success_url': `${process.env.NEXT_PUBLIC_URL}/premium?success=1`,
        'cancel_url': `${process.env.NEXT_PUBLIC_URL}/premium?cancelled=1`,
        'metadata[user_id]': user.id,
        'customer_email': user.email,
      }),
    });

    const session = await res.json();
    if (!res.ok) return NextResponse.json({ error: session.error?.message }, { status: 400 });
    return NextResponse.json({ url: session.url });
  }

  if (action === 'portal') {
    const user = await verifyToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = getServiceSupabase();
    const { data: u } = await sb.from('users').select('stripe_customer_id').eq('id', user.id).single();
    if (!u?.stripe_customer_id) return NextResponse.json({ error: 'No subscription found' }, { status: 404 });

    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${STRIPE_SECRET}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        customer: u.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_URL}/`,
      }),
    });

    const portal = await res.json();
    return NextResponse.json({ url: portal.url });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// Webhook handler
export async function PUT(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') || '';

  // Verify webhook signature
  if (!STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'No webhook secret' }, { status: 500 });

  // Simple HMAC verification
  const crypto = require('crypto');
  const [, ts] = sig.match(/t=(\d+)/) || [];
  const [, v1] = sig.match(/v1=([a-f0-9]+)/) || [];
  const computed = crypto
    .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
    .update(`${ts}.${body}`)
    .digest('hex');

  if (computed !== v1) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });

  const event = JSON.parse(body);
  const sb = getServiceSupabase();

  // Log event
  await sb.from('stripe_events').upsert({ id: event.id, type: event.type, payload: event });

  const obj = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      const userId = obj.metadata?.user_id;
      const customerId = obj.customer;
      const subId = obj.subscription;
      if (userId) {
        await sb.from('users').update({
          is_premium: true,
          stripe_customer_id: customerId,
          stripe_sub_id: subId,
          premium_until: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('id', userId);
        // Grant 100 Rubys on subscribe
        await sb.rpc('add_rubys', { p_user_id: userId, p_amount: 100, p_reason: 'premium_bonus' });
      }
      break;
    }
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused': {
      const customerId = obj.customer;
      await sb.from('users').update({ is_premium: false, premium_until: null })
        .eq('stripe_customer_id', customerId);
      break;
    }
    case 'invoice.payment_succeeded': {
      const customerId = obj.customer;
      await sb.from('users').update({
        is_premium: true,
        premium_until: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq('stripe_customer_id', customerId);
      break;
    }
  }

  await sb.from('stripe_events').update({ processed: true }).eq('id', event.id);
  return NextResponse.json({ received: true });
}
