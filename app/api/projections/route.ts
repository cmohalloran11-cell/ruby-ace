// app/api/projections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const pos  = request.nextUrl.searchParams.get('pos');

  try {
    const sb = getServiceSupabase();
    let query = sb
      .from('projections')
      .select('*')
      .eq('slate_date', date)
      .order('proj_fpts', { ascending: false });

    if (pos === 'hitters') query = query.not('position', 'eq', 'SP');
    if (pos === 'pitchers') query = query.eq('position', 'SP');

    const { data, error } = await query;
    if (error) throw error;

    const enriched = (data || []).map(p => ({
      ...p,
      // Computed value rating
      valueRating:  p.salary > 0 ? parseFloat((p.proj_fpts / p.salary * 1000).toFixed(2)) : 0,
      // Ensure new optional fields have defaults
      proj_floor:         p.proj_floor         || 0,
      proj_ceiling:       p.proj_ceiling       || 0,
      lineup_pos:         p.lineup_pos         || 0,
      opp:                p.opp                || '',
      in_probable_lineup: p.in_probable_lineup !== false, // default true if null
    }));

    return NextResponse.json(enriched);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
