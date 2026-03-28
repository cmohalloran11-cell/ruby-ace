'use client';
// components/DFSOptimizer.tsx
import { useState, useMemo } from 'react';
import { useProjections, useDFSOptimizer } from '@/hooks/useData';
import { TeamLogo, PosBadge, LoadingSkeleton, EmptyState, fmt$ } from './ui/shared';

const ALL_POS = ['All', 'SP', 'C', '1B', '2B', '3B', 'SS', 'OF'];
type SortKey = 'proj_fpts' | 'salary' | 'player_name' | 'valueRating';

const POS_ORDER: Record<string, number> = { SP: 0, C: 1, '1B': 2, '2B': 3, '3B': 4, SS: 5, OF: 6 };

function valColor(v: number) {
  if (v >= 7) return '#22c55e';
  if (v >= 5) return '#f59e0b';
  return '#94a3b8';
}

// Download lineups in DraftKings DKEntries.csv format
// Format: Entry ID, Contest Name, Contest ID, Entry Fee, P, P, C, 1B, 2B, 3B, SS, OF, OF, OF
// Players use "Name (ID)" format. Entry ID/Contest cols left blank — user pastes into their DKEntries file.
function downloadLineups(lineups: any[]) {
  if (!lineups.length) return;

  const header = ['Entry ID','Contest Name','Contest ID','Entry Fee','P','P','C','1B','2B','3B','SS','OF','OF','OF'];

  const rows = lineups.map((lu, i) => {
    const sorted = [...lu.players].sort((a, b) => (POS_ORDER[a.position] ?? 9) - (POS_ORDER[b.position] ?? 9));
    const players = sorted.map((p: any) => {
      // Use dk_name_id "Name (ID)" format — what DK DKEntries.csv expects
      if (p.dk_name_id) return p.dk_name_id;
      return p.player_name;
    });
    // Leave entry metadata blank — user fills from their DKEntries download
    return ['', '', '', '', ...players];
  });

  const csvContent = [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ruby-ace-lineups-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DFSOptimizer() {
  const { players, loading } = useProjections();
  const { optimize, SALARY_CAP, SALARY_MIN } = useDFSOptimizer(players);

  // Pool
  const [pos, setPos]           = useState('All');
  const [search, setSearch]     = useState('');
  const [sortKey, setSortKey]   = useState<SortKey>('proj_fpts');
  const [sortAsc, setSortAsc]   = useState(false);
  const [locked, setLocked]     = useState<Set<number>>(new Set());
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  // Settings
  const [numLineups, setNum]      = useState(3);
  const [stackTeam, setStack]     = useState('');
  const [stackSize, setStackSz]   = useState(3);
  const [mode, setMode]           = useState<'cash'|'gpp'>('cash');
  const [minUnique, setUniq]      = useState(2);
  const [randomness, setRand]     = useState(0);
  const [minSalary, setMinSal]    = useState(49000);
  const [maxExposure, setMaxExp]  = useState(100);
  const [maxOwnership, setMaxOwn] = useState(0);

  // Output
  const [lineups, setLineups]   = useState<any[]>([]);
  const [activeIdx, setIdx]     = useState(0);
  const [generating, setGen]    = useState(false);
  const [warn, setWarn]         = useState('');

  const teams = useMemo(() =>
    Array.from(new Set(players.map((p: any) => p.team).filter(Boolean))).sort() as string[],
  [players]);

  const filtered = useMemo(() => {
    let list = [...players];
    if (pos !== 'All') list = list.filter((p: any) => p.position === pos);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p: any) =>
        p.player_name?.toLowerCase().includes(q) || p.team?.toLowerCase().includes(q)
      );
    }
    list.sort((a: any, b: any) => {
      const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0;
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return list;
  }, [players, pos, search, sortKey, sortAsc]);

  const posBreakdown = useMemo(() => {
    const c: Record<string, number> = {};
    players.forEach((p: any) => { c[p.position] = (c[p.position] || 0) + 1; });
    return c;
  }, [players]);

  const hasSalary = players.some((p: any) => (p.salary || 0) > 0);
  const hasPositions = players.some((p: any) => p.position && p.position !== '');

  const sortBy = (k: SortKey) => {
    if (sortKey === k) setSortAsc(x => !x);
    else { setSortKey(k); setSortAsc(false); }
  };

  const toggleLock = (id: number) => setLocked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleExclude = (id: number) => setExcluded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearAll = () => { setLocked(new Set()); setExcluded(new Set()); };

  const generate = () => {
    setGen(true);
    setWarn('');
    setTimeout(() => {
      const result = optimize({
        locked: Array.from(locked),
        excluded: Array.from(excluded),
        numLineups,
        stackTeam: stackTeam || null,
        stackSize,
        mode,
        randomness,
        minUnique,
        minSalary,
        maxExposure,
        maxOwnership,
      });
      setLineups(result);
      setIdx(0);
      setGen(false);
      if (result.length === 0) {
        setWarn('Could not build valid lineups. Make sure you have uploaded the DraftKings salary CSV (for positions + salary) alongside theBatX projections.');
      } else if (result.length < numLineups) {
        setWarn(`Built ${result.length} of ${numLineups} requested lineups. Upload more players or relax your locked/excluded settings.`);
      }
    }, 50);
  };

  const cur = lineups[activeIdx];
  const goTo = (i: number) => setIdx(Math.max(0, Math.min(lineups.length - 1, i)));

  const SortTh = ({ label, k }: { label: string; k: SortKey }) => (
    <th onClick={() => sortBy(k)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      {label}{sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : ''}
    </th>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 16, alignItems: 'start' }}>

      {/* ── Player Pool ── */}
      <div className="card" style={{ padding: 16 }}>

        {/* Warnings */}
        {!loading && players.length > 0 && (!hasSalary || !hasPositions) && (
          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 6, padding: '10px 12px', fontSize: 12, color: '#fbbf24', marginBottom: 12, lineHeight: 1.7 }}>
            <strong>Missing data:</strong>
            {!hasSalary && <span> No salary data — </span>}
            {!hasPositions && <span> No position data — </span>}
            Go to <strong>Admin → Projections</strong> and upload your DraftKings salary CSV first, then upload theBatX files.
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input-field" style={{ maxWidth: 180, padding: '5px 10px', fontSize: 12 }}
            placeholder="Search name or team..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input-field" style={{ width: 80 }}
            value={pos} onChange={e => setPos(e.target.value)}>
            {ALL_POS.map(p => <option key={p}>{p}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
            {filtered.length} / {players.length}
          </span>
          {(locked.size > 0 || excluded.size > 0) && (
            <>
              {locked.size > 0 && <span style={{ fontSize: 12, color: '#f59e0b' }}>{locked.size} locked</span>}
              {excluded.size > 0 && <span style={{ fontSize: 12, color: '#ef4444' }}>{excluded.size} excluded</span>}
              <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>Clear</button>
            </>
          )}
        </div>

        {loading ? <LoadingSkeleton rows={10} cols={6} /> : players.length === 0 ? (
          <EmptyState message="Upload projections in Admin to populate the optimizer." />
        ) : (
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }} title="Lock into every lineup">Lock</th>
                  <SortTh label="Player" k="player_name" />
                  <th>Pos</th>
                  <SortTh label="Salary" k="salary" />
                  <SortTh label="Proj FP" k="proj_fpts" />
                  <SortTh label="Value" k="valueRating" />
                  <th style={{ width: 30 }} title="Exclude from lineups">X</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => {
                  const isL = locked.has(p.id);
                  const isX = excluded.has(p.id);
                  return (
                    <tr key={p.id} style={{ opacity: isX ? 0.2 : 1, background: isL ? 'rgba(245,158,11,0.04)' : '' }}>
                      <td>
                        <button onClick={() => toggleLock(p.id)} style={{
                          width: 24, height: 24, borderRadius: 4, cursor: 'pointer',
                          border: `1px solid ${isL ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                          background: isL ? 'rgba(245,158,11,0.15)' : 'transparent',
                          color: isL ? '#f59e0b' : '#475569', fontSize: 10, fontWeight: 700,
                        }}>{isL ? 'L' : '–'}</button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <TeamLogo abbr={p.team || '?'} size={20} />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>{p.player_name}</div>
                            <div style={{ fontSize: 10, color: '#475569' }}>{p.team}</div>
                          </div>
                        </div>
                      </td>
                      <td><PosBadge pos={p.position || '?'} /></td>
                      <td style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, fontSize: 13, color: p.salary > 0 ? '#e2e8f0' : '#334155' }}>
                        {p.salary > 0 ? fmt$(p.salary) : '—'}
                      </td>
                      <td>
                        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: '#60a5fa', fontSize: 15 }}>
                          {(p.proj_fpts || 0).toFixed(1)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: valColor(p.valueRating || 0) }}>
                          {p.valueRating > 0 ? p.valueRating.toFixed(2) : '—'}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => toggleExclude(p.id)} style={{
                          width: 24, height: 24, borderRadius: 4, cursor: 'pointer',
                          border: `1px solid ${isX ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}`,
                          background: isX ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.06)',
                          color: isX ? '#22c55e' : '#ef4444', fontSize: 10, fontWeight: 700,
                        }}>{isX ? '+' : 'X'}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Position coverage */}
        {players.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {['SP','C','1B','2B','3B','SS','OF'].map(p => (
              <div key={p} style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 11,
                fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
                background: (posBreakdown[p] || 0) > 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                color: (posBreakdown[p] || 0) > 0 ? '#22c55e' : '#ef4444',
                border: `1px solid ${(posBreakdown[p] || 0) > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
                {p} {posBreakdown[p] || 0}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Settings + Output ── */}
      <div>
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div className="section-label">Optimizer Settings</div>

          {/* Contest mode */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Contest type</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['cash', 'gpp'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${mode === m ? (m === 'cash' ? 'rgba(34,197,94,0.5)' : 'rgba(196,30,58,0.5)') : 'rgba(255,255,255,0.08)'}`,
                  background: mode === m ? (m === 'cash' ? 'rgba(34,197,94,0.08)' : 'rgba(196,30,58,0.08)') : 'transparent',
                  color: mode === m ? (m === 'cash' ? '#22c55e' : '#f06070') : '#64748b',
                  fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13,
                }}>
                  {m === 'cash' ? 'Cash / 50-50' : 'GPP / Tournament'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 5, lineHeight: 1.5 }}>
              {mode === 'cash'
                ? 'Maximizes projected FP — picks the best available players per dollar every time'
                : 'Same logic but adds slight variance to differentiate tournament entries'}
            </div>
          </div>

          {/* Lineups + Unique */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Lineups (1–150)</div>
              <input className="input-field" type="number" min={1} max={150}
                value={numLineups} onChange={e => setNum(Math.min(150, Math.max(1, +e.target.value)))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Min unique players</div>
              <input className="input-field" type="number" min={0} max={9}
                value={minUnique} onChange={e => setUniq(Math.min(9, Math.max(0, +e.target.value)))} />
            </div>
          </div>

          {/* Salary range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Min salary</div>
              <input className="input-field" type="number" min={30000} max={50000} step={100}
                value={minSalary} onChange={e => setMinSal(Math.min(50000, Math.max(30000, +e.target.value)))} />
              <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>Default $49,000</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Max salary</div>
              <input className="input-field" type="number" value={50000} disabled
                style={{ opacity: 0.4 }} />
              <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>DK cap $50,000</div>
            </div>
          </div>

          {/* Exposure + Ownership */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                Max exposure %
              </div>
              <input className="input-field" type="number" min={1} max={100}
                value={maxExposure} onChange={e => setMaxExp(Math.min(100, Math.max(1, +e.target.value)))} />
              <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>
                {maxExposure === 100 ? 'No limit — player can appear in all lineups' : `Max ${maxExposure}% of lineups (~${Math.ceil(maxExposure/100*numLineups)} of ${numLineups})`}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                Max own% <span style={{ color: '#475569' }}>(GPP)</span>
              </div>
              <input className="input-field" type="number" min={0} max={100}
                value={maxOwnership} onChange={e => setMaxOwn(Math.min(100, Math.max(0, +e.target.value)))} />
              <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>
                {maxOwnership === 0 ? 'No limit' : `Skip players projected >${maxOwnership}% owned`}
              </div>
            </div>
          </div>

          {/* Stack settings */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
              Team stack <span style={{ color: '#475569' }}>(optional — pairs batters from same team)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <select className="input-field" value={stackTeam} onChange={e => setStack(e.target.value)}>
                <option value="">No stack</option>
                {teams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="input-field" style={{ width: 70 }} value={stackSize} onChange={e => setStackSz(+e.target.value)}
                disabled={!stackTeam}>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>
            {stackTeam && (
              <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                Will include {stackSize} {stackTeam} batters in each lineup alongside a pitcher from a different team
              </div>
            )}
          </div>

          {/* Randomness — GPP only */}
          {mode === 'gpp' && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                Lineup variety: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{randomness}</span>
                <span style={{ color: '#475569' }}> (0 = optimal, 10 = max variety)</span>
              </div>
              <input type="range" min={0} max={10} step={1} value={randomness}
                onChange={e => setRand(+e.target.value)}
                style={{ width: '100%', accentColor: '#c41e3a' }} />
            </div>
          )}

          <button className="btn-primary"
            style={{ width: '100%', padding: 12, fontSize: 14 }}
            onClick={generate}
            disabled={players.length === 0 || generating}>
            {generating ? 'Building...' : `Generate ${numLineups} lineup${numLineups !== 1 ? 's' : ''}`}
          </button>

          {players.length === 0 && (
            <div style={{ fontSize: 11, color: '#475569', marginTop: 8, textAlign: 'center' }}>
              Upload projections in Admin first
            </div>
          )}

          {warn && (
            <div style={{ marginTop: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#fbbf24', lineHeight: 1.5 }}>
              {warn}
            </div>
          )}
        </div>

        {/* Generated lineups */}
        {lineups.length > 0 && (
          <div className="card" style={{ padding: 16 }}>

            {/* Navigator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <button onClick={() => goTo(activeIdx - 1)} disabled={activeIdx === 0} style={{
                width: 32, height: 32, borderRadius: 6, cursor: activeIdx === 0 ? 'not-allowed' : 'pointer',
                border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                color: activeIdx === 0 ? '#2a2a2a' : '#94a3b8', fontSize: 16, lineHeight: 1,
              }}>←</button>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
                  Lineup {activeIdx + 1} of {lineups.length}
                </div>
                <div style={{ fontSize: 11, color: '#475569' }}>
                  {mode === 'cash' ? 'Cash' : 'GPP'}{stackTeam ? ` · ${stackTeam} stack` : ''}
                </div>
              </div>

              <button onClick={() => goTo(activeIdx + 1)} disabled={activeIdx === lineups.length - 1} style={{
                width: 32, height: 32, borderRadius: 6, cursor: activeIdx === lineups.length - 1 ? 'not-allowed' : 'pointer',
                border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                color: activeIdx === lineups.length - 1 ? '#2a2a2a' : '#94a3b8', fontSize: 16, lineHeight: 1,
              }}>→</button>
            </div>

            {/* Quick jump dots (up to 20) */}
            {lineups.length > 1 && lineups.length <= 20 && (
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                {lineups.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)} style={{
                    width: 8, height: 8, borderRadius: '50%', padding: 0, border: 'none', cursor: 'pointer',
                    background: i === activeIdx ? '#c41e3a' : 'rgba(255,255,255,0.15)',
                    transition: 'background .15s',
                  }} />
                ))}
              </div>
            )}

            {cur && (
              <>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, marginBottom: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 8, overflow: 'hidden' }}>
                  {[
                    { label: 'Proj FP', val: cur.projFpts?.toFixed(1), color: '#22c55e' },
                    { label: 'Salary', val: fmt$(cur.totalSalary), color: cur.totalSalary > 50000 ? '#ef4444' : '#e2e8f0' },
                    { label: 'Remaining', val: fmt$(50000 - cur.totalSalary), color: '#64748b' },
                    { label: 'Cap used', val: `${((cur.totalSalary / 50000) * 100).toFixed(1)}%`, color: cur.totalSalary >= 49000 ? '#22c55e' : '#f59e0b' },
                  ].map((m, i) => (
                    <div key={m.label} style={{ textAlign: 'center', padding: '10px 4px', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div style={{ fontSize: 9, color: '#475569', fontFamily: "'Barlow Condensed',sans-serif", textTransform: 'uppercase', letterSpacing: '.08em' }}>{m.label}</div>
                      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700, color: m.color, marginTop: 2 }}>{m.val}</div>
                    </div>
                  ))}
                </div>

                {/* Player rows */}
                {[...cur.players]
                  .sort((a: any, b: any) => (POS_ORDER[a.position] ?? 9) - (POS_ORDER[b.position] ?? 9))
                  .map((p: any) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ width: 32, flexShrink: 0 }}>
                        <PosBadge pos={p.position || '?'} />
                      </div>
                      <TeamLogo abbr={p.team || '?'} size={20} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.player_name}
                        </div>
                        <div style={{ fontSize: 10, color: '#475569' }}>{p.team}</div>
                      </div>
                      {/* Exposure badge */}
                      {lineups.length > 1 && (() => {
                        const count = lineups.filter(lu => lu.players.some((lp:any) => lp.id === p.id)).length;
                        const pct = Math.round((count / lineups.length) * 100);
                        return (
                          <div style={{
                            fontSize: 10, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
                            color: pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#64748b',
                            flexShrink: 0, minWidth: 32, textAlign: 'center',
                          }} title={`In ${count} of ${lineups.length} lineups`}>
                            {pct}%
                          </div>
                        );
                      })()}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", color: '#60a5fa', fontWeight: 700, fontSize: 15 }}>
                          {(p.proj_fpts || 0).toFixed(1)}
                        </div>
                        <div style={{ fontSize: 10, color: '#475569' }}>
                          {p.salary > 0 ? fmt$(p.salary) : '—'}
                        </div>
                      </div>
                    </div>
                  ))}

                {/* Total row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, color: '#475569' }}>TOTAL</span>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 700, color: '#22c55e' }}>{cur.projFpts?.toFixed(1)} FP</span>
                </div>

                {/* Download button */}
                <button
                  onClick={() => downloadLineups(lineups)}
                  className="btn-outline"
                  style={{ width: '100%', marginTop: 12, fontSize: 13, padding: '8px 0' }}>
                  ⬇ Download all {lineups.length} lineup{lineups.length !== 1 ? 's' : ''} (.csv)
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
