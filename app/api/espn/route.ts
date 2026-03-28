// app/api/espn/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

const ESPN_BASE = 'https://fantasy.espn.com/apis/v3/games/flb/seasons';

async function espnFetch(leagueId: string, season: string, view: string, s2?: string, swid?: string) {
  const url = `${ESPN_BASE}/${season}/segments/0/leagues/${leagueId}?view=${view}`;
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (s2 && swid) headers['Cookie'] = `espn_s2=${s2}; SWID=${swid}`;
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) throw new Error(`ESPN API ${res.status} — check your league ID and cookies`);
  return res.json();
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const sb = getServiceSupabase();

    // Get user's ESPN credentials
    const { data: userData } = await sb
      .from('users')
      .select('espn_league_id, espn_s2, espn_swid')
      .eq('id', user.userId)
      .single();

    if (!userData?.espn_league_id) {
      return NextResponse.json({ error: 'No ESPN league configured. Add your League ID in settings.' }, { status: 400 });
    }

    const season = new Date().getFullYear().toString();
    const { espn_league_id: leagueId, espn_s2, espn_swid } = userData;

    // Fetch league data, rosters, and transactions in parallel
    const [leagueData, rosterData, transData] = await Promise.all([
      espnFetch(leagueId, season, 'mTeam,mSettings', espn_s2, espn_swid),
      espnFetch(leagueId, season, 'mRoster', espn_s2, espn_swid),
      espnFetch(leagueId, season, 'mTransactions2', espn_s2, espn_swid),
    ]);

    const teams = leagueData.teams?.map((t: any) => {
      const rosterTeam = rosterData.teams?.find((rt: any) => rt.id === t.id);
      return {
        id: t.id,
        name: `${t.location} ${t.nickname}`.trim(),
        abbr: t.abbrev,
        wins: t.record?.overall?.wins ?? 0,
        losses: t.record?.overall?.losses ?? 0,
        pointsFor: parseFloat((t.points ?? 0).toFixed(1)),
        pointsAgainst: parseFloat((t.pointsAgainst ?? 0).toFixed(1)),
        roster: rosterTeam?.roster?.entries?.map((e: any) => ({
          playerId: e.playerId,
          name: e.playerPoolEntry?.fullName ?? 'Unknown',
          injuryStatus: e.playerPoolEntry?.injuryStatus ?? 'ACTIVE',
          slotId: e.lineupSlotId,
          projPoints: parseFloat((e.playerPoolEntry?.playerRatings?.totalRating ?? 0).toFixed(1)),
        })) ?? [],
      };
    }) ?? [];

    const transactions = transData.transactions?.slice(0, 15).map((t: any) => ({
      id: t.id,
      type: t.type,
      date: new Date(t.proposedDate).toLocaleDateString(),
      status: t.status,
      items: t.items?.map((i: any) => ({
        player: i.playerName ?? 'Unknown',
        action: i.type,
        fromTeam: i.fromTeamId,
        toTeam: i.toTeamId,
      })) ?? [],
    })) ?? [];

    return NextResponse.json({
      leagueId,
      season,
      name: leagueData.settings?.name ?? 'My League',
      teams: teams.sort((a: any, b: any) => b.pointsFor - a.pointsFor),
      transactions,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Save ESPN credentials
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { leagueId, s2, swid } = await request.json();
    if (!leagueId) return NextResponse.json({ error: 'League ID required' }, { status: 400 });

    const sb = getServiceSupabase();
    await sb.from('users').update({
      espn_league_id: leagueId,
      espn_s2: s2 || null,
      espn_swid: swid || null,
    }).eq('id', user.userId);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
