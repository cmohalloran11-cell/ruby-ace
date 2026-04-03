'use client';
import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ContestData {
  name: string;
  entrants: number;
  prizePool: number;
  entryFee: number;
  prizes: { minRank: number; maxRank: number; prize: number }[];
}

function parseContestCSV(text: string): Partial<ContestData> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const data: Partial<ContestData> = {};

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('entrant') || lower.includes('entries')) {
      const match = line.match(/[\d,]+/);
      if (match) data.entrants = parseInt(match[0].replace(/,/g, ''));
    }
    if (lower.includes('prize pool') || lower.includes('total prizes')) {
      const match = line.match(/[\$]?([\d,]+\.?\d*)/);
      if (match) data.prizePool = parseFloat(match[1].replace(/,/g, ''));
    }
    if (lower.includes('entry fee') || lower.includes('buy-in')) {
      const match = line.match(/[\$]?([\d.]+)/);
      if (match) data.entryFee = parseFloat(match[1]);
    }
    if (lower.includes('contest name') || lower.includes('title')) {
      data.name = line.split(':').slice(1).join(':').trim() || line;
    }
  }

  // Try CSV prize table: Rank, Prize columns
  const prizes: ContestData['prizes'] = [];
  for (const line of lines) {
    const cols = line.split(',').map(c => c.trim().replace(/[$,]/g, ''));
    if (cols.length >= 2) {
      const rank = parseInt(cols[0]);
      const prize = parseFloat(cols[cols.length - 1]);
      if (!isNaN(rank) && !isNaN(prize) && prize > 0) {
        prizes.push({ minRank: rank, maxRank: rank, prize });
      }
    }
  }
  if (prizes.length > 0) data.prizes = prizes;

  return data;
}

export default function ContestSim({ lineups }: { lineups: any[][] }) {
  const { token, isPremium } = useAuth() as any;
  const [contest, setContest] = useState<ContestData>({
    name: 'MLB $300 Dime Time',
    entrants: 8500,
    prizePool: 300,
    entryFee: 0.10,
    prizes: [],
  });
  const [results, setResults] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'setup'|'results'>('setup');
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadContest = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseContestCSV(text);
    setContest(prev => ({ ...prev, ...parsed }));
    setMsg(`Loaded: ${parsed.name || file.name}`);
    if (e.target) e.target.value = '';
  };

  const runSim = () => {
    if (!lineups.length) { setMsg('Generate lineups first'); return; }
    setRunning(true); setMsg('Running simulations...');

    // Run client-side to avoid payload limits
    setTimeout(() => {
      const N_SIM = 5000;
      const { entrants, prizePool, entryFee } = contest;

      function randn() {
        const u = 1 - Math.random(), v = Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      }

      const results = lineups.map((lineup, li) => {
        const myProj = lineup.reduce((s: number, p: any) => s + (p.proj_fpts || 0), 0);
        const myStdDev = myProj * 0.28;
        let cashCount = 0, top1 = 0, top10 = 0, top25 = 0, totalPrize = 0;
        const scores: number[] = [];

        for (let sim = 0; sim < N_SIM; sim++) {
          const myScore = Math.max(0, myProj + randn() * myStdDev);
          scores.push(myScore);
          let beatenBy = 0;
          for (let f = 0; f < entrants - 1; f++) {
            const fp = 35 + randn() * 8;
            if (Math.max(0, fp + randn() * fp * 0.3) > myScore) beatenBy++;
          }
          const rank = beatenBy + 1;
          const pct = rank / entrants;
          if (pct <= 0.18) { cashCount++; totalPrize += (prizePool * 0.18) / Math.floor(entrants * 0.18); }
          if (rank === 1) top1++;
          if (pct <= 0.10) top10++;
          if (pct <= 0.25) top25++;
        }

        scores.sort((a, b) => a - b);
        const avgPrize = totalPrize / N_SIM;

        return {
          lineupIndex: li,
          projScore: myProj.toFixed(1),
          cashRate: (cashCount / N_SIM * 100).toFixed(1),
          top1Rate: (top1 / N_SIM * 100).toFixed(3),
          top10Rate: (top10 / N_SIM * 100).toFixed(1),
          top25Rate: (top25 / N_SIM * 100).toFixed(1),
          avgPrize: avgPrize.toFixed(2),
          roi: ((avgPrize / (entryFee || 0.1) - 1) * 100).toFixed(1),
          p10Score: scores[Math.floor(N_SIM * 0.1)].toFixed(1),
          p50Score: scores[Math.floor(N_SIM * 0.5)].toFixed(1),
          p90Score: scores[Math.floor(N_SIM * 0.9)].toFixed(1),
        };
      });

      setResults(results);
      setTab('results');
      setMsg(`Simulated ${N_SIM.toLocaleString()} contests × ${lineups.length} lineups`);
      setRunning(false);
    }, 50);
  };

  const inp = { background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:6, color:'#e2e8f0', padding:'6px 10px', fontSize:13, width:'100%' } as const;

  const avgCash = results.length ? (results.reduce((s,r)=>s+parseFloat(r.cashRate),0)/results.length).toFixed(1) : null;
  const avgROI  = results.length ? (results.reduce((s,r)=>s+parseFloat(r.roi),0)/results.length).toFixed(1) : null;
  const best    = results.length ? results.reduce((a,b)=>parseFloat(a.cashRate)>parseFloat(b.cashRate)?a:b) : null;

  return (
    <div style={{ padding:'16px 0' }}>
      {/* Sub tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {(['setup','results'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:'5px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13,
            background: tab===t ? 'rgba(196,30,58,0.12)' : 'transparent',
            color: tab===t ? '#f06070' : '#64748b', fontWeight: tab===t ? 600 : 400,
          }}>{t==='setup' ? 'Contest Setup' : `Results${results.length ? ` (${results.length})` : ''}`}</button>
        ))}
      </div>

      {tab === 'setup' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Manual entry */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:16 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Contest Details</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div>
                <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>Contest Name</div>
                <input style={inp} value={contest.name} onChange={e=>setContest(p=>({...p,name:e.target.value}))}/>
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

          {/* Upload or quick stats */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:16 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Upload Contest CSV</div>
            <div style={{ fontSize:12, color:'#475569', marginBottom:12, lineHeight:1.6 }}>
              Export contest details from DraftKings and upload here to auto-fill entrants, prize pool, and payout structure.
            </div>
            <button onClick={()=>fileRef.current?.click()} style={{
              width:'100%', padding:'8px 0', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)',
              background:'rgba(255,255,255,0.05)', color:'#94a3b8', fontSize:13, cursor:'pointer', marginBottom:10,
            }}>⬆ Upload Contest CSV</button>
            <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={uploadContest}/>

            {/* Current settings summary */}
            <div style={{ fontSize:12, color:'#64748b', lineHeight:2 }}>
              <div>📋 <strong style={{ color:'#94a3b8' }}>{contest.name}</strong></div>
              <div>👥 {contest.entrants.toLocaleString()} entrants</div>
              <div>💰 ${contest.prizePool.toLocaleString()} prize pool</div>
              <div>🎟 ${contest.entryFee} entry fee</div>
              <div>📊 {lineups.length} lineups ready to sim</div>
            </div>
          </div>

          {/* Run button */}
          <div style={{ gridColumn:'1/-1' }}>
            {msg && <div style={{ fontSize:12, color:'#64748b', marginBottom:8, textAlign:'center' }}>{msg}</div>}
            <button onClick={runSim} disabled={running || !lineups.length} style={{
              width:'100%', padding:'14px 0', borderRadius:10, border:'none',
              background: lineups.length && !running ? 'linear-gradient(135deg,#c41e3a,#7a1228)' : '#334155',
              color:'white', fontSize:15, fontWeight:700, cursor: lineups.length && !running ? 'pointer' : 'not-allowed',
            }}>
              {running ? `⏳ Simulating ${lineups.length} lineups × 10,000 contests...` : `▶ Run Contest Sim (${lineups.length} lineups)`}
            </button>
          </div>
        </div>
      )}

      {tab === 'results' && results.length > 0 && (
        <div>
          {/* Summary cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label:'Avg Cash Rate', value:`${avgCash}%`, color:'#22c55e' },
              { label:'Avg ROI', value:`${avgROI}%`, color: parseFloat(avgROI||'0')>=0?'#22c55e':'#ef4444' },
              { label:'Best Cash Rate', value:`${best?.cashRate}%`, color:'#f59e0b' },
              { label:'Avg Prize', value:`$${(results.reduce((s,r)=>s+parseFloat(r.avgPrize),0)/results.length).toFixed(2)}`, color:'#60a5fa' },
            ].map(c => (
              <div key={c.label} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'12px 16px', textAlign:'center' }}>
                <div style={{ fontSize:24, fontWeight:800, color:c.color }}>{c.value}</div>
                <div style={{ fontSize:11, color:'#475569' }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Per-lineup table */}
          <div style={{ maxHeight:400, overflowY:'auto' }}>
            <table className="data-table">
              <thead><tr>
                <th>Lineup</th>
                <th>Proj Score</th>
                <th>Cash Rate</th>
                <th>Top 10%</th>
                <th>Top 25%</th>
                <th>1st Place%</th>
                <th>Avg Prize</th>
                <th>ROI</th>
                <th>P10/P50/P90</th>
              </tr></thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight:700 }}>#{r.lineupIndex+1}</td>
                    <td>{r.projScore}</td>
                    <td style={{ color: parseFloat(r.cashRate)>=18?'#22c55e':'#94a3b8', fontWeight:700 }}>{r.cashRate}%</td>
                    <td style={{ color:'#60a5fa' }}>{r.top10Rate}%</td>
                    <td style={{ color:'#94a3b8' }}>{r.top25Rate}%</td>
                    <td style={{ color:'#f59e0b', fontSize:11 }}>{r.top1Rate}%</td>
                    <td style={{ color:'#22c55e' }}>${r.avgPrize}</td>
                    <td style={{ color: parseFloat(r.roi)>=0?'#22c55e':'#ef4444', fontWeight:700 }}>{r.roi}%</td>
                    <td style={{ fontSize:11, color:'#475569' }}>{r.p10Score}/{r.p50Score}/{r.p90Score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop:8, fontSize:11, color:'#334155', textAlign:'center' }}>{msg}</div>
        </div>
      )}

      {tab === 'results' && !results.length && (
        <div style={{ textAlign:'center', padding:'40px 0', color:'#334155', fontSize:13 }}>
          Run a simulation first to see results here.
        </div>
      )}
    </div>
  );
}
