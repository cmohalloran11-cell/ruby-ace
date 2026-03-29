'use client';
import { useState, useEffect, useCallback } from 'react';

const SOURCES = [
  { id: 'all',      label: 'All News',       tag: 'all' },
  { id: 'injuries', label: 'Injuries',       tag: 'Injury' },
  { id: 'lineups',  label: 'Lineups',        tag: 'Lineup' },
  { id: 'rotation', label: 'Rotations',      tag: 'Rotation' },
];

const TAG_STYLES: Record<string,{bg:string,color:string,border:string}> = {
  Injury:   { bg:'rgba(196,30,58,0.15)',  color:'#f06070', border:'rgba(196,30,58,0.3)' },
  Lineup:   { bg:'rgba(59,130,246,0.15)', color:'#60a5fa', border:'rgba(59,130,246,0.3)' },
  Rotation: { bg:'rgba(139,92,246,0.15)', color:'#a78bfa', border:'rgba(139,92,246,0.3)' },
  General:  { bg:'rgba(255,255,255,0.06)', color:'#94a3b8', border:'rgba(255,255,255,0.1)' },
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff/60000), h = Math.floor(m/60), dy = Math.floor(h/24);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${dy}d ago`;
}

function NewsCard({ item }: { item: any }) {
  const s = TAG_STYLES[item.tag] || TAG_STYLES.General;
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none', display:'block' }}>
      <div
        style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', cursor:'pointer', transition:'background .12s' }}
        onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.025)')}
        onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
      >
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:6 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', lineHeight:1.4, flex:1 }}>{item.title}</div>
          <span style={{ fontSize:10, color:'#334155', whiteSpace:'nowrap', marginTop:2 }}>{timeAgo(item.published)}</span>
        </div>
        {item.summary && (
          <div style={{ fontSize:12, color:'#64748b', lineHeight:1.5, marginBottom:8 }}>
            {item.summary.slice(0,200)}{item.summary.length>200?'…':''}
          </div>
        )}
        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:'.05em', background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>
          {item.tag}
        </span>
      </div>
    </a>
  );
}

export default function TeamFeed() {
  const [source, setSource] = useState('all');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (tag: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?tag=${tag}&limit=50`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const src = SOURCES.find(s => s.id === source);
    load(src?.tag || 'all');
  }, [source, load]);

  const filtered = items.filter(i =>
    !search || i.title?.toLowerCase().includes(search.toLowerCase()) || i.summary?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <style>{`
        .feed-scroll::-webkit-scrollbar { width: 3px; }
        .feed-scroll::-webkit-scrollbar-track { background: transparent; }
        .feed-scroll::-webkit-scrollbar-thumb { background: rgba(196,30,58,0.5); border-radius: 3px; }
        .feed-scroll::-webkit-scrollbar-thumb:hover { background: rgba(196,30,58,0.8); }
      `}</style>

      {/* Filter tabs + search */}
      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:14 }}>
        {SOURCES.map(s => (
          <button key={s.id} onClick={()=>setSource(s.id)} style={{
            padding:'5px 14px', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:600,
            fontFamily:"'Barlow Condensed',sans-serif",
            border:`1px solid ${source===s.id?'rgba(196,30,58,0.5)':'rgba(255,255,255,0.08)'}`,
            background:source===s.id?'rgba(196,30,58,0.12)':'transparent',
            color:source===s.id?'#f06070':'#64748b', transition:'all .15s',
          }}>{s.label}</button>
        ))}
        <input
          placeholder="Search..."
          value={search} onChange={e=>setSearch(e.target.value)}
          style={{
            marginLeft:'auto', background:'rgba(255,255,255,0.05)',
            border:'1px solid rgba(255,255,255,0.08)', borderRadius:20,
            color:'#e2e8f0', padding:'5px 14px', fontSize:12, outline:'none', width:160,
          }}
        />
      </div>

      {/* Feed container */}
      <div className="feed-scroll" style={{
        background:'#0d0d14', border:'1px solid rgba(255,255,255,0.07)',
        borderRadius:10, maxHeight:680, overflowY:'auto',
        scrollbarWidth:'thin', scrollbarColor:'rgba(196,30,58,0.5) transparent',
      }}>
        {/* Sticky header */}
        <div style={{
          padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)',
          display:'flex', alignItems:'center', gap:8,
          position:'sticky', top:0, background:'#0d0d14', zIndex:1,
        }}>
          <span style={{ fontSize:12, fontWeight:700, color:'#94a3b8', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:'.06em', textTransform:'uppercase' }}>
            MLB News Feed
          </span>
          {loading && <span style={{ fontSize:11, color:'#334155' }}>loading...</span>}
          {!loading && <span style={{ fontSize:11, color:'#334155', marginLeft:'auto' }}>{filtered.length} stories</span>}
        </div>

        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'#334155', fontSize:13 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'#334155', fontSize:13 }}>No stories found</div>
        ) : (
          filtered.map(item => <NewsCard key={item.id} item={item} />)
        )}
      </div>

      <div style={{ marginTop:8, fontSize:11, color:'#1e293b', textAlign:'center' }}>
        Powered by MLB.com · RotoWire · For entertainment purposes only
      </div>
    </div>
  );
}
