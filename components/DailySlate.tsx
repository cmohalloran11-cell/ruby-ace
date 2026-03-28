'use client';
// components/DailySlate.tsx
import { useSchedule } from '@/hooks/useData';
import { TeamLogo, LiveDot } from './ui/shared';

function GameCard({ game }: { game: any }) {
  const isLive = game.status === 'Live';
  const isFinal = game.status === 'Final';
  const gameTime = new Date(game.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div style={{
      flexShrink: 0,
      width: 190,
      background: '#141414',
      border: `1px solid ${isLive ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 8,
      padding: '10px 12px',
      cursor: 'default',
      transition: 'border-color .15s',
    }}>
      {/* Teams row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        {/* Away */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TeamLogo abbr={game.away.abbr} size={26} />
          <span style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 13, fontWeight: 700,
            color: (isLive || isFinal) && game.away.score > game.home.score ? '#e2e8f0' : '#94a3b8',
          }}>{game.away.abbr}</span>
        </div>

        {/* Score / Time */}
        <div style={{ textAlign: 'center', minWidth: 44 }}>
          {isLive || isFinal ? (
            <>
              <div style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 17, fontWeight: 700, lineHeight: 1,
              }}>
                <span style={{ color: game.away.score > game.home.score ? '#e2e8f0' : '#64748b' }}>
                  {game.away.score ?? 0}
                </span>
                <span style={{ color: '#334155', margin: '0 4px' }}>-</span>
                <span style={{ color: game.home.score > game.away.score ? '#e2e8f0' : '#64748b' }}>
                  {game.home.score ?? 0}
                </span>
              </div>
              {isLive && game.linescore && (
                <div style={{ fontSize: 9, color: '#22c55e', marginTop: 2, fontFamily: "'Barlow Condensed',sans-serif" }}>
                  {game.linescore.inningHalf?.charAt(0)} {game.linescore.currentInning}
                </div>
              )}
              {isFinal && <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>FINAL</div>}
            </>
          ) : (
            <div style={{ fontSize: 11, color: '#64748b', fontFamily: "'Barlow Condensed',sans-serif" }}>
              {gameTime}
            </div>
          )}
        </div>

        {/* Home */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 13, fontWeight: 700,
            color: (isLive || isFinal) && game.home.score > game.away.score ? '#e2e8f0' : '#94a3b8',
          }}>{game.home.abbr}</span>
          <TeamLogo abbr={game.home.abbr} size={26} />
        </div>
      </div>

      {/* Pitchers */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: '#475569',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        paddingTop: 7,
      }}>
        <span style={{ maxWidth: 65, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {game.away.probSP?.split(' ').pop() || 'TBD'}
        </span>
        {/* Weather icon */}
        {game.weather && (
          <span style={{ color: game.weather.impactColor, fontSize: 10, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif" }}>
            {game.weather.windSpeed}mph {game.weather.windDir}
          </span>
        )}
        <span style={{ maxWidth: 65, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
          {game.home.probSP?.split(' ').pop() || 'TBD'}
        </span>
      </div>

      {/* Weather badge */}
      {game.weather && (
        <div style={{ marginTop: 6 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 7px', borderRadius: 20,
            background: `${game.weather.impactColor}18`,
            color: game.weather.impactColor,
            fontSize: 10, fontWeight: 700,
            fontFamily: "'Barlow Condensed',sans-serif",
            border: `1px solid ${game.weather.impactColor}30`,
          }}>
            {game.weather.temp}°F · {game.weather.impactLabel}
          </span>
        </div>
      )}
    </div>
  );
}

export default function DailySlate() {
  const { games, loading } = useSchedule();
  const liveCount = games.filter((g: any) => g.status === 'Live').length;

  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      background: '#0e0e0e',
      padding: '10px 20px',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Label row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 11, fontWeight: 700, color: '#c41e3a',
            textTransform: 'uppercase', letterSpacing: '.1em',
          }}>Today's Slate</span>
          {liveCount > 0 && <LiveDot />}
          {!loading && games.length > 0 && (
            <span style={{ fontSize: 11, color: '#334155' }}>{games.length} games</span>
          )}
        </div>

        {/* Horizontal scroll */}
        <div style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(196,30,58,0.2) transparent',
        }}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                flexShrink: 0, width: 190, height: 90,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
              }} />
            ))
          ) : games.length === 0 ? (
            <div style={{ color: '#334155', fontSize: 13, padding: '8px 0' }}>No games scheduled today.</div>
          ) : (
            games.map((g: any) => <GameCard key={g.id} game={g} />)
          )}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </div>
  );
}
