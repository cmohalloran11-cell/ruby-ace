'use client';
// components/DFSOptimizer.tsx
import { useState, useMemo, useRef } from 'react';
import { useProjections, useDFSOptimizer } from '@/hooks/useData';
import { TeamLogo, PosBadge, LoadingSkeleton, EmptyState, fmt$ } from './ui/shared';

const ALL_POS = ['All', 'SP', 'C', '1B', '2B', '3B', 'SS', 'OF'];
type SortKey = 'proj_fpts' | 'proj_floor' | 'proj_ceiling' | 'proj_ownership' | 'salary' | 'player_name' | 'valueRating';
const POS_ORDER: Record<string, number> = { SP: 0, C: 1, '1B': 2, '2B': 3, '3B': 4, SS: 5, OF: 6 };

function valColor(v: number) {
  if (v >= 7) return '#22c55e';
  if (v >= 5) return '#f59e0b';
  return '#94a3b8';
}
function ownColor(o: number) {
  if (o >= 35) return '#ef4444';
  if (o >= 20) return '#f97316';
  if (o >= 10) return '#f59e0b';
  return '#22c55e';
}

// ── DK Download — exact DKEntries Edit Entries format ─────────
// Must match DKEntries.csv exactly:
// Cols 0-3:  Entry ID, Contest Name, Contest ID, Entry Fee (leave blank — user pastes from DKEntries download)
// Cols 4-13: P, P, C, 1B, 2B, 3B, SS, OF, OF, OF  using "Name (ID)" format
// Col 14:    blank (DK has instructions here)
// NO wrapping in quotes unless field contains comma — DK is strict about format
function downloadLineups(lineups: any[]) {
  if (!lineups.length) return;

  // Exact header matching DKEntries.csv
  const header = 'Entry ID,Contest Name,Contest ID,Entry Fee,P,P,C,1B,2B,3B,SS,OF,OF,OF';

  const dataRows = lineups.map(lu => {
    // Group by position
    const byPos: Record<string, any[]> = { SP:[], C:[], '1B':[], '2B':[], '3B':[], SS:[], OF:[] };
    for (const p of lu.players) {
      if (byPos[p.position]) byPos[p.position].push(p);
    }

    // Build ordered slots: P, P, C, 1B, 2B, 3B, SS, OF, OF, OF
    const slots: (any|null)[] = [
      byPos['SP'][0]  ?? null,
      byPos['SP'][1]  ?? null,
      byPos['C'][0]   ?? null,
      byPos['1B'][0]  ?? null,
      byPos['2B'][0]  ?? null,
      byPos['3B'][0]  ?? null,
      byPos['SS'][0]  ?? null,
      byPos['OF'][0]  ?? null,
      byPos['OF'][1]  ?? null,
      byPos['OF'][2]  ?? null,
    ];

    const playerCells = slots.map(p => {
      if (!p) return '';
      // DK Edit Entries requires "Firstname Lastname (DK_ID)" exactly
      if (p.dk_name_id && p.dk_name_id.trim()) return p.dk_name_id.trim();
      return p.player_name || '';
    });

    // 4 blank entry cols + 10 player cols — no trailing columns
    return ['', '', '', '', ...playerCells].join(',');
  });

  const csvContent = [header, ...dataRows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ruby-ace-lineups-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DFSOptimizer() {
  const { players, loading } = useProjections();
  const { optimize, simulateContest, SALARY_CAP, SALARY_MIN } = useDFSOptimizer(players);

  // ── Pool filters ──
  const [pos, setPos]           = useState('All');
  const [search, setSearch]     = useState('');
  const [sortKey, setSortKey]   = useState<SortKey>('proj_fpts');
  const [sortAsc, setSortAsc]   = useState(false);
  const [locked, setLocked]     = useState<Set<number>>(new Set());
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  // ── Optimizer settings ──
  const [numLineups, setNum]      = useState(20);
  const [mode, setMode]           = useState<'cash'|'gpp'>('cash');
  const [stackTeam, setStack]     = useState('');
  const [stackSize, setStackSz]   = useState(3);
  const [minUnique, setUniq]      = useState(2);
  const [minSalary, setMinSal]    = useState(49000);
  const [maxExposure, setMaxExp]  = useState(100);
  const [maxOwnership, setMaxOwn] = useState(0);
  const [maxPerTeam, setMaxTeam]  = useState(6);

  // ── Output ──
  const [lineups, setLineups]     = useState<any[]>([]);
  const [activeIdx, setIdx]       = useState(0);
  const [generating, setGen]      = useState(false);
  const [warn, setWarn]           = useState('');

  // ── Sim ──
  const [simResults, setSimResults] = useState<any[]>([]);
  const [simming, setSimming]       = useState(false);
  const [fieldSize, setFieldSize]   = useState(1000);
  const [showSim, setShowSim]       = useState(false);

  const teams = useMemo(() =>
    Array.from(new Set(players.map((p: any) => p.team).filter(Boolean))).sort() as string[],
  [players]);

  const filtered = useMemo(() => {
    let list = [...players];
    if (pos !== 'All') list = list.filter((p: any) => p.position === pos);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p: any) =>
        p.player_name?.toLowerCase().includes(q) || p.team?.toLowerCase().includes(q)
      );
    }
    list.sort((a: any, b: any) => {
      const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return list;
  }, [players, pos, search, sortKey, sortAsc]);

  const posBreakdown = useMemo(() => {
    const c: Record<string,number> = {};
    players.forEach((p: any) => { c[p.position] = (c[p.position]||0)+1; });
    return c;
  }, [players]);

  const sortBy = (k: SortKey) => {
    if (sortKey === k) setSortAsc(x => !x);
    else { setSortKey(k); setSortAsc(false); }
  };

  const toggleLock    = (id: number) => setLocked(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleExclude = (id: number) => setExcluded(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const clearAll = () => { setLocked(new Set()); setExcluded(new Set()); };

  const generate = () => {
    setGen(true); setWarn(''); setSimResults([]); setShowSim(false);
    setTimeout(() => {
      const result = optimize({
        locked:       Array.from(locked),
        excluded:     Array.from(excluded),
        numLineups,
        stackTeam:    stackTeam || null,
        stackSize,
        mode,
        minUnique,
        minSalary,
        maxExposure,
        maxOwnership,
        maxPerTeam,
      });
      setLineups(result);
      setIdx(0);
      setGen(false);
      if (result.length === 0) {
        setWarn('Could not build any valid lineups. Check your player pool has all positions with salary > 0. Try relaxing exposure or ownership limits.');
      } else if (result.length < numLineups) {
        setWarn(`Built ${result.length} of ${numLineups} lineups. Relax max exposure, min unique, or add more players.`);
      }
    }, 50);
  };

  const runSim = () => {
    if (!lineups.length) return;
    setSimming(true); setShowSim(true);
    setTimeout(() => {
      setSimResults(simulateContest(lineups, fieldSize) || []);
      setSimming(false);
    }, 50);
  };

  const cur = lineups[activeIdx];
  const goTo = (i: number) => setIdx(Math.max(0, Math.min(lineups.length-1, i)));

  // Exposure summary across all lineups
  const exposureMap = useMemo(() => {
    const m: Record<number, number> = {};
    lineups.forEach(lu => lu.players.forEach((p: any) => { m[p.id] = (m[p.id]||0)+1; }));
    return m;
  }, [lineups]);

  const SortTh = ({ label, k }: { label: string; k: SortKey }) => (
    <th onClick={() => sortBy(k)} style={{ cursor:'pointer', userSelect:'none', whiteSpace:'nowrap', fontSize: 11 }}>
      {label}{sortKey===k ? (sortAsc?' ↑':' ↓') : ''}
    </th>
  );

  const hasSalary    = players.some((p: any) => (p.salary||0) > 0);
  const hasPositions = players.some((p: any) => p.position && p.position !== '');

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 400px', gap:16, alignItems:'start' }}>

      {/* ── Player Pool ── */}
      <div>
        {/* Warning */}
        {!loading && players.length > 0 && (!hasSalary || !hasPositions) && (
          <div style={{ background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:6, padding:'10px 12px', fontSize:12, color:'#fbbf24', marginBottom:12, lineHeight:1.7 }}>
            <strong>Missing data</strong> — Upload DraftKings salary CSV first (sets positions + salary), then upload theBatX files.
          </div>
        )}

        <div className="card" style={{ padding:16 }}>
          {/* Filters */}
          <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
            <input className="input-field" style={{ maxWidth:190, padding:'5px 10px', fontSize:12 }}
              placeholder="Search name or team..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input-field" style={{ width:80 }} value={pos} onChange={e => setPos(e.target.value)}>
              {ALL_POS.map(p => <option key={p}>{p}</option>)}
            </select>
            <span style={{ fontSize:12, color:'#64748b', marginLeft:'auto' }}>{filtered.length}/{players.length}</span>
            {(locked.size>0||excluded.size>0) && (
              <>
                {locked.size>0 && <span style={{ fontSize:12, color:'#f59e0b' }}>{locked.size} locked</span>}
                {excluded.size>0 && <span style={{ fontSize:12, color:'#ef4444' }}>{excluded.size} excluded</span>}
                <button onClick={clearAll} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:12, textDecoration:'underline' }}>Clear</button>
              </>
            )}
          </div>

          {loading ? <LoadingSkeleton rows={10} cols={7} /> : players.length===0 ? (
            <EmptyState message="Upload projections in Admin to populate the optimizer." />
          ) : (
            <div style={{ maxHeight:500, overflowY:'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width:28 }}>L</th>
                    <SortTh label="Player" k="player_name" />
                    <th>Pos</th>
                    <SortTh label="Sal" k="salary" />
                    <SortTh label="Proj" k="proj_fpts" />
                    <SortTh label="Floor" k="proj_floor" />
                    <SortTh label="Ceil" k="proj_ceiling" />
                    <SortTh label="Own%" k="proj_ownership" />
                    <SortTh label="Val" k="valueRating" />
                    {lineups.length > 0 && <th style={{ fontSize:10 }}>Exp%</th>}
                    <th style={{ width:28 }}>X</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p: any) => {
                    const isL = locked.has(p.id);
                    const isX = excluded.has(p.id);
                    const own = p.proj_ownership || 0;
                    const exp = lineups.length > 0 ? Math.round(((exposureMap[p.id]||0)/lineups.length)*100) : null;
                    return (
                      <tr key={p.id} style={{ opacity:isX?0.2:1, background:isL?'rgba(245,158,11,0.04)':'' }}>
                        <td>
                          <button onClick={() => toggleLock(p.id)} style={{
                            width:22,height:22,borderRadius:4,cursor:'pointer',
                            border:`1px solid ${isL?'#f59e0b':'rgba(255,255,255,0.1)'}`,
                            background:isL?'rgba(245,158,11,0.15)':'transparent',
                            color:isL?'#f59e0b':'#475569',fontSize:10,fontWeight:700,
                          }}>{isL?'L':'–'}</button>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <TeamLogo abbr={p.team||'?'} size={18} />
                            <div>
                              <div style={{ fontSize:12, fontWeight:500 }}>{p.player_name}</div>
                              <div style={{ fontSize:10, color:'#475569' }}>{p.team}{p.lineup_pos ? ` · LP${p.lineup_pos}` : ''}</div>
                            </div>
                          </div>
                        </td>
                        <td><PosBadge pos={p.position||'?'} /></td>
                        <td style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:12, color:p.salary>0?'#e2e8f0':'#334155' }}>
                          {p.salary>0?fmt$(p.salary):'—'}
                        </td>
                        <td><span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, color:'#60a5fa', fontSize:14 }}>{(p.proj_fpts||0).toFixed(1)}</span></td>
                        <td style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'#64748b' }}>
                          {p.proj_floor>0?p.proj_floor.toFixed(1):'—'}
                        </td>
                        <td style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:'#94a3b8' }}>
                          {p.proj_ceiling>0?p.proj_ceiling.toFixed(1):'—'}
                        </td>
                        <td><span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:ownColor(own) }}>{own>0?`${own.toFixed(1)}%`:'—'}</span></td>
                        <td><span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, color:valColor(p.valueRating||0) }}>{p.valueRating>0?p.valueRating.toFixed(2):'—'}</span></td>
                        {lineups.length > 0 && (
                          <td style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11,
                            color: exp !== null && exp > maxExposure ? '#ef4444' : '#64748b' }}>
                            {exp !== null && exp > 0 ? `${exp}%` : '—'}
                          </td>
                        )}
                        <td>
                          <button onClick={() => toggleExclude(p.id)} style={{
                            width:22,height:22,borderRadius:4,cursor:'pointer',
                            border:`1px solid ${isX?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.2)'}`,
                            background:isX?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.06)',
                            color:isX?'#22c55e':'#ef4444',fontSize:10,fontWeight:700,
                          }}>{isX?'+':'X'}</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Position coverage */}
          {players.length>0 && (
            <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
              {['SP','C','1B','2B','3B','SS','OF'].map(p => (
                <div key={p} style={{
                  padding:'2px 8px', borderRadius:4, fontSize:11,
                  fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                  background:(posBreakdown[p]||0)>0?'rgba(34,197,94,0.08)':'rgba(239,68,68,0.08)',
                  color:(posBreakdown[p]||0)>0?'#22c55e':'#ef4444',
                  border:`1px solid ${(posBreakdown[p]||0)>0?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.2)'}`,
                }}>
                  {p} {posBreakdown[p]||0}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Settings + Output ── */}
      <div>
        <div className="card" style={{ padding:16, marginBottom:12 }}>
          <div className="section-label">Optimizer Settings</div>

          {/* Contest mode */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, color:'#94a3b8', marginBottom:6 }}>Contest type</div>
            <div style={{ display:'flex', gap:6 }}>
              {(['cash','gpp'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex:1, padding:'8px 0', borderRadius:6, cursor:'pointer',
                  border:`1px solid ${mode===m?(m==='cash'?'rgba(34,197,94,0.5)':'rgba(196,30,58,0.5)'):'rgba(255,255,255,0.08)'}`,
                  background:mode===m?(m==='cash'?'rgba(34,197,94,0.08)':'rgba(196,30,58,0.08)'):'transparent',
                  color:mode===m?(m==='cash'?'#22c55e':'#f06070'):'#64748b',
                  fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:13,
                }}>
                  {m==='cash'?'Cash / 50-50':'GPP / Tournament'}
                </button>
              ))}
            </div>
            <div style={{ fontSize:11, color:'#475569', marginTop:5, lineHeight:1.5 }}>
              {mode==='cash'
                ? 'Maximizes floor — picks highest projected floor players per dollar'
                : 'Maximizes ceiling leverage — rewards low-owned high-ceiling plays'}
            </div>
          </div>

          {/* Row 1: Lineups + Unique */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>Lineups (1–150)</div>
              <input className="input-field" type="number" min={1} max={150}
                value={numLineups} onChange={e => setNum(Math.min(150,Math.max(1,+e.target.value)))} />
            </div>
            <div>
              <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>Min unique players</div>
              <input className="input-field" type="number" min={0} max={9}
                value={minUnique} onChange={e => setUniq(Math.min(9,Math.max(0,+e.target.value)))} />
            </div>
          </div>

          {/* Row 2: Salary */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>Min salary</div>
              <input className="input-field" type="number" min={40000} max={50000} step={100}
                value={minSalary} onChange={e => setMinSal(Math.min(50000,Math.max(40000,+e.target.value)))} />
              <div style={{ fontSize:10, color:'#475569', marginTop:2 }}>Default $49,000</div>
            </div>
            <div>
              <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>Max per team</div>
              <input className="input-field" type="number" min={2} max={8}
                value={maxPerTeam} onChange={e => setMaxTeam(Math.min(8,Math.max(2,+e.target.value)))} />
              <div style={{ fontSize:10, color:'#475569', marginTop:2 }}>Max hitters from 1 team</div>
            </div>
          </div>

          {/* Row 3: Exposure + Ownership */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>Max exposure %</div>
              <input className="input-field" type="number" min={1} max={100}
                value={maxExposure} onChange={e => setMaxExp(Math.min(100,Math.max(1,+e.target.value)))} />
              <div style={{ fontSize:10, color:'#475569', marginTop:2 }}>
                {maxExposure===100?'No limit':`Max ${Math.floor(maxExposure/100*numLineups)}/${numLineups} lineups`}
              </div>
            </div>
            <div>
              <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>Max own% (GPP)</div>
              <input className="input-field" type="number" min={0} max={100}
                value={maxOwnership} onChange={e => setMaxOwn(Math.min(100,Math.max(0,+e.target.value)))} />
              <div style={{ fontSize:10, color:'#475569', marginTop:2 }}>
                {maxOwnership===0?'No limit':`Skip players >${maxOwnership}% owned`}
              </div>
            </div>
          </div>

          {/* Stack */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>Team stack (optional)</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 70px', gap:8 }}>
              <select className="input-field" value={stackTeam} onChange={e => setStack(e.target.value)}>
                <option value="">No stack</option>
                {teams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="input-field" type="number" min={2} max={5} value={stackSize}
                disabled={!stackTeam} onChange={e => setStackSz(Math.min(5,Math.max(2,+e.target.value)))} />
            </div>
            {stackTeam && (
              <div style={{ fontSize:11, color:'#475569', marginTop:4 }}>
                Forcing {stackSize} {stackTeam} batters + bring-back
              </div>
            )}
          </div>

          {/* Active rules */}
          <div style={{ marginBottom:12, padding:'8px 10px', background:'rgba(255,255,255,0.03)', borderRadius:6, fontSize:11, color:'#475569', lineHeight:1.8 }}>
            <div style={{ color:'#64748b', fontWeight:600, marginBottom:3, fontSize:11 }}>HARD RULES (always enforced)</div>
            <div>✓ No batters vs own pitcher in same lineup</div>
            <div>✓ No two SPs from same game</div>
            <div>✓ No duplicate lineups</div>
            <div>✓ Salary: ${minSalary.toLocaleString()} – $50,000</div>
            <div>✓ Max {maxPerTeam} players per team</div>
            {maxExposure<100 && <div style={{ color:'#f59e0b' }}>✓ Max {maxExposure}% exposure = {Math.floor(maxExposure/100*numLineups)}/{numLineups} lineups per player</div>}
            {maxOwnership>0 && <div style={{ color:'#f59e0b' }}>✓ Skip players over {maxOwnership}% owned</div>}
            {stackTeam && <div style={{ color:'#60a5fa' }}>✓ {stackSize}-man {stackTeam} stack</div>}
          </div>

          <button className="btn-primary" style={{ width:'100%', padding:12, fontSize:14 }}
            onClick={generate} disabled={players.length===0||generating}>
            {generating ? 'Building...' : `Generate ${numLineups} lineup${numLineups!==1?'s':''}`}
          </button>

          {players.length===0 && (
            <div style={{ fontSize:11, color:'#475569', marginTop:8, textAlign:'center' }}>
              Upload projections in Admin first
            </div>
          )}
          {warn && (
            <div style={{ marginTop:10, background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:6, padding:'8px 12px', fontSize:12, color:'#fbbf24', lineHeight:1.5 }}>
              {warn}
            </div>
          )}
        </div>

        {/* Generated lineups */}
        {lineups.length>0 && (
          <div className="card" style={{ padding:16, marginBottom:12 }}>
            {/* Navigator */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <button onClick={() => goTo(activeIdx-1)} disabled={activeIdx===0} style={{
                width:32,height:32,borderRadius:6,cursor:activeIdx===0?'not-allowed':'pointer',
                border:'1px solid rgba(255,255,255,0.1)',background:'transparent',
                color:activeIdx===0?'#2a2a2a':'#94a3b8',fontSize:18,lineHeight:1,
              }}>←</button>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700 }}>
                  Lineup {activeIdx+1} of {lineups.length}
                </div>
                <div style={{ fontSize:11, color:'#475569' }}>
                  {mode==='cash'?'Cash':'GPP'}{stackTeam?` · ${stackTeam} ${stackSize}-stack`:''}
                </div>
              </div>
              <button onClick={() => goTo(activeIdx+1)} disabled={activeIdx===lineups.length-1} style={{
                width:32,height:32,borderRadius:6,cursor:activeIdx===lineups.length-1?'not-allowed':'pointer',
                border:'1px solid rgba(255,255,255,0.1)',background:'transparent',
                color:activeIdx===lineups.length-1?'#2a2a2a':'#94a3b8',fontSize:18,lineHeight:1,
              }}>→</button>
            </div>

            {/* Dots */}
            {lineups.length>1 && lineups.length<=30 && (
              <div style={{ display:'flex', gap:4, justifyContent:'center', marginBottom:12, flexWrap:'wrap' }}>
                {lineups.map((_,i) => (
                  <button key={i} onClick={() => setIdx(i)} style={{
                    width:8,height:8,borderRadius:'50%',padding:0,border:'none',cursor:'pointer',
                    background:i===activeIdx?'#c41e3a':'rgba(255,255,255,0.15)',
                  }} />
                ))}
              </div>
            )}

            {cur && (
              <>
                {/* Stats */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0, marginBottom:12, background:'rgba(255,255,255,0.03)', borderRadius:8, overflow:'hidden' }}>
                  {[
                    { label:'Proj FP',  val:cur.projFpts?.toFixed(1), color:'#22c55e' },
                    { label:'Salary',   val:fmt$(cur.totalSalary), color:cur.totalSalary>50000?'#ef4444':'#e2e8f0' },
                    { label:'Rem',      val:fmt$(50000-cur.totalSalary), color:'#64748b' },
                    { label:'Cap Used', val:`${((cur.totalSalary/50000)*100).toFixed(1)}%`, color:cur.totalSalary>=49000?'#22c55e':'#f59e0b' },
                  ].map((m,i) => (
                    <div key={m.label} style={{ textAlign:'center', padding:'8px 4px', borderRight:i<3?'1px solid rgba(255,255,255,0.05)':'none' }}>
                      <div style={{ fontSize:9, color:'#475569', fontFamily:"'Barlow Condensed',sans-serif", textTransform:'uppercase', letterSpacing:'.08em' }}>{m.label}</div>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700, color:m.color, marginTop:2 }}>{m.val}</div>
                    </div>
                  ))}
                </div>

                {/* Players */}
                {[...cur.players]
                  .sort((a: any, b: any) => (POS_ORDER[a.position]??9)-(POS_ORDER[b.position]??9))
                  .map((p: any) => {
                    const exp = lineups.length > 1 ? Math.round(((exposureMap[p.id]||0)/lineups.length)*100) : null;
                    return (
                      <div key={p.id} style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ width:32, flexShrink:0 }}><PosBadge pos={p.position||'?'} /></div>
                        <TeamLogo abbr={p.team||'?'} size={18} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.player_name}</div>
                          <div style={{ fontSize:10, color:'#475569' }}>{p.team}{p.lineup_pos?` · LP${p.lineup_pos}`:''}</div>
                        </div>
                        {exp !== null && (
                          <div style={{ fontSize:10, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                            color:exp>maxExposure?'#ef4444':exp>0?'#64748b':'transparent', flexShrink:0 }}>
                            {exp>0?`${exp}%`:''}
                          </div>
                        )}
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", color:'#60a5fa', fontWeight:700, fontSize:14 }}>{(p.proj_fpts||0).toFixed(1)}</div>
                          <div style={{ fontSize:10, color:'#475569' }}>{p.salary>0?fmt$(p.salary):'—'}</div>
                        </div>
                      </div>
                    );
                  })}

                <div style={{ display:'flex', justifyContent:'space-between', marginTop:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, color:'#475569' }}>TOTAL</span>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:17, fontWeight:700, color:'#22c55e' }}>{cur.projFpts?.toFixed(1)} FP</span>
                </div>

                {/* Download */}
                <button onClick={() => downloadLineups(lineups)} className="btn-outline"
                  style={{ width:'100%', marginTop:12, fontSize:13, padding:'8px 0' }}>
                  ⬇ Download {lineups.length} lineup{lineups.length!==1?'s':''} (.csv — DK Edit Entries format)
                </button>

                {/* Contest Sim */}
                <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                    <div style={{ fontSize:12, color:'#94a3b8', flexShrink:0 }}>Field size</div>
                    <input className="input-field" type="number" min={10} max={200000}
                      value={fieldSize} onChange={e => setFieldSize(Math.max(10,+e.target.value))}
                      style={{ width:90 }} />
                    <button className="btn-outline" onClick={runSim} disabled={simming}
                      style={{ flex:1, fontSize:12, padding:'6px 0' }}>
                      {simming ? '⏳ Simulating...' : '🎲 Contest Sim'}
                    </button>
                  </div>
                  <div style={{ fontSize:11, color:'#475569' }}>
                    Monte Carlo sim vs {fieldSize.toLocaleString()}-person field (500 iterations)
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Contest Sim Results */}
        {showSim && simResults.length>0 && (
          <div className="card" style={{ padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div className="section-label" style={{ marginBottom:0 }}>Contest Sim — {fieldSize.toLocaleString()} field</div>
              <button onClick={() => setShowSim(false)} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:18 }}>×</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
              {[
                { label:'Avg Win%',   val:`${(simResults.reduce((s,r)=>s+r.winPct,0)/simResults.length).toFixed(1)}%`,   color:'#22c55e' },
                { label:'Avg Top 10%',val:`${(simResults.reduce((s,r)=>s+r.top10Pct,0)/simResults.length).toFixed(1)}%`, color:'#60a5fa' },
                { label:'Avg Top 25%',val:`${(simResults.reduce((s,r)=>s+r.top25Pct,0)/simResults.length).toFixed(1)}%`, color:'#f59e0b' },
              ].map(m => (
                <div key={m.label} style={{ textAlign:'center', background:'rgba(255,255,255,0.03)', borderRadius:6, padding:'8px 4px' }}>
                  <div style={{ fontSize:10, color:'#475569', fontFamily:"'Barlow Condensed',sans-serif", textTransform:'uppercase', letterSpacing:'.06em' }}>{m.label}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700, color:m.color }}>{m.val}</div>
                </div>
              ))}
            </div>
            <div style={{ maxHeight:280, overflowY:'auto' }}>
              <table className="data-table" style={{ fontSize:11 }}>
                <thead><tr>
                  <th>#</th><th>Avg FP</th><th>Floor</th><th>Ceil</th>
                  <th style={{ color:'#22c55e' }}>Win%</th>
                  <th style={{ color:'#60a5fa' }}>Top10</th>
                  <th style={{ color:'#f59e0b' }}>Top25</th>
                  <th>Score</th>
                </tr></thead>
                <tbody>
                  {simResults.map((r,i) => {
                    const rating = r.winPct*3+r.top10Pct*1.5+r.top25Pct;
                    const maxR = Math.max(...simResults.map(x=>x.winPct*3+x.top10Pct*1.5+x.top25Pct));
                    const isTop = rating>=maxR*0.9;
                    return (
                      <tr key={i} style={{ background:isTop?'rgba(34,197,94,0.05)':'', cursor:'pointer' }}
                          onClick={() => setIdx(i)}>
                        <td style={{ fontWeight:600, color:isTop?'#22c55e':'#94a3b8' }}>{isTop?'★':''} L{i+1}</td>
                        <td style={{ fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,color:'#60a5fa' }}>{r.avgScore}</td>
                        <td style={{ color:'#64748b' }}>{r.minScore}</td>
                        <td style={{ color:'#94a3b8' }}>{r.maxScore}</td>
                        <td style={{ color:'#22c55e',fontWeight:600 }}>{r.winPct}%</td>
                        <td style={{ color:'#60a5fa' }}>{r.top10Pct}%</td>
                        <td style={{ color:'#f59e0b' }}>{r.top25Pct}%</td>
                        <td>
                          <div style={{ width:50,height:5,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden' }}>
                            <div style={{ width:`${(rating/maxR)*100}%`,height:'100%',background:isTop?'#22c55e':'#c41e3a',borderRadius:3 }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize:11, color:'#334155', marginTop:8 }}>Click row to view lineup. ★ = best performing lineup.</div>
          </div>
        )}
      </div>
    </div>
  );
}
