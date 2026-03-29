// app/api/projections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get('date');
  const pos = request.nextUrl.searchParams.get('pos');

  try {
    const sb = getServiceSupabase();

    // If no date specified, return the most recently uploaded slate
    // This avoids timezone issues where server UTC date != user's local date
    let slateDate = dateParam;
    if (!slateDate) {
      const { data: latest } = await sb
        .from('projections')
        .select('slate_date')
        .order('slate_date', { ascending: false })
        .limit(1)
        .single();
      slateDate = latest?.slate_date || new Date().toISOString().split('T')[0];
    }

    let query = sb
      .from('projections')
      .select('*')
      .eq('slate_date', slateDate)
      .gt('proj_fpts', 0)   // only players with projections
      .order('proj_fpts', { ascending: false });

    if (pos === 'hitters') query = query.not('position', 'eq', 'SP');
    if (pos === 'pitchers') query = query.eq('position', 'SP');

    const { data, error } = await query;
    if (error) throw error;

    const enriched = (data || []).map(p => ({
      ...p,
      valueRating:        p.salary > 0 ? parseFloat((p.proj_fpts / p.salary * 1000).toFixed(2)) : 0,
      proj_floor:         p.proj_floor   || 0,
      proj_ceiling:       p.proj_ceiling || 0,
      lineup_pos:         p.lineup_pos   || 0,
      opp:                p.opp          || '',
      in_probable_lineup: p.in_probable_lineup !== false,
    }));

    return NextResponse.json(enriched);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
