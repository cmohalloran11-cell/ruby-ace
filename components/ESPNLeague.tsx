'use client';
// components/ESPNLeague.tsx
import { useEffect } from 'react';
import { useESPN } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSkeleton, EmptyState } from './ui/shared';

export default function ESPNLeague() {
  const { user } = useAuth();
  const { data, loading, error, load } = useESPN();

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (!user) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏟</div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Sign In to Sync Your League
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          Create a free account and connect your ESPN Fantasy league to see your roster, standings, and waiver wire here.
        </div>
      </div>
    );
  }

  if (loading) return <LoadingSkeleton rows={8} cols={4} />;

  if (error) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>
        {error.includes('No ESPN league') ? (
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Go to Settings (click your username in the header) → ESPN League tab → enter your League ID and save.
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Check that your League ID and cookies are correct in Settings.
          </div>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card" style={{ padding: 20, textAlign: 'center' }}>
        <EmptyState message="No league synced. Add your ESPN League ID in Settings." />
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={load}>
          Load League
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* League Header */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700 }}>
            {data.name}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {data.season} Season · {data.teams?.length} Teams · ESPN Fantasy Baseball
          </div>
        </div>
        <button className="btn-outline" onClick={load}>↻ Sync</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Standings */}
        <div className="card" style={{ padding: 16 }}>
          <div className="section-label">Standings</div>
          {data.teams?.map((t: any, i: number) => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 11, fontFamily: "'Barlow Condensed',sans-serif",
                fontWeight: 700, flexShrink: 0,
                background: i === 0 ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)',
                color: i === 0 ? '#f59e0b' : '#64748b',
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{t.wins}–{t.losses}</div>
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700,
                color: '#3b82f6',
              }}>{t.pointsFor}</div>
            </div>
          ))}
        </div>

        {/* Recent Transactions */}
        <div className="card" style={{ padding: 16 }}>
          <div className="section-label">Recent Transactions</div>
          {!data.transactions?.length ? (
            <EmptyState message="No recent transactions." />
          ) : data.transactions.map((t: any) => (
            <div key={t.id} style={{
              padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                  fontFamily: "'Barlow Condensed',sans-serif",
                  background: t.type === 'WAIVER' ? 'rgba(34,197,94,0.15)'
                    : t.type === 'DROP' ? 'rgba(239,68,68,0.15)'
                    : 'rgba(59,130,246,0.15)',
                  color: t.type === 'WAIVER' ? '#22c55e'
                    : t.type === 'DROP' ? '#ef4444'
                    : '#60a5fa',
                }}>{t.type}</span>
                <span style={{ fontSize: 11, color: '#475569' }}>{t.date}</span>
              </div>
              {t.items?.map((item: any, idx: number) => (
                <div key={idx} style={{ fontSize: 12, color: '#94a3b8', paddingLeft: 4 }}>
                  {item.action === 'ADD' ? '+ ' : '- '}{item.player}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* My Roster (first team that matches or just first team) */}
      {data.teams?.[0]?.roster?.length > 0 && (
        <div className="card" style={{ padding: 16, marginTop: 14 }}>
          <div className="section-label">
            {data.teams[0].name} — Roster
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {data.teams[0].roster.map((p: any) => (
              <div key={p.playerId} className="card-sm" style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {p.injuryStatus !== 'ACTIVE' && (
                      <span style={{ color: '#ef4444', marginRight: 4 }}>{p.injuryStatus}</span>
                    )}
                    {p.projPoints > 0 && <span style={{ color: '#3b82f6' }}>{p.projPoints} proj</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
