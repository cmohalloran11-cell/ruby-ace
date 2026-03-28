'use client';
import { useState, useEffect, useCallback } from 'react';
import { LoadingSkeleton, EmptyState } from './ui/shared';

const TEAMS = ['ALL','NYY','BOS','LAD','SF','HOU','TEX','ATL','PHI','NYM','CHC','MIL','SD','STL','CIN','PIT','COL','ARI','SEA','DET','CLE','MIN','KC','CWS','TOR','BAL','TB','MIA','WSH','OAK','LAA'];
const TAGS = ['all','Injury','Lineup','Rotation','General'];
const TAG_COLORS: Record<string,{bg:string;color:string;border:string}> = {
  Injury:   { bg:'rgba(196,30,58,0.15)',  color:'#f06070', border:'rgba(196,30,58,0.3)' },
  Lineup:   { bg:'rgba(59,130,246,0.15)', color:'#60a5fa', border:'rgba(59,130,246,0.3)' },
  Rotation: { bg:'rgba(139,92,246,0.15)', color:'#a78bfa', border:'rgba(139,92,246,0.3)' },
  General:  { bg:'rgba(255,255,255,0.06)', color:'#94a3b8', border:'rgba(255,255,255,0.1)' },
};

function TagBadge({ tag }: { tag: string }) {
  const s = TAG_COLORS[tag] || TAG_COLORS.General;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:'.06em', background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>{tag}</span>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function TeamFeed() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState('ALL');
  const [tag, setTag] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?team=${team}&tag=${tag}&limit=40`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [team, tag]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? items.filter(i => i.title?.toLowerCase().includes(search.toLowerCase()) || i.summary?.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div>
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input className="input-field" style={{ maxWidth:200, padding:'6px 12px', fontSize:13 }} placeholder="Search news..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field" style={{ width:110 }} value={team} onChange={e => { setTeam(e.target.value); }}>
          {TEAMS.map(t => <option key={t} value={t}>{t === 'ALL' ? 'All Teams' : t}</option>)}
        </select>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {TAGS.map(t => {
            const active = tag === t;
            const s = TAG_COLORS[t] || TAG_COLORS.General;
            return <button key={t} onClick={() => setTag(t)} style={{ padding:'4px 12px', borderRadius:20, border:`1px solid ${active ? s.border : 'rgba(255,255,255,0.1)'}`, background: active ? s.bg : 'transparent', color: active ? s.color : '#64748b', cursor:'pointer', fontSize:12, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, transition:'all .15s' }}>{t === 'all' ? 'All' : t}</button>;
          })}
        </div>
        <button className="btn-outline" style={{ fontSize:12, marginLeft:'auto' }} onClick={load}>↻ Refresh</button>
        {!loading && <span style={{ fontSize:12, color:'#475569' }}>{filtered.length} items</span>}
      </div>

      {loading ? <LoadingSkeleton rows={6} cols={2} /> : filtered.length === 0 ? <EmptyState message="No news found. Try changing your filters or refreshing." /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map((item: any) => (
            <div key={item.id} className="card" style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                {item.image && <img src={item.image} alt="" style={{ width:72, height:54, objectFit:'cover', borderRadius:6, flexShrink:0, border:'1px solid rgba(255,255,255,0.06)' }} onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                    <TagBadge tag={item.tag} />
                    {item.team && item.team !== 'ALL' && <span style={{ fontSize:10, fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif", color:'#64748b', letterSpacing:'.06em' }}>{item.team}</span>}
                    <span style={{ fontSize:11, color:'#475569', marginLeft:'auto' }}>{timeAgo(item.published)}</span>
                  </div>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:14, fontWeight:500, color:'#e2e8f0', textDecoration:'none', lineHeight:1.4, display:'block', marginBottom:6 }} onMouseOver={e => (e.currentTarget.style.color='#f06070')} onMouseOut={e => (e.currentTarget.style.color='#e2e8f0')}>{item.title}</a>
                  {item.summary && <div style={{ fontSize:12, color:'#64748b', lineHeight:1.6, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{item.summary}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
