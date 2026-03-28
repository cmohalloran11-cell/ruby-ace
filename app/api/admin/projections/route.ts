// app/api/admin/projections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { parse } from 'csv-parse/sync';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const sb = getServiceSupabase();
    const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const { data, error } = await sb
      .from('projections')
      .select('*')
      .eq('slate_date', date)
      .order('proj_fpts', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const sb = getServiceSupabase();
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // CSV upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const source = formData.get('source') as string || 'upload';
      const slateDate = formData.get('date') as string || new Date().toISOString().split('T')[0];

      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

      const text = await file.text();
      const records = parse(text, { columns: true, skip_empty_lines: true, trim: true });

      const rows = records.map((r: any) => ({
        player_name: r['Name'] || r['Player'] || r['player_name'] || '',
        team: r['Team'] || r['team'] || '',
        position: r['Pos'] || r['Position'] || r['position'] || '',
        proj_fpts: parseFloat(r['Proj'] || r['FPTS'] || r['DK Pts'] || r['proj_fpts'] || '0') || 0,
        proj_ownership: parseFloat(r['Own%'] || r['Ownership'] || r['proj_ownership'] || '0') || 0,
        proj_h:   parseFloat(r['H'] || r['proj_h'] || '0') || 0,
        proj_hr:  parseFloat(r['HR'] || r['proj_hr'] || '0') || 0,
        proj_rbi: parseFloat(r['RBI'] || r['proj_rbi'] || '0') || 0,
        proj_r:   parseFloat(r['R'] || r['proj_r'] || '0') || 0,
        proj_sb:  parseFloat(r['SB'] || r['proj_sb'] || '0') || 0,
        proj_k:   parseFloat(r['K'] || r['SO'] || r['proj_k'] || '0') || 0,
        proj_ip:  parseFloat(r['IP'] || r['proj_ip'] || '0') || 0,
        proj_er:  parseFloat(r['ER'] || r['proj_er'] || '0') || 0,
        proj_pitching_k: parseFloat(r['Ks'] || r['pK'] || r['proj_pitching_k'] || '0') || 0,
        proj_bb:  parseFloat(r['BB'] || r['proj_bb'] || '0') || 0,
        salary:   parseInt(r['Salary'] || r['DK Salary'] || r['salary'] || '0') || 0,
        source,
        slate_date: slateDate,
      })).filter((r: any) => r.player_name.length > 0);

      const { error } = await sb
        .from('projections')
        .upsert(rows, { onConflict: 'player_name,slate_date,source' });

      if (error) throw error;
      return NextResponse.json({ inserted: rows.length, source });
    }

    // Manual single player insert
    const body = await request.json();
    const { error } = await sb.from('projections').insert({
      ...body,
      slate_date: body.slate_date || new Date().toISOString().split('T')[0],
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const sb = getServiceSupabase();
    const { error } = await sb
      .from('projections')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request);
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const sb = getServiceSupabase();
    await sb.from('projections').delete().eq('id', id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
