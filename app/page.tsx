'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DailySlate from '@/components/DailySlate';
import DFSOptimizer from '@/components/DFSOptimizer';
import PickemPredictor from '@/components/PickemPredictor';
import AdminPanel from '@/components/AdminPanel';
import AuthModal from '@/components/AuthModal';
import UserSettings from '@/components/UserSettings';
import TeamFeed from '@/components/TeamFeed';

const MAIN_TABS = [
  { id: 'dfs',     icon: '🏆', label: 'DFS Optimizer' },
  { id: 'bets',    icon: '🎲', label: 'Bets' },
  { id: 'feed',    icon: '📡', label: 'Team Feed' },
];

export default function HomePage() {
  const { user, isAdmin, isPremium, logout, loading } = useAuth();
  const [tab, setTab] = useState('dfs');
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState<'login'|'register'>('login');
  const [showSettings, setShowSettings] = useState(false);

  const switchTab = (id: string) => {
    setTab(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openLogin = () => { setAuthTab('login'); setShowAuth(true); };
  const openRegister = () => { setAuthTab('register'); setShowAuth(true); };

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0e0e0e' }}>
        <div style={{ color:'#475569', fontSize:14 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0e0e0e' }}>

      {/* Sticky header + nav + slate */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'#0e0e0e' }}>

        {/* Top bar */}
        <div style={{ borderBottom:'1px solid rgba(196,30,58,0.12)', padding:'0 20px' }}>
          <div style={{ maxWidth:1400, margin:'0 auto' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0 0', flexWrap:'wrap' }}>

              {/* Logo */}
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <svg width="24" height="30" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="40,0 0,25 40,35" fill="#c41e3a"/>
                  <polygon points="40,0 80,25 40,35" fill="#9b1830"/>
                  <polygon points="0,25 40,35 18,88" fill="#6e1022"/>
                  <polygon points="80,25 40,35 62,88" fill="#c41e3a" opacity="0.78"/>
                  <polygon points="40,35 18,88 40,96" fill="#4a0b18"/>
                  <polygon points="40,35 62,88 40,96" fill="#851525"/>
                  <polygon points="40,0 80,25 40,96 0,25" fill="none" stroke="#c41e3a" stroke-width="1.5" opacity="0.3"/>
                </svg>
                <div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:21, fontWeight:700, lineHeight:1, letterSpacing:'-0.5px' }}>
                    Ruby <span style={{ color:'#c41e3a' }}>Ace</span>
                  </div>
                  <div style={{ fontSize:9, color:'#334155', letterSpacing:'.1em', textTransform:'uppercase' }}>MLB Analytics</div>
                </div>
              </div>

              {/* Right */}
              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <div style={{
                  display:'inline-flex', alignItems:'center', gap:4,
                  background:'rgba(34,197,94,0.08)', color:'#22c55e',
                  padding:'2px 9px', borderRadius:20, fontSize:10,
                  fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif",
                  border:'1px solid rgba(34,197,94,0.2)',
                }}>
                  <span style={{ width:4, height:4, borderRadius:'50%', background:'#22c55e', display:'inline-block' }} />
                  Live
                </div>
                <span style={{ color:'#2a2a2a', fontSize:11 }}>
                  {new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                </span>
                <a href="/shop" style={{ fontSize:12, color:'#94a3b8', textDecoration:'none', padding:'4px 10px', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, fontFamily:"'Barlow',sans-serif" }}>🛒 Shop</a>

                {user ? (
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <button onClick={() => setShowSettings(true)} style={{
                      background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                      borderRadius:6, padding:'4px 10px', cursor:'pointer', color:'#94a3b8', fontSize:12,
                      fontFamily:"'Barlow',sans-serif", display:'flex', alignItems:'center', gap:5,
                    }}>
                      ♦ {user.rubys_balance ?? 0} · ⚙ {user.username}
                      {user.role === 'admin' && (
                        <span style={{ padding:'1px 6px', borderRadius:20, fontSize:9, background:'rgba(196,30,58,0.2)', color:'#f06070', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, border:'1px solid rgba(196,30,58,0.4)' }}>ADMIN</span>
                      )}
                    </button>
                    <button className="btn-outline" style={{ fontSize:11, padding:'4px 10px' }} onClick={logout}>Sign Out</button>
                  </div>
                ) : (
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn-outline" style={{ fontSize:11, padding:'4px 10px' }} onClick={openLogin}>Sign In</button>
                    <button className="btn-primary" style={{ fontSize:11, padding:'4px 12px' }} onClick={openRegister}>Sign Up</button>
                  </div>
                )}
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ display:'flex', gap:5, padding:'10px 0 0', flexWrap:'wrap' }}>
              {MAIN_TABS.map(t => (
                <button key={t.id}
                  className={`tab-btn${tab===t.id?' active':''}`}
                  onClick={() => switchTab(t.id)}>
                  {t.icon} {t.label}
                </button>
              ))}
              {isAdmin && (
                <button
                  className={`tab-btn${tab==='admin'?' active':''}`}
                  onClick={() => switchTab('admin')}
                  style={{ marginLeft:'auto' }}>
                  🔐 Admin
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Slate strip — pinned below nav */}
        <DailySlate />
      </div>

      {/* Page content */}
      <div style={{ maxWidth:1400, margin:'0 auto', padding:'20px 20px 60px' }}>

        {tab === 'dfs'     && <><div className="section-label">DraftKings DFS Optimizer</div><DFSOptimizer /></>}
        {tab === 'bets'    && <PickemPredictor />}

        {tab === 'feed'    && (
          isAdmin || isPremium
            ? <TeamFeed />
            : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
                <div className="card" style={{ padding:32, textAlign:'center', maxWidth:400 }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>💎</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700, marginBottom:8 }}>Premium Feature</div>
                  <div style={{ color:'#64748b', fontSize:13, marginBottom:20 }}>Team Feed is available to Ruby Ace Premium subscribers.</div>
                  <button className="btn-primary" onClick={() => window.location.href='/premium'}>Upgrade to Premium</button>
                </div>
              </div>
        )}
        {tab === 'admin'   && (
          isAdmin ? <AdminPanel /> : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
              <div className="card" style={{ padding:32, textAlign:'center', maxWidth:360 }}>
                <div style={{ fontSize:36, marginBottom:12 }}>♦</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:700, marginBottom:8 }}>Admin Access Only</div>
                <div style={{ color:'#64748b', fontSize:13, marginBottom:20 }}>Sign in with your admin account.</div>
                <button className="btn-primary" onClick={openLogin}>Sign In</button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop:'1px solid rgba(196,30,58,0.08)', padding:'12px 20px' }}>
        <div style={{ maxWidth:1400, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <div style={{ color:'#1e1e1e', fontSize:11 }}>Ruby Ace · For entertainment purposes only · <a href="/privacy" style={{color:'#334155',textDecoration:'none'}}>Privacy</a> · <a href="/terms" style={{color:'#334155',textDecoration:'none'}}>Terms</a></div>
          {!user && <button className="btn-primary" style={{ fontSize:11, padding:'4px 12px' }} onClick={openRegister}>Create Free Account</button>}
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} defaultTab={authTab} />}
      {showSettings && user && <UserSettings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
