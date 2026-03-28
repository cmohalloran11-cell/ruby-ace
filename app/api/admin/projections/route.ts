// app/api/admin/projections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';

// Native CSV parser — no dependencies
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) return [];

  // Parse a single CSV line respecting quoted fields
  const parseLine = (line: string): string[] => {
    const vals: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) {
        vals.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += c;
      }
    }
    vals.push(cur.trim().replace(/^"|"$/g, ''));
    return vals;
  };

  const rawHeaders = parseLine(lines[0]);
  // Normalize headers to uppercase, trim whitespace and BOM
  const headers = rawHeaders.map(h => h.replace(/^\uFEFF/, '').trim().toUpperCase());

  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const vals = parseLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
      return row;
    });
}

// Map theBatX + DraftKings + generic CSV formats to our schema
function mapRow(R: Record<string, string>, source: string, slateDate: string): any | null {
  const name = R['NAME'] || R['PLAYER'] || R['PLAYER NAME'] || R['PLAYERNAME'] || '';
  if (!name || name.length === 0) return null;

  // DK projection — theBatX uses TOMORROW_DK
  const proj = parseFloat(
    R['TOMORROW_DK'] || R['PROJ'] || R['FPTS'] || R['DK PTS'] || R['DK_PTS'] ||
    R['PROJECTION'] || R['PROJ_FPTS'] || R['FANTASY POINTS'] || '0'
  ) || 0;

  // Ownership
  const own = parseFloat(
    R['12TEAM_OWN'] || R['15TEAM_OWN'] || R['OWN%'] || R['OWN'] ||
    R['OWNERSHIP'] || R['PROJ OWN%'] || '0'
  ) || 0;

  // Salary
  const salary = parseInt(
    R['SALARY'] || R['DK SALARY'] || R['DK_SALARY'] || R['SAL'] || '0'
  ) || 0;

  // Position — DK export has it, theBatX doesn't
  const rawPos = R['POS'] || R['POSITION'] || R['ROSTER POSITION'] || '';
  // Auto-detect pitcher if has IP/ERA but no batting stats
  const hasPitching = R['IP'] !== undefined && R['IP'] !== '' || R['ERA'] !== undefined && R['ERA'] !== '';
  const hasBatting  = R['BA'] !== undefined && R['BA'] !== '' || R['AVG'] !== undefined && R['AVG'] !== '';
  const position = rawPos || (hasPitching && !hasBatting ? 'SP' : '');

  // Team — theBatX uses KCR for Royals, normalize to KC
  const rawTeam = (R['TEAM'] || R['TEAM ABBREVIATION'] || '').toUpperCase().trim();
  const teamMap: Record<string, string> = { KCR: 'KC', CWS: 'CWS', TBR: 'TB', SDP: 'SD', SFG: 'SF', WSN: 'WSH' };
  const team = teamMap[rawTeam] || rawTeam;

  return {
    player_name: name,
    team,
    position,
    proj_fpts:     proj,
    proj_ownership: own,
    salary,
    proj_hr:  parseFloat(R['HR']  || '0') || 0,
    proj_rbi: parseFloat(R['RBI'] || '0') || 0,
    proj_r:   parseFloat(R['R']   || '0') || 0,
    proj_sb:  parseFloat(R['SB']  || '0') || 0,
    proj_h:   parseFloat(R['H']   || '0') || 0,
    proj_k:   parseFloat(R['K']   || R['SO'] || '0') || 0,
    proj_ip:  parseFloat(R['IP']  || '0') || 0,
    proj_er:  parseFloat(R['ER']  || '0') || 0,
    proj_bb:  parseFloat(R['BB']  || '0') || 0,
    source,
    slate_date: slateDate,
  };
}

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
    return NextResponse.json(data || []);
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
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const source = (formData.get('source') as string) || 'upload';
      const slateDate = (formData.get('date') as string) || new Date().toISOString().split('T')[0];

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const text = await file.text();
      const records = parseCSV(text);

      if (records.length === 0) {
        return NextResponse.json({ error: 'No rows found in CSV', inserted: 0 });
      }

      const rows = records
        .map(r => mapRow(r, source, slateDate))
        .filter(Boolean)
        .filter((r: any) => r.player_name.length > 0 && r.proj_fpts > 0);

      if (rows.length === 0) {
        // Return debug info about what columns were found
        const sampleKeys = Object.keys(records[0] || {}).slice(0, 10).join(', ');
        return NextResponse.json({
          error: `No valid players found. CSV columns detected: ${sampleKeys}`,
          inserted: 0,
          debug: { totalRecords: records.length, sampleKeys },
        });
      }

      // Upsert in batches of 100
      let inserted = 0;
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const { error } = await sb
          .from('projections')
          .upsert(batch, { onConflict: 'player_name,slate_date,source' });
        if (error) throw error;
        inserted += batch.length;
      }

      return NextResponse.json({ inserted, source, slateDate });
    }

    // Manual single insert
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
    const sb = getServiceSupabase();
    const id = request.nextUrl.searchParams.get('id');
    const clearAll = request.nextUrl.searchParams.get('clearAll');
    const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (clearAll === 'true') {
      // Clear all projections for a given date
      const { data, error } = await sb
        .from('projections')
        .delete()
        .eq('slate_date', date)
        .select('id');
      if (error) throw error;
      return NextResponse.json({ deleted: data?.length || 0 });
    }

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await sb.from('projections').delete().eq('id', id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
