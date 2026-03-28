'use client';
// components/DFSOptimizer.tsx
import { useState, useMemo } from 'react';
import { useProjections, useDFSOptimizer } from '@/hooks/useData';
import { TeamLogo, PosBadge, LoadingSkeleton, EmptyState, fmt$ } from './ui/shared';

const ALL_POSITIONS = ['All', 'SP', 'C', '1B', '2B', '3B', 'SS', 'OF'];
type SortKey = 'proj_fpts' | 'salary' | 'player_name' | 'valueRating';

function valColor(v: number) {
  if (v >= 7) return '#22c55e';
  if (v >= 5) return '#f59e0b';
  return '#94a3b8';
}

export default function DFSOptimizer() {
  const { players, loading } = useProjections();
  const { optimize, SALARY_CAP, SALARY_MIN } = useDFSOptimizer(players);

  // Pool state
  const [pos, setPos]         = useState('All');
  const [search, setSearch]   = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('proj_fpts');
  const [sortAsc, setSortAsc] = useState(false);
  const [locked, setLocked]   = useState<Set<number>>(new Set());
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  // Settings state
  const [numLineups, setNum]  = useState(3);
  const [stackTeam, setStack] = useState('');
  const [mode, setMode]       = useState<'cash'|'gpp'>('cash');
  const [minUnique, setUniq]  = useState(2);
  const [randomness, setRand] = useState(0);

  // Output state
  const [lineups, setLineups] = useState<any[]>([]);
  const [activeIdx, setIdx]   = useState(0);
  const [generating, setGen]  = useState(false);
  const [warn, setWarn]       = useState('');

  const teams = useMemo(() =>
    Array.from(new Set(players.map((p: any) => p.team).filter(Boolean))).sort() as string[],
  [players]);

  const filtered = useMemo(() => {
    let list = [...players];
    if (pos !== 'All') list = list.filter((p: any) => p.position === pos);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p: any) =>
        p.player_name.toLowerCase().includes(q) || p.team?.toLowerCase().includes(q)
      );
    }
    list.sort((a: any, b: any) => {
      const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return list;
  }, [players, pos, search, sortKey, sortAsc]);

  const sort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(x => !x);
    else { setSortKey(k); setSortAsc(false); }
  };

  const toggleLock = (id: number) => {
    setLocked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleExclude = (id: number) => {
    setExcluded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const clearAll = () => { setLocked(new Set()); setExcluded(new Set()); };

  const generate = () => {
    setGen(true);
    setWarn('');
    setTimeout(() => {
      const result = optimize({
        locked: Array.from(locked),
        excluded: Array.from(excluded),
        numLineups,
        stackTeam: stackTeam || null,
        mode,
        randomness,
        minUnique,
      });
      setLineups(result);
      setIdx(0);
      setGen(false);
      if (result.length === 0) {
        setWarn('Could not build valid lineups. Make sure you have players at every position (SP, C, 1B, 2B, 3B, SS, OF) with salary > 0 uploaded.');
      } else if (result.length < numLineups) {
        setWarn(`Only generated ${result.length} of ${numLineups} lineups — not enough eligible players to fill all slots with salary between $${(SALARY_MIN/1000).toFixed(0)}k–$${(SALARY_CAP/1000).toFixed(0)}k.`);
      }
    }, 50);
  };

  const cur = lineups[activeIdx];
  const hasSalary = players.some((p: any) => (p.salary || 0) > 0);
  const posBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    players.forEach((p: any) => { counts[p.position] = (counts[p.position] || 0) + 1; });
    return counts;
  }, [players]);

  const SortTh = ({ label, k }: { label: string; k: SortKey }) => (
    <th onClick={() => sort(k)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      {label}{sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : ''}
    </th>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>

      {/* ── Player Pool ── */}
      <div className="card" style={{ padding: 16 }}>

        {/* Filter row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input-field" style={{ maxWidth: 200, padding: '5px 10px', fontSize: 12 }}
            placeholder="Search name or team..."
            value={search} onChange={e => setSearch(e.target.value)} />

          <select className="input-field" style={{ width: 80 }}
            value={pos} onChange={e => setPos(e.target.value)}>
            {ALL_POSITIONS.map(p => <option key={p}>{p}</option>)}
          </select>

          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
            {filtered.length} players
          </span>

          {(locked.size > 0 || excluded.size > 0) && (
            <>
              {locked.size > 0 && <span style={{ fontSize: 12, color: '#f59e0b' }}>{locked.size} locked</span>}
              {excluded.size > 0 && <span style={{ fontSize: 12, color: '#ef4444' }}>{excluded.size} excluded</span>}
              <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>
                Clear
              </button>
            </>
          )}
        </div>

        {/* Position coverage warning */}
        {!loading && players.length > 0 && !hasSalary && (
          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#fbbf24', marginBottom: 10 }}>
            No salary data found. Upload your DraftKings salary CSV alongside theBatX projections for the optimizer to work correctly.
          </div>
        )}

        {loading ? <LoadingSkeleton rows={10} cols={6} /> : players.length === 0 ? (
          <EmptyState message="Upload projections in Admin to populate the optimizer." />
        ) : (
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 28 }} title="Lock into lineup">L</th>
                  <SortTh label="Player" k="player_name" />
                  <th>Pos</th>
                  <SortTh label="Salary" k="salary" />
                  <SortTh label="Proj FP" k="proj_fpts" />
                  <SortTh label="Value" k="valueRating" />
                  <th style={{ width: 28 }} title="Exclude">X</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => {
                  const isL = locked.has(p.id);
                  const isX = excluded.has(p.id);
                  const val = p.valueRating || 0;
                  return (
                    <tr key={p.id} style={{
                      opacity: isX ? 0.2 : 1,
                      background: isL ? 'rgba(245,158,11,0.05)' : '',
                    }}>
                      <td>
                        <button onClick={() => toggleLock(p.id)} title={isL ? 'Unlock' : 'Lock into lineup'} style={{
                          width: 22, height: 22, borderRadius: 4, cursor: 'pointer',
                          border: `1px solid ${isL ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                          background: isL ? 'rgba(245,158,11,0.15)' : 'transparent',
                          color: isL ? '#f59e0b' : '#475569', fontSize: 10, fontWeight: 700,
                        }}>
                          {isL ? 'L' : '-'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <TeamLogo abbr={p.team || '?'} size={20} />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>{p.player_name}</div>
                            <div style={{ fontSize: 10, color: '#475569' }}>{p.team}</div>
                          </div>
                        </div>
                      </td>
                      <td><PosBadge pos={p.position || '?'} /></td>
                      <td style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, fontSize: 13 }}>
                        {p.salary > 0 ? fmt$(p.salary) : <span style={{ color: '#2a2a2a' }}>—</span>}
                      </td>
                      <td>
                        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: '#60a5fa', fontSize: 15 }}>
                          {(p.proj_fpts || 0).toFixed(1)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: valColor(val) }}>
                          {val > 0 ? val.toFixed(2) : <span style={{ color: '#2a2a2a' }}>—</span>}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => toggleExclude(p.id)} title={isX ? 'Include' : 'Exclude'} style={{
                          width: 22, height: 22, borderRadius: 4, cursor: 'pointer',
                          border: `1px solid ${isX ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.25)'}`,
                          background: isX ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.08)',
                          color: isX ? '#22c55e' : '#ef4444', fontSize: 10, fontWeight: 700,
                        }}>
                          {isX ? '+' : 'X'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Position coverage */}
        {players.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {['SP','C','1B','2B','3B','SS','OF'].map(p => (
              <div key={p} style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 11,
                fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
                background: (posBreakdown[p] || 0) > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: (posBreakdown[p] || 0) > 0 ? '#22c55e' : '#ef4444',
                border: `1px solid ${(posBreakdown[p] || 0) > 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}>
                {p}: {posBreakdown[p] || 0}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Settings + Output ── */}
      <div>
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div className="section-label">Optimizer Settings</div>

          {/* How it works */}
          <div style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#64748b', marginBottom: 14, lineHeight: 1.6 }}>
            Maximizes projected fantasy points while keeping salary between <span style={{ color: '#94a3b8' }}>${(SALARY_MIN/1000).toFixed(0)}k – ${(SALARY_CAP/1000).toFixed(0)}k</span>.
            Click column headers to sort. Lock players to force them in. X to exclude.
          </div>

          {/* Contest mode */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Contest type</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['cash', 'gpp'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${mode === m ? (m === 'cash' ? 'rgba(34,197,94,0.5)' : 'rgba(196,30,58,0.5)') : 'rgba(255,255,255,0.08)'}`,
                  background: mode === m ? (m === 'cash' ? 'rgba(34,197,94,0.08)' : 'rgba(196,30,58,0.08)') : 'transparent',
                  color: mode === m ? (m === 'cash' ? '#22c55e' : '#f06070') : '#64748b',
                  fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13,
                }}>
                  {m === 'cash' ? 'Cash / 50-50' : 'GPP / Tournament'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 5 }}>
              {mode === 'cash' ? 'Pure points — highest proj FP lineup every time' : 'Adds slight ownership variance to differentiate GPP entries'}
            </div>
          </div>

          {/* Lineups + Unique */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Lineups</div>
              <input className="input-field" type="number" min={1} max={150}
                value={numLineups}
                onChange={e => setNum(Math.min(150, Math.max(1, +e.target.value)))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Min unique</div>
              <input className="input-field" type="number" min={0} max={8}
                value={minUnique}
                onChange={e => setUniq(Math.min(8, Math.max(0, +e.target.value)))} />
            </div>
          </div>

          {/* Stack */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Team stack (optional)</div>
            <select className="input-field" value={stackTeam} onChange={e => setStack(e.target.value)}>
              <option value="">No stack</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Randomness — GPP only */}
          {mode === 'gpp' && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                Lineup variety: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{randomness}</span>
                <span style={{ color: '#475569' }}> (0=optimal, 10=max variety)</span>
              </div>
              <input type="range" min={0} max={10} step={1} value={randomness}
                onChange={e => setRand(+e.target.value)}
                style={{ width: '100%', accentColor: '#c41e3a' }} />
            </div>
          )}

          <button className="btn-primary" style={{ width: '100%', padding: 12, fontSize: 14, letterSpacing: '.02em' }}
            onClick={generate}
            disabled={players.length === 0 || generating}>
            {generating ? 'Building lineups...' : `Generate ${numLineups} lineup${numLineups !== 1 ? 's' : ''}`}
          </button>

          {players.length === 0 && (
            <div style={{ fontSize: 11, color: '#475569', marginTop: 8, textAlign: 'center' }}>
              Upload projections in Admin first
            </div>
          )}

          {warn && (
            <div style={{ marginTop: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#fbbf24', lineHeight: 1.5 }}>
              {warn}
            </div>
          )}
        </div>

        {/* Generated lineups */}
        {lineups.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="section-label" style={{ marginBottom: 0 }}>
                {lineups.length} lineup{lineups.length !== 1 ? 's' : ''} generated
              </div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {lineups.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)} style={{
                    width: 26, height: 26, borderRadius: 5, cursor: 'pointer',
                    border: `1px solid ${i === activeIdx ? '#c41e3a' : 'rgba(255,255,255,0.1)'}`,
                    background: i === activeIdx ? '#9b1c35' : 'transparent',
                    color: '#fff', fontSize: 11,
                    fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
                  }}>{i + 1}</button>
                ))}
              </div>
            </div>

            {cur && (
              <>
                {/* Stats bar */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 8, overflow: 'hidden' }}>
                  {[
                    { label: 'Proj FP', val: cur.projFpts?.toFixed(1), color: '#22c55e' },
                    { label: 'Salary', val: fmt$(cur.totalSalary), color: cur.totalSalary > 50000 ? '#ef4444' : '#e2e8f0' },
                    { label: 'Remaining', val: fmt$(50000 - cur.totalSalary), color: '#64748b' },
                    { label: 'Utilization', val: `${((cur.totalSalary / 50000) * 100).toFixed(1)}%`, color: cur.totalSalary >= 49000 ? '#22c55e' : '#f59e0b' },
                  ].map((m, i) => (
                    <div key={m.label} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div style={{ fontSize: 10, color: '#475569', fontFamily: "'Barlow Condensed',sans-serif", textTransform: 'uppercase', letterSpacing: '.08em' }}>{m.label}</div>
                      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 700, color: m.color, marginTop: 2 }}>{m.val}</div>
                    </div>
                  ))}
                </div>

                {/* Players */}
                {cur.players
                  .sort((a: any, b: any) => {
                    const order: Record<string, number> = { SP: 0, C: 2, '1B': 3, '2B': 4, '3B': 5, SS: 6, OF: 7 };
                    return (order[a.position] ?? 9) - (order[b.position] ?? 9);
                  })
                  .map((p: any) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ width: 30, flexShrink: 0 }}>
                        <PosBadge pos={p.position || '?'} />
                      </div>
                      <TeamLogo abbr={p.team || '?'} size={20} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.player_name}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", color: '#60a5fa', fontWeight: 700, fontSize: 15 }}>
                          {(p.proj_fpts || 0).toFixed(1)}
                        </div>
                        <div style={{ fontSize: 10, color: '#475569' }}>
                          {p.salary > 0 ? fmt$(p.salary) : '—'}
                        </div>
                      </div>
                    </div>
                  ))}

                {/* Lineup total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 13, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700 }}>
                  <span style={{ color: '#475569' }}>TOTAL</span>
                  <span style={{ color: '#22c55e', fontSize: 16 }}>{cur.projFpts?.toFixed(1)} FP</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
