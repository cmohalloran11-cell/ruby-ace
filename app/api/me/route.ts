// app/api/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from('users')
      .select('id, email, username, role, subscription, fav_teams, notify_prefs, espn_league_id, espn_s2, espn_swid, created_at')
      .eq('id', user.userId)
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const sb = getServiceSupabase();

    // Only allow safe fields to be updated
    const allowed = ['username', 'fav_teams', 'notify_prefs', 'espn_league_id', 'espn_s2', 'espn_swid'];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error } = await sb.from('users').update(updates).eq('id', user.userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
