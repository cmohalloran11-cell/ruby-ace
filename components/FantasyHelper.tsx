'use client';
// components/FantasyHelper.tsx
import { useState } from 'react';
import { useProjections } from '@/hooks/useData';
import { useNews } from '@/hooks/useData';
import { TeamLogo, PosBadge, MatchupGrade, LoadingSkeleton, EmptyState, fmtAvg, fmt$ } from './ui/shared';

const TABS = ['Projections', 'Start/Sit', 'Waiver Wire', 'News Feed'];

export default function FantasyHelper() {
  const [tab, setTab] = useState('Projections');
  const [posFilter, setPosFilter] = useState<string>('all');
  const { players, loading } = useProjections(undefined, posFilter === 'all' ? undefined : posFilter);
  const { news, loading: newsLoading } = useNews('ALL', 30);

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* PROJECTIONS */}
      {tab === 'Projections' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            {['all','hitters','pitchers'].map(f => (
              <button key={f} className="btn-outline"
                style={posFilter === f ? { borderColor: '#3b82f6', color: '#93c5fd' } : {}}
                onClick={() => setPosFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 12 }}>{players.length} players</span>
          </div>
          <div className="card" style={{ overflow: 'auto' }}>
            {loading ? <div style={{ padding: 12 }}><LoadingSkeleton rows={8} cols={7} /></div> : (
              players.length === 0
                ? <EmptyState message="No projections for today yet. Upload a CSV in the Admin panel." />
                : (
                  <table className="data-table">
                    <thead><tr>
                      <th>Player</th><th>Team</th><th>Pos</th>
                      <th>Proj FP</th><th>L7 Trend</th><th>Salary</th>
                      <th>Own%</th><th>Value</th>
                    </tr></thead>
                    <tbody>
                      {players.map((p: any) => (
                        <tr key={p.id}>
                          <td><span style={{ fontWeight: 500 }}>{p.player_name}</span></td>
                          <td><TeamLogo abbr={p.team || '?'} size={22} /></td>
                          <td><PosBadge pos={p.position || '?'} /></td>
                          <td><span className="neon-blue" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600 }}>{p.proj_fpts}</span></td>
                          <td>
                            <span style={{ fontSize: 12, color: '#94a3b8' }}>
                              {p.proj_hr > 0 ? `${p.proj_hr}HR ` : ''}
                              {p.proj_sb > 0 ? `${p.proj_sb}SB ` : ''}
                              {p.proj_pitching_k > 0 ? `${p.proj_pitching_k}K` : ''}
                            </span>
                          </td>
                          <td style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, fontSize: 12 }}>
                            {p.salary > 0 ? fmt$(p.salary) : '—'}
                          </td>
                          <td style={{ color: p.proj_ownership > 25 ? '#ef4444' : p.proj_ownership > 15 ? '#f59e0b' : '#22c55e', fontSize: 12 }}>
                            {p.proj_ownership > 0 ? `${p.proj_ownership}%` : '—'}
                          </td>
                          <td style={{ fontFamily: "'Barlow Condensed',sans-serif", color: (p.valueRating || 0) > 6 ? '#22c55e' : '#94a3b8', fontSize: 12 }}>
                            {p.valueRating ? p.valueRating.toFixed(2) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
            )}
          </div>
        </div>
      )}

      {/* START / SIT */}
      {tab === 'Start/Sit' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {(['Start', 'Sit'] as const).map(rec => {
            const list = rec === 'Start'
              ? players.filter((_:any,i:number)=>i<6)
              : players.filter((_:any,i:number)=>i>=players.length-6);
            return (
              <div key={rec} className="card" style={{ padding: 16 }}>
                <div className="section-label" style={{ color: rec === 'Start' ? '#22c55e' : '#ef4444' }}>
                  {rec === 'Start' ? '▲ Recommended Starts' : '▼ Consider Sitting'}
                </div>
                {loading ? <LoadingSkeleton rows={5} cols={3} /> : list.map((p:any) => (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <TeamLogo abbr={p.team||'?'} size={24} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>{p.player_name}</div>
                      <div style={{ fontSize:11, color:'#64748b' }}>{p.position} · Proj: <span style={{ color:'#3b82f6' }}>{p.proj_fpts} FP</span></div>
                    </div>
                    <span style={{ fontFamily:"'Barlow Condensed',sans-serif", color: rec==='Start'?'#22c55e':'#ef4444', fontWeight:700, fontSize:13 }}>
                      {rec==='Start'?'▲ Start':'▼ Sit'}
                    </span>
                  </div>
                ))}
                {!loading && list.length === 0 && <EmptyState message="Upload projections to see recommendations." />}
              </div>
            );
          })}
        </div>
      )}

      {/* WAIVER WIRE */}
      {tab === 'Waiver Wire' && (
        <div className="card" style={{ padding: 16 }}>
          <div className="section-label">🔥 Waiver Pickups — Sorted by Value</div>
          {loading ? <LoadingSkeleton rows={8} cols={4} /> : (
            players.length === 0
              ? <EmptyState message="Upload projections to see waiver recommendations." />
              : players
                  .filter((p:any) => p.proj_fpts > 0)
                  .sort((a:any,b:any) => (b.valueRating||0)-(a.valueRating||0))
                  .slice(0,15)
                  .map((p:any) => (
                    <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                      <TeamLogo abbr={p.team||'?'} size={26} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:500 }}>{p.player_name} <span style={{ color:'#64748b', fontSize:12 }}>({p.position})</span></div>
                        <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>
                          Proj: <span style={{ color:'#3b82f6' }}>{p.proj_fpts} FP</span>
                          {p.proj_hr > 0.1 && <> · {p.proj_hr.toFixed(2)} HR/G</>}
                          {p.proj_sb > 0.05 && <> · {p.proj_sb.toFixed(2)} SB/G</>}
                          {p.proj_pitching_k > 1 && <> · {p.proj_pitching_k.toFixed(1)} K/start</>}
                        </div>
                      </div>
                      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", color:'#22c55e', fontWeight:700, fontSize:12, background:'rgba(34,197,94,0.1)', padding:'3px 9px', borderRadius:20 }}>
                        {(p.valueRating||0).toFixed(2)} val
                      </span>
                    </div>
                  ))
          )}
        </div>
      )}

      {/* NEWS FEED */}
      {tab === 'News Feed' && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            {['ALL','NYY','LAD','BOS','HOU','ATL','PHI'].map(t => (
              <button key={t} className="btn-outline" style={{ fontSize:11, padding:'3px 10px' }}>{t}</button>
            ))}
          </div>
          {newsLoading ? <LoadingSkeleton rows={6} cols={2} /> : (
            news.length === 0
              ? <EmptyState message="No news available." />
              : news.map((item:any) => (
                <div key={item.id} className="card" style={{ padding:'12px 14px', marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                        <span style={{
                          padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700,
                          fontFamily:"'Barlow Condensed',sans-serif",
                          background: item.tag==='Injury'?'rgba(239,68,68,0.15)':item.tag==='Lineup'?'rgba(59,130,246,0.15)':'rgba(255,255,255,0.07)',
                          color: item.tag==='Injury'?'#ef4444':item.tag==='Lineup'?'#60a5fa':'#94a3b8',
                        }}>{item.tag}</span>
                        <span style={{ fontSize:11, color:'#475569' }}>
                          {new Date(item.published).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
                        </span>
                      </div>
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize:14, fontWeight:500, color:'#e2e8f0', textDecoration:'none', lineHeight:1.4,
                          display:'block', marginBottom:4 }}>
                        {item.title}
                      </a>
                      {item.summary && <div style={{ fontSize:12, color:'#64748b', lineHeight:1.5 }}>{item.summary}</div>}
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
