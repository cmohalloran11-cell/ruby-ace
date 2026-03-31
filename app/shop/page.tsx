'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const PRODUCTS = [
  {
    id: 'premium_monthly',
    name: 'Ruby Ace Premium',
    subtitle: 'Monthly subscription',
    price: 9.99,
    period: '/month',
    badge: 'MOST POPULAR',
    badgeColor: '#c41e3a',
    description: 'Full access to every Ruby Ace feature.',
    features: ['📡 Live Team Feed','📊 Custom Projections upload','🔢 Up to 1500 lineups','♦ 100 bonus Rubys on signup','📈 Stack projections boost','🎯 Cash + GPP contest sims'],
    action: 'checkout',
    cta: 'Subscribe Now',
    highlight: true,
  },
  {
    id: 'rubys_100',
    name: '100 Rubys',
    subtitle: 'One-time purchase',
    price: 1.99,
    period: '',
    badge: null,
    badgeColor: '',
    description: 'Spend on Bets entries. Each entry costs 10 ♦.',
    features: ['♦ 100 Rubys added instantly','🎲 Make up to 10 pick entries','+2 ♦ earned per entry','Never expires'],
    action: 'buy_rubys',
    rubys: 100,
    cta: 'Buy 100 Rubys',
    highlight: false,
  },
  {
    id: 'rubys_500',
    name: '500 Rubys',
    subtitle: 'Best value',
    price: 7.99,
    period: '',
    badge: 'BEST VALUE',
    badgeColor: '#f59e0b',
    description: 'Stock up and make picks all season.',
    features: ['♦ 500 Rubys added instantly','🎲 Make up to 50 pick entries','+2 ♦ earned per entry','Never expires','Save vs buying individually'],
    action: 'buy_rubys',
    rubys: 500,
    cta: 'Buy 500 Rubys',
    highlight: false,
  },
];

export default function ShopPage() {
  const { user, token, isPremium } = useAuth() as any;
  const [loading, setLoading] = useState<string|null>(null);
  const [msg, setMsg] = useState('');

  const handlePurchase = async (product: typeof PRODUCTS[0]) => {
    if (!user) { window.location.href = '/'; return; }
    setLoading(product.id); setMsg('');
    if (product.action === 'checkout') {
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
    }
    if (product.action === 'buy_rubys') {
      setMsg('Ruby purchases coming soon — watch ads to earn free Rubys in the Bets tab!');
    }
    setLoading(null);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0e0e0e', padding:'40px 20px' }}>
      <div style={{ maxWidth:900, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <a href="/" style={{ display:'inline-flex', alignItems:'center', gap:10, textDecoration:'none', marginBottom:24 }}>
            <svg width="32" height="38" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg">
              <polygon points="40,0 0,25 40,35" fill="#c41e3a"/>
              <polygon points="40,0 80,25 40,35" fill="#9b1830"/>
              <polygon points="0,25 40,35 18,88" fill="#6e1022"/>
              <polygon points="80,25 40,35 62,88" fill="#c41e3a" opacity="0.78"/>
              <polygon points="40,35 18,88 40,96" fill="#4a0b18"/>
              <polygon points="40,35 62,88 40,96" fill="#851525"/>
            </svg>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:700, color:'#e2e8f0' }}>Ruby <span style={{ color:'#c41e3a' }}>Ace</span></span>
          </a>
          <h1 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:42, fontWeight:800, margin:'0 0 8px', letterSpacing:'-1px' }}>Shop</h1>
          <p style={{ color:'#475569', fontSize:15, margin:0 }}>Unlock premium features and stock up on Rubys</p>
        </div>

        {msg && <div style={{ padding:'12px 16px', borderRadius:8, marginBottom:24, textAlign:'center', background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.3)', color:'#fbbf24', fontSize:13, maxWidth:500, margin:'0 auto 24px' }}>{msg}</div>}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:20, marginBottom:40 }}>
          {PRODUCTS.map(product => {
            const isOwned = product.id === 'premium_monthly' && isPremium;
            return (
              <div key={product.id} style={{ background: product.highlight ? 'rgba(196,30,58,0.06)' : 'rgba(255,255,255,0.03)', border:`1px solid ${product.highlight ? 'rgba(196,30,58,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius:16, padding:28, position:'relative', display:'flex', flexDirection:'column' }}>
                {product.badge && (
                  <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:product.badgeColor, color:'white', padding:'3px 14px', borderRadius:20, fontSize:10, fontWeight:800, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:'.1em', whiteSpace:'nowrap' }}>{product.badge}</div>
                )}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, color:'#475569', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase' as const, marginBottom:4 }}>{product.subtitle}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:700, marginBottom:8 }}>{product.name}</div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:8 }}>
                    <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:42, fontWeight:800, color:'#e2e8f0', lineHeight:1 }}>${product.price}</span>
                    {product.period && <span style={{ fontSize:13, color:'#475569' }}>{product.period}</span>}
                  </div>
                  <div style={{ fontSize:13, color:'#64748b', lineHeight:1.5 }}>{product.description}</div>
                </div>
                <div style={{ flex:1, marginBottom:24 }}>
                  {product.features.map((f,i) => <div key={i} style={{ fontSize:13, color:'#94a3b8', marginBottom:8 }}>{f}</div>)}
                </div>
                {isOwned ? (
                  <div style={{ padding:'12px 0', textAlign:'center' as const, color:'#22c55e', fontWeight:700, fontSize:14, border:'1px solid rgba(34,197,94,0.3)', borderRadius:10, background:'rgba(34,197,94,0.06)' }}>✓ Already subscribed</div>
                ) : (
                  <button onClick={() => handlePurchase(product)} disabled={loading===product.id || !user} style={{ width:'100%', padding:'13px 0', borderRadius:10, background: product.highlight ? (user ? 'linear-gradient(135deg,#c41e3a,#7a1228)' : '#334155') : (user ? 'rgba(255,255,255,0.08)' : '#334155'), color: user ? 'white' : '#64748b', fontSize:14, fontWeight:700, cursor: user && loading!==product.id ? 'pointer' : 'not-allowed', border: product.highlight ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
                    {loading===product.id ? 'Loading...' : !user ? 'Sign in to purchase' : product.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding:'20px 24px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, marginBottom:32 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:700, marginBottom:12 }}>♦ What are Rubys?</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16 }}>
            {[{icon:'▶',title:'Watch ads',desc:'Earn 5 ♦ per ad, up to 5x per day (free)'},{icon:'🎲',title:'Make entries',desc:'Earn 2 ♦ every time you submit a pick entry'},{icon:'💎',title:'Go Premium',desc:'Get 100 bonus Rubys when you subscribe'},{icon:'🛒',title:'Buy Rubys',desc:'Purchase Rubys directly in the shop'}].map(item => (
              <div key={item.title} style={{ display:'flex', gap:10 }}>
                <span style={{ fontSize:20 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', marginBottom:2 }}>{item.title}</div>
                  <div style={{ fontSize:12, color:'#475569' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign:'center' as const }}><a href="/" style={{ fontSize:13, color:'#334155', textDecoration:'none' }}>← Back to Ruby Ace</a></div>
      </div>
    </div>
  );
}
