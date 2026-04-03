// app/api/optimizer-settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const tok = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
  if (!tok) return NextResponse.json(null);
  let user: any;
  try { user = verifyToken(tok); } catch { return NextResponse.json(null); }
  if (!user) return NextResponse.json(null);

  const sb = getServiceSupabase();
  const { data } = await sb
    .from('optimizer_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json(data || null);
}

export async function POST(req: NextRequest) {
  const tok = getTokenFromHeader(req.headers.get('authorization') ?? undefined);
  if (!tok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let user: any;
  try { user = verifyToken(tok); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await req.json();
  const sb = getServiceSupabase();

  const { data, error } = await sb
    .from('optimizer_settings')
    .upsert({
      user_id:        user.id,
      num_lineups:    settings.numLineups    ?? 20,
      max_exposure:   settings.maxExposure   ?? 100,
      min_salary:     settings.minSalary     ?? 49000,
      avoid_opp:      settings.avoidOpp      ?? false,
      max_overlap:    settings.maxOverlap    ?? 9,
      selected_stacks: settings.selectedStacks ?? [],
      mode:           settings.mode          ?? 'cash',
      updated_at:     new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
