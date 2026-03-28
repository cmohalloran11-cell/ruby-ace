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
    locked = [] as number[],
    excluded = [] as number[],
    numLineups = 1,
    stackTeam = null as string | null,
    stackSize = 3,
    mode = 'cash' as 'cash' | 'gpp',
    randomness = 0,
    minUnique = 2,
  }) => {
    // Only include players with proj points > 0
    const pool = players.filter(p =>
      !excluded.includes(p.id) &&
      (p.proj_fpts || 0) > 0
    );

    const lineups: any[] = [];
    let seed = 1;

    while (lineups.length < numLineups && seed < numLineups * 20) {
      seed++;
      const lu = buildLineup(pool, locked, SALARY_CAP, SALARY_MIN, seed, stackTeam, stackSize, mode, randomness);
      if (!lu) continue;

      // Enforce min unique players vs previous lineup
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

  return { optimize, SALARY_CAP, SALARY_MIN };
}

// DK MLB classic: 2 SP, 1 C, 1 1B, 1 2B, 1 3B, 1 SS, 3 OF = 10 players
const DK_SLOTS = [
  { positions: ['SP'], need: 2 },
  { positions: ['C', 'C/1B'], need: 1 },
  { positions: ['1B', 'C/1B'], need: 1 },
  { positions: ['2B'], need: 1 },
  { positions: ['3B'], need: 1 },
  { positions: ['SS'], need: 1 },
  { positions: ['OF'], need: 3 },
];

function seededRng(seed: number) {
  let s = seed * 1664525 + 1013904223;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function buildLineup(
  pool: any[],
  locked: number[],
  cap: number,
  minSal: number,
  seed: number,
  stackTeam: string | null,
  stackSize: number,
  mode: string,
  randomness: number,
): any | null {
  const rand = seededRng(seed);

  // Score each player — pure points maximization with optional noise
  const scored = pool.map(p => {
    let score = p.proj_fpts || 0;

    // Stack bonus — strongly prefer stack team batters (not pitchers)
    if (stackTeam && p.team === stackTeam && p.position !== 'SP') {
      score *= 1.4; // strong boost to ensure stacking
    }

    // GPP mode: slight ownership penalty to diversify
    if (mode === 'gpp' && p.proj_ownership > 0) {
      score *= (1 - (p.proj_ownership / 100) * 0.15);
    }

    // Randomness: small noise to create lineup variety
    if (randomness > 0) {
      const noise = (rand() - 0.5) * (randomness / 10) * score * 0.3;
      score += noise;
    }

    return { ...p, _score: score };
  }).sort((a, b) => b._score - a._score);

  const isLocked = (id: number) => locked.includes(id);
  const roster: any[] = scored.filter(p => isLocked(p.id));
  let salUsed = roster.reduce((s: number, p: any) => s + (p.salary || 0), 0);

  // Helper: fill a position slot with best available player
  const fill = (positions: string[], count: number) => {
    const have = roster.filter(p => positions.includes(p.position)).length;
    let need = count - have;
    for (const p of scored) {
      if (need <= 0) break;
      if (!positions.includes(p.position)) continue;
      if (roster.some(r => r.id === p.id)) continue;

      const slotsLeft = 10 - roster.length;
      // Must leave enough salary for remaining slots (min $3000 each)
      const salNeededAfter = (slotsLeft - 1) * 3000;
      const pSal = p.salary || 0;

      if (salUsed + pSal > cap - salNeededAfter) continue;
      // Don\'t go so cheap we can\'t reach minSal
      // (heuristic: don\'t leave too much on the table early)

      roster.push(p);
      salUsed += pSal;
      need--;
    }
  };

  // Fill in DK slot order
  for (const slot of DK_SLOTS) {
    fill(slot.positions, slot.need);
  }

  if (roster.length < 10) return null;

  const final = roster.slice(0, 10);
  const totalSalary = final.reduce((s: number, p: any) => s + (p.salary || 0), 0);

  // Reject if under salary minimum or over cap
  if (totalSalary < minSal || totalSalary > cap) return null;

  return {
    players: final,
    totalSalary,
    projFpts: parseFloat(final.reduce((s: number, p: any) => s + (p.proj_fpts || 0), 0).toFixed(1)),
  };
}


