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

  const optimize = useCallback(({
    locked = [] as number[],
    excluded = [] as number[],
    numLineups = 1,
    stackTeam = null as string | null,
    mode = 'cash' as 'cash' | 'gpp',
    maxOwnership = 0,
    minUnique = 2,
    randomness = 0,
  }) => {
    const eligible = players.filter(p =>
      !excluded.includes(p.id) &&
      (p.proj_fpts || 0) > 0 &&
      (maxOwnership === 0 || (p.proj_ownership || 0) <= maxOwnership || locked.includes(p.id))
    );

    const lineups: any[] = [];
    let attempts = 0;

    while (lineups.length < numLineups && attempts < numLineups * 10) {
      attempts++;
      const lu = buildLineup(eligible, locked, SALARY_CAP, attempts, stackTeam, mode, randomness);
      if (!lu) continue;

      // Enforce minimum unique players between consecutive lineups
      if (minUnique > 0 && lineups.length > 0) {
        const prev = lineups[lineups.length - 1];
        const prevIds = new Set(prev.players.map((p: any) => p.id));
        const unique = lu.players.filter((p: any) => !prevIds.has(p.id)).length;
        if (unique < minUnique) continue;
      }

      lineups.push(lu);
    }

    return lineups;
  }, [players]);

  return { optimize, SALARY_CAP };
}

function seededRng(seed: number) {
  let s = (seed + 1) * 1664525 + 1013904223;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return Math.abs(s) / 2147483648;
  };
}

function scorePlayer(p: any, mode: 'cash' | 'gpp', stackTeam: string | null, rand: () => number, randomness: number): number {
  const proj = p.proj_fpts || 0;
  const salary = p.salary || 1;
  const own = p.proj_ownership || 0;

  // Base value: projected points per $1000 salary
  let score = (proj / salary) * 1000;

  if (mode === 'gpp') {
    // GPP: reward high proj + low ownership (leverage)
    // Ownership penalty — lower owned players get a boost
    const ownPenalty = own > 0 ? (own / 100) * 0.4 : 0;
    score = score * (1 - ownPenalty) + proj * 0.15;
  } else {
    // Cash: pure floor — maximize projected points relative to salary
    // Slightly penalize very high ownership (avoid contrarian risk in cash)
    score = proj * 0.6 + score * 0.4;
  }

  // Stack team bonus
  if (stackTeam && p.team === stackTeam && p.position !== 'SP') {
    score *= 1.25;
  }

  // Randomness (0 = deterministic, 10 = very random)
  if (randomness > 0) {
    const noise = (rand() - 0.5) * (randomness / 10) * score * 0.5;
    score += noise;
  }

  return score;
}

function buildLineup(
  players: any[],
  locked: number[],
  cap: number,
  seed: number,
  stackTeam: string | null,
  mode: 'cash' | 'gpp',
  randomness: number,
) {
  const rand = seededRng(seed);
  const roster: any[] = [...players.filter(p => locked.includes(p.id))];
  let salaryUsed = roster.reduce((s: number, p: any) => s + (p.salary || 0), 0);

  // Score and sort all available players
  const available = [...players]
    .filter(p => !locked.includes(p.id))
    .map(p => ({ ...p, _score: scorePlayer(p, mode, stackTeam, rand, randomness) }))
    .sort((a, b) => b._score - a._score);

  const POSITIONS = [
    { slots: ['SP'], count: 2 },
    { slots: ['C'], count: 1 },
    { slots: ['1B'], count: 1 },
    { slots: ['2B'], count: 1 },
    { slots: ['3B'], count: 1 },
    { slots: ['SS'], count: 1 },
    { slots: ['OF'], count: 3 },
  ];

  const fill = (positions: string[], count: number) => {
    const current = roster.filter(p => positions.includes(p.position)).length;
    let needed = count - current;

    for (const p of available) {
      if (needed <= 0) break;
      if (!positions.includes(p.position)) continue;
      if (roster.some(r => r.id === p.id)) continue;

      const slotsRemaining = 10 - roster.length;
      // Ensure we leave enough salary room for remaining slots (min $3000/player)
      const minSalaryNeeded = (slotsRemaining - 1) * 3000;
      // Ensure we don't overspend
      if (salaryUsed + (p.salary || 0) > cap - minSalaryNeeded) continue;

      roster.push(p);
      salaryUsed += (p.salary || 0);
      needed--;
    }
  };

  for (const pos of POSITIONS) {
    fill(pos.slots, pos.count);
  }

  if (roster.length < 10) return null;

  const final = roster.slice(0, 10);
  const totalSalary = final.reduce((s: number, p: any) => s + (p.salary || 0), 0);

  // Reject lineups that are too far under the cap (poor salary utilization)
  if (totalSalary < cap * 0.92) return null;

  return {
    players: final,
    totalSalary,
    projFpts: parseFloat(final.reduce((s: number, p: any) => s + (p.proj_fpts || 0), 0).toFixed(1)),
    avgOwnership: parseFloat((final.reduce((s: number, p: any) => s + (p.proj_ownership || 0), 0) / final.length).toFixed(1)),
  };
}
