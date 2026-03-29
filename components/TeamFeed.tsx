'use client';
import { useState, useEffect, useCallback } from 'react';

const FEEDS = [
  { id: 'UnderdogMLB',     label: 'Underdog MLB' },
  { id: 'MLB',             label: 'MLB' },
  { id: 'UnderdogNFP',     label: 'Underdog' },
  { id: 'RotoWireMLB',     label: 'RotoWire' },
  { id: 'FantasyAlarm',    label: 'Fantasy Alarm' },
  { id: 'mlbtraderumors',  label: 'MLBTR' },
  { id: 'Buster_ESPN',     label: 'Buster Olney' },
  { id: 'JonHeyman',       label: 'Jon Heyman' },
  { id: 'Ken_Rosenthal',   label: 'Ken Rosenthal' },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${d}d`;
}

function PostCard({ post, handle }: { post: any; handle: string }) {
  return (
    <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        transition: 'background .15s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg,#2d0810,#9b1c35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#f06070', flexShrink: 0,
            fontFamily: "'Barlow Condensed',sans-serif",
          }}>
            {handle[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>
              @{handle}
            </div>
            <div style={{ fontSize: 11, color: '#334155' }}>{timeAgo(post.published)}</div>
          </div>
          <div style={{ marginLeft: 'auto', color: '#1a1a2e', fontSize: 13 }}>𝕏</div>
        </div>

        {/* Post text */}
        <div style={{
          fontSize: 13, color: '#cbd5e1', lineHeight: 1.55,
          fontFamily: "'Barlow',sans-serif",
          wordBreak: 'break-word',
        }}>
          {post.text}
        </div>
      </div>
    </a>
  );
}

export default function TeamFeed() {
  const [active, setActive] = useState('UnderdogMLB');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (handle: string) => {
    setLoading(true); setError(''); setPosts([]);
    try {
      const res = await fetch(`/api/xfeed?handle=${handle}`);
      const data = await res.json();
      if (data.error || !data.items?.length) {
        setError(`Could not load @${handle} — X may be blocking the feed.`);
      } else {
        setPosts(data.items);
      }
    } catch {
      setError('Network error loading feed.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(active); }, [active, load]);

  return (
    <div>
      {/* Feed tabs */}
      <div style={{
        display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16,
        paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {FEEDS.map(f => (
          <button key={f.id} onClick={() => setActive(f.id)} style={{
            padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            fontFamily: "'Barlow Condensed',sans-serif",
            border: `1px solid ${active === f.id ? 'rgba(196,30,58,0.5)' : 'rgba(255,255,255,0.08)'}`,
            background: active === f.id ? 'rgba(196,30,58,0.12)' : 'transparent',
            color: active === f.id ? '#f06070' : '#64748b',
            transition: 'all .15s',
          }}>
            @{f.id}
          </button>
        ))}
      </div>

      {/* Feed container */}
      <div style={{
        background: '#0d0d14',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        maxHeight: 680,
        overflowY: 'auto',
        // Custom scrollbar
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(196,30,58,0.4) transparent',
      }}>
        <style>{`
          .xfeed-scroll::-webkit-scrollbar { width: 4px; }
          .xfeed-scroll::-webkit-scrollbar-track { background: transparent; }
          .xfeed-scroll::-webkit-scrollbar-thumb { background: rgba(196,30,58,0.4); border-radius: 4px; }
          .xfeed-scroll::-webkit-scrollbar-thumb:hover { background: rgba(196,30,58,0.7); }
        `}</style>

        {/* Feed header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 8,
          position: 'sticky', top: 0, background: '#0d0d14', zIndex: 1,
        }}>
          <span style={{ fontSize: 14, color: '#1a8cd8' }}>𝕏</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>@{active}</span>
          {loading && <span style={{ fontSize: 11, color: '#334155', marginLeft: 4 }}>loading...</span>}
          <button onClick={() => load(active)} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            color: '#334155', cursor: 'pointer', fontSize: 14, padding: '2px 6px',
          }} title="Refresh">↻</button>
        </div>

        {loading && (
          <div style={{ padding: 40, textAlign: 'center', color: '#334155', fontSize: 13 }}>
            Fetching posts from @{active}...
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>{error}</div>
            <a href={`https://twitter.com/${active}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#1a8cd8', textDecoration: 'none' }}>
              View @{active} on X →
            </a>
          </div>
        )}

        {!loading && !error && posts.map(post => (
          <PostCard key={post.id} post={post} handle={active} />
        ))}

        {!loading && !error && posts.length > 0 && (
          <div style={{ padding: '12px 16px', textAlign: 'center' }}>
            <a href={`https://twitter.com/${active}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#334155', textDecoration: 'none' }}>
              View all on X →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
