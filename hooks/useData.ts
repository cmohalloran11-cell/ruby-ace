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
  }) => {
    const eligible = players.filter(p => !excluded.includes(p.id));
    const lineups = [];
    for (let i = 0; i < numLineups; i++) {
      const lu = buildLineup(eligible, locked, SALARY_CAP, i, stackTeam);
      if (lu) lineups.push(lu);
    }
    return lineups;
  }, [players]);

  return { optimize, SALARY_CAP };
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return Math.abs(s) / 2147483648;
  };
}

function buildLineup(players: any[], locked: number[], cap: number, seed: number, stackTeam: string | null) {
  const rand = rng(seed + 1);
  const roster: any[] = [...players.filter(p => locked.includes(p.id))];
  let salaryLeft = cap - roster.reduce((s: number, p: any) => s + (p.salary || 0), 0);

  const sorted = [...players]
    .filter(p => !locked.includes(p.id))
    .sort((a, b) => {
      const va = (a.proj_fpts / (a.salary || 1)) + rand() * 0.6;
      const vb = (b.proj_fpts / (b.salary || 1)) + rand() * 0.6;
      return vb - va;
    });

  // Stack bonus: bump stack team players up
  if (stackTeam) {
    sorted.forEach(p => {
      if (p.team === stackTeam) p._stackBonus = 1.2;
    });
    sorted.sort((a, b) => {
      const va = (a.proj_fpts / (a.salary || 1)) * (a._stackBonus || 1);
      const vb = (b.proj_fpts / (b.salary || 1)) * (b._stackBonus || 1);
      return vb - va;
    });
  }

  const fill = (positions: string[], count: number) => {
    const current = roster.filter(p => positions.includes(p.position)).length;
    let needed = count - current;
    for (const p of sorted) {
      if (needed <= 0) break;
      if (!positions.includes(p.position)) continue;
      if (roster.some(r => r.id === p.id)) continue;
      const minRemaining = (10 - roster.length - 1) * 3000;
      if ((p.salary || 0) > salaryLeft - minRemaining) continue;
      roster.push(p);
      salaryLeft -= (p.salary || 0);
      needed--;
    }
  };

  fill(['SP'], 2);
  fill(['C'], 1);
  fill(['1B'], 1);
  fill(['2B'], 1);
  fill(['3B'], 1);
  fill(['SS'], 1);
  fill(['OF'], 3);

  if (roster.length < 10) return null;
  const final = roster.slice(0, 10);
  return {
    players: final,
    totalSalary: final.reduce((s: number, p: any) => s + (p.salary || 0), 0),
    projFpts: parseFloat(final.reduce((s: number, p: any) => s + (p.proj_fpts || 0), 0).toFixed(1)),
  };
}
