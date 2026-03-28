// lib/mlb-api.ts
// Official MLB Stats API — completely free, no key needed

const MLB_BASE = 'https://statsapi.mlb.com/api/v1';

async function mlbFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${MLB_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    next: { revalidate: 300 }, // Next.js cache 5 min
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`MLB API error ${res.status}: ${path}`);
  return res.json();
}

// Stadium coordinates for weather lookup
export const STADIUM_COORDS: Record<string, { lat: number; lon: number; name: string }> = {
  NYY: { lat: 40.8296, lon: -73.9262, name: 'Yankee Stadium' },
  BOS: { lat: 42.3467, lon: -71.0972, name: 'Fenway Park' },
  LAD: { lat: 34.0739, lon: -118.2400, name: 'Dodger Stadium' },
  SF:  { lat: 37.7786, lon: -122.3893, name: 'Oracle Park' },
  CHC: { lat: 41.9484, lon: -87.6553, name: 'Wrigley Field' },
  HOU: { lat: 29.7573, lon: -95.3555, name: 'Minute Maid Park' },
  TEX: { lat: 32.7473, lon: -97.0845, name: 'Globe Life Field' },
  ATL: { lat: 33.8908, lon: -84.4678, name: 'Truist Park' },
  PHI: { lat: 39.9061, lon: -75.1665, name: 'Citizens Bank Park' },
  NYM: { lat: 40.7571, lon: -73.8458, name: 'Citi Field' },
  MIL: { lat: 43.0280, lon: -87.9712, name: 'American Family Field' },
  SD:  { lat: 32.7076, lon: -117.1570, name: 'Petco Park' },
  STL: { lat: 38.6226, lon: -90.1928, name: 'Busch Stadium' },
  CIN: { lat: 39.0974, lon: -84.5060, name: 'Great American Ball Park' },
  PIT: { lat: 40.4469, lon: -80.0057, name: 'PNC Park' },
  COL: { lat: 39.7559, lon: -104.9942, name: 'Coors Field' },
  ARI: { lat: 33.4453, lon: -112.0667, name: 'Chase Field' },
  SEA: { lat: 47.5914, lon: -122.3325, name: 'T-Mobile Park' },
  OAK: { lat: 37.7516, lon: -122.2005, name: 'Oakland Coliseum' },
  LAA: { lat: 33.8003, lon: -117.8827, name: 'Angel Stadium' },
  DET: { lat: 42.3390, lon: -83.0485, name: 'Comerica Park' },
  CLE: { lat: 41.4962, lon: -81.6852, name: 'Progressive Field' },
  MIN: { lat: 44.9817, lon: -93.2776, name: 'Target Field' },
  KC:  { lat: 39.0517, lon: -94.4803, name: 'Kauffman Stadium' },
  CWS: { lat: 41.8300, lon: -87.6339, name: 'Guaranteed Rate Field' },
  TOR: { lat: 43.6414, lon: -79.3894, name: 'Rogers Centre' },
  BAL: { lat: 39.2838, lon: -76.6218, name: 'Camden Yards' },
  TB:  { lat: 27.7682, lon: -82.6534, name: 'Tropicana Field' },
  MIA: { lat: 25.7781, lon: -80.2197, name: 'loanDepot Park' },
  WSH: { lat: 38.8730, lon: -77.0074, name: 'Nationals Park' },
};

export async function fetchTodaySchedule(date?: string) {
  const today = date || new Date().toISOString().split('T')[0];
  const data = await mlbFetch('/schedule', {
    sportId: '1',
    date: today,
    hydrate: 'team,venue,probablePitcher,linescore,broadcasts',
  });

  const games = data.dates?.[0]?.games || [];
  return games.map((g: any) => ({
    id: g.gamePk,
    status: g.status.abstractGameState,
    statusDetail: g.status.detailedState,
    time: g.gameDate,
    timeLocal: new Date(g.gameDate).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    }),
    away: {
      id: g.teams.away.team.id,
      abbr: g.teams.away.team.abbreviation,
      name: g.teams.away.team.teamName,
      score: g.teams.away.score ?? null,
      probSP: g.teams.away.probablePitcher?.fullName ?? 'TBD',
    },
    home: {
      id: g.teams.home.team.id,
      abbr: g.teams.home.team.abbreviation,
      name: g.teams.home.team.teamName,
      score: g.teams.home.score ?? null,
      probSP: g.teams.home.probablePitcher?.fullName ?? 'TBD',
    },
    venue: g.venue?.name ?? 'TBD',
    linescore: g.linescore ?? null,
  }));
}

export async function fetchLiveGame(gamePk: number) {
  const data = await fetch(
    `${MLB_BASE}/game/${gamePk}/feed/live`,
    { cache: 'no-store' } // never cache live data
  ).then(r => r.json());

  return {
    status: data.gameData?.status?.abstractGameState,
    inning: data.liveData?.linescore?.currentInning,
    half: data.liveData?.linescore?.inningHalf,
    outs: data.liveData?.linescore?.outs,
    score: {
      away: data.liveData?.linescore?.teams?.away?.runs ?? 0,
      home: data.liveData?.linescore?.teams?.home?.runs ?? 0,
    },
    currentPlay: data.liveData?.plays?.currentPlay?.result?.description,
    onBase: data.liveData?.plays?.currentPlay?.runners?.length ?? 0,
  };
}

export async function fetchPlayerStats(playerId: number, season?: number) {
  const yr = season || new Date().getFullYear();
  const data = await mlbFetch(`/people/${playerId}/stats`, {
    stats: 'season',
    season: String(yr),
    group: 'hitting,pitching',
  });
  return data.stats;
}

export async function fetchTeamRoster(teamId: number) {
  const data = await mlbFetch(`/teams/${teamId}/roster`, {
    rosterType: 'active',
  });
  return data.roster?.map((p: any) => ({
    id: p.person.id,
    name: p.person.fullName,
    pos: p.position.abbreviation,
    jersey: p.jerseyNumber,
  })) ?? [];
}

export async function fetchStandings() {
  const data = await mlbFetch('/standings', {
    leagueId: '103,104',
    season: String(new Date().getFullYear()),
    standingsTypes: 'regularSeason',
  });
  return data.records;
}
