'use client';
// components/UserSettings.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const ALL_TEAMS = ['NYY','BOS','LAD','SF','HOU','TEX','ATL','PHI','NYM','CHC','MIL','SD',
  'STL','CIN','PIT','COL','ARI','SEA','DET','CLE','MIN','KC','CWS','TOR','BAL','TB','MIA','WSH','OAK','LAA'];

const TEAM_COLORS: Record<string,string> = {
  NYY:'#0d1b2a',BOS:'#bd3039',LAD:'#005a9c',SF:'#fd5a1e',HOU:'#eb6e1f',TEX:'#003278',
  ATL:'#ce1141',PHI:'#e81828',NYM:'#002d72',CHC:'#0e3386',MIL:'#12284b',SD:'#2f241d',
};

export default function UserSettings({ onClose }: { onClose: () => void }) {
  const { user, token } = useAuth();
  const [espnLeagueId, setEspnLeagueId] = useState('');
  const [espnS2, setEspnS2] = useState('');
  const [espnSwid, setEspnSwid] = useState('');
  const [favTeams, setFavTeams] = useState<string[]>([]);
  const [notifyInjuries, setNotifyInjuries] = useState(true);
  const [notifyLineups, setNotifyLineups] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'espn'|'teams'|'notifications'>('espn');

  // Load current settings
  useEffect(() => {
    if (!token) return;
    fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setEspnLeagueId(data.espn_league_id || '');
        setFavTeams(data.fav_teams || []);
        setNotifyInjuries(data.notify_prefs?.injuries ?? true);
        setNotifyLineups(data.notify_prefs?.lineups ?? true);
      });
  }, [token]);

  const save = async () => {
    setSaving(true);
    await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        espn_league_id: espnLeagueId || null,
        espn_s2: espnS2 || null,
        espn_swid: espnSwid || null,
        fav_teams: favTeams,
        notify_prefs: { injuries: notifyInjuries, lineups: notifyLineups },
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleTeam = (t: string) => {
    setFavTeams(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const TABS = [
    { id: 'espn' as const, label: 'ESPN League' },
    { id: 'teams' as const, label: 'Favorite Teams' },
    { id: 'notifications' as const, label: 'Notifications' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(2,8,16,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div className="card" style={{
        padding: 0, width: 480, maxHeight: '85vh', overflow: 'hidden',
        boxShadow: '0 0 0 1px rgba(59,130,246,0.25), 0 4px 40px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700 }}>
              Settings
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{user?.username} · {user?.email}</div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 20, lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Sub-tabs */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '0 20px',
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === t.id ? '#3b82f6' : 'transparent'}`,
              color: activeTab === t.id ? '#93c5fd' : '#64748b',
              padding: '10px 14px', cursor: 'pointer', fontSize: 13,
              fontFamily: "'Barlow',sans-serif", fontWeight: 500,
              transition: 'all .15s', marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: 20, overflowY: 'auto', maxHeight: 'calc(85vh - 140px)' }}>

          {/* ESPN */}
          {activeTab === 'espn' && (
            <div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>
                Connect your ESPN Fantasy Baseball league to sync your roster, standings, waiver wire, and transactions.
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  League ID <span style={{ color: '#475569' }}>— from your ESPN league URL</span>
                </label>
                <input className="input-field" placeholder="e.g. 336271"
                  value={espnLeagueId} onChange={e => setEspnLeagueId(e.target.value)} />
              </div>

              <div style={{
                background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: 6, padding: '10px 12px', fontSize: 12, color: '#fbbf24',
                marginBottom: 16, lineHeight: 1.6,
              }}>
                <strong>Private league?</strong> You need your ESPN cookies. In Chrome: go to ESPN Fantasy →
                open DevTools (F12) → Application tab → Cookies → fantasy.espn.com →
                copy <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>espn_s2</code> and{' '}
                <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>SWID</code> values below.
                Public leagues leave these blank.
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  espn_s2 cookie <span style={{ color: '#475569' }}>— private leagues only</span>
                </label>
                <input className="input-field" placeholder="AEB3K2..." type="password"
                  value={espnS2} onChange={e => setEspnS2(e.target.value)} />
              </div>
              <div style={{ marginBottom: 4 }}>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  SWID cookie <span style={{ color: '#475569' }}>— private leagues only</span>
                </label>
                <input className="input-field" placeholder="{A1B2C3D4-...}"
                  value={espnSwid} onChange={e => setEspnSwid(e.target.value)} />
              </div>
            </div>
          )}

          {/* Favorite Teams */}
          {activeTab === 'teams' && (
            <div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                Select your teams to personalize news and alerts.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {ALL_TEAMS.map(t => {
                  const selected = favTeams.includes(t);
                  const bg = TEAM_COLORS[t] || '#1e293b';
                  return (
                    <button key={t} onClick={() => toggleTeam(t)} style={{
                      padding: '8px 4px', borderRadius: 6, border: `1px solid ${selected ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                      background: selected ? `${bg}dd` : 'rgba(255,255,255,0.03)',
                      color: '#fff', cursor: 'pointer', fontSize: 12,
                      fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
                      transition: 'all .15s',
                      boxShadow: selected ? '0 0 0 1px rgba(59,130,246,0.5)' : 'none',
                    }}>{t}</button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                Choose which alerts you want to receive.
              </div>
              {[
                { label: 'Injury alerts', desc: 'Player placed on IL or injury reported', val: notifyInjuries, set: setNotifyInjuries },
                { label: 'Lineup announcements', desc: 'Starting lineups posted by teams', val: notifyLineups, set: setNotifyLineups },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.desc}</div>
                  </div>
                  <button onClick={() => item.set(!item.val)} style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: item.val ? '#1d4ed8' : 'rgba(255,255,255,0.1)',
                    position: 'relative', transition: 'background .2s', flexShrink: 0,
                  }}>
                    <span style={{
                      position: 'absolute', top: 2, left: item.val ? 22 : 2,
                      width: 20, height: 20, borderRadius: '50%', background: '#fff',
                      transition: 'left .2s', display: 'block',
                    }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
