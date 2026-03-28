'use client';
// components/DFSOptimizer.tsx
import { useState, useMemo } from 'react';
import { useProjections, useDFSOptimizer } from '@/hooks/useData';
import { TeamLogo, PosBadge, LoadingSkeleton, EmptyState, fmt$ } from './ui/shared';

const POSITIONS = ['All', 'SP', 'C', '1B', '2B', '3B', 'SS', 'OF'];

type SortKey = 'proj_fpts' | 'proj_ownership' | 'salary' | 'valueRating' | 'player_name';

function ownColor(own: number) {
  if (own >= 35) return '#ef4444';
  if (own >= 20) return '#f97316';
  if (own >= 10) return '#f59e0b';
  return '#22c55e';
}

function valColor(val: number) {
  if (val >= 7) return '#22c55e';
  if (val >= 5) return '#f59e0b';
  return '#94a3b8';
}

export default function DFSOptimizer() {
  const { players, loading } = useProjections();
  const { optimize, SALARY_CAP } = useDFSOptimizer(players);

  // Pool filters
  const [posFilter, setPosFilter]   = useState('All');
  const [search, setSearch]         = useState('');
  const [sortKey, setSortKey]       = useState<SortKey>('proj_fpts');
  const [sortAsc, setSortAsc]       = useState(false);
  const [salMin, setSalMin]         = useState(0);
  const [salMax, setSalMax]         = useState(100000);
  const [ownMax, setOwnMax]         = useState(100);

  // Player actions
  const [locked, setLocked]         = useState<Set<number>>(new Set());
  const [excluded, setExcluded]     = useState<Set<number>>(new Set());

  // Optimizer settings
  const [numLineups, setNumLineups] = useState(3);
  const [stackTeam, setStackTeam]   = useState('');
  const [mode, setMode]             = useState<'cash'|'gpp'>('cash');
  const [maxOwnership, setMaxOwnership] = useState(0);
  const [minUnique, setMinUnique]   = useState(2);
  const [randomness, setRandomness] = useState(0);

  // Output
  const [lineups, setLineups]       = useState<any[]>([]);
  const [activeIdx, setActiveIdx]   = useState(0);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const filteredPlayers = useMemo(() => {
    let list = players.filter((p: any) => {
      if (posFilter !== 'All' && p.position !== posFilter) return false;
      if (search && !p.player_name.toLowerCase().includes(search.toLowerCase()) && !p.team?.toLowerCase().includes(search.toLowerCase())) return false;
      if (p.salary > 0 && (p.salary < salMin || p.salary > salMax)) return false;
      if (ownMax < 100 && (p.proj_ownership || 0) > ownMax) return false;
      return true;
    });
    list = [...list].sort((a: any, b: any) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return list;
  }, [players, posFilter, search, salMin, salMax, ownMax, sortKey, sortAsc]);

  const teams = useMemo(() =>
    Array.from(new Set(players.map((p: any) => p.team).filter(Boolean))).sort() as string[],
    [players]
  );

  const generate = () => {
    const result = optimize({
      locked: Array.from(locked),
      excluded: Array.from(excluded),
      numLineups,
      stackTeam: stackTeam || null,
      mode,
      maxOwnership,
      minUnique,
      randomness,
    });
    setLineups(result);
    setActiveIdx(0);
  };

  const toggleLock = (id: number) => {
    const s = new Set(locked);
    s.has(id) ? s.delete(id) : s.add(id);
    setLocked(s);
  };

  const toggleExclude = (id: number) => {
    const s = new Set(excluded);
    s.has(id) ? s.delete(id) : s.add(id);
    setExcluded(s);
  };

  const cur = lineups[activeIdx];

  const SortTh = ({ label, k }: { label: string; k: SortKey }) => (
    <th onClick={() => handleSort(k)} style={{ cursor:'pointer', userSelect:'none', whiteSpace:'nowrap' }}>
      {label} {sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : ''}
    </th>
  );

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:16, alignItems:'start' }}>

      {/* ── Left: Player Pool ── */}
      <div className="card" style={{ padding:16 }}>

        {/* Filter bar */}
        <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
          <input className="input-field"
            style={{ maxWidth:180, padding:'5px 10px', fontSize:12 }}
            placeholder="Search player or team..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="input-field" style={{ width:80 }}
            value={posFilter} onChange={e => setPosFilter(e.target.value)}>
            {POSITIONS.map(p => <option key={p}>{p}</option>)}
          </select>
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12 }}>
            <span style={{ color:'#64748b' }}>Sal</span>
            <input className="input-field" type="number" style={{ width:72, padding:'4px 6px', fontSize:11 }}
              placeholder="Min" value={salMin || ''} onChange={e => setSalMin(+e.target.value || 0)} />
            <span style={{ color:'#475569' }}>-</span>
            <input className="input-field" type="number" style={{ width:80, padding:'4px 6px', fontSize:11 }}
              placeholder="Max" value={salMax >= 100000 ? '' : salMax} onChange={e => setSalMax(+e.target.value || 100000)} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12 }}>
            <span style={{ color:'#64748b' }}>Own max</span>
            <input className="input-field" type="number" style={{ width:60, padding:'4px 6px', fontSize:11 }}
              placeholder="100" min={0} max={100} value={ownMax >= 100 ? '' : ownMax}
              onChange={e => setOwnMax(+e.target.value || 100)} />
            <span style={{ color:'#475569' }}>%</span>
          </div>
          <span style={{ fontSize:12, color:'#64748b', marginLeft:'auto' }}>
            {filteredPlayers.length} / {players.length} players
          </span>
        </div>

        {/* Legend */}
        <div style={{ display:'flex', gap:14, marginBottom:10, fontSize:11, color:'#475569' }}>
          <span>Lock = force into lineup</span>
          <span style={{ color:'#ef4444' }}>X = exclude</span>
          {locked.size > 0 && <span style={{ color:'#f59e0b' }}>{locked.size} locked</span>}
          {excluded.size > 0 && <span style={{ color:'#ef4444' }}>{excluded.size} excluded</span>}
          {(locked.size > 0 || excluded.size > 0) && (
            <button onClick={() => { setLocked(new Set()); setExcluded(new Set()); }}
              style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:11, textDecoration:'underline' }}>
              Clear all
            </button>
          )}
        </div>

        {loading ? <LoadingSkeleton rows={10} cols={7} /> : players.length === 0 ? (
          <EmptyState message="Upload projections in Admin to populate the optimizer." />
        ) : (
          <div style={{ maxHeight:520, overflowY:'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width:28 }}></th>
                  <SortTh label="Player" k="player_name" />
                  <th>Pos</th>
                  <SortTh label="Salary" k="salary" />
                  <SortTh label="Proj FP" k="proj_fpts" />
                  <SortTh label="Own%" k="proj_ownership" />
                  <SortTh label="Value" k="valueRating" />
                  <th style={{ width:30 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((p: any) => {
                  const isLocked = locked.has(p.id);
                  const isExcluded = excluded.has(p.id);
                  const val = p.valueRating || 0;
                  const own = p.proj_ownership || 0;
                  return (
                    <tr key={p.id} style={{ opacity: isExcluded ? 0.25 : 1, background: isLocked ? 'rgba(251,191,36,0.04)' : '' }}>
                      <td>
                        <button onClick={() => toggleLock(p.id)} title="Lock player" style={{
                          width:22, height:22, borderRadius:4,
                          border:`1px solid ${isLocked ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                          background: isLocked ? 'rgba(251,191,36,0.15)' : 'transparent',
                          cursor:'pointer', fontSize:10, fontWeight:700,
                          color: isLocked ? '#f59e0b' : '#475569',
                        }}>
                          {isLocked ? 'L' : '-'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <TeamLogo abbr={p.team || '?'} size={20} />
                          <div>
                            <div style={{ fontSize:12, fontWeight:500 }}>{p.player_name}</div>
                            <div style={{ fontSize:10, color:'#475569' }}>{p.team}</div>
                          </div>
                        </div>
                      </td>
                      <td><PosBadge pos={p.position || '?'} /></td>
                      <td style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:12 }}>
                        {p.salary > 0 ? fmt$(p.salary) : <span style={{ color:'#334155' }}>—</span>}
                      </td>
                      <td>
                        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, color:'#60a5fa', fontSize:14 }}>
                          {p.proj_fpts?.toFixed(1) || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:12, color: ownColor(own) }}>
                          {own > 0 ? `${own.toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color: valColor(val) }}>
                          {val > 0 ? val.toFixed(2) : '—'}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => toggleExclude(p.id)} title="Exclude player" style={{
                          background: isExcluded ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
                          border: `1px solid ${isExcluded ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.25)'}`,
                          color: isExcluded ? '#22c55e' : '#ef4444',
                          width:24, height:24, borderRadius:4,
                          cursor:'pointer', fontSize:11, fontWeight:700,
                        }}>
                          {isExcluded ? '+' : 'X'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Right: Settings + Output ── */}
      <div>
        <div className="card" style={{ padding:16, marginBottom:12 }}>
          <div className="section-label">Optimizer Settings</div>

          {/* Contest mode */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, color:'#94a3b8', marginBottom:6 }}>Contest type</div>
            <div style={{ display:'flex', gap:6 }}>
              {(['cash', 'gpp'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex:1, padding:'8px 0', borderRadius:6, cursor:'pointer',
                  border:`1px solid ${mode===m ? (m==='cash' ? 'rgba(34,197,94,0.5)' : 'rgba(196,30,58,0.5)') : 'rgba(255,255,255,0.08)'}`,
                  background: mode===m ? (m==='cash' ? 'rgba(34,197,94,0.08)' : 'rgba(196,30,58,0.08)') : 'transparent',
                  color: mode===m ? (m==='cash' ? '#22c55e' : '#f06070') : '#64748b',
                  fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:13, letterSpacing:'.04em',
                }}>
                  {m === 'cash' ? 'Cash / 50-50' : 'GPP / Tournament'}
                </button>
              ))}
            </div>
            <div style={{ fontSize:11, color:'#475569', marginTop:6, lineHeight:1.5 }}>
              {mode === 'cash'
                ? 'Maximizes floor — picks highest projected FP per dollar, minimizes variance'
                : 'Maximizes ceiling — rewards low-ownership leverage plays for tournament upside'}
            </div>
          </div>

          {/* Lineups + Unique */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
            <div>
              <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>Lineups (1-150)</div>
              <input className="input-field" type="number" min={1} max={150}
                value={numLineups}
                onChange={e => setNumLineups(Math.min(150, Math.max(1, +e.target.value)))} />
            </div>
            <div>
              <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>Min unique players</div>
              <input className="input-field" type="number" min={0} max={8}
                value={minUnique}
                onChange={e => setMinUnique(Math.min(8, Math.max(0, +e.target.value)))} />
            </div>
          </div>

          {/* Stack */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>Team stack</div>
            <select className="input-field" value={stackTeam} onChange={e => setStackTeam(e.target.value)}>
              <option value="">No stack</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* GPP-only settings */}
          {mode === 'gpp' && (
            <>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>
                  Max ownership % <span style={{ color:'#475569' }}>(0 = no limit)</span>
                </div>
                <input className="input-field" type="number" min={0} max={100}
                  value={maxOwnership}
                  onChange={e => setMaxOwnership(Math.min(100, Math.max(0, +e.target.value)))} />
              </div>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>
                  Randomness: <span style={{ color:'#e2e8f0', fontWeight:600 }}>{randomness}</span>
                  <span style={{ color:'#475569' }}> (0=optimal, 10=varied)</span>
                </div>
                <input type="range" min={0} max={10} step={1} value={randomness}
                  onChange={e => setRandomness(+e.target.value)}
                  style={{ width:'100%', accentColor:'#c41e3a' }} />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#334155' }}>
                  <span>Optimal</span><span>Balanced</span><span>Varied</span>
                </div>
              </div>
            </>
          )}

          {/* Status */}
          {(locked.size > 0 || excluded.size > 0) && (
            <div style={{ marginBottom:10, fontSize:12 }}>
              {locked.size > 0 && <span style={{ color:'#f59e0b', marginRight:8 }}>{locked.size} locked</span>}
              {excluded.size > 0 && <span style={{ color:'#ef4444' }}>{excluded.size} excluded</span>}
            </div>
          )}

          <button className="btn-primary" style={{ width:'100%', padding:10, fontSize:14 }}
            onClick={generate} disabled={players.length === 0}>
            Generate {numLineups} lineup{numLineups !== 1 ? 's' : ''}
          </button>

          {players.length === 0 && (
            <div style={{ fontSize:11, color:'#475569', marginTop:8, textAlign:'center' }}>
              Upload projections in Admin first
            </div>
          )}
        </div>

        {/* Generated lineups */}
        {lineups.length > 0 && (
          <div className="card" style={{ padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div className="section-label" style={{ marginBottom:0 }}>
                {lineups.length} lineup{lineups.length !== 1 ? 's' : ''} generated
              </div>
              <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                {lineups.map((_, i) => (
                  <button key={i} onClick={() => setActiveIdx(i)} style={{
                    width:26, height:26, borderRadius:5,
                    border:`1px solid ${i === activeIdx ? '#c41e3a' : 'rgba(255,255,255,0.1)'}`,
                    background: i === activeIdx ? '#9b1c35' : 'transparent',
                    color:'#fff', cursor:'pointer', fontSize:11,
                    fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                  }}>{i + 1}</button>
                ))}
              </div>
            </div>

            {cur && (
              <>
                {/* Lineup stats */}
                <div style={{ display:'flex', gap:12, marginBottom:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.07)', flexWrap:'wrap' }}>
                  {[
                    { label:'Proj FP', val: cur.projFpts?.toFixed(1), color:'#22c55e' },
                    { label:'Salary', val: fmt$(cur.totalSalary), color: cur.totalSalary > SALARY_CAP ? '#ef4444' : '#e2e8f0' },
                    { label:'Remaining', val: fmt$(SALARY_CAP - cur.totalSalary), color:'#64748b' },
                    { label:'Avg own%', val: cur.avgOwnership ? `${cur.avgOwnership}%` : '—', color: mode==='gpp' ? ownColor(cur.avgOwnership||0) : '#94a3b8' },
                  ].map(m => (
                    <div key={m.label} style={{ textAlign:'center', flex:1 }}>
                      <div style={{ fontSize:10, color:'#475569', fontFamily:"'Barlow Condensed',sans-serif", textTransform:'uppercase', letterSpacing:'.08em' }}>{m.label}</div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:700, color:m.color }}>{m.val}</div>
                    </div>
                  ))}
                </div>

                {/* Players */}
                {cur.players.map((p: any) => (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <PosBadge pos={p.position || '?'} />
                    <TeamLogo abbr={p.team || '?'} size={18} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:500 }}>{p.player_name}</div>
                      {p.proj_ownership > 0 && (
                        <div style={{ fontSize:10, color: ownColor(p.proj_ownership) }}>{p.proj_ownership.toFixed(1)}% own</div>
                      )}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", color:'#60a5fa', fontWeight:700, fontSize:14 }}>{p.proj_fpts?.toFixed(1)}</div>
                      <div style={{ fontSize:10, color:'#475569' }}>{p.salary > 0 ? fmt$(p.salary) : '—'}</div>
                    </div>
                  </div>
                ))}

                {/* Lineup value summary */}
                <div style={{ marginTop:10, padding:'8px 10px', background:'rgba(255,255,255,0.03)', borderRadius:6, fontSize:11, color:'#64748b' }}>
                  {mode === 'gpp' && cur.avgOwnership > 0 && (
                    <span>Avg ownership: <span style={{ color: ownColor(cur.avgOwnership), fontWeight:600 }}>{cur.avgOwnership?.toFixed(1)}%</span> — </span>
                  )}
                  Salary used: <span style={{ color:'#94a3b8', fontWeight:600 }}>{((cur.totalSalary / SALARY_CAP) * 100).toFixed(1)}%</span> of cap
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
