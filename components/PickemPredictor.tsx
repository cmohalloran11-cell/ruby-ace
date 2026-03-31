'use client';
// components/PickemPredictor.tsx — Bets tab with Rubys entry flow
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useProps } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSkeleton, EmptyState } from './ui/shared';

const ENTRY_COST = 10;
const PICK_COLORS: Record<string,string> = {
  over:  '#22c55e',
  under: '#3b82f6',
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff/3600000), m = Math.floor(diff/60000);
  if (m < 60) return `${m}m ago`;
  return `${h}h ago`;
}

function AdWatchButton({ onEarned }: { onEarned: (n: number) => void }) {
  const { token } = useAuth() as any;
  const [watching, setWatching] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [msg, setMsg] = useState('');

  const watch = async () => {
    if (!token) { setMsg('Sign in first'); return; }
    setWatching(true); setMsg(''); setCountdown(5);
    const t = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(t); } return c - 1; }), 1000);
    await new Promise(r => setTimeout(r, 5000));
    try {
      const res = await fetch('/api/rubys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: 'ad_watch' }),
      });
      const data = await res.json();
      if (res.status === 401) { setMsg('Sign in to earn Rubys'); }
      else if (data.earned) { onEarned(data.balance); setMsg(`+${data.earned} ♦ Rubys earned!`); }
      else setMsg(data.error || 'Error');
    } catch { setMsg('Network error'); }
    setWatching(false);
  };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <button onClick={watch} disabled={watching} style={{
        padding:'6px 14px', borderRadius:8, cursor:watching?'not-allowed':'pointer',
        border:'1px solid rgba(251,191,36,0.3)', background:'rgba(251,191,36,0.08)',
        color:'#fbbf24', fontSize:12, fontWeight:600,
        opacity: watching ? 0.7 : 1,
      }}>
        {watching ? `▶ Watching ad... ${countdown}s` : '▶ Watch Ad (+5 ♦)'}
      </button>
      {msg && <span style={{ fontSize:12, color: msg.startsWith('+') ? '#22c55e' : '#ef4444' }}>{msg}</span>}
    </div>
  );
}

function ContestSim({ picks }: { picks: any[] }) {
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      const N = 10000;
      let cashWins = 0, scores: number[] = [];

      for (let i = 0; i < N; i++) {
        let score = 0;
        for (const pick of picks) {
          const proj = parseFloat(pick.projection) || parseFloat(pick.line) || 0;
          const stdDev = proj * 0.35;
          const actual = proj + (Math.random() + Math.random() - 1) * stdDev * 1.7;
          const hit = pick.direction === 'over' ? actual > pick.line : actual < pick.line;
          if (hit) score += pick.confidence || 7;
        }
        scores.push(score);
        if (score > picks.length * 6.5) cashWins++;
      }

      scores.sort((a,b) => a - b);
      const cashRate = ((cashWins / N * 100) || 0).toFixed(1);
      const p50 = (scores[Math.floor(N * 0.5)] || 0).toFixed(1);
      const p75 = (scores[Math.floor(N * 0.75)] || 0).toFixed(1);
      const p90 = (scores[Math.floor(N * 0.9)] || 0).toFixed(1);
      const p10 = (scores[Math.floor(N * 0.1)] || 0).toFixed(1);

      // GPP finish distribution (simulate 1000-entry field)
      let top1=0, top10=0, top25=0;
      for (let i = 0; i < N; i++) {
        const myScore = scores[i];
        const field = Array.from({length:999}, () => {
          const base = 45 + Math.random()*30;
          return base + (Math.random()-0.5)*10;
        });
        field.sort((a,b)=>b-a);
        const rank = field.filter(s => s > myScore).length + 1;
        if (rank <= 1) top1++;
        if (rank <= 100) top10++;
        if (rank <= 250) top25++;
      }

      setResult({
        cashRate,
        gppTop1: (top1/N*100).toFixed(2),
        gppTop10: (top10/N*100).toFixed(1),
        gppTop25: (top25/N*100).toFixed(1),
        p10, p50, p75, p90,
      });
      setRunning(false);
    }, 100);
  };

  return (
    <div style={{ marginTop:16, padding:'14px 16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: result ? 12 : 0 }}>
        <span style={{ fontSize:13, fontWeight:700, color:'#94a3b8' }}>Contest Simulation</span>
        <button onClick={run} disabled={running || picks.length < 2} style={{
          padding:'5px 14px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600,
          border:'1px solid rgba(196,30,58,0.4)', background:'rgba(196,30,58,0.08)', color:'#f06070',
        }}>
          {running ? 'Running 10k sims...' : '▶ Run Sim'}
        </button>
      </div>
      {result && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div style={{ padding:'10px 14px', background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:8, textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:800, color:'#22c55e' }}>{result.cashRate}%</div>
            <div style={{ fontSize:11, color:'#64748b' }}>Cash Rate (H2H)</div>
          </div>
          <div style={{ padding:'10px 14px', background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:8, textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:800, color:'#60a5fa' }}>{result.gppTop10}%</div>
            <div style={{ fontSize:11, color:'#64748b' }}>GPP Top 10%</div>
          </div>
          <div style={{ padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:6 }}>
            <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>Score distribution</div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
              <span style={{ color:'#ef4444' }}>P10: {result.p10}</span>
              <span style={{ color:'#94a3b8' }}>P50: {result.p50}</span>
              <span style={{ color:'#22c55e' }}>P90: {result.p90}</span>
            </div>
          </div>
          <div style={{ padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:6 }}>
            <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>GPP finish</div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
              <span style={{ color:'#fbbf24' }}>Top 1%: {result.gppTop1}%</span>
              <span style={{ color:'#a78bfa' }}>Top 25%: {result.gppTop25}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PickemPredictor() {
  const { picks, loading } = useProps();
  const { user, token, updateRubys } = useAuth() as any;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dirFilter, setDirFilter] = useState<'all'|'over'|'under'>('all');
  const [minConf, setMinConf] = useState(0);
  const [rubys, setRubys] = useState<number>(user?.rubys_balance ?? 0);
  const [entries, setEntries] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [view, setView] = useState<'picks'|'entries'>('picks');

  // Sync rubys from user
  useEffect(() => { setRubys(user?.rubys_balance ?? 0); }, [user]);

  // Load existing entries
  const loadEntries = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/picks', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setEntries([]); return; }
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch { setEntries([]); }
  }, [token]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const filtered = useMemo(() => picks.filter((p:any) => {
    if ((p.confidence || 0) < minConf) return false;
    if (dirFilter !== 'all' && p.direction !== dirFilter) return false;
    return true;
  }), [picks, minConf, dirFilter]);

  const selectedPicks = picks.filter((p:any) => selected.has(p.player + p.stat));
  const canEnter = selected.size >= 2 && selected.size <= 6 && rubys >= ENTRY_COST;

  const toggle = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else if (s.size < 6) s.add(id);
    setSelected(s);
  };

  const submitEntry = async () => {
    if (!user) { setSubmitMsg('Sign in to make entries'); return; }
    if (!canEnter) return;
    setSubmitting(true); setSubmitMsg('');
    try {
      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ picks: selectedPicks }),
      });
      const data = await res.json();
      if (data.entry) {
        setRubys(data.rubysBalance);
        if (updateRubys) updateRubys(data.rubysBalance);
        setSelected(new Set());
        setSubmitMsg(`Entry submitted! −${ENTRY_COST} ♦, +2 ♦ earned`);
        loadEntries();
      } else {
        setSubmitMsg(data.error || 'Failed to submit');
      }
    } catch { setSubmitMsg('Network error'); }
    setSubmitting(false);
  };

  const inp = { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, color:'#e2e8f0', padding:'5px 10px', fontSize:12 };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>

      {/* ── Left: Pick list ── */}
      <div>
        {/* Sub-tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:14, borderBottom:'1px solid rgba(255,255,255,0.06)', paddingBottom:10 }}>
          {(['picks','entries'] as const).map(v => (
            <button key={v} onClick={()=>setView(v)} style={{
              padding:'5px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13,
              background: view===v ? 'rgba(196,30,58,0.12)' : 'transparent',
              color: view===v ? '#f06070' : '#64748b', fontWeight: view===v ? 600 : 400,
            }}>{v==='picks' ? "Today's Picks" : `My Entries (${entries.length})`}</button>
          ))}
        </div>

        {view === 'picks' && (
          <>
            {/* Filters */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
              <div style={{ display:'flex', gap:5 }}>
                {(['all','over','under'] as const).map(d => (
                  <button key={d} onClick={()=>setDirFilter(d)} style={{
                    padding:'4px 12px', borderRadius:20, border:`1px solid ${dirFilter===d?'rgba(196,30,58,0.4)':'rgba(255,255,255,0.08)'}`,
                    background:dirFilter===d?'rgba(196,30,58,0.1)':'transparent',
                    color:dirFilter===d?'#f06070':'#64748b', cursor:'pointer', fontSize:12,
                  }}>{d.charAt(0).toUpperCase()+d.slice(1)}</button>
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#64748b' }}>
                Min confidence:
                <input type="range" min={0} max={9} step={0.5} value={minConf}
                  onChange={e=>setMinConf(+e.target.value)} style={{ width:70, accentColor:'#c41e3a' }}/>
                <span style={{ color:'#f06070', fontWeight:700 }}>{(minConf||0).toFixed(1)}</span>
              </div>
              <span style={{ marginLeft:'auto', fontSize:12, color:'#475569' }}>{filtered.length} picks</span>
            </div>

            {loading ? <LoadingSkeleton rows={5} cols={4}/> : (
              filtered.length === 0
                ? <EmptyState message={picks.length===0 ? 'Picks will appear once projections are uploaded for today.' : 'No picks match filters.'}/>
                : filtered.map((pick:any) => {
                    const id = pick.player + pick.stat;
                    const isSel = selected.has(id);
                    const col = PICK_COLORS[pick.direction || 'over'] || '#94a3b8';
                    return (
                      <div key={id} onClick={()=>toggle(id)} style={{
                        display:'grid', gridTemplateColumns:'1fr auto auto auto',
                        alignItems:'center', gap:12, padding:'10px 14px', marginBottom:6,
                        background: isSel ? 'rgba(196,30,58,0.08)' : 'rgba(255,255,255,0.02)',
                        border:`1px solid ${isSel ? 'rgba(196,30,58,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius:10, cursor:'pointer', transition:'all .12s',
                      }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600 }}>{pick.player || '—'}</div>
                          <div style={{ fontSize:11, color:'#475569' }}>{pick.game || ''}</div>
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontSize:13, fontWeight:700, color:col }}>
                            {(pick.direction || 'over').toUpperCase()} {pick.line ?? '—'}
                          </div>
                          <div style={{ fontSize:11, color:'#475569' }}>{pick.stat || ''}</div>
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'#94a3b8' }}>
                            {pick.odds != null ? (pick.odds > 0 ? `+${pick.odds}` : pick.odds) : '—'}
                          </div>
                          <div style={{ fontSize:11, color:'#475569' }}>odds</div>
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontSize:14, fontWeight:800, color: (pick.confidence||0)>=8?'#22c55e':(pick.confidence||0)>=7?'#f59e0b':'#ef4444' }}>
                            {(pick.confidence||0).toFixed(1)}
                          </div>
                          <div style={{ fontSize:10, color:'#475569' }}>conf</div>
                        </div>
                      </div>
                    );
                  })
            )}
          </>
        )}

        {view === 'entries' && (
          <div>
            {entries.length === 0
              ? <EmptyState message="No entries yet. Select picks and submit an entry below."/>
              : entries.map((e:any) => (
                  <div key={e.id} style={{ padding:'12px 14px', marginBottom:8, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                      <span style={{ fontSize:12, color:'#475569' }}>{timeAgo(e.created_at)} · {e.picks?.length} picks · −{e.rubys_spent} ♦</span>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                        background: e.status==='open'?'rgba(251,191,36,0.1)':e.result==='win'?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',
                        color: e.status==='open'?'#fbbf24':e.result==='win'?'#22c55e':'#ef4444',
                        border:`1px solid ${e.status==='open'?'rgba(251,191,36,0.2)':e.result==='win'?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.2)'}`,
                      }}>{e.status==='open'?'OPEN':e.result?.toUpperCase()}</span>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {e.picks?.map((p:any, i:number) => (
                        <span key={i} style={{ fontSize:11, padding:'2px 8px', borderRadius:20,
                          background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                          color: p.direction==='over'?'#22c55e':'#60a5fa',
                        }}>{p.player} — {(p.direction||'over').toUpperCase()} {p.line||0} {p.stat||''}</span>
                      ))}
                    </div>
                    {e.rubys_earned > 0 && (
                      <div style={{ marginTop:6, fontSize:11, color:'#22c55e' }}>+{e.rubys_earned} ♦ earned</div>
                    )}
                  </div>
                ))}
          </div>
        )}

        {/* Contest sim (always visible in picks view when selections made) */}
        {view === 'picks' && selectedPicks.length >= 2 && (
          <ContestSim picks={selectedPicks}/>
        )}
      </div>

      {/* ── Right: Entry builder + Rubys ── */}
      <div>
        {/* Rubys balance */}
        <div style={{ padding:'14px 16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:13, fontWeight:700 }}>♦ Rubys Balance</span>
            <span style={{ fontSize:20, fontWeight:800, color:'#c41e3a' }}>{rubys}</span>
          </div>
          {user ? (
            <AdWatchButton onEarned={(bal) => { setRubys(bal); if (updateRubys) updateRubys(bal); }}/>
          ) : (
            <div style={{ fontSize:12, color:'#475569' }}>Sign in to earn Rubys</div>
          )}
          <div style={{ marginTop:8, fontSize:11, color:'#334155' }}>
            Earn: +5 ♦ per ad · +2 ♦ per entry submitted
          </div>
        </div>

        {/* Entry builder */}
        <div style={{ padding:'14px 16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>
            Entry Builder
            <span style={{ float:'right', fontSize:12, color:'#475569' }}>{selected.size}/6 picks</span>
          </div>

          {selected.size === 0 ? (
            <div style={{ fontSize:12, color:'#334155', textAlign:'center', padding:'16px 0' }}>
              Select 2–6 picks to build an entry
            </div>
          ) : (
            selectedPicks.map((p:any) => (
              <div key={p.player+p.stat} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:12 }}>
                <span style={{ color:'#e2e8f0' }}>{p.player}</span>
                <span style={{ color: p.direction==='over'?'#22c55e':'#60a5fa', fontWeight:700 }}>
                  {(p.direction||'over').toUpperCase()} {p.line||0} {p.stat||''}
                </span>
              </div>
            ))
          )}

          {selected.size >= 2 && (
            <div style={{ marginTop:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#64748b', marginBottom:8 }}>
                <span>Entry cost</span>
                <span style={{ color:'#c41e3a', fontWeight:700 }}>−{ENTRY_COST} ♦</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#64748b', marginBottom:12 }}>
                <span>Earn on submit</span>
                <span style={{ color:'#22c55e', fontWeight:700 }}>+2 ♦</span>
              </div>
              <button onClick={submitEntry} disabled={!canEnter || submitting} style={{
                width:'100%', padding:'10px 0', borderRadius:8, border:'none',
                background: canEnter && !submitting ? 'linear-gradient(135deg,#c41e3a,#7a1228)' : '#334155',
                color:'white', fontSize:13, fontWeight:700, cursor: canEnter&&!submitting?'pointer':'not-allowed',
              }}>
                {submitting ? 'Submitting...' : !user ? 'Sign in to enter' : rubys < ENTRY_COST ? `Need ${ENTRY_COST} ♦ Rubys` : `Submit Entry (${ENTRY_COST} ♦)`}
              </button>
              {submitMsg && (
                <div style={{ marginTop:8, fontSize:12, color: submitMsg.includes('submitted')?'#22c55e':'#ef4444', textAlign:'center' }}>
                  {submitMsg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* How Rubys work */}
        <div style={{ marginTop:12, padding:'12px 14px', background:'rgba(196,30,58,0.04)', border:'1px solid rgba(196,30,58,0.12)', borderRadius:10 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#f06070', marginBottom:8 }}>How Rubys work</div>
          <div style={{ fontSize:11, color:'#475569', lineHeight:1.6 }}>
            ♦ <strong>Earn</strong> Rubys by watching ads and making entries.<br/>
            ♦ <strong>Spend</strong> {ENTRY_COST} Rubys to submit a pick entry.<br/>
            ♦ Pick 2–6 players — more picks = higher potential payout.<br/>
            ♦ Premium members get 100 bonus Rubys on signup.
          </div>
        </div>
      </div>
    </div>
  );
}
