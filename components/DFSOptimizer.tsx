'use client';
// components/DFSOptimizer.tsx
import { useState, useMemo } from 'react';
import { useProjections } from '@/hooks/useData';
import { useDFSOptimizer } from '@/hooks/useData';
import { TeamLogo, PosBadge, LoadingSkeleton, EmptyState, fmt$ } from './ui/shared';

export default function DFSOptimizer() {
  const { players, loading } = useProjections();
  const { optimize, SALARY_CAP } = useDFSOptimizer(players);
  const [locked, setLocked] = useState<Set<number>>(new Set());
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [numLineups, setNumLineups] = useState(3);
  const [stackTeam, setStackTeam] = useState<string>('');
  const [lineups, setLineups] = useState<any[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [posFilter, setPosFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredPlayers = useMemo(() => {
    return players.filter((p: any) => {
      if (excluded.has(p.id)) return true; // still show excluded (grayed)
      if (posFilter === 'hitters' && p.position === 'SP') return false;
      if (posFilter === 'pitchers' && p.position !== 'SP') return false;
      if (search && !p.player_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [players, posFilter, search, excluded]);

  const teams = useMemo(() => Array.from(new Set(players.map((p:any) => p.team).filter(Boolean))).sort(), [players]);

  const generate = () => {
    const result = optimize({
      locked: Array.from(locked),
      excluded: Array.from(excluded),
      numLineups,
      stackTeam: stackTeam || null,
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

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:16 }}>
      {/* Left: Player Pool */}
      <div>
        <div className="card" style={{ padding:16 }}>
          <div className="section-label">Player Pool</div>
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
            {['all','hitters','pitchers'].map(f => (
              <button key={f} className="btn-outline"
                style={posFilter===f?{borderColor:'#3b82f6',color:'#93c5fd'}:{}}
                onClick={() => setPosFilter(f)}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
            <input
              className="input-field"
              style={{ maxWidth:160, padding:'5px 10px', fontSize:12 }}
              placeholder="Search player..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? <LoadingSkeleton rows={10} cols={7} /> : (
            players.length === 0
              ? <EmptyState message="Upload projections in Admin → Projections to populate the optimizer." />
              : (
                <div style={{ maxHeight:420, overflowY:'auto' }}>
                  <table className="data-table">
                    <thead><tr>
                      <th></th><th>Player</th><th>Pos</th><th>Salary</th>
                      <th>Proj</th><th>Own%</th><th>Val</th><th></th>
                    </tr></thead>
                    <tbody>
                      {filteredPlayers.map((p: any) => (
                        <tr key={p.id} style={{ opacity: excluded.has(p.id) ? 0.3 : 1 }}>
                          <td>
                            <button
                              onClick={() => toggleLock(p.id)}
                              style={{
                                width:22, height:22, borderRadius:4,
                                border:`1px solid ${locked.has(p.id)?'#f59e0b':'rgba(255,255,255,0.15)'}`,
                                background: locked.has(p.id)?'rgba(251,191,36,0.2)':'transparent',
                                cursor:'pointer', fontSize:11,
                                color: locked.has(p.id)?'#f59e0b':'#64748b',
                              }}>
                              {locked.has(p.id) ? '🔒' : '·'}
                            </button>
                          </td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <TeamLogo abbr={p.team||'?'} size={20} />
                              <span style={{ fontSize:12 }}>{p.player_name}</span>
                            </div>
                          </td>
                          <td><PosBadge pos={p.position||'?'} /></td>
                          <td style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:12 }}>
                            {p.salary > 0 ? fmt$(p.salary) : '—'}
                          </td>
                          <td><span className="neon-blue" style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600 }}>{p.proj_fpts}</span></td>
                          <td style={{ color: p.proj_ownership>25?'#ef4444':p.proj_ownership>15?'#f59e0b':'#22c55e', fontSize:12 }}>
                            {p.proj_ownership > 0 ? `${p.proj_ownership}%` : '—'}
                          </td>
                          <td style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:(p.valueRating||0)>6?'#22c55e':'#94a3b8' }}>
                            {p.valueRating ? p.valueRating.toFixed(2) : '—'}
                          </td>
                          <td>
                            <button
                              onClick={() => toggleExclude(p.id)}
                              style={{
                                background: excluded.has(p.id)?'rgba(34,197,94,0.2)':'rgba(220,38,38,0.6)',
                                border:'none', color:'#fff', padding:'2px 8px',
                                borderRadius:4, cursor:'pointer', fontSize:10,
                              }}>
                              {excluded.has(p.id) ? '✓' : '✕'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
          )}
        </div>
      </div>

      {/* Right: Settings + Generated Lineups */}
      <div>
        <div className="card" style={{ padding:16, marginBottom:12 }}>
          <div className="section-label">Optimizer Settings</div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:'#94a3b8', display:'block', marginBottom:4 }}>
              Number of Lineups (1–20)
            </label>
            <input
              className="input-field"
              type="number" min={1} max={20}
              value={numLineups}
              onChange={e => setNumLineups(Math.min(20, Math.max(1, +e.target.value)))}
              style={{ width:80 }}
            />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, color:'#94a3b8', display:'block', marginBottom:4 }}>
              Team Stack
            </label>
            <select className="input-field" value={stackTeam} onChange={e => setStackTeam(e.target.value)}>
              <option value="">No Stack</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:12, fontSize:12, color:'#64748b' }}>
            {locked.size > 0 && <span style={{ color:'#f59e0b' }}>🔒 {locked.size} locked · </span>}
            {excluded.size > 0 && <span style={{ color:'#ef4444' }}>✕ {excluded.size} excluded</span>}
          </div>
          <button className="btn-primary" style={{ width:'100%' }} onClick={generate}
            disabled={players.length === 0}>
            ⚡ Generate {numLineups} Lineup{numLineups > 1 ? 's' : ''}
          </button>
          {players.length === 0 && (
            <div style={{ fontSize:11, color:'#475569', marginTop:8, textAlign:'center' }}>
              Upload projections first in Admin panel
            </div>
          )}
        </div>

        {lineups.length > 0 && (
          <div className="card" style={{ padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div className="section-label" style={{ marginBottom:0 }}>Generated Lineups</div>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {lineups.map((_,i) => (
                  <button key={i} onClick={() => setActiveIdx(i)} style={{
                    width:28, height:28, borderRadius:5, border:'1px solid',
                    borderColor: i===activeIdx?'#3b82f6':'rgba(255,255,255,0.12)',
                    background: i===activeIdx?'#1d4ed8':'transparent',
                    color:'#fff', cursor:'pointer', fontSize:12,
                    fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600,
                  }}>{i+1}</button>
                ))}
              </div>
            </div>

            {cur && (
              <>
                <div style={{ display:'flex', gap:16, marginBottom:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                  {[
                    { label:'Proj FP', val: cur.projFpts.toFixed(1), color:'#22c55e' },
                    { label:'Salary',  val: fmt$(cur.totalSalary), color: cur.totalSalary > SALARY_CAP ? '#ef4444' : '#e2e8f0' },
                    { label:'Rem',     val: fmt$(SALARY_CAP - cur.totalSalary), color:'#94a3b8' },
                  ].map(m => (
                    <div key={m.label} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:10, color:'#64748b', fontFamily:"'Barlow Condensed',sans-serif", textTransform:'uppercase', letterSpacing:'.08em' }}>{m.label}</div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700, color:m.color }}>{m.val}</div>
                    </div>
                  ))}
                </div>
                {cur.players.map((p:any) => (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <PosBadge pos={p.position||'?'} />
                    <TeamLogo abbr={p.team||'?'} size={19} />
                    <div style={{ flex:1, fontSize:12 }}>{p.player_name}</div>
                    <div style={{ fontSize:11, color:'#64748b' }}>{fmt$(p.salary||0)}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", color:'#3b82f6', fontWeight:600, fontSize:13 }}>{p.proj_fpts}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
