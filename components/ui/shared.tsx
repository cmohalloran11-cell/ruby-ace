'use client';
// components/ui/shared.tsx

// Real MLB team IDs for logo CDN
const TEAM_IDS: Record<string, number> = {
  ARI:109, ATL:144, BAL:110, BOS:111, CHC:112, CWS:145, CIN:113,
  CLE:114, COL:115, DET:116, HOU:117, KC:118, LAA:108, LAD:119,
  MIA:146, MIL:158, MIN:142, NYM:121, NYY:147, OAK:133, PHI:143,
  PIT:134, SD:135, SEA:136, SF:137, STL:138, TB:139, TEX:140,
  TOR:141, WSH:120,
};

const TEAM_COLORS: Record<string, string> = {
  NYY:'#0d1b2a', BOS:'#bd3039', LAD:'#005a9c', ATL:'#ce1141',
  HOU:'#eb6e1f', TEX:'#003278', PHI:'#e81828', NYM:'#002d72',
  CHC:'#0e3386', MIL:'#12284b', SF:'#fd5a1e',  SD:'#2f241d',
  STL:'#c41e3a', CIN:'#c6011f', PIT:'#27251f', COL:'#333366',
  ARI:'#a71930', SEA:'#0c2c56', DET:'#0c2340', CLE:'#e31937',
  MIN:'#002b5c', KC:'#004687', CWS:'#27251f', TOR:'#134a8e',
  BAL:'#df4601', TB:'#092c5c',  MIA:'#00a3e0', WSH:'#ab0003',
  OAK:'#003831', LAA:'#ba0021',
};

export function TeamLogo({ abbr, size = 28 }: { abbr: string; size?: number }) {
  const teamId = TEAM_IDS[abbr];
  const bg = TEAM_COLORS[abbr] || '#1e293b';

  if (teamId) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 4, flexShrink: 0,
        background: `${bg}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <img
          src={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
          alt={abbr}
          width={size - 4}
          height={size - 4}
          style={{ objectFit: 'contain' }}
          onError={(e) => {
            const parent = (e.target as HTMLImageElement).parentElement;
            if (parent) {
              parent.innerHTML = `<span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;color:#fff;font-size:${Math.round(size*0.33)}px">${abbr.slice(0,3)}</span>`;
            }
          }}
        />
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: 4, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontFamily: "'Barlow Condensed',sans-serif",
      fontWeight: 700, color: '#fff', flexShrink: 0,
      border: '1px solid rgba(255,255,255,0.1)',
    }}>{abbr.slice(0, 3)}</div>
  );
}

export function ConfidenceMeter({ score }: { score: number }) {
  const s = score || 0;
  const color = s >= 8.5 ? '#22c55e' : s >= 7 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ width: `${s * 10}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: "'Barlow Condensed',sans-serif", color, fontWeight: 700, fontSize: 13, minWidth: 28 }}>
        {s.toFixed(1)}
      </span>
    </div>
  );
}

const GRADE_COLORS: Record<string, string> = {
  'A+':'#22c55e','A':'#22c55e','A-':'#86efac','B+':'#86efac',
  'B':'#fbbf24','B-':'#f97316','C+':'#f97316','C':'#ef4444',
};

export function MatchupGrade({ grade }: { grade: string }) {
  return (
    <span style={{
      color: GRADE_COLORS[grade] || '#94a3b8',
      fontFamily: "'Barlow Condensed',sans-serif",
      fontWeight: 700, fontSize: 13,
    }}>{grade}</span>
  );
}

export function PosBadge({ pos }: { pos: string }) {
  const isSP = pos === 'SP' || pos === 'RP';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: isSP ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.15)',
      color: isSP ? '#a78bfa' : '#60a5fa',
      borderRadius: 4, padding: '2px 6px',
      fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700,
      minWidth: 28,
    }}>{pos}</div>
  );
}

export function Pill({
  children, color = 'blue'
}: { children: React.ReactNode; color?: 'green' | 'red' | 'blue' | 'yellow' | 'gray' }) {
  const styles = {
    green:  { bg: 'rgba(34,197,94,0.15)',  text: '#22c55e' },
    red:    { bg: 'rgba(196,30,58,0.15)',   text: '#f06070' },
    blue:   { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa' },
    yellow: { bg: 'rgba(251,191,36,0.15)', text: '#f59e0b' },
    gray:   { bg: 'rgba(255,255,255,0.06)',text: '#94a3b8' },
  };
  const s = styles[color];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 9px', borderRadius: 20,
      background: s.bg, color: s.text,
      fontSize: 11, fontWeight: 700,
      fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.06em',
    }}>{children}</span>
  );
}

export function LoadingSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ padding: '8px 0' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} style={{
              flex: j === 0 ? 2 : 1,
              height: 14, borderRadius: 4,
              background: 'rgba(255,255,255,0.05)',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: `${(i + j) * 0.05}s`,
            }} />
          ))}
        </div>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </div>
  );
}

export function LiveDot() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
      background: 'rgba(34,197,94,0.15)', color: '#22c55e',
      padding: '2px 9px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif" }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e',
        display: 'inline-block', animation: 'blink 1.2s ease-in-out infinite' }} />
      LIVE
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#475569', fontSize: 13 }}>
      {message}
    </div>
  );
}

export function fmt$(n: number) { return `$${n.toLocaleString()}`; }
export function fmtAvg(n: number) { return `.${String(Math.round(n * 1000)).padStart(3,'0')}`; }
