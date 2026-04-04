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
    // No date param = API returns most recent slate
    apiFetch(`/api/admin/projections`, token)
      .then(data => { setPlayers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

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
    apiFetch(`/api/admin/projections`, token)
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

// Fill order and minimum realistic salary per slot
// Used for budget-aware selection — ensures enough salary left for later slots
const SLOT_FILL_ORDER = ['SP','SP','C','1B','2B','3B','SS','OF','OF','OF'];
const SLOT_MIN_SAL: Record<string,number> = {
  SP: 2000, C: 2000, '1B': 2000, '2B': 2000, '3B': 2000, SS: 2000, OF: 2000
};
// Buffer reduction: actual minimum is lower than DK minimum to avoid false blocks
const SLOT_MIN_BUFFER = 0.85; // use 85% of minimum to give budget room
function minSalaryNeeded(rosterLen: number): number {
  // Minimum salary for all slots AFTER the one being filled (index rosterLen)
  const future = SLOT_FILL_ORDER.slice(rosterLen + 1);
  return Math.floor(future.reduce((sum, s) => sum + (SLOT_MIN_SAL[s] || 2000), 0) * SLOT_MIN_BUFFER);
}

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
  const ceiling = p.proj_ceiling || proj * 1.8;
  const own     = p.proj_ownership || 0;
  const sal     = p.salary || 3000;
  const lp      = p.lineup_pos  || 5;
  const isSP    = p.position === 'SP';

  const value    = (proj / sal) * 1000;
  const lpFactor = lp === 1 ? 1.05 : lp <= 4 ? 1.03 : lp >= 8 ? 0.97 : 1.0;

  let score: number;

  if (mode === 'cash') {
    // Cash: projected FP is king, small value bonus for salary efficiency
    score = (proj * 0.75 + value * 0.25) * lpFactor;
  } else {
    // GPP: ceiling leverage (ceiling / sqrt(ownership)) rewards upside + low-owned
    const ceilingLeverage = own > 0 ? ceiling / Math.sqrt(own) : ceiling * 1.5;
    score = (ceilingLeverage * 0.5 + proj * 0.35 + value * 0.15) * lpFactor;
    if (own > 40) score *= 0.70;
    else if (own > 30) score *= 0.82;
    else if (own > 20) score *= 0.92;
  }

  // Stack team boost (base)
  if (stackTeam && p.team === stackTeam && !isSP) score *= 1.25;

  // Stack projection boost — if team has high implied runs, boost all batters
  const impliedRuns = p.implied_runs || 0;
  if (!isSP && impliedRuns > 0) {
    // Scale: 4 implied runs = neutral, 6+ = 15% boost, 8+ = 25% boost
    const stackBoost = Math.min(1.25, 1 + Math.max(0, (impliedRuns - 4) / 20));
    score *= stackBoost;
  }

  return score;
}

// Stack combo: array of group sizes summing to 8 hitter slots
// e.g. [4,3,1] = 4 from team A, 3 from team B, 1 from any remaining team
// e.g. [5,2,1] = 5 from team A, 2 from team B, 1 from any
type StackCombo = number[]; // sorted descending

// ── Build one lineup ──────────────────────────────────────────
interface BuildOptions {
  locked:          number[];
  excluded:        Set<number>;
  cap:             number;
  minSal:          number;
  stackTeam:       string | null;   // anchor team for largest group
  stackCombo:      StackCombo;      // e.g. [4,3,1] — 0 = no stack constraint
  mode:            'cash' | 'gpp';
  noisePts:        number;
  maxExposure:     number;
  totalLineups:    number;
  exposureCounts:  Record<number, number>;
  oppMap:          Record<string, string>;
  maxPerTeam:      number;          // 10 = no limit
  ruleNoBatterVsPitcher: boolean;
  ruleNoSameGameSPs:     boolean;
  ruleMinSalary:         boolean;
  rngSeed:         number;
}

function buildOne(pool: any[], opts: BuildOptions): any[] | null {
  const {
    locked, excluded, cap, stackTeam, stackCombo,
    mode, noisePts, maxExposure, totalLineups, exposureCounts,
    ruleNoBatterVsPitcher, ruleNoSameGameSPs,
    rngSeed,
  } = opts;

  const rng = mkRng(rngSeed);
  const maxAllowed = maxExposure < 100
    ? Math.max(1, Math.floor((maxExposure / 100) * totalLineups))
    : Infinity;

  const spOppMap: Record<string, string> = {};
  for (const p of pool) {
    if (p.position === 'SP' && p.opp) spOppMap[p.team] = p.opp;
  }

  const useCombo = !!(stackCombo && stackCombo.length > 0 && stackCombo[0] > 1);

  // Score and shuffle pool
  const scored = pool
    .filter(p => !excluded.has(p.id))
    .map(p => ({
      ...p,
      _score: compositeScore(p, mode, stackTeam) + (rng() - 0.5) * (noisePts || 2) * 2,
    }))
    .sort((a, b) => b._score - a._score);

  const roster: any[] = [];
  const usedIds = new Set<number>();
  let salUsed = 0;

  // Add locked players first
  for (const p of scored) {
    if (locked.includes(p.id) && !usedIds.has(p.id)) {
      roster.push(p); usedIds.add(p.id); salUsed += p.salary || 0;
    }
  }

  // Fill each slot
  const FILL_ORDER = ['SP','SP','C','1B','2B','3B','SS','OF','OF','OF'];

  for (let slotIdx = 0; slotIdx < FILL_ORDER.length; slotIdx++) {
    const slotPos = FILL_ORDER[slotIdx];
    const alreadyFilled = roster.filter(p => p.position === slotPos).length;
    const slotsOfThisType = FILL_ORDER.filter(s => s === slotPos).length;
    if (alreadyFilled >= slotsOfThisType) continue;

    // How many of this position still needed
    const currentOfType = roster.filter(p => p.position === slotPos).length;
    const neededOfType = slotsOfThisType - currentOfType;
    if (neededOfType <= 0) continue;

    // Remaining slots after this one (for budget lookahead)
    const remainingSlots = FILL_ORDER.slice(slotIdx + 1);
    const remainingPositions = remainingSlots.filter(s => 
      !roster.filter(p => p.position === s).length || 
      remainingSlots.filter(rs => rs === s).length > roster.filter(p => p.position === s).length
    );
    // Min cost for remaining slots = count of each remaining position × cheapest available
    let minRemaining = 0;
    const tempFilled: Record<string, number> = {};
    for (const rs of remainingSlots) {
      tempFilled[rs] = (tempFilled[rs] || 0) + 1;
    }
    for (const [pos, cnt] of Object.entries(tempFilled)) {
      const cheapest = scored
        .filter(p => p.position === pos && !usedIds.has(p.id))
        .sort((a,b) => (a.salary||0) - (b.salary||0));
      for (let k = 0; k < cnt && k < cheapest.length; k++) {
        minRemaining += cheapest[k].salary || 0;
      }
    }

    let filled = false;
    for (const p of scored) {
      if (p.position !== slotPos) continue;
      if (usedIds.has(p.id)) continue;

      const pSal = p.salary || 0;

      // Hard cap check with real minimum for remaining slots
      if (salUsed + pSal + minRemaining > cap) continue;

      // No batter vs pitcher rule
      if (ruleNoBatterVsPitcher && p.position !== 'SP') {
        if (roster.some(r => r.position === 'SP' && spOppMap[r.team] === p.team)) continue;
      }
      if (ruleNoBatterVsPitcher && p.position === 'SP') {
        if (roster.some(r => r.position !== 'SP' && spOppMap[p.team] === r.team)) continue;
      }

      // No same-game SPs
      if (ruleNoSameGameSPs && p.position === 'SP') {
        if (roster.some(r => r.position === 'SP' &&
          (spOppMap[r.team] === p.team || spOppMap[p.team] === r.team))) continue;
      }

      // Exposure — use id or player_name as key
      const expKey = p.id ?? p.player_name ?? p.name;
      if (maxExposure < 100 && !locked.includes(p.id)) {
        if ((exposureCounts[expKey] || 0) >= maxAllowed) continue;
      }

      // Max hitters per team (DK rule: max 5 batters from one team)
      if (slotPos !== 'SP') {
        const teamCount = roster.filter(r => r.team === p.team && r.position !== 'SP').length;
        if (teamCount >= maxPerTeam) continue;
      }

      roster.push(p);
      usedIds.add(p.id);
      salUsed += pSal;
      filled = true;
      break;
    }

    if (!filled) {
      // Retry without budget constraint — just find any valid player
      for (const p of scored) {
        if (p.position !== slotPos) continue;
        if (usedIds.has(p.id)) continue;
        if (salUsed + (p.salary||0) > cap) continue;
        // Still enforce team cap on retry
        if (slotPos !== 'SP') {
          const teamCount = roster.filter(r => r.team === p.team && r.position !== 'SP').length;
          if (teamCount >= maxPerTeam) continue;
        }
        roster.push(p); usedIds.add(p.id); salUsed += p.salary||0;
        filled = true;
        break;
      }
    }

    if (!filled) {
      if (rngSeed <= 3) console.warn('[buildOne] FAILED slot', slotPos, 'sal=', salUsed, 'cap=', cap);
      return null;
    }
  }

  if (roster.length !== 10) return null;
  const total = roster.reduce((s, p) => s + (p.salary || 0), 0);
  if (total > cap) return null;
  return roster;
}


export function useDFSOptimizer(players: any[]) {

  const optimize = useCallback(({
    locked       = [] as number[],
    excluded     = [] as number[],
    numLineups   = 1,
    stackTeam    = null as string | null,
    stackCombos  = [[]] as number[][], // array of combos to rotate through
    mode         = 'cash' as 'cash' | 'gpp',
    minUnique    = 2,
    minSalary    = 49000,
    maxExposure  = 100,
    maxOwnership = 0,
    ruleNoBatterVsPitcher = true,
    ruleNoSameGameSPs     = true,
    ruleMinSalary         = true,
    minExposures          = {} as Record<number,number>,
    projVariability       = 0,
    existingLineups       = [] as any[],
  }) => {
    // Pool: proj_fpts > 0, IPL (in probable lineup) filter, not excluded
    const excludedSet = new Set(excluded);
    const pool = players.filter((p: any) =>
      !excludedSet.has(p.id) &&
      (p.proj_fpts || 0) > 0 &&
      (p.in_probable_lineup !== false || locked.includes(p.id)) &&
      (maxOwnership === 0 || (p.proj_ownership || 0) <= maxOwnership || locked.includes(p.id))
    );

    console.log('[Optimizer] Pool:', pool.length, 'total |',
      pool.filter((p:any)=>p.position==='SP').length, 'SPs | salary>0:',
      pool.filter((p:any)=>(p.salary||0)>0).length, '| fpts>0:',
      pool.filter((p:any)=>(p.proj_fpts||0)>0).length,
      '| positions:', [...new Set(pool.map((p:any)=>p.position))].sort().join(', '));

    if (pool.length < 10) return [];

    // Build SP->opp map
    const oppMap: Record<string, string> = {};
    for (const p of pool) {
      if (p.position === 'SP' && p.opp) oppMap[p.team as string] = p.opp as string;
    }

    const exposureCounts: Record<number, number> = {};
    const lineups: any[] = [];
    const usedHashes = new Set<string>(
      existingLineups.map((lu:any) => (lu.players || lu).map((p:any) => p.id).sort().join(','))
    );
    const existingExposureCounts: Record<string,number> = {};
    for (const lu of existingLineups) {
      for (const p of (lu.players || lu)) {
        const k = p.id ?? p.player_name;
        existingExposureCounts[k] = (existingExposureCounts[k]||0) + 1;
      }
    }
    // Merge existing exposure into counts
    Object.assign(exposureCounts, existingExposureCounts);
    let seed = 0;

    for (let attempt = 0; attempt < numLineups * 1000 && lineups.length < numLineups; attempt++) {
      seed++;
      const noisePts = (projVariability > 0 ? projVariability * 0.5 : 2) + (lineups.length / Math.max(numLineups, 1)) * 8;
      const stackCombo = stackCombos[lineups.length % stackCombos.length] || [];

      const roster = buildOne(pool, {
        locked, excluded: excludedSet, cap: DK_CAP, minSal: minSalary,
        stackTeam, stackCombo, mode, noisePts,
        maxExposure, totalLineups: numLineups, exposureCounts,
        oppMap, maxPerTeam: 5,
        ruleNoBatterVsPitcher, ruleNoSameGameSPs, ruleMinSalary,
        rngSeed: seed,
      });

      if (!roster) {
        if (seed <= 3) console.warn('[Optimizer] seed='+seed+' buildOne=null');
        continue;
      }

      const hash = roster.map((p:any) => p.id).sort().join(',');
      if (usedHashes.has(hash)) continue;

      // Only enforce minUnique on small pools when we have plenty of attempts left
      if (minUnique > 1 && lineups.length > 0 && lineups.length < numLineups * 0.8) {
        const prev = new Set(lineups[lineups.length-1].players.map((p:any) => p.id));
        if (roster.filter((p:any) => !prev.has(p.id)).length < Math.min(minUnique, 2)) continue;
      }

      // No floor check — allow variance across all lineups

      for (const p of roster) { const k = p.id ?? p.player_name ?? p.name; exposureCounts[k] = (exposureCounts[k]||0) + 1; }
      usedHashes.add(hash);

      lineups.push({
        players: roster,
        totalSalary: roster.reduce((s:number,p:any) => s+(p.salary||0), 0),
        projFpts: parseFloat(roster.reduce((s:number,p:any) => s+(p.proj_fpts||0), 0).toFixed(1)),
        avgOwnership: parseFloat((roster.reduce((s:number,p:any) => s+(p.proj_ownership||0), 0)/roster.length).toFixed(1)),
      });
    }

    // Enforce minimum exposures — if a player hasn't hit their min, force them into more lineups
    if (Object.keys(minExposures).length > 0 && lineups.length > 0) {
      for (const [idStr, minPct] of Object.entries(minExposures)) {
        const pid = parseInt(idStr);
        const minCount = Math.ceil((minPct / 100) * lineups.length);
        const currentCount = lineups.filter(lu => lu.players.some((p:any) => (p.id ?? p.player_name) === pid || p.id === pid)).length;
        if (currentCount < minCount) {
          // Find lineups without this player and swap in worst-scoring player at same position
          const player = pool.find(p => p.id === pid);
          if (player) {
            let swapped = 0;
            for (const lu of lineups) {
              if (swapped >= minCount - currentCount) break;
              if (lu.players.some((p:any) => p.id === pid)) continue;
              // Find replaceable player at same position (lowest score, not locked)
              const pos = player.position;
              const samePos = lu.players.filter((p:any) => p.position === pos && !locked.includes(p.id));
              if (!samePos.length) continue;
              const worst = samePos.sort((a:any,b:any) => (a.proj_fpts||0)-(b.proj_fpts||0))[0];
              const newSal = lu.totalSalary - (worst.salary||0) + (player.salary||0);
              if (newSal > DK_CAP) continue;
              lu.players = lu.players.map((p:any) => p.id===worst.id ? player : p);
              lu.totalSalary = newSal;
              lu.projFpts = parseFloat(lu.players.reduce((s:number,p:any)=>s+(p.proj_fpts||0),0).toFixed(1));
              swapped++;
            }
          }
        }
      }
    }

    console.log('[Optimizer] Built', lineups.length, '/', numLineups, 'lineups');
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
