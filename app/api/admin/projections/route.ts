// app/api/admin/projections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) return [];
  const parseLine = (line: string): string[] => {
    const vals: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (c === ',' && !inQ) { vals.push(cur.trim().replace(/^"|"$/g, '')); cur = ''; }
      else cur += c;
    }
    vals.push(cur.trim().replace(/^"|"$/g, ''));
    return vals;
  };
  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(h => h.replace(/^\uFEFF/, '').trim().toUpperCase());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
    return row;
  });
}

// Detect if this is a DraftKings salary export
function isDKSalaryCSV(records: Record<string, string>[]): boolean {
  if (!records.length) return false;
  const keys = Object.keys(records[0]);
  return keys.some(k => k.toUpperCase() === 'ROSTER POSITION' || k.toUpperCase() === 'GAME INFO');
}

function normalizeName(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapTheBatX(R: Record<string, string>, source: string, slateDate: string): any | null {
  const name = R['NAME'] || R['PLAYER'] || R['PLAYER NAME'] || '';
  if (!name) return null;
  const dkNameId = R['NAME_ID'] || R['NAME + ID'] || '';
  const opp = R['OPP'] || R['OPP_TM'] || '';
  const proj = parseFloat(R['TOMORROW_DK'] || R['PROJ'] || R['FPTS'] || R['DK PTS'] || '0') || 0;
  if (proj <= 0) return null;
  const own = parseFloat(R['POWN'] || R['12TEAM_OWN'] || R['15TEAM_OWN'] || R['OWN%'] || R['OWN'] || '0') || 0;
  const salary = parseInt(R['SALARY'] || R['DK SALARY'] || '0') || 0;
  const hasPitching = R['IP'] !== undefined && R['IP'] !== '' || R['ERA'] !== undefined && R['ERA'] !== '';
  const hasBatting = R['BA'] !== undefined && R['BA'] !== '' || R['HR'] !== undefined && R['HR'] !== '';
  const position = R['POS'] || R['POSITION'] || (hasPitching && !hasBatting ? 'SP' : '');
  const rawTeam = (R['TEAM'] || '').toUpperCase().trim();
  const teamMap: Record<string,string> = { KCR:'KC', TBR:'TB', SDP:'SD', SFG:'SF', WSN:'WSH', CHW:'CWS' };
  const team = teamMap[rawTeam] || rawTeam;
  const floor   = parseFloat(R['FLOOR']   || '0') || 0;
  const ceiling = parseFloat(R['CEILING'] || '0') || 0;
  const lineupPos = parseInt(R['LP'] || '0') || 0;

  const ipl = String(R['IPL'] || R['OL'] || '').toLowerCase() === 'true';

  return {
    player_name: name.trim(),
    dk_name_id: dkNameId || undefined,
    opp: opp || undefined,
    in_probable_lineup: ipl,
    team, position,
    proj_fpts:    proj,
    proj_ownership: own,
    proj_floor:   floor,
    proj_ceiling: ceiling,
    lineup_pos:   lineupPos,
    salary,
    proj_hr:  parseFloat(R['HR']  || '0') || 0,
    proj_rbi: parseFloat(R['RBI'] || '0') || 0,
    proj_r:   parseFloat(R['R']   || '0') || 0,
    proj_sb:  parseFloat(R['SB']  || '0') || 0,
    proj_h:   parseFloat(R['H']   || '0') || 0,
    proj_k:   parseFloat(R['K']   || R['SO'] || '0') || 0,
    proj_ip:  parseFloat(R['IP']  || '0') || 0,
    proj_er:  parseFloat(R['ER']  || '0') || 0,
    proj_pitching_k: parseFloat(R['K'] || R['SO'] || '0') || 0,
    proj_bb:  parseFloat(R['BB']  || '0') || 0,
    source, slate_date: slateDate,
  };
}

function mapDKSalary(R: Record<string, string>, slateDate: string): any | null {
  // DK columns: Position, Name + ID, Name, ID, Roster Position, Salary, Game Info, TeamAbbrev, AvgPointsPerGame
  const name = R['NAME'] || R['PLAYERNAME'] || R['PLAYER NAME'] || '';
  if (!name) return null;
  const salary = parseInt(R['SALARY'] || '0') || 0;
  if (salary <= 0) return null;
  const rawPos = R['ROSTER POSITION'] || R['POSITION'] || R['POS'] || '';
  // DK uses positions like SP, RP, C, 1B, 2B, 3B, SS, OF
  const position = rawPos.split('/')[0].trim(); // take first if "SP/RP"
  const rawTeam = (R['TEAMABBREV'] || R['TEAM ABBREV'] || R['TEAM'] || '').toUpperCase().trim();
  const teamMap: Record<string,string> = { KCR:'KC', TBR:'TB', SDP:'SD', SFG:'SF', WSN:'WSH', CHW:'CWS' };
  const team = teamMap[rawTeam] || rawTeam;
  const avgPts = parseFloat(R['AVGPOINTSPERGAME'] || R['AVG POINTS PER GAME'] || '0') || 0;
  return {
    player_name: name.trim(),
    team, position, salary,
    // Only set proj if we have it and no other proj exists
    avg_pts_per_game: avgPts,
    source: 'dk_salary', slate_date: slateDate,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const sb = getServiceSupabase();
    const dateParam = request.nextUrl.searchParams.get('date');
    let date = dateParam;
    if (!date) {
      const { data: latest } = await sb.from('projections')
        .select('slate_date').order('slate_date', { ascending: false }).limit(1).single();
      date = latest?.slate_date || new Date().toISOString().split('T')[0];
    }
    const { data, error } = await sb
      .from('projections').select('*').eq('slate_date', date)
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
      const slateDate = (formData.get('date') as string) || new Date().toISOString().split('T')[0];
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

      const text = await file.text();
      const records = parseCSV(text);
      if (!records.length) return NextResponse.json({ error: 'No rows found in CSV', inserted: 0 });

      const sampleKeys = Object.keys(records[0]).slice(0, 8).join(', ');
      const isDK = isDKSalaryCSV(records);

      if (isDK) {
        // DraftKings salary CSV — merge salary + position into existing rows by player name
        const dkRows = records.map(r => mapDKSalary(r, slateDate)).filter(Boolean) as any[];
        if (!dkRows.length) return NextResponse.json({ error: `No valid DK players found. Columns: ${sampleKeys}`, inserted: 0 });

        // Get existing projections for this date
        const { data: existing } = await sb.from('projections').select('id, player_name').eq('slate_date', slateDate);
        const existingMap: Record<string, number> = {};
        (existing || []).forEach((p: any) => { existingMap[normalizeName(p.player_name)] = p.id; });

        let updated = 0, inserted = 0;
        for (const row of dkRows) {
          const nameKey = normalizeName(row.player_name);
          const existingId = existingMap[nameKey];
          if (existingId) {
            // Update existing row with salary and position
            await sb.from('projections').update({
              salary: row.salary,
              position: row.position || undefined,
              team: row.team || undefined,
            }).eq('id', existingId);
            updated++;
          } else {
            // Insert new row with just salary/position (proj will be 0 until theBatX uploaded)
            await sb.from('projections').insert({
              player_name: row.player_name,
              team: row.team,
              position: row.position,
              salary: row.salary,
              proj_fpts: 0, // never use FPPG as projection — requires explicit theBatX upload
              proj_ownership: 0,
              source: 'dk_salary',
              slate_date: slateDate,
            });
            inserted++;
          }
        }
        return NextResponse.json({ updated, inserted, total: dkRows.length, type: 'dk_salary' });

      } else {
        // theBatX or generic projection CSV
        const rows = records.map(r => mapTheBatX(r, 'upload', slateDate)).filter(Boolean) as any[];
        if (!rows.length) return NextResponse.json({ error: `No valid players found. Columns: ${sampleKeys}. Need NAME (or PLAYER) and FPTS columns.`, inserted: 0 });

        // Upsert in batches — handles unique(player_name, slate_date, source) constraint
        let inserted = 0;
        let firstError = '';
        for (let i = 0; i < rows.length; i += 50) {
          const batch = rows.slice(i, i + 50).map((row: any) => ({
            player_name:        row.player_name,
            team:               row.team,
            position:           row.position,
            salary:             row.salary || 0,
            proj_fpts:          row.proj_fpts || 0,
            proj_ownership:     row.proj_ownership || 0,
            proj_floor:         row.proj_floor || 0,
            proj_ceiling:       row.proj_ceiling || 0,
            lineup_pos:         row.lineup_pos || 0,
            in_probable_lineup: row.in_probable_lineup ?? true,
            opp:                row.opp || null,
            dk_name_id:         row.dk_name_id || null,
            proj_hr:            row.proj_hr || 0,
            proj_rbi:           row.proj_rbi || 0,
            proj_r:             row.proj_r || 0,
            proj_sb:            row.proj_sb || 0,
            proj_h:             row.proj_h || 0,
            proj_k:             row.proj_k || 0,
            proj_ip:            row.proj_ip || 0,
            proj_er:            row.proj_er || 0,
            proj_pitching_k:    row.proj_pitching_k || 0,
            proj_bb:            row.proj_bb || 0,
            source:             'upload',
            slate_date:         slateDate,
          }));

          const { data: upserted, error: batchErr } = await sb
            .from('projections')
            .upsert(batch, { onConflict: 'player_name,slate_date,source', ignoreDuplicates: false })
            .select('id');

          if (batchErr) {
            firstError = batchErr.message;
            console.error('Upsert batch error:', batchErr.message);
          } else {
            inserted += upserted?.length || 0;
          }
        }

        if (inserted === 0 && firstError) {
          return NextResponse.json({ error: `Upload failed: ${firstError}`, inserted: 0 });
        }
        return NextResponse.json({ inserted, total: rows.length, source: 'upload', slateDate });
      }
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
    const { error } = await sb.from('projections')
      .update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id);
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
    if (clearAll === 'true') {
      // Use most recent slate_date — avoids timezone mismatch with hardcoded today
      const dateParam = request.nextUrl.searchParams.get('date');
      let date = dateParam;
      if (!date) {
        const { data: latest } = await sb.from('projections')
          .select('slate_date').order('slate_date', { ascending: false }).limit(1).single();
        date = latest?.slate_date;
      }
      if (!date) return NextResponse.json({ deleted: 0 });
      const { data, error } = await sb.from('projections').delete().eq('slate_date', date).select('id');
      if (error) throw error;
      return NextResponse.json({ deleted: data?.length || 0, date });
    }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await sb.from('projections').delete().eq('id', id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
