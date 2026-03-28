// app/api/picks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const sb = getServiceSupabase();
    const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const { data, error } = await sb
      .from('user_picks')
      .select('*')
      .eq('user_id', user.userId)
      .eq('slate_date', date)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const sb = getServiceSupabase();
    const { error } = await sb.from('user_picks').insert({
      user_id: user.userId,
      slate_date: body.slate_date || new Date().toISOString().split('T')[0],
      player_name: body.player,
      stat: body.stat,
      line: body.line,
      direction: body.direction,
      confidence: body.confidence,
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const sb = getServiceSupabase();
    await sb.from('user_picks').delete().eq('id', id).eq('user_id', user.userId);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
