// app/api/rubys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await verifyToken(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getServiceSupabase();
  const { data } = await sb
    .from('users')
    .select('rubys_balance')
    .eq('id', user.id)
    .single();

  const { data: txns } = await sb
    .from('rubys_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({ balance: data?.rubys_balance || 0, transactions: txns || [] });
}

// Earn Rubys (ad watch)
export async function POST(req: NextRequest) {
  const user = await verifyToken(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { reason } = await req.json();

  const EARN_MAP: Record<string, number> = {
    ad_watch: 5,
    daily_login: 10,
  };

  const amount = EARN_MAP[reason];
  if (!amount) return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });

  // Rate limit: ad_watch max 5x/day
  if (reason === 'ad_watch') {
    const sb = getServiceSupabase();
    const today = new Date().toISOString().split('T')[0];
    const { count } = await sb
      .from('rubys_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('reason', 'ad_watch')
      .gte('created_at', `${today}T00:00:00Z`);

    if ((count || 0) >= 5) {
      return NextResponse.json({ error: 'Ad watch limit reached for today (5 max)' }, { status: 429 });
    }
  }

  const sb = getServiceSupabase();
  const { data, error } = await sb.rpc('add_rubys', {
    p_user_id: user.id,
    p_amount: amount,
    p_reason: reason,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ balance: data, earned: amount });
}
