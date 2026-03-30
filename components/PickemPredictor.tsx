'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function PremiumPage() {
  const { user, token, isPremium } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) setMsg('🎉 Welcome to Premium! Your account has been upgraded.');
    if (params.get('cancelled')) setMsg('Checkout cancelled — no charge was made.');
  }, []);

  const checkout = async () => {
    if (!user) { window.location.href = '/'; return; }
    setLoading(true);
    try {
      const res = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'checkout' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setMsg(data.error || 'Something went wrong');
    } catch { setMsg('Network error'); }
    setLoading(false);
  };

  const portal = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'portal' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setMsg(data.error || 'Something went wrong');
    } catch { setMsg('Network error'); }
    setLoading(false);
  };

  const features = [
    { icon: '📡', title: 'Team Feed', desc: 'Live MLB news, injuries, and lineup updates' },
    { icon: '📊', title: 'Custom Projections', desc: 'Upload your own projections to override theBatX' },
    { icon: '🔢', title: '1500 Lineups', desc: 'Optimize up to 1500 DFS lineups at once' },
    { icon: '♦', title: '100 Bonus Rubys', desc: 'Start with 100 Rubys to use on Bets entries' },
    { icon: '📈', title: 'Stack Projections', desc: 'Team totals and implied runs auto-boost stacks' },
    { icon: '🎯', title: 'Contest Sims', desc: 'Monte Carlo cash rate and GPP projections' },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'#0e0e0e', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
      <div style={{ maxWidth:540, width:'100%' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <svg width="48" height="58" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg" style={{ margin:'0 auto 12px', display:'block' }}>
            <polygon points="40,0 0,25 40,35" fill="#c41e3a"/>
            <polygon points="40,0 80,25 40,35" fill="#9b1830"/>
            <polygon points="0,25 40,35 18,88" fill="#6e1022"/>
            <polygon points="80,25 40,35 62,88" fill="#c41e3a" opacity="0.78"/>
            <polygon points="40,35 18,88 40,96" fill="#4a0b18"/>
            <polygon points="40,35 62,88 40,96" fill="#851525"/>
          </svg>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:700 }}>
            Ruby <span style={{ color:'#c41e3a' }}>Ace</span> Premium
          </div>
          <div style={{ fontSize:13, color:'#475569', marginTop:4 }}>Unlock the full platform</div>
        </div>

        {msg && (
          <div style={{ padding:'12px 16px', borderRadius:8, marginBottom:20, textAlign:'center',
            background: msg.includes('🎉') ? 'rgba(34,197,94,0.1)' : 'rgba(251,191,36,0.1)',
            border: `1px solid ${msg.includes('🎉') ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.3)'}`,
            color: msg.includes('🎉') ? '#22c55e' : '#fbbf24', fontSize:13,
          }}>{msg}</div>
        )}

        {/* Price card */}
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(196,30,58,0.3)', borderRadius:16, padding:28, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:6 }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:48, fontWeight:800, color:'#e2e8f0', lineHeight:1 }}>$14.99</span>
            <span style={{ fontSize:14, color:'#475569' }}>/month</span>
          </div>
          <div style={{ fontSize:12, color:'#475569', marginBottom:24 }}>Cancel anytime · No contracts</div>

          {/* Features */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:24 }}>
            {features.map(f => (
              <div key={f.title} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{f.title}</div>
                  <div style={{ fontSize:11, color:'#475569', lineHeight:1.4 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {isPremium ? (
            <div>
              <div style={{ textAlign:'center', padding:'10px 0', marginBottom:12, color:'#22c55e', fontWeight:700, fontSize:14 }}>
                ✓ You're a Premium member
              </div>
              <button onClick={portal} disabled={loading} style={{
                width:'100%', padding:'14px 0', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)',
                background:'transparent', color:'#94a3b8', fontSize:14, cursor:'pointer', fontWeight:600,
              }}>
                {loading ? 'Loading...' : 'Manage Subscription'}
              </button>
            </div>
          ) : (
            <button onClick={checkout} disabled={loading || !user} style={{
              width:'100%', padding:'14px 0', borderRadius:10, border:'none',
              background: user ? 'linear-gradient(135deg,#c41e3a,#7a1228)' : '#334155',
              color:'white', fontSize:15, fontWeight:700,
              cursor: user ? 'pointer' : 'not-allowed',
            }}>
              {loading ? 'Loading...' : !user ? 'Sign in to upgrade' : 'Upgrade to Premium →'}
            </button>
          )}
        </div>

        <div style={{ textAlign:'center' }}>
          <a href="/" style={{ fontSize:13, color:'#334155', textDecoration:'none' }}>← Back to Ruby Ace</a>
        </div>
      </div>
    </div>
  );
}
