// app/api/stack-projections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const sb = getServiceSupabase();
  const { data: latest } = await sb.from('stack_projections')
    .select('slate_date').order('slate_date', { ascending: false }).limit(1).single();
  const date = latest?.slate_date || new Date().toISOString().split('T')[0];

  const { data } = await sb.from('stack_projections')
    .select('*').eq('slate_date', date).order('implied_runs', { ascending: false });

  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  try { await requireAdmin(req as any); } catch {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { stacks, slate_date } = await req.json();
  if (!Array.isArray(stacks)) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  const sb = getServiceSupabase();
  const date = slate_date || new Date().toISOString().split('T')[0];

  const rows = stacks.map((s: any) => ({
    team: (s.team || '').toUpperCase(),
    slate_date: date,
    implied_runs: parseFloat(s.implied_runs) || 0,
    team_total: parseFloat(s.team_total) || parseFloat(s.implied_runs) || 0,
    over_under: parseFloat(s.over_under) || 0,
    spread: parseFloat(s.spread) || 0,
    source: s.source || 'thebatx',
    updated_at: new Date().toISOString(),
  }));

  console.log('[StackProj] Upserting', rows.length, 'rows:', JSON.stringify(rows.slice(0,2)));
  const { error } = await sb.from('stack_projections')
    .upsert(rows, { onConflict: 'team,slate_date' });

  if (error) {
    console.error('[StackProj] DB error:', error);
    return NextResponse.json({ error: error.message, detail: error.details }, { status: 500 });
  }
  return NextResponse.json({ uploaded: rows.length });
}
