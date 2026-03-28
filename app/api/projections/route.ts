// app/api/projections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// No cache — always fresh so uploads show immediately
export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const pos = request.nextUrl.searchParams.get('pos');

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

    const withValue = (data || []).map(p => ({
      ...p,
      valueRating: p.salary > 0
        ? parseFloat((p.proj_fpts / p.salary * 1000).toFixed(2))
        : 0,
    }));

    return NextResponse.json(withValue);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
