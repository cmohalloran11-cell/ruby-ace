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

// ═══════════════════════════════════════════════════════════════
// DFS OPTIMIZER
// ═══════════════════════════════════════════════════════════════

const DK_CAP  = 50000;
const DK_MIN  = 49000;
const DK_SLOT_MIN = 2000; // DK absolute minimum salary per player

// DK MLB Classic: 2 SP, 1 C, 1 1B, 1 2B, 1 3B, 1 SS, 3 OF
const SLOTS = [
  { key: 'SP', positions: ['SP'],       count: 2 },
  { key: 'C',  positions: ['C'],        count: 1 },
  { key: '1B', positions: ['1B'],       count: 1 },
  { key: '2B', positions: ['2B'],       count: 1 },
  { key: '3B', positions: ['3B'],       count: 1 },
  { key: 'SS', positions: ['SS'],       count: 1 },
  { key: 'OF', positions: ['OF'],       count: 3 },
];

// Seeded deterministic RNG (LCG)
function mkRng(seed: number) {
  let s = (seed * 1664525 + 1013904223) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// ── Composite player score ────────────────────────────────────
function compositeScore(p: any, mode: 'cash' | 'gpp', stackTeam: string | null): number {
  const proj    = p.proj_fpts    || 0;
  const floor   = p.proj_floor   || proj * 0.3;
  const ceiling = p.proj_ceiling || proj * 1.8;
  const own     = p.proj_ownership || 0;
  const sal     = p.salary || 3000;
  const lp      = p.lineup_pos  || 5; // batting order position, default middle
  const isSP    = p.position === 'SP';

  // Value = pts per $1k salary
  const value = (proj / sal) * 1000;

  // Lineup position factor — leadoff (1) and cleanup (3,4) get slight boost
  const lpFactor = lp === 1 ? 1.05 : lp <= 4 ? 1.03 : lp >= 8 ? 0.97 : 1.0;

  let score: number;

  if (mode === 'cash') {
    // Cash: maximize FLOOR, weight floor heavily, blend with value
    // We want players who reliably produce, not lottery tickets
    score = (floor * 0.55 + proj * 0.35 + value * 0.1) * lpFactor;
    // Penalize very cheap players — drags salary utilization down
    if (sal < 4000) score *= 0.88;
    if (sal < 3500) score *= 0.80;
  } else {
    // GPP: maximize CEILING leverage = ceiling relative to ownership
    // Low-owned ceiling plays are the goal
    const ceilingLeverage = own > 0 ? ceiling / Math.sqrt(own) : ceiling * 1.5;
    score = (ceilingLeverage * 0.5 + proj * 0.35 + value * 0.15) * lpFactor;
    // Penalize high ownership — chalk is bad in GPPs
    if (own > 40) score *= 0.70;
    else if (own > 30) score *= 0.82;
    else if (own > 20) score *= 0.92;
    else if (own < 8 && !isSP) score *= 1.08; // low-owned bonus
  }

  // Stack team batter boost
  if (stackTeam && p.team === stackTeam && !isSP) {
    score *= 1.25;
  }

  return score;
}

// ── Build one lineup ──────────────────────────────────────────
interface BuildOptions {
  locked:         number[];
  excluded:       Set<number>;
  cap:            number;
  minSal:         number;
  stackTeam:      string | null;
  stackSize:      number;
  mode:           'cash' | 'gpp';
  noisePts:       number;   // flat points of noise added to scores
  maxExposure:    number;   // 0-100 %
  totalLineups:   number;
  exposureCounts: Record<number, number>;
  oppMap:         Record<string, string>; // spTeam -> opponentTeam
  maxPerTeam:     number;
  minSalaryUsage: number;   // minimum salary to use
  rngSeed:        number;
}

function buildOne(pool: any[], opts: BuildOptions): any[] | null {
  const {
    locked, excluded, cap, minSal, stackTeam, stackSize,
    mode, noisePts, maxExposure, totalLineups, exposureCounts,
    oppMap, maxPerTeam, rngSeed,
  } = opts;

  const rng = mkRng(rngSeed);
  const maxAllowed = maxExposure < 100
    ? Math.max(1, Math.floor((maxExposure / 100) * totalLineups))
    : Infinity;

  // Score each player once, add flat-point noise (not percentage)
  // Flat noise prevents low-proj players from jumping over high-proj players
  const scored = pool
    .filter(p => !excluded.has(p.id))
    .map(p => {
      const base = compositeScore(p, mode, stackTeam);
      // Noise: ±noisePts flat — a player projecting 18 FP won't drop below
      // a player projecting 8 FP even with max noise
      const noise = noisePts > 0 ? (rng() - 0.5) * noisePts * 2 : 0;
      return { ...p, _base: base, _score: base + noise };
    })
    .sort((a, b) => b._score - a._score);

  // Build opp map: SP team → team they're pitching against
  const spOppMap = { ...oppMap };
  for (const p of pool) {
    if (p.position === 'SP' && p.opp && !spOppMap[p.team]) {
      spOppMap[p.team] = p.opp;
    }
  }

  // batter faces SP check
  const batterFacesSP = (batterTeam: string, spTeam: string) =>
    spOppMap[spTeam] === batterTeam;

  const roster: any[] = [];
  const usedIds = new Set<number>();
  let salUsed = 0;

  // Lock in forced players first
  for (const p of scored) {
    if (locked.includes(p.id) && !usedIds.has(p.id)) {
      roster.push(p);
      usedIds.add(p.id);
      salUsed += p.salary || 0;
    }
  }

  const fill = (positions: string[], count: number): boolean => {
    const have = roster.filter(p => positions.includes(p.position)).length;
    let need = count - have;

    for (const p of scored) {
      if (need <= 0) break;
      if (!positions.includes(p.position)) continue;
      if (usedIds.has(p.id)) continue;

      // ── HARD RULE: no batter vs own SP ──────────────────────
      if (p.position !== 'SP') {
        const spInRoster = roster.filter(r => r.position === 'SP');
        if (spInRoster.some(sp => batterFacesSP(p.team, sp.team))) continue;
      }
      if (p.position === 'SP') {
        const battersInRoster = roster.filter(r => r.position !== 'SP');
        if (battersInRoster.some(b => batterFacesSP(b.team, p.team))) continue;
      }

      // ── HARD RULE: no two SPs from same game ────────────────
      if (p.position === 'SP') {
        const spInRoster = roster.filter(r => r.position === 'SP');
        for (const sp of spInRoster) {
          // Same game = they face each other
          if (spOppMap[sp.team] === p.team || spOppMap[p.team] === sp.team) continue;
        }
      }

      // ── HARD RULE: max exposure ──────────────────────────────
      if (maxExposure < 100 && !locked.includes(p.id)) {
        if ((exposureCounts[p.id] || 0) >= maxAllowed) continue;
      }

      // ── HARD RULE: max players per team ─────────────────────
      if (maxPerTeam < 10) {
        const teamCount = roster.filter(r => r.team === p.team).length;
        if (teamCount >= maxPerTeam) continue;
      }

      // ── HARD RULE: no worthless min-salary plays ────────────
      if ((p.salary || 0) <= 3500 && (p.proj_fpts || 0) < 7) continue;

      // ── HARD RULE: stack enforcement ─────────────────────────
      if (stackTeam && p.position !== 'SP') {
        const stackHave = roster.filter(r => r.team === stackTeam && r.position !== 'SP').length;
        const slotsLeft = count - roster.filter(r => positions.includes(r.position)).length;
        const stackLeft = scored.filter(c =>
          positions.includes(c.position) &&
          !usedIds.has(c.id) &&
          c.team === stackTeam
        ).length;
        // If we still need stack players and they're available, don't pick non-stack
        if (stackHave < stackSize && p.team !== stackTeam && stackLeft >= slotsLeft) continue;
      }

      // ── Salary headroom check ────────────────────────────────
      // After adding this player, remaining slots need at least DK_SLOT_MIN each
      const slotsRemaining = 10 - roster.length - 1;
      const salAfter = salUsed + (p.salary || 0);
      // Don't exceed cap (leave DK_SLOT_MIN per remaining slot)
      if (salAfter > cap - slotsRemaining * DK_SLOT_MIN) continue;
      // Don't go so cheap we can't reach the salary floor
      // Assume remaining players average at most $7000 (generous ceiling)
      if (salAfter + slotsRemaining * 7000 < minSal) continue;

      roster.push(p);
      usedIds.add(p.id);
      salUsed += p.salary || 0;
      need--;
    }

    return need === 0;
  };

  // Fill all slots
  let ok = true;
  for (const slot of SLOTS) {
    if (!fill(slot.positions, slot.count)) { ok = false; break; }
  }

  if (!ok || roster.length !== 10) return null;

  const totalSalary = roster.reduce((s, p) => s + (p.salary || 0), 0);
  if (totalSalary < minSal || totalSalary > cap) return null;

  // Final validation: no batter vs SP
  const finalSPs = roster.filter(p => p.position === 'SP');
  const finalBats = roster.filter(p => p.position !== 'SP');
  for (const sp of finalSPs) {
    for (const b of finalBats) {
      if (batterFacesSP(b.team, sp.team)) return null;
    }
  }

  return roster;
}

// ── Main optimizer hook ───────────────────────────────────────
export function useDFSOptimizer(players: any[]) {

  const optimize = useCallback(({
    locked       = [] as number[],
    excluded     = [] as number[],
    numLineups   = 1,
    stackTeam    = null as string | null,
    stackSize    = 3,
    mode         = 'cash' as 'cash' | 'gpp',
    minUnique    = 2,
    minSalary    = 49000,
    maxExposure  = 100,
    maxOwnership = 0,
    maxPerTeam   = 6,
  }) => {
    // Pool: proj_fpts > 0, IPL (in probable lineup) filter, not excluded
    const excludedSet = new Set(excluded);
    const pool = players.filter(p =>
      !excludedSet.has(p.id) &&
      (p.proj_fpts || 0) > 0 &&
      // Only include confirmed lineup players — IPL=true from theBatX
      // Locked players always included regardless of IPL
      (p.in_probable_lineup !== false || locked.includes(p.id)) &&
      // Ownership filter (GPP use)
      (maxOwnership === 0 || (p.proj_ownership || 0) <= maxOwnership || locked.includes(p.id))
    );

    if (pool.length < 10) {
      return []; // not enough players
    }

    // Build SP→opp map from the pool
    const oppMap: Record<string, string> = {};
    for (const p of pool) {
      if (p.position === 'SP' && p.opp) oppMap[p.team] = p.opp;
    }

    const exposureCounts: Record<number, number> = {};
    const lineups: any[] = [];
    const usedLineupHashes = new Set<string>();

    let seed = 0;
    let totalAttempts = 0;
    const MAX_ATTEMPTS = numLineups * 200;

    while (lineups.length < numLineups && totalAttempts < MAX_ATTEMPTS) {
      seed++;
      totalAttempts++;

      // Noise: 0 for first few lineups (optimal), increasing for variety
      // Scale by lineup count so 20-lineup sets get more variety than 3-lineup sets
      const progressRatio = lineups.length / numLineups;
      const noisePts = progressRatio * 3.5 * (numLineups > 5 ? 1.2 : 0.8);

      const roster = buildOne(pool, {
        locked,
        excluded: excludedSet,
        cap: DK_CAP,
        minSal: minSalary,
        stackTeam,
        stackSize,
        mode,
        noisePts,
        maxExposure,
        totalLineups: numLineups,
        exposureCounts,
        oppMap,
        maxPerTeam,
        minSalaryUsage: minSalary,
        rngSeed: seed,
      });

      if (!roster) continue;

      // Dedup check — hash by sorted player IDs
      const hash = [...roster].map(p => p.id).sort().join(',');
      if (usedLineupHashes.has(hash)) continue;

      // Min unique vs previous lineup
      if (minUnique > 0 && lineups.length > 0) {
        const prevIds = new Set(lineups[lineups.length - 1].players.map((p: any) => p.id));
        const uniqueCount = roster.filter(p => !prevIds.has(p.id)).length;
        if (uniqueCount < minUnique) continue;
      }

      // Quality floor: at least 80% of best lineup's proj FP
      if (lineups.length > 0) {
        const thisFP = roster.reduce((s, p) => s + (p.proj_fpts || 0), 0);
        const bestFP = lineups[0].projFpts;
        if (thisFP < bestFP * 0.80) continue;
      }

      // Update exposure
      for (const p of roster) {
        exposureCounts[p.id] = (exposureCounts[p.id] || 0) + 1;
      }

      usedLineupHashes.add(hash);

      const totalSalary = roster.reduce((s, p) => s + (p.salary || 0), 0);
      const projFpts    = parseFloat(roster.reduce((s, p) => s + (p.proj_fpts || 0), 0).toFixed(1));
      const avgOwn      = parseFloat((roster.reduce((s, p) => s + (p.proj_ownership || 0), 0) / roster.length).toFixed(1));

      lineups.push({ players: roster, totalSalary, projFpts, avgOwnership: avgOwn });
    }

    return lineups;
  }, [players]);

  // ── Contest simulator ───────────────────────────────────────
  const simulateContest = useCallback((lineups: any[], fieldSize: number = 1000) => {
    if (!lineups.length) return null;
    const NUM_SIMS = 500;
    const rng = mkRng(99);

    const results = lineups.map(() => ({
      wins: 0, top10: 0, top25: 0, totalScore: 0, minScore: 999, maxScore: 0,
    }));

    for (let sim = 0; sim < NUM_SIMS; sim++) {
      // Score each of your lineups with realistic variance
      const yourScores = lineups.map(lu => {
        return lu.players.reduce((sum: number, p: any) => {
          const base = p.proj_fpts || 0;
          const std = p.position === 'SP' ? base * 0.35 : base * 0.28;
          // Box-Muller for normal distribution
          const u1 = Math.max(1e-10, rng());
          const u2 = rng();
          const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          return sum + Math.max(0, base + z * std);
        }, 0);
      });

      // Generate field
      const field: number[] = [];
      for (let i = 0; i < fieldSize; i++) {
        const u1 = Math.max(1e-10, rng()); const u2 = rng();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        field.push(90 + z * 18);
      }
      field.sort((a, b) => b - a);

      yourScores.forEach((score, i) => {
        results[i].totalScore += score;
        results[i].minScore = Math.min(results[i].minScore, score);
        results[i].maxScore = Math.max(results[i].maxScore, score);
        const rank = field.findIndex(f => score > f);
        const pct = (rank === -1 ? fieldSize : rank) / fieldSize;
        if (pct < 0.01) results[i].wins++;
        if (pct < 0.10) results[i].top10++;
        if (pct < 0.25) results[i].top25++;
      });
    }

    return results.map((r, i) => ({
      lineupIdx: i,
      avgScore:  parseFloat((r.totalScore / NUM_SIMS).toFixed(1)),
      minScore:  parseFloat(r.minScore.toFixed(1)),
      maxScore:  parseFloat(r.maxScore.toFixed(1)),
      winPct:    parseFloat((r.wins   / NUM_SIMS * 100).toFixed(1)),
      top10Pct:  parseFloat((r.top10  / NUM_SIMS * 100).toFixed(1)),
      top25Pct:  parseFloat((r.top25  / NUM_SIMS * 100).toFixed(1)),
    }));
  }, []);

  return { optimize, simulateContest, SALARY_CAP: DK_CAP, SALARY_MIN: DK_MIN };
}
