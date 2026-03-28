'use client';
// app/page.tsx
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DailySlate from '@/components/DailySlate';
import FantasyHelper from '@/components/FantasyHelper';
import DFSOptimizer from '@/components/DFSOptimizer';
import PickemPredictor from '@/components/PickemPredictor';
import AdminPanel from '@/components/AdminPanel';
import AuthModal from '@/components/AuthModal';
import UserSettings from '@/components/UserSettings';
import ESPNLeague from '@/components/ESPNLeague';

const MAIN_TABS = [
  { id: 'fantasy', icon: '⚡', label: 'Fantasy Helper' },
  { id: 'dfs',     icon: '🏆', label: 'DFS Optimizer' },
  { id: 'pickem',  icon: '🎯', label: "Pick'em Tool" },
  { id: 'league',  icon: '🏟', label: 'My League' },
];

// Ruby Ace brand colors
const R = {
  accent: '#c41e3a',
  accentHover: '#e02247',
  accentDim: '#9b1c35',
  accentBg: '#2d0810',
  accentBorder: 'rgba(196,30,58,0.4)',
  accentText: '#f06070',
};

export default function HomePage() {
  const { user, isAdmin, logout, loading } = useAuth();
  const [tab, setTab] = useState('fantasy');
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState<'login'|'register'>('login');
  const [showSettings, setShowSettings] = useState(false);

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

      {/* Header */}
      <div style={{
        background:'#0e0e0e',
        borderBottom:`1px solid rgba(196,30,58,0.15)`,
        padding:'0 20px',
        position:'sticky', top:0, zIndex:50,
      }}>
        <div style={{ maxWidth:1400, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 0 0', flexWrap:'wrap' }}>

            {/* Logo */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width: 36, height: 36,
                background: `linear-gradient(135deg, ${R.accentBg}, ${R.accentDim})`,
                border: `1px solid ${R.accentBorder}`,
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>♦</div>
              <div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 22, fontWeight: 700, lineHeight: 1,
                  letterSpacing: '-0.5px',
                }}>
                  Ruby <span style={{ color: R.accent }}>Ace</span>
                </div>
                <div style={{ fontSize: 10, color: '#475569', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  MLB Analytics
                </div>
              </div>
            </div>

            {/* Right side */}
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              {/* Live badge */}
              <div style={{
                display:'inline-flex', alignItems:'center', gap:5,
                background:'rgba(34,197,94,0.08)', color:'#22c55e',
                padding:'3px 10px', borderRadius:20, fontSize:11,
                fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif",
                border:'1px solid rgba(34,197,94,0.2)',
              }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e', display:'inline-block' }} />
                Live Data
              </div>

              <span style={{ color:'#334155', fontSize:12 }}>
                {new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
              </span>

              {user ? (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={() => setShowSettings(true)} style={{
                    background:'rgba(255,255,255,0.04)',
                    border:'1px solid rgba(255,255,255,0.08)',
                    borderRadius:6, padding:'5px 12px',
                    cursor:'pointer', color:'#94a3b8', fontSize:13,
                    fontFamily:"'Barlow',sans-serif",
                    display:'flex', alignItems:'center', gap:6,
                    transition:'all .15s',
                  }}>
                    ⚙ {user.username}
                    {user.role === 'admin' && (
                      <span style={{
                        padding:'1px 7px', borderRadius:20, fontSize:10,
                        background:`rgba(196,30,58,0.2)`, color:R.accentText,
                        fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                        border:`1px solid ${R.accentBorder}`,
                      }}>ADMIN</span>
                    )}
                  </button>
                  <button className="btn-outline" style={{ fontSize:12 }} onClick={logout}>
                    Sign Out
                  </button>
                </div>
              ) : (
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn-outline" style={{ fontSize:12 }} onClick={openLogin}>Sign In</button>
                  <button className="btn-primary" style={{ fontSize:12 }} onClick={openRegister}>Sign Up Free</button>
                </div>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display:'flex', gap:6, padding:'11px 0 0', flexWrap:'wrap' }}>
            {MAIN_TABS.map(t => (
              <button key={t.id}
                className={`tab-btn${tab===t.id?' active':''}`}
                onClick={() => setTab(t.id)}>
                {t.icon} {t.label}
              </button>
            ))}
            {isAdmin && (
              <button
                className={`tab-btn${tab==='admin'?' active':''}`}
                onClick={() => setTab('admin')}
                style={{ marginLeft:'auto' }}>
                🔐 Admin
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1400, margin:'0 auto', padding:'20px 20px 60px' }}>
        {tab !== 'admin' && <DailySlate />}

        {tab === 'fantasy' && (
          <><div className="section-label">Fantasy Baseball Helper</div><FantasyHelper /></>
        )}
        {tab === 'dfs' && (
          <><div className="section-label">DraftKings DFS Optimizer</div><DFSOptimizer /></>
        )}
        {tab === 'pickem' && (
          <><div className="section-label">Underdog Pick'em Predictor</div><PickemPredictor /></>
        )}
        {tab === 'league' && (
          <><div className="section-label">My ESPN Fantasy League</div><ESPNLeague /></>
        )}
        {tab === 'admin' && (
          isAdmin ? <AdminPanel /> : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
              <div className="card" style={{ padding:32, textAlign:'center', maxWidth:360 }}>
                <div style={{ fontSize:40, marginBottom:12 }}>♦</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:700, marginBottom:8 }}>
                  Admin Access Only
                </div>
                <div style={{ color:'#64748b', fontSize:13, marginBottom:20 }}>
                  Sign in with your admin account to manage projections, users, and scoring rules.
                </div>
                <button className="btn-primary" onClick={openLogin}>Sign In</button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop:`1px solid rgba(196,30,58,0.1)`, padding:'14px 20px' }}>
        <div style={{ maxWidth:1400, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <div style={{ color:'#2a2a2a', fontSize:12 }}>
            Ruby Ace · MLB Stats API · Open-Meteo · The Odds API · For entertainment purposes only
          </div>
          {!user && (
            <button className="btn-primary" style={{ fontSize:12 }} onClick={openRegister}>
              Create Free Account
            </button>
          )}
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} defaultTab={authTab} />}
      {showSettings && user && <UserSettings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
