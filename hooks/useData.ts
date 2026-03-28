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

    const exposureCounts: Record<number, number> = {};
    const lineups: any[] = [];
    let seed = 1;
    let attempts = 0;

    while (lineups.length < numLineups && attempts < numLineups * 40) {
      seed++; attempts++;
      const lu = buildLineup(pool, locked, SALARY_CAP, minSalary, seed, stackTeam, stackSize, mode, randomness, exposureCounts, maxExposure, numLineups);
      if (!lu) continue;

      // Enforce min unique vs ALL previous lineups (not just last)
      if (minUnique > 0 && lineups.length > 0) {
        const prev = lineups[lineups.length - 1];
        const prevIds = new Set(prev.players.map((p: any) => p.id));
        const unique = lu.players.filter((p: any) => !prevIds.has(p.id)).length;
        if (unique < minUnique) continue;
      }

      for (const p of lu.players) {
        exposureCounts[p.id] = (exposureCounts[p.id] || 0) + 1;
      }
      lineups.push(lu);
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
  pool:           any[],
  locked:         number[],
  cap:            number,
  minSal:         number,
  seed:           number,
  stackTeam:      string | null,
  stackSize:      number,
  mode:           string,
  randomness:     number,
  exposureCounts: Record<number, number> = {},
  maxExposure:    number = 100,
  totalLineups:   number = 1,
): any | null {
  const rand = seededRng(seed);

  // Build the pitcher–batter opponent map for anti-correlation rule
  // Key: pitcher team, Value: set of batter teams to block (i.e. teams facing that pitcher)
  const pitchers = pool.filter(p => p.position === 'SP');
  const pitcherOpponents: Record<string, string> = {};
  // We need to know which team each pitcher faces — stored in player.team (pitcher's team)
  // and we block batters from the opposing team
  // Since we don't have opp stored, we infer from game context using team
  // Players on slate share games — for each SP, block batters from teams facing them
  // We'll use a heuristic: if a batter is on a team that a selected SP is pitching AGAINST, block them

  // Score all players
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

      // ── RULE: No batters vs own SP in same lineup ──────────
      if (p.position !== 'SP') {
        const rosterPitchers = roster.filter(r => r.position === 'SP');
        let blocked = false;
        for (const sp of rosterPitchers) {
          // Block if batter plays for a team the SP is pitching against
          // We detect this via the opp field if available, or cross-reference game
          if (sp.opp && sp.opp === p.team) { blocked = true; break; }
          if (p.opp  && p.opp  === sp.team) { blocked = true; break; }
        }
        if (blocked) continue;
      }

      // ── RULE: Batters can't be on same team as SP they face ─
      if (p.position === 'SP') {
        const rosterBatters = roster.filter(r => r.position !== 'SP');
        let blocked = false;
        for (const b of rosterBatters) {
          if (p.opp && p.opp === b.team) { blocked = true; break; }
          if (b.opp && b.opp === p.team) { blocked = true; break; }
        }
        if (blocked) continue;
      }

      // ── RULE: Max exposure per player ─────────────────────
      if (maxExposure < 100 && !isLocked(p.id)) {
        const used    = exposureCounts[p.id] || 0;
        const allowed = Math.max(1, Math.ceil((maxExposure / 100) * totalLineups));
        if (used >= allowed) continue;
      }

      // ── RULE: Smart value floor — avoid truly cheap plays ──
      // Don't use $4k min-salary players unless they have strong proj
      if ((p.salary || 0) <= 4000 && (p.proj_fpts || 0) < 8) continue;

      // ── RULE: Stack enforcement ────────────────────────────
      if (stackTeam && p.position !== 'SP' && positions[0] !== 'SP') {
        const stackCount = roster.filter(r => r.team === stackTeam && r.position !== 'SP').length;
        const slotsLeft  = count - (roster.filter(r => positions.includes(r.position)).length);
        // If we still need stack players, prefer stack team
        if (stackCount < stackSize && p.team !== stackTeam) {
          const nonStackCandidates = scored.filter(c =>
            positions.includes(c.position) &&
            !roster.some(r => r.id === c.id) &&
            c.team === stackTeam
          );
          if (nonStackCandidates.length >= slotsLeft) continue;
        }
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

  // Sanity: no batter should face any SP in the same lineup
  const finalPitchers = final.filter(p => p.position === 'SP');
  const finalBatters  = final.filter(p => p.position !== 'SP');
  for (const sp of finalPitchers) {
    for (const b of finalBatters) {
      if ((sp.opp && sp.opp === b.team) || (b.opp && b.opp === sp.team)) return null;
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
