'use client';
// components/TeamFeed.tsx — X/Twitter embed feed
import { useState, useEffect, useRef } from 'react';

// Top MLB accounts and beat writers to feature
const FEEDS = [
  { id: 'underdogmlb',  label: 'Underdog MLB', handle: 'UnderdogMLB',  type: 'account' },
  { id: 'mlb',          label: 'MLB',          handle: 'MLB',          type: 'account' },
  { id: 'underdog',     label: 'Underdog',     handle: 'UnderdogNFP',  type: 'account' },
  { id: 'rotowire',     label: 'RotoWire',     handle: 'RotoWireMLB',  type: 'account' },
  { id: 'fantasyalarm', label: 'Fantasy Alarm', handle: 'FantasyAlarm', type: 'account' },
  { id: 'mlbtr',        label: 'MLB Trade Rumors', handle: 'mlbtraderumors', type: 'account' },
  { id: 'buster',       label: 'Buster Olney', handle: 'Buster_ESPN',  type: 'account' },
  { id: 'heyman',       label: 'Jon Heyman',   handle: 'JonHeyman',    type: 'account' },
  { id: 'rosenthal',    label: 'Ken Rosenthal', handle: 'Ken_Rosenthal', type: 'account' },
];

declare global {
  interface Window { twttr: any; }
}

function TwitterFeed({ handle }: { handle: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';

    const loadWidget = () => {
      if (window.twttr?.widgets) {
        window.twttr.widgets.createTimeline(
          { sourceType: 'profile', screenName: handle },
          ref.current,
          {
            theme: 'dark',
            chrome: 'noheader nofooter noborders transparent',
            tweetLimit: 10,
            dnt: true,
          }
        );
      }
    };

    if (window.twttr?.widgets) {
      loadWidget();
    } else {
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.onload = loadWidget;
      document.head.appendChild(script);
    }
  }, [handle]);

  return (
    <div ref={ref} style={{ minHeight: 400 }}>
      <div style={{ padding: 40, textAlign: 'center', color: '#334155', fontSize: 13 }}>
        Loading @{handle}...
      </div>
    </div>
  );
}

export default function TeamFeed() {
  const [active, setActive] = useState('underdogmlb');
  const current = FEEDS.find(f => f.id === active) || FEEDS[0];

  return (
    <div>
      {/* Feed selector tabs */}
      <div style={{
        display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16,
        paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {FEEDS.map(f => (
          <button key={f.id} onClick={() => setActive(f.id)} style={{
            padding: '5px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '.03em',
            border: `1px solid ${active === f.id ? 'rgba(196,30,58,0.5)' : 'rgba(255,255,255,0.08)'}`,
            background: active === f.id ? 'rgba(196,30,58,0.12)' : 'transparent',
            color: active === f.id ? '#f06070' : '#64748b',
            transition: 'all .15s',
          }}>
            @{f.handle}
          </button>
        ))}
      </div>

      {/* Active feed label */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 20,
          background: 'rgba(29,161,242,0.08)', border: '1px solid rgba(29,161,242,0.2)',
          color: '#1da1f2', fontSize: 12, fontWeight: 700,
          fontFamily: "'Barlow Condensed',sans-serif",
        }}>
          𝕏 @{current.handle}
        </div>
        <span style={{ fontSize: 11, color: '#334155' }}>· live feed</span>
      </div>

      {/* Twitter embed */}
      <div style={{
        background: '#0a0a0f',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        overflow: 'hidden',
        maxHeight: 700,
        overflowY: 'auto',
      }}>
        <TwitterFeed key={current.handle} handle={current.handle} />
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: '#1e293b', textAlign: 'center' }}>
        Powered by X · For entertainment purposes only
      </div>
    </div>
  );
}
