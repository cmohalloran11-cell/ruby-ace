// app/api/picks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

const ENTRY_COST = 10;

export async function GET(req: NextRequest) {
  const user = await verifyToken(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getServiceSupabase();
  const { data } = await sb.from('pick_entries').select('*')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const user = await verifyToken(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { picks } = await req.json();
  if (!Array.isArray(picks) || picks.length < 2 || picks.length > 6)
    return NextResponse.json({ error: 'Need 2-6 picks per entry' }, { status: 400 });

  const sb = getServiceSupabase();
  const { data: newBalance, error: spendErr } = await sb.rpc('spend_rubys', {
    p_user_id: user.id, p_amount: ENTRY_COST, p_reason: 'pick_entry',
  });
  if (spendErr) return NextResponse.json(
    { error: spendErr.message.includes('Insufficient') ? 'Not enough Rubys' : spendErr.message },
    { status: 400 }
  );

  const { data: entry, error: entryErr } = await sb.from('pick_entries')
    .insert({ user_id: user.id, rubys_spent: ENTRY_COST, picks,
              slate_date: new Date().toISOString().split('T')[0] })
    .select().single();

  if (entryErr) {
    await sb.rpc('add_rubys', { p_user_id: user.id, p_amount: ENTRY_COST, p_reason: 'refund' });
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
  await sb.rpc('add_rubys', { p_user_id: user.id, p_amount: 2, p_reason: 'pick_entry', p_ref_id: entry.id });
  return NextResponse.json({ entry, rubysBalance: newBalance, entryCost: ENTRY_COST });
}
