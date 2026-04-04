'use client';
import { useState, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ContestData {
  name: string;
  entrants: number;
  prizePool: number;
  entryFee: number;
}

function parseContestCSV(text: string): Partial<ContestData> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const data: Partial<ContestData> = {};
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('entrant') || lower.includes('entries')) {
      const m = line.match(/[\d,]+/); if (m) data.entrants = parseInt(m[0].replace(/,/g,''));
    }
    if (lower.includes('prize pool') || lower.includes('total prizes')) {
      const m = line.match(/[\$]?([\d,]+\.?\d*)/); if (m) data.prizePool = parseFloat(m[1].replace(/,/g,''));
    }
    if (lower.includes('entry fee') || lower.includes('buy-in')) {
      const m = line.match(/[\$]?([\d.]+)/); if (m) data.entryFee = parseFloat(m[1]);
    }
    if (lower.includes('contest name') || lower.includes('title')) {
      data.name = line.split(':').slice(1).join(':').trim() || line;
    }
  }
  return data;
}

export default function ContestSim({ lineups, savedResults, savedContest, onResultsChange, onContestChange, onSelectLineups }: {
  lineups: any[][];
  savedResults?: any[];
  savedContest?: any;
  onResultsChange?: (r: any[]) => void;
  onContestChange?: (c: any) => void;
  onSelectLineups?: (indices: number[]) => void;
}) {
  const { token } = useAuth() as any;
  const [contest, setContest] = useState<ContestData>(savedContest || {
    name: 'MLB $300 Dime Time',
    entrants: 8500,
    prizePool: 300,
    entryFee: 0.10,
  });
  const [results, setResults] = useState<any[]>(savedResults || []);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'setup'|'results'|'players'|'stacks'>('setup');
  const [sortKey, setSortKey] = useState<string>('cashRate');
  const [sortDir, setSortDir] = useState<1|-1>(-1);
  const [selectedResult, setSelectedResult] = useState<number|null>(null);
  const [simSelected, setSimSelected] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadContest = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    const parsed = parseContestCSV(text);
    setContest(prev => {
      const updated = { ...prev, ...parsed };
      if (onContestChange) onContestChange(updated);
      return updated;
    });
    setMsg(`Loaded: ${parsed.name || file.name}`);
    if (e.target) e.target.value = '';
  };

  const runSim = () => {
    if (!lineups.length) { setMsg('Generate lineups first'); return; }
    setRunning(true); setMsg(`Simulating lineup 1 of ${lineups.length}...`);
    const N_SIM = 1000;
    const { entrants, prizePool, entryFee } = contest;
    const allResults: any[] = [];

    function randn() {
      const u = 1 - Math.random(), v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    // Build prize tiers for this contest (typical GPP structure)
    function getPrize(rank: number): number {
      const pct = rank / entrants;
      if (rank === 1) return prizePool * 0.15;
      if (rank <= 2) return prizePool * 0.09;
      if (rank <= 3) return prizePool * 0.06;
      if (rank <= 5) return prizePool * 0.04;
      if (rank <= 10) return prizePool * 0.025;
      if (rank <= 25) return prizePool * 0.015;
      if (rank <= 50) return prizePool * 0.01;
      if (rank <= 100) return prizePool * 0.006;
      if (pct <= 0.05) return prizePool * 0.003;
      if (pct <= 0.10) return prizePool * 0.002;
      if (pct <= 0.18) return entryFee * 2; // min cash = 2x entry
      return 0;
    }

    function simOne(lineup: any[], li: number) {
      const myProj = lineup.reduce((s: number, p: any) => s + (p.proj_fpts || 0), 0);
      const myStdDev = myProj * 0.28;
      let cashCount = 0, top1 = 0, top10 = 0, top25 = 0, totalPrize = 0;
      const scores: number[] = [];

      for (let sim = 0; sim < N_SIM; sim++) {
        const myScore = Math.max(0, myProj + randn() * myStdDev);
        scores.push(myScore);
        let beatenBy = 0;
        const sample = Math.min(entrants - 1, 300);
        for (let f = 0; f < sample; f++) {
          const fp = 35 + randn() * 8;
          if (Math.max(0, fp + randn() * fp * 0.3) > myScore) beatenBy++;
        }
        const rank = Math.round(beatenBy / sample * entrants) + 1;
        const pct = rank / entrants;
        const prize = getPrize(rank);
        if (prize > 0) { cashCount++; totalPrize += prize; }
        if (rank <= 1) top1++;
        if (pct <= 0.10) top10++;
        if (pct <= 0.25) top25++;
      }
      scores.sort((a, b) => a - b);
      const avgPrize = totalPrize / N_SIM;
      const roi = (avgPrize / (entryFee || 0.1) - 1) * 100;

      // Build player summary for this lineup
      const players = lineup.map((p: any) => ({
        name: p.player_name,
        team: p.team,
        pos: p.position,
        proj: p.proj_fpts || 0,
        salary: p.salary || 0,
      }));

      // Stack detection (3+ from same team)
      const teamCounts: Record<string, number> = {};
      for (const p of lineup) if (p.position !== 'SP') teamCounts[p.team] = (teamCounts[p.team]||0)+1;
      const primaryStack = Object.entries(teamCounts).sort((a,b)=>b[1]-a[1])[0];

      return {
        lineupIndex: li,
        projScore: myProj,
        cashRate: cashCount / N_SIM * 100,
        top1Rate: top1 / N_SIM * 100,
        top10Rate: top10 / N_SIM * 100,
        top25Rate: top25 / N_SIM * 100,
        avgPrize,
        roi,
        p10Score: scores[Math.floor(N_SIM * 0.1)],
        p50Score: scores[Math.floor(N_SIM * 0.5)],
        p90Score: scores[Math.floor(N_SIM * 0.9)],
        players,
        primaryStack: primaryStack ? `${primaryStack[0]} (${primaryStack[1]})` : '—',
        sp1: lineup.filter((p:any)=>p.position==='SP')[0]?.player_name || '—',
        sp2: lineup.filter((p:any)=>p.position==='SP')[1]?.player_name || '—',
        totalSalary: lineup.reduce((s:number,p:any)=>s+(p.salary||0),0),
      };
    }

    const CHUNK = 5;
    let idx = 0;
    function processChunk() {
      const end = Math.min(idx + CHUNK, lineups.length);
      for (let i = idx; i < end; i++) allResults.push(simOne(lineups[i], i));
      idx = end;
      setMsg(`Simulating lineup ${Math.min(idx+1, lineups.length)} of ${lineups.length}...`);
      if (idx < lineups.length) {
        setTimeout(processChunk, 0);
      } else {
        const final = [...allResults];
        setResults(final);
        if (onResultsChange) onResultsChange(final);
        setTab('results');
        setMsg(`${N_SIM.toLocaleString()} sims × ${lineups.length} lineups complete`);
        setRunning(false);
      }
    }
    setTimeout(processChunk, 50);
  };

  // Sorted results
  const sorted = useMemo(() => {
    if (!results.length) return [];
    return [...results].sort((a, b) => sortDir * (b[sortKey] - a[sortKey]));
  }, [results, sortKey, sortDir]);

  // Player aggregates across all lineups
  const playerStats = useMemo(() => {
    if (!results.length) return [];
    const map: Record<string, any> = {};
    for (const r of results) {
      for (const p of r.players) {
        if (!map[p.name]) map[p.name] = { ...p, count: 0, totalCash: 0, totalROI: 0, totalProj: 0 };
        map[p.name].count++;
        map[p.name].totalCash += r.cashRate;
        map[p.name].totalROI += r.roi;
        map[p.name].totalProj += r.projScore;
      }
    }
    return Object.values(map).map((p: any) => ({
      ...p,
      exposure: (p.count / results.length * 100).toFixed(1),
      avgCash: (p.totalCash / p.count).toFixed(1),
      avgROI: (p.totalROI / p.count).toFixed(1),
    })).sort((a: any, b: any) => parseFloat(b.avgROI) - parseFloat(a.avgROI));
  }, [results]);

  // Stack aggregates
  const stackStats = useMemo(() => {
    if (!results.length) return [];
    const map: Record<string, any> = {};
    for (const r of results) {
      const k = r.primaryStack;
      if (!map[k]) map[k] = { stack: k, count: 0, totalCash: 0, totalROI: 0 };
      map[k].count++;
      map[k].totalCash += r.cashRate;
      map[k].totalROI += r.roi;
    }
    return Object.values(map).map((s: any) => ({
      ...s,
      exposure: (s.count / results.length * 100).toFixed(1),
      avgCash: (s.totalCash / s.count).toFixed(1),
      avgROI: (s.totalROI / s.count).toFixed(1),
    })).sort((a: any, b: any) => parseFloat(b.avgROI) - parseFloat(a.avgROI));
  }, [results]);

  const avgCash = results.length ? (results.reduce((s,r)=>s+r.cashRate,0)/results.length).toFixed(1) : null;
  const avgROI  = results.length ? (results.reduce((s,r)=>s+r.roi,0)/results.length).toFixed(1) : null;

  const inp = { background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:6, color:'#e2e8f0', padding:'6px 10px', fontSize:13, width:'100%' } as const;

  const SortTh = ({ label, k }: { label: string, k: string }) => (
    <th onClick={() => { if (sortKey===k) setSortDir(d=>d===1?-1:1); else { setSortKey(k); setSortDir(-1); } }}
      style={{ padding:'6px 10px', textAlign:'left' as const, color: sortKey===k?'#c41e3a':'#64748b',
        fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' as const, userSelect:'none' as const }}>
      {label} {sortKey===k ? (sortDir===-1?'↓':'↑') : ''}
    </th>
  );

  return (
    <div style={{ padding:'16px 0' }}>
      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16, borderBottom:'1px solid rgba(255,255,255,0.06)', paddingBottom:10 }}>
        {(['setup','results','players','stacks'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:'5px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13,
            background: tab===t?'rgba(196,30,58,0.12)':'transparent',
            color: tab===t?'#f06070':'#64748b', fontWeight: tab===t?600:400,
          }}>
            {t==='setup'?'Setup':t==='results'?`Results${results.length?` (${results.length})`:''}`
              :t==='players'?'Players':' Stacks'}
          </button>
        ))}
      </div>

      {tab === 'setup' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:16 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Contest Details</div>
            <div style={{ display:'flex', flexDirection:'column' as const, gap:10 }}>
              <div>
                <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>Contest Name</div>
                <input style={inp} value={contest.name} onChange={e=>{const u={...contest,name:e.target.value};setContest(u);if(onContestChange)onContestChange(u);}}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>Entrants</div>
                  <input style={inp} type="number" value={contest.entrants} onChange={e=>setContest(p=>({...p,entrants:+e.target.value}))}/>
                </div>
                <div>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>Entry Fee ($)</div>
                  <input style={inp} type="number" step="0.01" value={contest.entryFee} onChange={e=>setContest(p=>({...p,entryFee:+e.target.value}))}/>
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>Prize Pool ($)</div>
                <input style={inp} type="number" value={contest.prizePool} onChange={e=>setContest(p=>({...p,prizePool:+e.target.value}))}/>
              </div>
            </div>
          </div>

          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:16 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Upload Contest CSV</div>
            <div style={{ fontSize:12, color:'#475569', marginBottom:10 }}>Auto-fill from DK contest export</div>
            <button onClick={()=>fileRef.current?.click()} style={{
              width:'100%', padding:'8px 0', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)',
              background:'rgba(255,255,255,0.05)', color:'#94a3b8', fontSize:13, cursor:'pointer', marginBottom:12,
            }}>⬆ Upload Contest CSV</button>
            <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={uploadContest}/>
            <div style={{ fontSize:12, color:'#64748b', lineHeight:2 }}>
              <div>📋 {contest.name}</div>
              <div>👥 {contest.entrants.toLocaleString()} entrants</div>
              <div>💰 ${contest.prizePool.toLocaleString()} pool · ${contest.entryFee} entry</div>
              <div>📊 {lineups.length} lineups ready</div>
            </div>
          </div>

          <div style={{ gridColumn:'1/-1' }}>
            {msg && <div style={{ fontSize:12, color:'#64748b', marginBottom:8, textAlign:'center' as const }}>{msg}</div>}
            <button onClick={runSim} disabled={running || !lineups.length} style={{
              width:'100%', padding:'14px 0', borderRadius:10, border:'none',
              background: lineups.length && !running ? 'linear-gradient(135deg,#c41e3a,#7a1228)' : '#334155',
              color:'white', fontSize:15, fontWeight:700, cursor: lineups.length && !running ? 'pointer' : 'not-allowed',
            }}>
              {running ? msg : `▶ Run Contest Sim (${lineups.length} lineups)`}
            </button>
          </div>
        </div>
      )}

      {tab === 'results' && (
        <div>
          {/* Selection toolbar */}
          {results.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, flexWrap:'wrap' as const }}>
              <span style={{ fontSize:12, color:'#475569' }}>
                {simSelected.size > 0 ? `${simSelected.size} selected` : 'Click rows to select lineups'}
              </span>
              <button onClick={()=>setSimSelected(simSelected.size===results.length?new Set():new Set(results.map((r:any)=>r.lineupIndex)))} style={{
                padding:'3px 12px', borderRadius:6, border:'1px solid rgba(255,255,255,0.12)',
                background:'rgba(255,255,255,0.05)', color:'#94a3b8', cursor:'pointer', fontSize:12,
              }}>{simSelected.size===results.length?'Deselect All':'Select All'}</button>
              {simSelected.size > 0 && (
                <button onClick={()=>{
                  if (onSelectLineups) onSelectLineups(Array.from(simSelected) as number[]);
                  setSimSelected(new Set());
                }} style={{
                  padding:'3px 12px', borderRadius:6, border:'1px solid rgba(196,30,58,0.4)',
                  background:'rgba(196,30,58,0.1)', color:'#f06070', cursor:'pointer', fontSize:12, fontWeight:600,
                }}>✓ Use {simSelected.size} Lineups</button>
              )}
            </div>
          )}

          {/* Summary */}
          {results.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
              {[
                { label:'Avg Cash Rate', value:`${avgCash}%`, color:'#22c55e' },
                { label:'Avg ROI', value:`${parseFloat(avgROI||'0')>=0?'+':''}${avgROI}%`, color:parseFloat(avgROI||'0')>=0?'#22c55e':'#ef4444' },
                { label:'Best Cash Rate', value:`${Math.max(...results.map(r=>r.cashRate)).toFixed(1)}%`, color:'#f59e0b' },
                { label:'Best ROI', value:`+${Math.max(...results.map(r=>r.roi)).toFixed(1)}%`, color:'#60a5fa' },
              ].map(c=>(
                <div key={c.label} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 14px', textAlign:'center' as const }}>
                  <div style={{ fontSize:22, fontWeight:800, color:c.color }}>{c.value}</div>
                  <div style={{ fontSize:11, color:'#475569' }}>{c.label}</div>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 ? (
            <div style={{ textAlign:'center' as const, padding:'40px 0', color:'#334155', fontSize:13 }}>Run simulation first.</div>
          ) : (
            <div style={{ maxHeight:420, overflowY:'auto' as const }}>
              <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.1)', position:'sticky' as const, top:0, background:'#13131f' }}>
                    <th style={{width:32,padding:'6px 8px'}}>
                        <input type="checkbox" checked={simSelected.size===sorted.length && sorted.length>0}
                          onChange={()=>setSimSelected(simSelected.size===sorted.length?new Set():new Set(sorted.map((r:any)=>r.lineupIndex)))}
                          style={{accentColor:'#c41e3a',cursor:'pointer'}}/>
                      </th>
                    <SortTh label="#" k="lineupIndex"/>
                    <SortTh label="Proj" k="projScore"/>
                    <SortTh label="Cash%" k="cashRate"/>
                    <SortTh label="Top10%" k="top10Rate"/>
                    <SortTh label="Top25%" k="top25Rate"/>
                    <SortTh label="ROI%" k="roi"/>
                    <SortTh label="AvgPrize" k="avgPrize"/>
                    <SortTh label="P50" k="p50Score"/>
                    <th style={{ padding:'6px 10px', color:'#64748b', fontSize:11 }}>Stack</th>
                    <th style={{ padding:'6px 10px', color:'#64748b', fontSize:11 }}>SPs</th>
                    <th style={{ padding:'6px 10px', color:'#64748b', fontSize:11 }}>Sal</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => (
                    <tr key={r.lineupIndex}
                      style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', cursor:'pointer',
                        background: simSelected.has(i)?'rgba(196,30,58,0.1)':selectedResult===r.lineupIndex?'rgba(196,30,58,0.04)':i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding:'6px 8px' }} onClick={e=>{e.stopPropagation();const s=new Set(simSelected);s.has(r.lineupIndex)?s.delete(r.lineupIndex):s.add(r.lineupIndex);setSimSelected(s);}}>
                        <input type="checkbox" checked={simSelected.has(r.lineupIndex)} onChange={()=>{}} style={{accentColor:'#c41e3a',cursor:'pointer'}}/>
                      </td>
                      <td style={{ padding:'6px 10px', color:'#475569', cursor:'pointer' }} onClick={()=>setSelectedResult(selectedResult===r.lineupIndex?null:r.lineupIndex)}>#{r.lineupIndex+1}</td>
                      <td style={{ padding:'6px 10px', fontWeight:600 }}>{r.projScore.toFixed(1)}</td>
                      <td style={{ padding:'6px 10px', color:r.cashRate>=20?'#22c55e':r.cashRate>=15?'#f59e0b':'#94a3b8', fontWeight:700 }}>{r.cashRate.toFixed(1)}%</td>
                      <td style={{ padding:'6px 10px', color:'#60a5fa' }}>{r.top10Rate.toFixed(1)}%</td>
                      <td style={{ padding:'6px 10px', color:'#94a3b8' }}>{r.top25Rate.toFixed(1)}%</td>
                      <td style={{ padding:'6px 10px', color:r.roi>=0?'#22c55e':'#ef4444', fontWeight:700 }}>{r.roi>=0?'+':''}{r.roi.toFixed(1)}%</td>
                      <td style={{ padding:'6px 10px', color:'#22c55e' }}>${r.avgPrize.toFixed(2)}</td>
                      <td style={{ padding:'6px 10px', color:'#64748b' }}>{r.p50Score.toFixed(1)}</td>
                      <td style={{ padding:'6px 10px', color:'#c41e3a', fontSize:11 }}>{r.primaryStack}</td>
                      <td style={{ padding:'6px 10px', color:'#475569', fontSize:11, whiteSpace:'nowrap' as const }}>{r.sp1?.split(' ').pop()}/{r.sp2?.split(' ').pop()}</td>
                      <td style={{ padding:'6px 10px', color:'#334155', fontSize:11 }}>${(r.totalSalary/1000).toFixed(1)}k</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Lineup detail panel */}
          {selectedResult !== null && (() => {
            const r = results.find(x => x.lineupIndex === selectedResult);
            if (!r) return null;
            return (
              <div style={{ marginTop:14, padding:14, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(196,30,58,0.2)', borderRadius:10 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:10, color:'#f06070' }}>Lineup #{selectedResult+1} Detail</div>
                <div style={{ display:'flex', flexWrap:'wrap' as const, gap:6, marginBottom:10 }}>
                  {r.players.map((p: any, i: number) => (
                    <div key={i} style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600,
                      background: p.pos==='SP'?'rgba(196,30,58,0.1)':'rgba(255,255,255,0.05)',
                      border:`1px solid ${p.pos==='SP'?'rgba(196,30,58,0.3)':'rgba(255,255,255,0.08)'}`,
                      color: p.pos==='SP'?'#f06070':'#94a3b8' }}>
                      {p.pos} {p.name} <span style={{ color:'#475569' }}>({p.team}) ${(p.salary/1000).toFixed(1)}k</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, fontSize:12 }}>
                  {[
                    ['Cash Rate', `${r.cashRate.toFixed(1)}%`],
                    ['ROI', `${r.roi>=0?'+':''}${r.roi.toFixed(1)}%`],
                    ['P10/P50/P90', `${r.p10Score.toFixed(0)}/${r.p50Score.toFixed(0)}/${r.p90Score.toFixed(0)}`],
                    ['Primary Stack', r.primaryStack],
                    ['Total Salary', `$${r.totalSalary.toLocaleString()}`],
                  ].map(([k,v]) => (
                    <div key={k as string} style={{ textAlign:'center' as const }}>
                      <div style={{ color:'#475569', fontSize:10, marginBottom:2 }}>{k}</div>
                      <div style={{ fontWeight:700, color:'#e2e8f0' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {msg && results.length > 0 && <div style={{ marginTop:8, fontSize:11, color:'#334155', textAlign:'center' as const }}>{msg}</div>}
        </div>
      )}

      {tab === 'players' && (
        <div>
          <div style={{ fontSize:12, color:'#475569', marginBottom:12 }}>Player performance aggregated across all simulated lineups. Click column headers to sort.</div>
          {playerStats.length === 0 ? <div style={{ textAlign:'center' as const, padding:'40px 0', color:'#334155' }}>Run simulation first.</div> : (
            <div style={{ maxHeight:450, overflowY:'auto' as const }}>
              <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.1)', position:'sticky' as const, top:0, background:'#13131f' }}>
                    {['Player','Pos','Team','Exp%','Avg Cash%','Avg ROI%','Proj/G','Salary'].map(h=>(
                      <th key={h} style={{ padding:'6px 10px', textAlign:'left' as const, color:'#64748b', fontSize:11, fontWeight:600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {playerStats.map((p: any, i: number) => (
                    <tr key={p.name} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)',
                      background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding:'6px 10px', fontWeight:600 }}>{p.name}</td>
                      <td style={{ padding:'6px 10px', color:'#c41e3a' }}>{p.pos}</td>
                      <td style={{ padding:'6px 10px', color:'#475569' }}>{p.team}</td>
                      <td style={{ padding:'6px 10px', color:'#94a3b8' }}>{p.exposure}%</td>
                      <td style={{ padding:'6px 10px', color:parseFloat(p.avgCash)>=20?'#22c55e':'#94a3b8', fontWeight:700 }}>{p.avgCash}%</td>
                      <td style={{ padding:'6px 10px', color:parseFloat(p.avgROI)>=0?'#22c55e':'#ef4444', fontWeight:700 }}>{parseFloat(p.avgROI)>=0?'+':''}{p.avgROI}%</td>
                      <td style={{ padding:'6px 10px', color:'#64748b' }}>{p.proj.toFixed(1)}</td>
                      <td style={{ padding:'6px 10px', color:'#334155' }}>${(p.salary/1000).toFixed(1)}k</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'stacks' && (
        <div>
          <div style={{ fontSize:12, color:'#475569', marginBottom:12 }}>Primary stack (3+ batters from same team) performance across all lineups.</div>
          {stackStats.length === 0 ? <div style={{ textAlign:'center' as const, padding:'40px 0', color:'#334155' }}>Run simulation first.</div> : (
            <div style={{ maxHeight:450, overflowY:'auto' as const }}>
              <table style={{ width:'100%', borderCollapse:'collapse' as const, fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
                    {['Stack','Lineups','Exposure%','Avg Cash%','Avg ROI%'].map(h=>(
                      <th key={h} style={{ padding:'6px 10px', textAlign:'left' as const, color:'#64748b', fontSize:11, fontWeight:600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stackStats.map((s: any, i: number) => (
                    <tr key={s.stack} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)',
                      background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding:'6px 10px', fontWeight:700, color:'#c41e3a' }}>{s.stack}</td>
                      <td style={{ padding:'6px 10px', color:'#94a3b8' }}>{s.count}</td>
                      <td style={{ padding:'6px 10px', color:'#64748b' }}>{s.exposure}%</td>
                      <td style={{ padding:'6px 10px', color:parseFloat(s.avgCash)>=20?'#22c55e':'#94a3b8', fontWeight:700 }}>{s.avgCash}%</td>
                      <td style={{ padding:'6px 10px', color:parseFloat(s.avgROI)>=0?'#22c55e':'#ef4444', fontWeight:700 }}>{parseFloat(s.avgROI)>=0?'+':''}{s.avgROI}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
