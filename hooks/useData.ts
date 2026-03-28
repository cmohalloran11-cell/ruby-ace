'use client';
// hooks/useData.ts — all data fetching hooks

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Generic fetcher
async function apiFetch(path: string, token?: string | null, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// ── Schedule + Weather ────────────────────────────────────────
export function useSchedule(date?: string) {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const path = `/api/schedule${date ? `?date=${date}` : ''}`;
      const data = await apiFetch(path);
      setGames(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  return { games, loading, error, refresh: load };
}

// ── Projections ───────────────────────────────────────────────
export function useProjections(date?: string, pos?: string) {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let params = date ? `?date=${date}` : '?';
    if (pos) params += `&pos=${pos}`;
    apiFetch(`/api/projections${params}`)
      .then(d => { setPlayers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [date, pos]);

  return { players, loading };
}

// ── Props / Pick Lines ────────────────────────────────────────
export function useProps() {
  const [picks, setPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/props')
      .then(d => { setPicks(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { picks, loading };
}

// ── News Feed ─────────────────────────────────────────────────
export function useNews(team: string = 'ALL', limit: number = 25) {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/news?team=${team}&limit=${limit}`)
      .then(d => { setNews(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [team, limit]);

  return { news, loading };
}

// ── ESPN League ───────────────────────────────────────────────
export function useESPN() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const d = await apiFetch('/api/espn', token);
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const saveCredentials = async (leagueId: string, s2?: string, swid?: string) => {
    await apiFetch('/api/espn', token, {
      method: 'POST',
      body: JSON.stringify({ leagueId, s2, swid }),
    });
    await load();
  };

  return { data, loading, error, load, saveCredentials };
}

// ── Admin: Projections ────────────────────────────────────────
export function useAdminProjections(date?: string) {
  const { token } = useAuth();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const d = date || new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!token) return;
    apiFetch(`/api/admin/projections?date=${d}`, token)
      .then(data => { setPlayers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, d]);

  const update = async (id: number, fields: Record<string, any>) => {
    setSaving(true);
    await apiFetch('/api/admin/projections', token, {
      method: 'PATCH',
      body: JSON.stringify({ id, ...fields }),
    });
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p));
    setSaving(false);
  };

  const remove = async (id: number) => {
    await apiFetch(`/api/admin/projections?id=${id}`, token, { method: 'DELETE' });
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const uploadCSV = async (file: File, source: string) => {
    setSaving(true);
    const form = new FormData();
    form.append('file', file);
    form.append('source', source);
    form.append('date', d);
    const res = await fetch('/api/admin/projections', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const result = await res.json();
    setSaving(false);
    // Reload after upload
    apiFetch(`/api/admin/projections?date=${d}`, token)
      .then(data => setPlayers(Array.isArray(data) ? data : []));
    return result;
  };

  return { players, loading, saving, update, remove, uploadCSV };
}

// ── Admin: Users ──────────────────────────────────────────────
export function useAdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiFetch('/api/admin/users', token)
      .then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const updateUser = async (id: string, fields: any) => {
    await apiFetch('/api/admin/users', token, {
      method: 'PATCH',
      body: JSON.stringify({ id, ...fields }),
    });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...fields } : u));
  };

  return { users, loading, updateUser };
}

// ── DFS Optimizer (client-side) ───────────────────────────────
export function useDFSOptimizer(players: any[]) {
  const SALARY_CAP = 50000;
  const SALARY_MIN = 49000;

  const optimize = useCallback(({
    locked       = [] as number[],
    excluded     = [] as number[],
    numLineups   = 1,
    stackTeam    = null as string | null,
    stackSize    = 3,
    mode         = 'cash' as 'cash' | 'gpp',
    randomness   = 0,
    minUnique    = 2,
    minSalary    = 49000,
    maxExposure  = 100,
    maxOwnership = 0,
  }) => {
    const pool = players.filter(p =>
      !excluded.includes(p.id) &&
      (p.proj_fpts || 0) > 0 &&
      (maxOwnership === 0 || (p.proj_ownership || 0) <= maxOwnership || locked.includes(p.id))
    );

    // Build pitcher → opponent team map from pool
    // Pitchers and batters share a game — identify pairs by matching teams
    // SP team X pitches vs batter team Y: both appear in pool
    // We infer this: for every SP in pool, find which non-SP teams they're NOT on
    // Use opp field if present, otherwise infer from known game matchups
    const pitcherOppMap: Record<string, string> = {};
    const pitchers = pool.filter(p => p.position === 'SP');
    const batterTeams = [...new Set(pool.filter(p => p.position !== 'SP').map((p:any) => p.team as string))];
    pitchers.forEach((sp: any) => {
      // opp field from DB if available
      if (sp.opp) {
        pitcherOppMap[sp.team] = sp.opp;
        return;
      }
      // Infer: sp.team plays against exactly one other team in the slate
      // Find the team that shares a game with sp.team but isn't sp.team
      // We approximate by excluding sp.team from batter teams — if only one other
      // team could be the opponent (limited slate), pick the one most likely
      // For now store empty — anti-correlation rule will use team-based inference below
    });

    const exposureCounts: Record<number, number> = {};
    const lineups: any[] = [];
    let seed = 0;

    for (let phase = 1; phase <= 4 && lineups.length < numLineups; phase++) {
      const effectiveMinUnique = phase >= 2 ? Math.max(0, minUnique - (phase - 2)) : minUnique;
      // Exposure: use ACTUAL lineups built so far, not requested total
      // maxAllowed recalculated each iteration based on real progress
      const effectiveMaxExp    = phase >= 3 ? Math.min(100, maxExposure + (phase - 2) * 20) : maxExposure;
      const effectiveMinSal    = phase >= 4 ? Math.max(45000, minSalary - 1000) : minSalary;
      const phaseAttempts      = numLineups * 40;

      for (let a = 0; a < phaseAttempts && lineups.length < numLineups; a++) {
        seed++;
        const effectiveRandom = randomness + (phase - 1) * 1.5;
        // Pass current lineup count so exposure is based on actual progress
        const lu = buildLineup(pool, locked, SALARY_CAP, effectiveMinSal, seed, stackTeam, stackSize, mode, effectiveRandom, exposureCounts, effectiveMaxExp, numLineups, pitcherOppMap);
        if (!lu) continue;

        if (effectiveMinUnique > 0 && lineups.length > 0) {
          const prev = lineups[lineups.length - 1];
          const prevIds = new Set(prev.players.map((p: any) => p.id));
          const unique = lu.players.filter((p: any) => !prevIds.has(p.id)).length;
          if (unique < effectiveMinUnique) continue;
        }

        // Reject lineups below 72% of best — no garbage lineups
        if (lineups.length > 0 && lu.projFpts < lineups[0].projFpts * 0.72) continue;

        for (const p of lu.players) {
          exposureCounts[p.id] = (exposureCounts[p.id] || 0) + 1;
        }
        lineups.push(lu);
      }
    }

    return lineups;
  }, [players]);

  // Contest simulation — given your lineups, simulate against a field
  const simulateContest = useCallback((lineups: any[], fieldSize: number = 1000, payoutStructure: 'top10' | 'top25' | 'h2h' = 'top25') => {
    if (!lineups.length || !players.length) return null;

    // Score a lineup using DK scoring rules with variance
    const scoreLine = (lineup: any[], rng: () => number) => {
      return lineup.reduce((sum: number, p: any) => {
        const base = p.proj_fpts || 0;
        // Add realistic variance: ~25% std dev for hitters, ~35% for pitchers
        const stdDev = p.position === 'SP' ? base * 0.35 : base * 0.25;
        const variance = stdDev * (rng() + rng() + rng() + rng() - 2); // approx normal via CLT
        return sum + Math.max(0, base + variance);
      }, 0);
    };

    const rng = seededRng(42);
    const NUM_SIMS = 500;
    const results = lineups.map(() => ({ wins: 0, top10: 0, top25: 0, avgScore: 0, minScore: Infinity, maxScore: 0 }));

    for (let sim = 0; sim < NUM_SIMS; sim++) {
      // Score your lineups
      const yourScores = lineups.map(lu => scoreLine(lu.players, rng));

      // Generate field scores — use player pool to build realistic distribution
      const fieldScores: number[] = [];
      for (let i = 0; i < fieldSize; i++) {
        // Field lineup score: avg ~85-95 FP with ~15 FP std dev
        const fieldBase = 88 + (rng() - 0.5) * 20;
        const fieldVar  = (rng() + rng() - 1) * 12;
        fieldScores.push(fieldBase + fieldVar);
      }
      fieldScores.sort((a, b) => b - a);

      const top10cutoff  = fieldScores[Math.floor(fieldSize * 0.10)] || 0;
      const top25cutoff  = fieldScores[Math.floor(fieldSize * 0.25)] || 0;
      const winCutoff    = fieldScores[0] || 0;

      yourScores.forEach((score, i) => {
        results[i].avgScore += score / NUM_SIMS;
        results[i].minScore  = Math.min(results[i].minScore, score);
        results[i].maxScore  = Math.max(results[i].maxScore, score);
        const allScores = [...fieldScores, score].sort((a, b) => b - a);
        const rank = allScores.indexOf(score) + 1;
        const pct  = rank / (fieldSize + 1);
        if (pct <= 0.01) results[i].wins++;
        if (pct <= 0.10) results[i].top10++;
        if (pct <= 0.25) results[i].top25++;
      });
    }

    return results.map((r, i) => ({
      lineupIdx:  i,
      avgScore:   parseFloat(r.avgScore.toFixed(1)),
      minScore:   parseFloat(r.minScore.toFixed(1)),
      maxScore:   parseFloat(r.maxScore.toFixed(1)),
      winPct:     parseFloat((r.wins   / NUM_SIMS * 100).toFixed(1)),
      top10Pct:   parseFloat((r.top10  / NUM_SIMS * 100).toFixed(1)),
      top25Pct:   parseFloat((r.top25  / NUM_SIMS * 100).toFixed(1)),
    }));
  }, [players]);

  return { optimize, simulateContest, SALARY_CAP, SALARY_MIN };
}

// DK MLB classic slots
const DK_SLOTS = [
  { positions: ['SP'],         need: 2 },
  { positions: ['C', 'C/1B'],  need: 1 },
  { positions: ['1B', 'C/1B'], need: 1 },
  { positions: ['2B'],         need: 1 },
  { positions: ['3B'],         need: 1 },
  { positions: ['SS'],         need: 1 },
  { positions: ['OF'],         need: 3 },
];

function seededRng(seed: number) {
  let s = seed * 1664525 + 1013904223;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function scorePlayer(p: any, mode: string, stackTeam: string | null, rand: () => number, randomness: number): number {
  let score = p.proj_fpts || 0;
  const sal  = p.salary || 1;
  const own  = p.proj_ownership || 0;

  // Value score baseline (pts per $1k) — rewards efficient spend
  const value = (score / sal) * 1000;

  if (mode === 'gpp') {
    // GPP: balance raw points + value + low ownership leverage
    // Penalise chalk heavily — being different wins GPPs
    const ownPenalty = own > 30 ? 0.75 : own > 20 ? 0.87 : own > 10 ? 0.95 : 1.0;
    score = (score * 0.6 + value * 0.4) * ownPenalty;
  } else {
    // Cash: pure floor — weight raw pts heavily, small value bonus
    // Penalise very cheap plays that drag salary down
    const salBonus = sal >= 5000 ? 1.0 : sal >= 4000 ? 0.92 : 0.82;
    score = (score * 0.75 + value * 0.25) * salBonus;
  }

  // Stack bonus — prefer batters from stack team
  if (stackTeam && p.team === stackTeam && p.position !== 'SP') {
    score *= 1.3;
  }

  // Randomness for lineup variety
  if (randomness > 0) {
    const noise = (rand() - 0.5) * (randomness / 10) * score * 0.4;
    score += noise;
  }

  return score;
}

function buildLineup(
  pool:            any[],
  locked:          number[],
  cap:             number,
  minSal:          number,
  seed:            number,
  stackTeam:       string | null,
  stackSize:       number,
  mode:            string,
  randomness:      number,
  exposureCounts:  Record<number, number> = {},
  maxExposure:     number = 100,
  totalLineups:    number = 1,
  pitcherOppMap:   Record<string, string> = {},
): any | null {
  const rand = seededRng(seed);

  // Build runtime game-pair map: which team faces which pitcher
  // For each SP in pool, their opponent team = batters from the other team in same game
  // We derive this by: all teams in pool come in pairs (home/away per game)
  // SP team X => the other team in that game is X's opponent
  // Since we don't always have opp field, we build a conflict set:
  // conflictPairs: Set of "SPteam|batterTeam" strings that should NOT coexist
  const spTeams = [...new Set(pool.filter(p => p.position === 'SP').map((p: any) => p.team as string))];
  const batterTeams = [...new Set(pool.filter(p => p.position !== 'SP').map((p: any) => p.team as string))];

  // For each SP team, find their opponent using opp field or pitcherOppMap
  // If neither available, infer: SP's opponent is a team in batterTeams that isn't SP's own team
  // and shares a game (we approximate using known slate matchups hardcoded as fallback)
  const spOppMap: Record<string, string> = { ...pitcherOppMap };
  for (const sp of pool.filter(p => p.position === 'SP')) {
    if (!spOppMap[sp.team]) {
      if (sp.opp) spOppMap[sp.team] = sp.opp;
    }
  }

  const isBatterVsPitcher = (batterTeam: string, spTeam: string): boolean => {
    if (spOppMap[spTeam] && spOppMap[spTeam] === batterTeam) return true;
    // Reverse check: if batter's opp = sp's team
    const batterPlayer = pool.find((p: any) => p.team === batterTeam && p.opp === spTeam);
    if (batterPlayer) return true;
    return false;
  };

  const scored = pool
    .map(p => ({ ...p, _score: scorePlayer(p, mode, stackTeam, rand, randomness) }))
    .sort((a, b) => b._score - a._score);

  const isLocked = (id: number) => locked.includes(id);
  const roster: any[] = scored.filter(p => isLocked(p.id));
  let salUsed = roster.reduce((s: number, p: any) => s + (p.salary || 0), 0);

  const fill = (positions: string[], count: number) => {
    const have = roster.filter(p => positions.includes(p.position)).length;
    let need   = count - have;

    for (const p of scored) {
      if (need <= 0) break;
      if (!positions.includes(p.position)) continue;
      if (roster.some(r => r.id === p.id)) continue;

      // ── RULE 1: No batter vs pitcher in same lineup ────────
      if (p.position !== 'SP') {
        const blocked = roster
          .filter(r => r.position === 'SP')
          .some(sp => isBatterVsPitcher(p.team, sp.team));
        if (blocked) continue;
      }
      if (p.position === 'SP') {
        const blocked = roster
          .filter(r => r.position !== 'SP')
          .some(b => isBatterVsPitcher(b.team, p.team));
        if (blocked) continue;
      }

      // ── RULE 2: Max exposure ───────────────────────────────
      if (maxExposure < 100 && !isLocked(p.id)) {
        const used    = exposureCounts[p.id] || 0;
        // Use totalLineups (requested) for the cap — this is intentional
        // so that 40% of 20 = max 8 appearances regardless of phase
        const allowed = Math.max(1, Math.floor((maxExposure / 100) * totalLineups));
        if (used >= allowed) continue;
      }

      // ── RULE 3: No min-salary filler unless strong proj ───
      if ((p.salary || 0) <= 4000 && (p.proj_fpts || 0) < 8) continue;

      // ── RULE 4: Stack enforcement ──────────────────────────
      if (stackTeam && p.position !== 'SP' && positions[0] !== 'SP') {
        const stackCount    = roster.filter(r => r.team === stackTeam && r.position !== 'SP').length;
        const haveInSlot    = roster.filter(r => positions.includes(r.position)).length;
        const stillNeed     = count - haveInSlot;
        const stackAvail    = scored.filter(c =>
          positions.includes(c.position) && !roster.some(r => r.id === c.id) && c.team === stackTeam
        ).length;
        if (stackCount < stackSize && p.team !== stackTeam && stackAvail >= stillNeed) continue;
      }

      // ── Salary constraints ─────────────────────────────────
      const slotsLeft      = 10 - roster.length;
      const salNeededAfter = (slotsLeft - 1) * 3000;
      if (salUsed + (p.salary || 0) > cap - salNeededAfter) continue;

      roster.push(p);
      salUsed += (p.salary || 0);
      need--;
    }
  };

  for (const slot of DK_SLOTS) fill(slot.positions, slot.need);

  if (roster.length < 10) return null;

  const final       = roster.slice(0, 10);
  const totalSalary = final.reduce((s: number, p: any) => s + (p.salary || 0), 0);
  if (totalSalary < minSal || totalSalary > cap) return null;

  // Final sanity check: reject if any batter faces any SP in lineup
  const finalSPs      = final.filter(p => p.position === 'SP');
  const finalBatters  = final.filter(p => p.position !== 'SP');
  for (const sp of finalSPs) {
    for (const b of finalBatters) {
      if (isBatterVsPitcher(b.team, sp.team)) return null;
    }
  }

  const avgOwn = final.reduce((s: number, p: any) => s + (p.proj_ownership || 0), 0) / final.length;

  return {
    players: final,
    totalSalary,
    projFpts:     parseFloat(final.reduce((s: number, p: any) => s + (p.proj_fpts || 0), 0).toFixed(1)),
    avgOwnership: parseFloat(avgOwn.toFixed(1)),
  };
}
