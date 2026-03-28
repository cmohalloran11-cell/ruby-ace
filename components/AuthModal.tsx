'use client';
// components/AuthModal.tsx
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export default function AuthModal({ onClose, defaultTab = 'login' }: Props) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login'|'register'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(email, password, username);
      }
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(2,8,16,0.85)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000,
    }} onClick={onClose}>
      <div className="card" style={{
        padding:32, width:380, boxShadow:'0 0 0 1px rgba(59,130,246,0.3), 0 4px 40px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <div style={{ width:36, height:36, background:'linear-gradient(135deg,#1d4ed8,#7c3aed)',
            borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>⚾</div>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700 }}>
              Ruby <span style={{ color: "#c41e3a" }}>Ace</span>
            </div>
            <div style={{ fontSize:10, color:'#475569', letterSpacing:'.1em', textTransform:'uppercase' }}>Analytics Platform</div>
          </div>
        </div>

        {/* Tab toggle */}
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          {(['login','register'] as const).map(t => (
            <button key={t} className={`tab-btn${tab===t?' active':''}`}
              style={{ flex:1, padding:'8px' }} onClick={() => setTab(t)}>
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {tab === 'register' && (
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:'#94a3b8', display:'block', marginBottom:4 }}>Username</label>
            <input className="input-field" placeholder="your_username" value={username}
              onChange={e => setUsername(e.target.value)} />
          </div>
        )}
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:12, color:'#94a3b8', display:'block', marginBottom:4 }}>Email</label>
          <input className="input-field" type="email" placeholder="you@example.com" value={email}
            onChange={e => setEmail(e.target.value)} />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, color:'#94a3b8', display:'block', marginBottom:4 }}>Password</label>
          <input className="input-field" type="password" placeholder="••••••••" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>

        {error && <div style={{ color:'#f87171', fontSize:12, marginBottom:12 }}>{error}</div>}

        <button className="btn-primary" style={{ width:'100%', padding:'10px' }}
          onClick={submit} disabled={loading}>
          {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <button onClick={onClose} style={{
          display:'block', width:'100%', marginTop:12, background:'none',
          border:'none', color:'#475569', cursor:'pointer', fontSize:12,
        }}>Cancel</button>
      </div>
    </div>
  );
}
