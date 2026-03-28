// app/api/admin/scoring/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const sb = getServiceSupabase();
    const { data, error } = await sb.from('scoring_rules').select('*').order('platform');
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const { sport, platform, rules } = body;
    if (!sport || !platform || !rules) {
      return NextResponse.json({ error: 'sport, platform, and rules required' }, { status: 400 });
    }
    const sb = getServiceSupabase();
    const { error } = await sb
      .from('scoring_rules')
      .upsert({ sport, platform, rules, updated_at: new Date().toISOString() },
        { onConflict: 'sport,platform' });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
