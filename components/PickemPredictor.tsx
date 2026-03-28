'use client';
// components/PickemPredictor.tsx
import { useState, useMemo } from 'react';
import { useProps } from '@/hooks/useData';
import { TeamLogo, ConfidenceMeter, LoadingSkeleton, EmptyState } from './ui/shared';

export default function PickemPredictor() {
  const { picks, loading } = useProps();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [minConf, setMinConf] = useState(0);
  const [dirFilter, setDirFilter] = useState<'all'|'over'|'under'>('all');

  const filtered = useMemo(() => picks.filter((p:any) => {
    if (p.confidence < minConf) return false;
    if (dirFilter !== 'all' && p.direction !== dirFilter) return false;
    return true;
  }), [picks, minConf, dirFilter]);

  const toggle = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else if (s.size < 5) s.add(id);
    setSelected(s);
  };

  const selPicks = picks.filter((p:any) => selected.has(p.player + p.stat));
  const avgConf = selPicks.length ? (selPicks.reduce((a:number,p:any)=>a+p.confidence,0)/selPicks.length).toFixed(1) : 0;
  const avgHR = selPicks.length ? Math.round(selPicks.reduce((a:number,p:any)=>a+(p.hitRate||0),0)/selPicks.length) : 0;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 290px', gap:16 }}>
      {/* Picks List */}
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, flexWrap:'wrap' }}>
          <div className="section-label" style={{ marginBottom:0 }}>Today's Best Picks</div>
          <div style={{ display:'flex', gap:6 }}>
            {(['all','over','under'] as const).map(d => (
              <button key={d} className="btn-outline"
                style={dirFilter===d?{borderColor:'#3b82f6',color:'#93c5fd'}:{}}
                onClick={() => setDirFilter(d)}>
                {d.charAt(0).toUpperCase()+d.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'#64748b' }}>Min Confidence:</span>
            <input type="range" min={0} max={9} step={0.5} value={minConf}
              onChange={e => setMinConf(+e.target.value)}
              style={{ width:80 }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, color:'#3b82f6' }}>
              {minConf.toFixed(1)}
            </span>
          </div>
        </div>

        {loading ? <LoadingSkeleton rows={6} cols={4} /> : (
          filtered.length === 0
            ? <EmptyState message={picks.length === 0 ? "Prop lines not yet available for today. Check back closer to game time." : "No picks match your filters."} />
            : filtered.map((pick: any) => {
                const pickId = pick.player + pick.stat;
                const isSel = selected.has(pickId);
                const isOver = pick.direction === 'over';
                return (
                  <div key={pickId} className="card" style={{
                    padding:'13px 15px', marginBottom:9, cursor:'pointer',
                    border: isSel ? '1px solid #3b82f6' : undefined,
                    background: isSel ? 'rgba(59,130,246,0.07)' : undefined,
                    transition:'all .15s',
                  }} onClick={() => toggle(pickId)}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:11 }}>
                      <div style={{ flexShrink:0 }}>
                        <div style={{
                          display:'inline-flex', padding:'5px 11px', borderRadius:20,
                          background: isOver?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)',
                          color: isOver?'#22c55e':'#ef4444',
                          fontSize:12, fontWeight:700,
                          fontFamily:"'Barlow Condensed',sans-serif",
                        }}>
                          {isOver ? '▲ OVER' : '▼ UNDER'}
                        </div>
                        {isSel && <div style={{ fontSize:10, color:'#3b82f6', marginTop:4, textAlign:'center', fontFamily:"'Barlow Condensed',sans-serif" }}>✓ ADDED</div>}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
                          <span style={{ fontWeight:600, fontSize:14 }}>{pick.player}</span>
                          <span style={{ fontSize:11, color:'#64748b' }}>{pick.game}</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:5 }}>
                          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, color:'#94a3b8' }}>{pick.stat}</span>
                          <span style={{ fontSize:12, color:'#64748b' }}>Line: <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, color:'#e2e8f0' }}>{pick.line}</span></span>
                          {pick.odds && <span style={{ fontSize:11, color:'#64748b' }}>({pick.odds > 0 ? '+' : ''}{pick.odds})</span>}
                          {pick.hitRate && (
                            <span style={{
                              background:'rgba(255,255,255,0.06)', color:'#94a3b8',
                              padding:'2px 8px', borderRadius:20, fontSize:11,
                              fontFamily:"'Barlow Condensed',sans-serif",
                            }}>
                              Hit Rate: <span style={{ color:pick.hitRate>=70?'#22c55e':pick.hitRate>=60?'#f59e0b':'#ef4444', fontWeight:700 }}>{pick.hitRate}%</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, minWidth:90 }}>
                        <div style={{ fontSize:10, color:'#475569', marginBottom:4, fontFamily:"'Barlow Condensed',sans-serif", textTransform:'uppercase', letterSpacing:'.08em' }}>Confidence</div>
                        <ConfidenceMeter score={pick.confidence || 7} />
                      </div>
                    </div>
                  </div>
                );
              })
        )}
      </div>

      {/* My Entry */}
      <div>
        <div className="card" style={{ padding:14, marginBottom:12 }}>
          <div className="section-label">My Entry ({selected.size}/5 picks)</div>
          {selPicks.length === 0 && (
            <div style={{ color:'#475569', fontSize:13, textAlign:'center', padding:'16px 0' }}>
              Click picks to build your entry
            </div>
          )}
          {selPicks.map((p:any) => (
            <div key={p.player+p.stat} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{
                padding:'2px 7px', borderRadius:20,
                background: p.direction==='over'?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)',
                color: p.direction==='over'?'#22c55e':'#ef4444',
                fontSize:10, fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif",
              }}>{p.direction.toUpperCase()}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500 }}>{p.player}</div>
                <div style={{ fontSize:11, color:'#64748b' }}>{p.stat} {p.direction==='over'?'>':'<'} {p.line}</div>
              </div>
              <button style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:14 }}
                onClick={() => toggle(p.player+p.stat)}>✕</button>
            </div>
          ))}
          {selPicks.length >= 2 && (
            <div style={{ marginTop:14, padding:11, background:'rgba(255,255,255,0.03)', borderRadius:6 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                {[{label:'Avg Conf', val:avgConf, color:'#3b82f6'},{label:'Avg Hit%',val:`${avgHR}%`,color:'#22c55e'}].map(m => (
                  <div key={m.label}>
                    <div style={{ fontSize:10, color:'#64748b', fontFamily:"'Barlow Condensed',sans-serif", textTransform:'uppercase', letterSpacing:'.08em' }}>{m.label}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700, color:m.color }}>{m.val}</div>
                  </div>
                ))}
              </div>
              <button className="btn-primary" style={{ width:'100%' }}>Submit Entry</button>
            </div>
          )}
        </div>

        {/* Top Plays */}
        {picks.length > 0 && (
          <div className="card" style={{ padding:14 }}>
            <div className="section-label">Top Plays of the Day</div>
            {[...picks].sort((a:any,b:any)=>b.confidence-a.confidence).slice(0,4).map((p:any) => (
              <div key={p.player+p.stat} style={{ padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:500 }}>{p.player}</span>
                  <span style={{
                    padding:'2px 8px', borderRadius:20,
                    background: p.direction==='over'?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)',
                    color: p.direction==='over'?'#22c55e':'#ef4444',
                    fontSize:10, fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif",
                  }}>{p.direction.toUpperCase()} {p.line}</span>
                </div>
                <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>{p.stat}</div>
                <ConfidenceMeter score={p.confidence || 7} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
