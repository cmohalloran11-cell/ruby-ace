'use client';
// components/DFSOptimizer.tsx — DFO-style layout
import { useState, useMemo } from 'react';
import { useProjections, useDFSOptimizer } from '@/hooks/useData';

const SLOTS = ['P','P','C','1B','2B','3B','SS','OF','OF','OF'];
const COMBO_MAP: Record<string, number[]> = {
  '4-3 Team Stack': [4,3], '4-4 Team Stack': [4,4],
  '5-2': [5,2], '5-3': [5,3], '4-2-2': [4,2,2],
  '4-3-1': [4,3,1], '4-2-1-1': [4,2,1,1], '3-3-2': [3,3,2],
  '3-2-2': [3,2,2], '3-2-1-1': [3,2,1,1],
};

function downloadCSV(lineups: any[][], contestInfo?: {entryIds: string[], name: string, id: string, fee: string}) {
  if (!lineups.length) return;
  const header = 'Entry ID,Contest Name,Contest ID,Entry Fee,P,P,C,1B,2B,3B,SS,OF,OF,OF';
  const rows = lineups.map((roster, i) => {
    const byPos: Record<string, any[]> = { SP:[], C:[], '1B':[], '2B':[], '3B':[], SS:[], OF:[] };
    for (const p of roster) { if (byPos[p.position]) byPos[p.position].push(p); }
    const slots = [byPos.SP[0],byPos.SP[1],byPos.C[0],byPos['1B'][0],byPos['2B'][0],
                   byPos['3B'][0],byPos.SS[0],byPos.OF[0],byPos.OF[1],byPos.OF[2]];
    const players = slots.map(p => p ? (p.dk_name_id?.trim() || p.player_name) : '').join(',');
    // If contest info provided, fill entry metadata; otherwise leave blank
    if (contestInfo?.entryIds?.[i]) {
      return `${contestInfo.entryIds[i]},${contestInfo.name},${contestInfo.id},${contestInfo.fee},${players}`;
    }
    return `,,,,${players}`;
  });
  const csv = [header,...rows].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  a.download = 'lineups.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// Parse a DKEntries.csv file to extract contest info + entry IDs
function parseDKEntries(text: string): {entryIds: string[], name: string, id: string, fee: string} | null {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const entryIds: string[] = [];
  let name = '', id = '', fee = '';
  for (const line of lines) {
    const cols = line.split(',');
    if (cols[0]?.trim().match(/^\d+$/)) {
      if (!name && cols[1]) { name = cols[1].trim(); id = cols[2]?.trim() || ''; fee = cols[3]?.trim() || ''; }
      entryIds.push(cols[0].trim());
    }
  }
  return entryIds.length > 0 ? { entryIds, name, id, fee } : null;
}

const TAB = (active: boolean) => ({
  display:'flex' as const, flexDirection:'column' as const, alignItems:'center' as const,
  gap:4, padding:'10px 0', cursor:'pointer', fontSize:12, flex:1,
  color: active ? '#fff' : '#64748b',
  background: active ? '#2dd4bf' : 'transparent',
  border:'none', borderRadius:8, fontWeight: active ? 700 : 400,
});

function Toggle({val, onClick}: {val:boolean, onClick:()=>void}) {
  return (
    <button onClick={onClick} style={{
      width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',
      background:val?'#2dd4bf':'rgba(255,255,255,0.15)',position:'relative',transition:'background .2s',flexShrink:0
    }}>
      <div style={{position:'absolute',top:3,width:18,height:18,borderRadius:'50%',background:'white',transition:'left .2s',left:val?23:3}} />
    </button>
  );
}

function Slider({value,min,max,onChange,label}:{value:number,min:number,max:number,onChange:(n:number)=>void,label:string}) {
  return (
    <div style={{marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:12,color:'#94a3b8'}}>{label}</span>
        <span style={{fontSize:12,color:'#2dd4bf',fontWeight:700}}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e=>onChange(+e.target.value)}
        style={{width:'100%',accentColor:'#2dd4bf'}}/>
      <div style={{display:'flex',justifyContent:'space-between'}}>
        <span style={{fontSize:10,color:'#475569'}}>{min}</span>
        <span style={{fontSize:10,color:'#475569'}}>{max}</span>
      </div>
    </div>
  );
}

export default function DFSOptimizer() {
  const { players, loading } = useProjections();
  const { optimize } = useDFSOptimizer(players);

  const [tab, setTab] = useState<'minexp'|'maxexp'|'stacks'|'projections'|'players'>('players');
  const [numLineups, setNum] = useState(20);
  const [generating, setGen] = useState(false);
  const [lineups, setLineups] = useState<any[][]>([]);
  const [contestInfo, setContestInfo] = useState<{entryIds:string[],name:string,id:string,fee:string}|null>(null);
  const [dkFileName, setDkFileName] = useState('');
  const [view, setView] = useState<'lineups'|'playerExp'|'teamExp'>('lineups');
  const [showResults, setShowResults] = useState(false);
  const [warn, setWarn] = useState('');
  const [debug, setDebug] = useState('');

  // Settings
  const [defaultMaxExp, setMaxExp] = useState(100);
  const [selectedStacks, setStacks] = useState<Set<string>>(new Set());
  const [maxPerTeam] = useState(5);
  const [maxOverlap, setOverlap] = useState(9);
  const [avoidOpp, setAvoidOpp] = useState(false);
  const [minSalary, setMinSal] = useState(49000);
  const [maxSalary] = useState(50000);
  const [maxOwn, setMaxOwn] = useState(1000);
  const [locked, setLocked] = useState<Set<number>>(new Set());
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [posFilter, setPos] = useState('All');
  const [search, setSearch] = useState('');

  const inp = {background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:6,color:'#e2e8f0',padding:'6px 10px',fontSize:13} as const;
  const card = {background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:20,marginBottom:16} as const;

  const generate = () => {
    setGen(true); setWarn('');
    setTimeout(() => {
      const activeCombos = selectedStacks.size === 0 ? [[]] : Array.from(selectedStacks).map(k => COMBO_MAP[k]||[]);
      // Collect debug info before optimizing
      const dbgPositions = [...new Set(players.map((p:any) => p.position))].sort().join(', ');
      const dbgSalary = players.filter((p:any) => (p.salary||0) > 0).length;
      const dbgFpts = players.filter((p:any) => (p.proj_fpts||0) > 0).length;
      const dbgSPs = players.filter((p:any) => p.position === 'SP').length;
      setDebug(`Pool: ${players.length} total | ${dbgSPs} SPs | salary>0: ${dbgSalary} | fpts>0: ${dbgFpts} | positions: ${dbgPositions}`);

      const result = optimize({
        locked: Array.from(locked), excluded: Array.from(excluded),
        numLineups, stackCombos: activeCombos, mode: 'cash',
        minUnique: maxOverlap < 9 ? 10 - maxOverlap : 0,
        minSalary, maxExposure: defaultMaxExp,
        maxOwnership: maxOwn < 1000 ? maxOwn : 0,
        ruleNoBatterVsPitcher: avoidOpp,
        ruleNoSameGameSPs: true, ruleMinSalary: false,
      });
      setLineups(result.map((lu:any) => lu.players));
      setGen(false); setShowResults(result.length > 0);
      if (!result.length) setWarn('Could not build any valid lineups. Check your player pool has all positions with salary > 0.');
      else if (result.length < numLineups) setWarn(`Built ${result.length} of ${numLineups} lineups.`);
      else setWarn('');
    }, 50);
  };

  const playerExp = useMemo(() => {
    if (!lineups.length) return [];
    const m: Record<number,{p:any,c:number}> = {};
    lineups.forEach(lu => lu.forEach((p:any) => { if (!m[p.id]) m[p.id]={p,c:0}; m[p.id].c++; }));
    return Object.values(m).map(({p,c})=>({...p,expPct:Math.round(c/lineups.length*100)})).sort((a,b)=>b.expPct-a.expPct);
  }, [lineups]);

  const teamExp = useMemo(() => {
    if (!lineups.length) return [];
    const m: Record<string,number> = {};
    lineups.forEach(lu => { const ts=new Set(lu.map((p:any)=>p.team)); ts.forEach(t=>{ m[t as string]=(m[t as string]||0)+1; }); });
    return Object.entries(m).map(([team,c])=>({team,expPct:Math.round(c/lineups.length*100)})).sort((a,b)=>b.expPct-a.expPct);
  }, [lineups]);

  const filteredPlayers = useMemo(() => players.filter((p:any) => {
    if (posFilter !== 'All' && p.position !== posFilter) return false;
    if (search && !p.player_name?.toLowerCase().includes(search.toLowerCase()) && !p.team?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [players, posFilter, search]);

  return (
    <div style={{maxWidth:900,margin:'0 auto',padding:'0 0 90px 0'}}>
      {/* Top nav */}
      <div style={{display:'flex',gap:4,marginBottom:20,background:'rgba(0,0,0,0.3)',borderRadius:12,padding:6}}>
        {([
          {key:'minexp' as const,icon:'🔒',label:'Min Exp'},
          {key:'maxexp' as const,icon:'%',label:'Max Exp'},
          {key:'stacks' as const,icon:'📊',label:'Stacks'},
          {key:'projections' as const,icon:'📈',label:'Projections'},
          {key:'players' as const,icon:'👥',label:'Players'},
        ]).map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={TAB(tab===t.key)}>
            <span style={{fontSize:18}}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Min Exp */}
      {tab==='minexp' && (
        <div style={card}>
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:4}}>Minimum Exposure</h3>
          <p style={{fontSize:12,color:'#64748b',marginBottom:16}}>Lock a player into a slot or set minimum exposure.</p>
          <div style={{display:'grid',gridTemplateColumns:'50px 1fr 130px',gap:10,alignItems:'center',marginBottom:8}}>
            <span style={{fontSize:11,color:'#64748b',fontWeight:600}}>Slot</span>
            <span style={{fontSize:11,color:'#64748b',fontWeight:600}}>Player</span>
            <span style={{fontSize:11,color:'#64748b',fontWeight:600,textAlign:'center' as const}}>Min Exposure</span>
          </div>
          {SLOTS.map((slot,i)=>(
            <div key={i} style={{display:'grid',gridTemplateColumns:'50px 1fr 130px',gap:10,alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:13,fontWeight:700,color:'#94a3b8'}}>{slot}</span>
              <select style={{...inp,width:'100%'}} defaultValue="">
                <option value="">Optimize</option>
                {players.filter((p:any)=>slot==='P'?p.position==='SP':p.position===slot)
                  .sort((a:any,b:any)=>b.proj_fpts-a.proj_fpts).slice(0,30)
                  .map((p:any)=><option key={p.id} value={p.id}>{p.player_name} ({p.team})</option>)}
              </select>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input type="range" min={0} max={100} defaultValue={100} style={{flex:1,accentColor:'#2dd4bf'}}/>
                <span style={{fontSize:12,color:'#2dd4bf',fontWeight:700,width:38,textAlign:'right' as const}}>100%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Max Exp */}
      {tab==='maxexp' && (
        <div style={card}>
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:4}}>Maximum Exposure</h3>
          <p style={{fontSize:12,color:'#64748b',marginBottom:20}}>Limit how often any player appears across your lineups.</p>
          <Slider label="Default Max Exposure %" value={defaultMaxExp} min={1} max={100} onChange={setMaxExp}/>
          <div style={{marginTop:20}}>
            <div style={{fontSize:13,fontWeight:600,color:'#94a3b8',marginBottom:8}}>Custom Max Exposure per Player</div>
            {playerExp.length===0 && <p style={{fontSize:12,color:'#334155'}}>Generate lineups first to see players here.</p>}
            {playerExp.slice(0,15).map((p:any)=>(
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                <span style={{fontSize:12,flex:1}}>{p.player_name} <span style={{color:'#475569'}}>({p.team})</span></span>
                <input type="number" min={0} max={100} defaultValue={defaultMaxExp} style={{...inp,width:70,textAlign:'center' as const}}/>
                <span style={{fontSize:11,color:'#475569'}}>%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stacks */}
      {tab==='stacks' && (
        <div style={card}>
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:4}}>Stacks</h3>
          <p style={{fontSize:12,color:'#64748b',marginBottom:16}}>Select one or more stack patterns. Rotated across lineups.</p>
          <div style={{fontSize:13,fontWeight:600,color:'#94a3b8',marginBottom:10}}>Common Stacks</div>
          <div style={{display:'flex',gap:8,marginBottom:20}}>
            {['4-3 Team Stack','4-4 Team Stack'].map(k=>(
              <button key={k} onClick={()=>{const n=new Set(selectedStacks);n.has(k)?n.delete(k):n.add(k);setStacks(n);}} style={{
                padding:'8px 20px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,
                border:`1px solid ${selectedStacks.has(k)?'#2dd4bf':'rgba(255,255,255,0.12)'}`,
                background:selectedStacks.has(k)?'rgba(45,212,191,0.1)':'transparent',
                color:selectedStacks.has(k)?'#2dd4bf':'#94a3b8',
              }}>{k}</button>
            ))}
          </div>
          <div style={{fontSize:13,fontWeight:600,color:'#94a3b8',marginBottom:10}}>Custom Stacks</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
            {Object.keys(COMBO_MAP).filter(k=>!['4-3 Team Stack','4-4 Team Stack'].includes(k)).map(k=>(
              <label key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:8,cursor:'pointer',
                border:`1px solid ${selectedStacks.has(k)?'rgba(45,212,191,0.4)':'rgba(255,255,255,0.06)'}`,
                background:selectedStacks.has(k)?'rgba(45,212,191,0.06)':'transparent'}}>
                <input type="checkbox" checked={selectedStacks.has(k)}
                  onChange={()=>{const n=new Set(selectedStacks);n.has(k)?n.delete(k):n.add(k);setStacks(n);}}
                  style={{accentColor:'#2dd4bf'}}/>
                <span style={{fontSize:12,fontWeight:700,color:selectedStacks.has(k)?'#2dd4bf':'#64748b'}}>{k}</span>
              </label>
            ))}
          </div>
          <div style={{fontSize:13,fontWeight:600,color:'#94a3b8',marginBottom:10}}>Per-Team Player Limits</div>
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',background:'rgba(255,255,255,0.04)',borderRadius:8}}>
            <span style={{fontSize:13,flex:1}}>Limit to <strong style={{color:'#2dd4bf'}}>{maxPerTeam}</strong> offensive players from any given team.</span>
            <div style={{display:'flex',gap:6}}>
              {[3,4,5,6,7].map(n=>(
                <button key={n} style={{width:32,height:32,borderRadius:6,
                  border:`1px solid ${n===maxPerTeam?'#2dd4bf':'rgba(255,255,255,0.1)'}`,
                  background:n===maxPerTeam?'rgba(45,212,191,0.1)':'transparent',
                  color:n===maxPerTeam?'#2dd4bf':'#64748b',cursor:'pointer',fontSize:12,fontWeight:700}}>{n}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Projections */}
      {tab==='projections' && (
        <div style={card}>
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:4}}>Projections</h3>
          <p style={{fontSize:12,color:'#64748b',marginBottom:16}}>Add variability to projections for more diverse lineups.</p>
          <div style={{fontSize:13,fontWeight:600,color:'#94a3b8',marginBottom:12}}>Projection Variability (%)</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:10,marginBottom:24}}>
            {['P','C','1B','2B','3B','SS','OF'].map(pos=>(
              <div key={pos}>
                <div style={{fontSize:11,color:'#64748b',textAlign:'center' as const,marginBottom:4}}>{pos}</div>
                <input type="number" min={0} max={50} defaultValue={0} style={{...inp,textAlign:'center' as const,padding:'6px 4px',width:'100%'}}/>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <button style={{padding:'10px 0',borderRadius:8,border:'1px solid rgba(255,255,255,0.12)',background:'transparent',color:'#94a3b8',cursor:'pointer',fontSize:13}}>Edit Projections</button>
            <button style={{padding:'10px 0',borderRadius:8,border:'1px solid rgba(45,212,191,0.4)',background:'rgba(45,212,191,0.06)',color:'#2dd4bf',cursor:'pointer',fontSize:13,fontWeight:600}}>↑ Upload Projections</button>
          </div>
          {players.length>0 && <div style={{marginTop:10,fontSize:12,color:'#475569',textAlign:'center' as const}}>{players.length} players loaded</div>}
        </div>
      )}

      {/* Players */}
      {tab==='players' && (
        <>
          <div style={card}>
            <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Players</h3>
            <Slider label="Max Player Overlap" value={maxOverlap} min={0} max={9} onChange={setOverlap}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,margin:'16px 0'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'rgba(255,255,255,0.03)',borderRadius:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>Avoid Opposing Pitcher</div>
                  <div style={{fontSize:11,color:'#475569'}}>No batters vs your SPs</div>
                </div>
                <Toggle val={avoidOpp} onClick={()=>setAvoidOpp(v=>!v)}/>
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'rgba(255,255,255,0.03)',borderRadius:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>Show No Projection</div>
                  <div style={{fontSize:11,color:'#475569'}}>Include unranked players</div>
                </div>
                <Toggle val={false} onClick={()=>{}}/>
              </div>
            </div>
            <div style={{fontSize:13,fontWeight:600,color:'#94a3b8',marginBottom:10}}>Salary Range</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:12,alignItems:'center',marginBottom:20}}>
              <div><div style={{fontSize:11,color:'#64748b',marginBottom:4}}>Min Total Salary</div>
                <input type="number" value={minSalary} onChange={e=>setMinSal(+e.target.value)} style={{...inp,width:'100%'}}/></div>
              <div style={{textAlign:'center' as const,color:'#475569',fontSize:12}}>Range ($)</div>
              <div><div style={{fontSize:11,color:'#64748b',marginBottom:4}}>Max Total Salary</div>
                <input type="number" value={50000} readOnly style={{...inp,width:'100%',opacity:.6}}/></div>
            </div>
          </div>
          <div style={card}>
            <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Ownership</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:12,alignItems:'center',marginBottom:16}}>
              <div><div style={{fontSize:11,color:'#64748b',marginBottom:4}}>Min Total Ownership %</div>
                <input type="number" defaultValue={0} style={{...inp,width:'100%'}}/></div>
              <div style={{textAlign:'center' as const,color:'#475569',fontSize:12}}>Range (%)</div>
              <div><div style={{fontSize:11,color:'#64748b',marginBottom:4}}>Max Total Ownership %</div>
                <input type="number" value={maxOwn} onChange={e=>setMaxOwn(+e.target.value)} style={{...inp,width:'100%'}}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <button style={{padding:'10px 0',borderRadius:8,border:'1px solid rgba(255,255,255,0.12)',background:'transparent',color:'#94a3b8',cursor:'pointer',fontSize:13}}>Edit Ownership</button>
              <button style={{padding:'10px 0',borderRadius:8,border:'1px solid rgba(45,212,191,0.4)',background:'rgba(45,212,191,0.06)',color:'#2dd4bf',cursor:'pointer',fontSize:13,fontWeight:600}}>↑ Upload Ownership Data</button>
            </div>
          </div>
          {/* Player pool */}
          <div style={card}>
            <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap' as const}}>
              <h3 style={{fontSize:15,fontWeight:700,margin:0}}>Player Pool</h3>
              <span style={{fontSize:12,color:'#475569',marginLeft:'auto'}}>{filteredPlayers.length} players</span>
              <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,width:150}}/>
              <select value={posFilter} onChange={e=>setPos(e.target.value)} style={{...inp,width:70}}>
                {['All','SP','C','1B','2B','3B','SS','OF'].map(p=><option key={p}>{p}</option>)}
              </select>
              {(locked.size>0||excluded.size>0) && (
                <button onClick={()=>{setLocked(new Set());setExcluded(new Set());}} style={{fontSize:12,color:'#64748b',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Clear</button>
              )}
            </div>
            {loading ? <div style={{textAlign:'center' as const,padding:40,color:'#475569'}}>Loading...</div>
            : players.length===0 ? <div style={{textAlign:'center' as const,padding:40,color:'#475569'}}>Upload projections in Admin to load the player pool.</div>
            : (
              <div style={{maxHeight:450,overflowY:'auto' as const}}>
                <table style={{width:'100%',borderCollapse:'collapse' as const,fontSize:12}}>
                  <thead style={{position:'sticky' as const,top:0,background:'#141420'}}>
                    <tr style={{borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                      <th style={{padding:'6px 8px',width:30}}/>
                      <th style={{padding:'6px 8px',textAlign:'left' as const,color:'#64748b',fontWeight:600,fontSize:11}}>Player</th>
                      <th style={{padding:'6px 8px',textAlign:'left' as const,color:'#64748b',fontWeight:600,fontSize:11}}>Pos</th>
                      <th style={{padding:'6px 8px',textAlign:'left' as const,color:'#64748b',fontWeight:600,fontSize:11}}>Sal</th>
                      <th style={{padding:'6px 8px',textAlign:'left' as const,color:'#64748b',fontWeight:600,fontSize:11}}>Proj</th>
                      <th style={{padding:'6px 8px',textAlign:'left' as const,color:'#64748b',fontWeight:600,fontSize:11}}>Own%</th>
                      <th style={{padding:'6px 8px',width:30}}/>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.slice(0,150).map((p:any)=>{
                      const isL=locked.has(p.id), isX=excluded.has(p.id);
                      return (
                        <tr key={p.id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',opacity:isX?0.3:1,background:isL?'rgba(45,212,191,0.04)':''}}>
                          <td style={{padding:'5px 8px'}}>
                            <button onClick={()=>{const n=new Set(locked);n.has(p.id)?n.delete(p.id):n.add(p.id);setLocked(n);}}
                              style={{width:20,height:20,borderRadius:4,border:`1px solid ${isL?'#2dd4bf':'rgba(255,255,255,0.1)'}`,background:isL?'rgba(45,212,191,0.2)':'transparent',cursor:'pointer',fontSize:10,color:isL?'#2dd4bf':'#475569'}}>
                              {isL?'✓':'+'}
                            </button>
                          </td>
                          <td style={{padding:'5px 8px',fontWeight:500}}>{p.player_name} <span style={{color:'#475569'}}>({p.team})</span></td>
                          <td style={{padding:'5px 8px',color:'#94a3b8'}}>{p.position}</td>
                          <td style={{padding:'5px 8px'}}>${(p.salary||0).toLocaleString()}</td>
                          <td style={{padding:'5px 8px',color:'#60a5fa',fontWeight:700}}>{(p.proj_fpts||0).toFixed(1)}</td>
                          <td style={{padding:'5px 8px',color:'#94a3b8'}}>{p.proj_ownership>0?`${p.proj_ownership.toFixed(1)}%`:'—'}</td>
                          <td style={{padding:'5px 8px'}}>
                            <button onClick={()=>{const n=new Set(excluded);n.has(p.id)?n.delete(p.id):n.add(p.id);setExcluded(n);}}
                              style={{width:20,height:20,borderRadius:4,border:`1px solid ${isX?'rgba(34,197,94,0.4)':'rgba(239,68,68,0.2)'}`,background:isX?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.04)',cursor:'pointer',fontSize:10,color:isX?'#22c55e':'#ef4444'}}>
                              {isX?'+':'X'}
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
        </>
      )}

      {/* Results modal */}
      {showResults && lineups.length>0 && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:100,display:'flex',alignItems:'flex-start',justifyContent:'center',overflowY:'auto',padding:'30px 16px'}}>
          <div style={{background:'#13131f',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,width:'100%',maxWidth:1300,padding:24}}>
            <div style={{display:'flex',alignItems:'center',marginBottom:16}}>
              <div style={{fontSize:16,fontWeight:700}}>Total number of lineups: {lineups.length}</div>
              <button onClick={()=>setShowResults(false)} style={{marginLeft:'auto',background:'none',border:'none',color:'#94a3b8',cursor:'pointer',fontSize:22}}>×</button>
            </div>
            {/* DKEntries upload for auto-fill */}
            <div style={{marginBottom:12,padding:'10px 14px',background:'rgba(45,212,191,0.04)',border:'1px solid rgba(45,212,191,0.15)',borderRadius:8}}>
              <div style={{fontSize:12,color:'#2dd4bf',fontWeight:600,marginBottom:6}}>
                Step 1: Upload your DKEntries.csv <span style={{color:'#475569',fontWeight:400}}>(from DK → Lineups → Edit Entries → Download)</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <label style={{display:'flex',alignItems:'center',gap:8,padding:'7px 14px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:6,cursor:'pointer',fontSize:13}}>
                  <span>📂</span>
                  <span style={{color:contestInfo?'#22c55e':'#94a3b8'}}>{dkFileName || 'Choose DKEntries.csv...'}</span>
                  <input type="file" accept=".csv" style={{display:'none'}} onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setDkFileName(file.name);
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const parsed = parseDKEntries(ev.target?.result as string);
                      setContestInfo(parsed);
                    };
                    reader.readAsText(file);
                  }}/>
                </label>
                {contestInfo && (
                  <div style={{fontSize:11,color:'#22c55e'}}>
                    ✓ {contestInfo.entryIds.length} entries · {contestInfo.name.slice(0,30)}
                  </div>
                )}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'6px 12px',flex:1}}>
                <span style={{fontSize:13,color:'#94a3b8'}}>{contestInfo ? '✓ Ready to upload directly to DK' : 'lineups.csv (paste entry IDs manually)'}</span>
                <button onClick={()=>downloadCSV(lineups, contestInfo || undefined)} style={{marginLeft:'auto',background:'rgba(45,212,191,0.15)',border:'1px solid rgba(45,212,191,0.3)',borderRadius:6,color:'#2dd4bf',cursor:'pointer',padding:'4px 14px',fontSize:13,fontWeight:600}}>
                  Step 2: ↓ Download
                </button>
              </div>
              <button onClick={()=>{setLineups([]);setShowResults(false);setContestInfo(null);setDkFileName('');}} style={{padding:'8px 20px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,color:'#ef4444',cursor:'pointer',fontSize:13}}>Clear</button>
            </div>
            <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:'1px solid rgba(255,255,255,0.08)',paddingBottom:10}}>
              {(['lineups','playerExp','teamExp'] as const).map(v=>(
                <button key={v} onClick={()=>setView(v)} style={{
                  padding:'6px 18px',borderRadius:8,border:'none',cursor:'pointer',fontSize:13,
                  background:view===v?'rgba(45,212,191,0.15)':'transparent',
                  color:view===v?'#2dd4bf':'#64748b',fontWeight:view===v?600:400}}>
                  {v==='lineups'?'Lineups':v==='playerExp'?'Player Exp.':'Team Exp.'}
                </button>
              ))}
            </div>
            {view==='lineups' && (
              <div style={{overflowX:'auto' as const}}>
                <table style={{width:'100%',borderCollapse:'collapse' as const,fontSize:12}}>
                  <thead>
                    <tr style={{borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
                      <th style={{width:28}}/>
                      {['P1','P2','C','1B','2B','3B','SS','OF1','OF2','OF3'].map(h=>(
                        <th key={h} style={{padding:'6px 10px',textAlign:'left' as const,color:'#64748b',fontSize:11,fontWeight:600}}>{h}</th>
                      ))}
                      <th style={{padding:'6px 10px',textAlign:'right' as const,color:'#64748b',fontSize:11,fontWeight:600}}>PROJ. POINTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineups.map((roster,i)=>{
                      const byPos: Record<string,any[]>={SP:[],C:[],  '1B':[],'2B':[],'3B':[],SS:[],OF:[]};
                      roster.forEach((p:any)=>{if(byPos[p.position])byPos[p.position].push(p);});
                      const cells=[byPos.SP[0],byPos.SP[1],byPos.C[0],byPos['1B'][0],byPos['2B'][0],byPos['3B'][0],byPos.SS[0],byPos.OF[0],byPos.OF[1],byPos.OF[2]];
                      const proj=roster.reduce((s:number,p:any)=>s+(p.proj_fpts||0),0);
                      return (
                        <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}
                          onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.025)')}
                          onMouseLeave={e=>(e.currentTarget.style.background='')}>
                          <td style={{padding:'6px 8px',color:'#334155',cursor:'pointer',fontSize:13}}>🗑</td>
                          {cells.map((p,j)=>(
                            <td key={j} style={{padding:'6px 10px',whiteSpace:'nowrap' as const,fontSize:12}}>
                              {p?<>{p.player_name} <span style={{color:'#475569'}}>({p.team})</span></>:'—'}
                            </td>
                          ))}
                          <td style={{padding:'6px 10px',textAlign:'right' as const,fontWeight:700,color:'#2dd4bf'}}>{proj.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {view==='playerExp' && (
              <table style={{width:'100%',borderCollapse:'collapse' as const,fontSize:13}}>
                <thead>
                  <tr style={{borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
                    {['PLAYER','POSITION','EXPOSURE %','PROJECTION'].map(h=>(
                      <th key={h} style={{padding:'8px 12px',textAlign:'left' as const,color:'#64748b',fontSize:11,fontWeight:600}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {playerExp.map((p:any)=>(
                    <tr key={p.id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <td style={{padding:'8px 12px',fontWeight:500}}>{p.player_name}</td>
                      <td style={{padding:'8px 12px',color:'#94a3b8'}}>{p.position}</td>
                      <td style={{padding:'8px 12px',color:p.expPct>defaultMaxExp+5?'#ef4444':'#2dd4bf',fontWeight:700}}>{p.expPct}%</td>
                      <td style={{padding:'8px 12px',color:'#60a5fa'}}>{(p.proj_fpts||0).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {view==='teamExp' && (
              <table style={{width:'100%',borderCollapse:'collapse' as const,fontSize:13}}>
                <thead>
                  <tr style={{borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
                    {['TEAM','LINEUP EXPOSURE %'].map(h=>(
                      <th key={h} style={{padding:'8px 12px',textAlign:'left' as const,color:'#64748b',fontSize:11,fontWeight:600}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamExp.map((t:any)=>(
                    <tr key={t.team} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <td style={{padding:'8px 12px',fontWeight:600}}>{t.team}</td>
                      <td style={{padding:'8px 12px',color:'#2dd4bf',fontWeight:700}}>{t.expPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'#0e0e14',borderTop:'1px solid rgba(255,255,255,0.08)',padding:'12px 24px',display:'flex',alignItems:'center',gap:16,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:13,color:'#94a3b8',whiteSpace:'nowrap' as const}}>Number of Lineups</span>
          <input type="number" value={numLineups} min={1} max={150}
            onChange={e=>setNum(Math.min(150,Math.max(1,+e.target.value)))}
            style={{...inp,width:80,textAlign:'center' as const}}/>
        </div>
        <div style={{flex:1}}>
          {warn && <div style={{fontSize:12,color:'#f59e0b'}}>{warn}</div>}
          {debug && <div style={{fontSize:11,color:'#475569',marginTop:2}}>{debug}</div>}
        </div>
        <div style={{display:'flex',gap:12,marginLeft:'auto'}}>
          <button onClick={generate} disabled={generating||players.length===0} style={{
            padding:'12px 44px',borderRadius:8,border:'none',
            cursor:generating||players.length===0?'not-allowed':'pointer',
            background:generating||players.length===0?'#334155':'linear-gradient(135deg,#2dd4bf,#0891b2)',
            color:'white',fontSize:15,fontWeight:700,opacity:generating||players.length===0?0.6:1}}>
            {generating?'Generating...':'Generate Lineups'}
          </button>
          <button onClick={()=>lineups.length>0&&setShowResults(true)} style={{
            padding:'12px 44px',borderRadius:8,
            border:`1px solid ${lineups.length>0?'rgba(45,212,191,0.4)':'rgba(255,255,255,0.1)'}`,
            background:lineups.length>0?'rgba(45,212,191,0.08)':'transparent',
            color:lineups.length>0?'#2dd4bf':'#475569',fontSize:15,fontWeight:700,cursor:lineups.length>0?'pointer':'default'}}>
            View Lineups{lineups.length>0?` (${lineups.length})`:''}
          </button>
        </div>
      </div>
    </div>
  );
}
