'use client';
// components/DailySlate.tsx
import { useSchedule } from '@/hooks/useData';
import { TeamLogo, LiveDot } from './ui/shared';

function WeatherIcon({ condition }: { condition: string }) {
  const c = condition?.toLowerCase() || '';
  if (c.includes('clear') || c.includes('sunny')) return <>☀️</>;
  if (c.includes('cloud') || c.includes('overcast')) return <>⛅</>;
  if (c.includes('rain') || c.includes('drizzle')) return <>🌧️</>;
  if (c.includes('thunder') || c.includes('storm')) return <>⛈️</>;
  if (c.includes('snow')) return <>❄️</>;
  if (c.includes('fog') || c.includes('mist')) return <>🌫️</>;
  if (c.includes('wind')) return <>💨</>;
  return <>🌤️</>;
}

function GameCard({ game }: { game: any }) {
  const isLive = game.status === 'Live';
  const isFinal = game.status === 'Final';
  const gameTime = new Date(game.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const w = game.weather;

  return (
    <div style={{
      flexShrink: 0,
      width: 200,
      background: '#141414',
      border: `1px solid ${isLive ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 8,
      padding: '10px 12px',
      transition: 'border-color .15s',
    }}>
      {/* Teams + Score row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        {/* Away */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <TeamLogo abbr={game.away.abbr} size={24} />
          <span style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700,
            color: (isLive || isFinal) && game.away.score > game.home.score ? '#e2e8f0' : '#94a3b8',
          }}>{game.away.abbr}</span>
        </div>

        {/* Score / Time */}
        <div style={{ textAlign: 'center', minWidth: 44 }}>
          {isLive || isFinal ? (
            <>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 700, lineHeight: 1 }}>
                <span style={{ color: game.away.score > game.home.score ? '#e2e8f0' : '#64748b' }}>{game.away.score ?? 0}</span>
                <span style={{ color: '#334155', margin: '0 4px' }}>-</span>
                <span style={{ color: game.home.score > game.away.score ? '#e2e8f0' : '#64748b' }}>{game.home.score ?? 0}</span>
              </div>
              {isLive && game.linescore && (
                <div style={{ fontSize: 9, color: '#22c55e', marginTop: 2, fontFamily: "'Barlow Condensed',sans-serif" }}>
                  {game.linescore.inningHalf?.charAt(0)} {game.linescore.currentInning}
                </div>
              )}
              {isFinal && <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>FINAL</div>}
            </>
          ) : (
            <div style={{ fontSize: 11, color: '#64748b', fontFamily: "'Barlow Condensed',sans-serif" }}>{gameTime}</div>
          )}
        </div>

        {/* Home */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700,
            color: (isLive || isFinal) && game.home.score > game.away.score ? '#e2e8f0' : '#94a3b8',
          }}>{game.home.abbr}</span>
          <TeamLogo abbr={game.home.abbr} size={24} />
        </div>
      </div>

      {/* Pitchers row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: '#475569',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        paddingTop: 6, marginBottom: w ? 6 : 0,
      }}>
        <span style={{ maxWidth: 68, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {game.away.probSP?.split(' ').pop() || 'TBD'}
        </span>
        <span style={{ color: '#334155', fontSize: 9 }}>vs</span>
        <span style={{ maxWidth: 68, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
          {game.home.probSP?.split(' ').pop() || 'TBD'}
        </span>
      </div>

      {/* Weather — full row */}
      {w && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          paddingTop: 6,
        }}>
          {/* Temp + condition */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
              <WeatherIcon condition={w.condition || ''} />
              <span style={{ fontWeight: 700, color: '#cbd5e1' }}>{w.temp}°F</span>
              {w.condition && (
                <span style={{ color: '#475569', fontSize: 10 }}>{w.condition}</span>
              )}
            </div>
          </div>
          {/* Wind */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, color: '#64748b' }}>
              💨 {w.windSpeed}mph {w.windDir}
            </div>
            {/* Impact badge */}
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
              fontFamily: "'Barlow Condensed',sans-serif",
              background: `${w.impactColor}18`,
              color: w.impactColor,
              border: `1px solid ${w.impactColor}30`,
            }}>
              {w.impactLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DailySlate() {
  const { games, loading } = useSchedule();
  const liveCount = games.filter((g: any) => g.status === 'Live').length;

  if (loading) {
    return (
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '8px 20px' }}>
        <div style={{ fontSize: 11, color: '#334155' }}>Loading slate...</div>
      </div>
    );
  }

  if (!games.length) return null;

  return (
    <div style={{ borderBottom: '1px solid rgba(196,30,58,0.1)', padding: '10px 20px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Label row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
            textTransform: 'uppercase', color: '#334155',
            fontFamily: "'Barlow Condensed',sans-serif",
          }}>Today's Slate</span>
          {liveCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(34,197,94,0.08)', color: '#22c55e',
              padding: '1px 7px', borderRadius: 20, fontSize: 9,
              fontWeight: 700, border: '1px solid rgba(34,197,94,0.2)',
              fontFamily: "'Barlow Condensed',sans-serif",
            }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              LIVE
            </span>
          )}
          <span style={{ fontSize: 10, color: '#1e293b', fontFamily: "'Barlow Condensed',sans-serif" }}>
            {games.length} games
          </span>
        </div>

        {/* Scrollable game cards */}
        <style>{`
          .slate-scroll::-webkit-scrollbar { height: 3px; }
          .slate-scroll::-webkit-scrollbar-track { background: transparent; }
          .slate-scroll::-webkit-scrollbar-thumb { background: rgba(196,30,58,0.5); border-radius: 3px; }
          .slate-scroll::-webkit-scrollbar-thumb:hover { background: rgba(196,30,58,0.8); }
        `}</style>
        <div className="slate-scroll" style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          scrollbarWidth: 'thin', scrollbarColor: 'rgba(196,30,58,0.5) transparent',
          paddingBottom: 6,
        }}>
          {games.map((game: any) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </div>
    </div>
  );
}
