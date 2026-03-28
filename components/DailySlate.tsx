'use client';
// components/DailySlate.tsx
import { useSchedule } from '@/hooks/useData';
import { TeamLogo, LiveDot, LoadingSkeleton } from './ui/shared';

function WeatherBadge({ weather }: { weather: any }) {
  if (!weather) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 20,
      background: `${weather.impactColor}22`,
      color: weather.impactColor,
      fontSize: 11, fontWeight: 700,
      fontFamily: "'Barlow Condensed',sans-serif",
      whiteSpace: 'nowrap',
    }}>
      {weather.impactLabel}
    </span>
  );
}

function ScoreDisplay({ game }: { game: any }) {
  const isLive = game.status === 'Live';
  const isFinal = game.status === 'Final';

  if (!isLive && !isFinal) {
    return (
      <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>
        {new Date(game.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
        <span style={{ color: game.away.score > game.home.score ? '#e2e8f0' : '#64748b' }}>
          {game.away.score ?? 0}
        </span>
        <span style={{ color: '#475569', margin: '0 6px' }}>-</span>
        <span style={{ color: game.home.score > game.away.score ? '#e2e8f0' : '#64748b' }}>
          {game.home.score ?? 0}
        </span>
      </div>
      {isLive && game.linescore && (
        <div style={{ fontSize: 10, color: '#22c55e', marginTop: 2, fontFamily: "'Barlow Condensed',sans-serif" }}>
          {game.linescore.inningHalf?.charAt(0)} {game.linescore.currentInning}
        </div>
      )}
      {isFinal && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>FINAL</div>}
    </div>
  );
}

export default function DailySlate() {
  const { games, loading, error } = useSchedule();
  const today = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  const liveCount = games.filter(g => g.status === 'Live').length;

  return (
    <div style={{ paddingBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>Today's Slate</div>
        {liveCount > 0 && <LiveDot />}
        <span style={{ color: '#64748b', fontSize: 12 }}>{today}</span>
        {games.length > 0 && (
          <span style={{ color: '#64748b', fontSize: 12 }}>· {games.length} Games</span>
        )}
      </div>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 8 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card" style={{ padding: 14, height: 110, background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      )}

      {error && (
        <div style={{ color: '#f87171', fontSize: 13, padding: '12px 0' }}>
          Could not load schedule: {error}
        </div>
      )}

      {!loading && games.length === 0 && !error && (
        <div style={{ color: '#475569', fontSize: 13, padding: '12px 0' }}>No games scheduled today.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 8 }}>
        {games.map((g: any) => (
          <div key={g.id} className="card" style={{ padding: '12px 14px' }}>
            {/* Teams + Score */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TeamLogo abbr={g.away.abbr} size={24} />
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14 }}>{g.away.abbr}</span>
                <span style={{ color: '#475569', fontSize: 11 }}>@</span>
                <TeamLogo abbr={g.home.abbr} size={24} />
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14 }}>{g.home.abbr}</span>
              </div>
              <ScoreDisplay game={g} />
            </div>

            {/* Probable Pitchers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 8 }}>
              <span>{g.away.probSP}</span>
              <span style={{ color: '#334155' }}>vs</span>
              <span>{g.home.probSP}</span>
            </div>

            {/* Venue */}
            <div style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>{g.venue}</div>

            {/* Weather */}
            {g.weather && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4,
                background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '7px 10px' }}>
                {[
                  { label: 'TEMP', val: `${g.weather.temp}°F` },
                  { label: 'WIND', val: `${g.weather.windSpeed}mph` },
                  { label: 'DIR',  val: g.weather.windDir },
                  { label: 'RAIN', val: `${g.weather.rainPct}%` },
                ].map(w => (
                  <div key={w.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#475569', fontFamily: "'Barlow Condensed',sans-serif",
                      textTransform: 'uppercase', letterSpacing: '0.08em' }}>{w.label}</div>
                    <div style={{ fontSize: 12, fontFamily: "'Barlow Condensed',sans-serif",
                      fontWeight: 600, color: '#cbd5e1', marginTop: 1 }}>{w.val}</div>
                  </div>
                ))}
              </div>
            )}
            {g.weather && (
              <div style={{ marginTop: 7 }}>
                <WeatherBadge weather={g.weather} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
