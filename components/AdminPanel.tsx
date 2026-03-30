'use client';
// components/AdminPanel.tsx
import { useState, useRef, useEffect } from 'react';
import { useAdminProjections, useAdminUsers } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import { TeamLogo, LoadingSkeleton, EmptyState, fmt$ } from './ui/shared';

const SIDEBAR = [
  { id:'projections', icon:'📊', label:'Projections' },
  { id:'stacks',      icon:'📈', label:'Stack Projs' },
  { id:'injuries',    icon:'🏥', label:'Injuries' },
  { id:'users',       icon:'👥', label:'Users' },
  { id:'scoring',     icon:'⚙️',  label:'Scoring Rules' },
];

/* ── Projections ──────────────────────────────────────────── */
function ProjectionsSection() {
  const { players, loading, saving, update, remove, uploadCSV } = useAdminProjections();
  const { token } = useAuth();
  const [editId, setEditId]     = useState<number|null>(null);
  const [editVal, setEditVal]   = useState('');
  const [editField, setEditField] = useState('');
  const [msg, setMsg]           = useState('');
  const [clearing, setClearing] = useState(false);
  const fileRef                 = useRef<HTMLInputElement>(null);

  const startEdit = (id:number, field:string, val:any) => {
    setEditId(id); setEditField(field); setEditVal(String(val ?? ''));
  };
  const commitEdit = async () => {
    if (editId == null) return;
    await update(editId, { [editField]: parseFloat(editVal) || editVal });
    setEditId(null);
  };
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg('⏳ Uploading…');
    try {
      const result = await uploadCSV(file, 'upload');
      if (result.error) {
        setMsg(`❌ Error: ${result.error}`);
      } else if (result.type === 'dk_salary') {
        setMsg(`✅ DraftKings salary CSV: merged ${result.updated} players with existing projections, added ${result.inserted} new`);
      } else if (!result.inserted || result.inserted === 0) {
        setMsg('⚠️ Imported 0 players. Check that TOMORROW_DK or Proj column has values > 0.');
      } else {
        setMsg(`✅ Imported ${result.inserted} players from ${file.name}`);
      }
    } catch (err: any) {
      setMsg(`❌ Upload failed: ${err.message}`);
    }
    setTimeout(() => setMsg(''), 6000);
    if (e.target) e.target.value = '';
  };

  const handleClear = async () => {
    if (!confirm(`Clear all projections? This cannot be undone.`)) return;
    setClearing(true);
    try {
      // No date param = delete most recent slate (avoids timezone date mismatch)
      const res = await fetch(`/api/admin/projections?clearAll=true`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const text = await res.text();
      const result = text ? JSON.parse(text) : {};
      if (!res.ok || result.error) {
        setMsg(`❌ ${result.error || `Server error ${res.status}`}`);
      } else {
        setMsg(`✅ Cleared ${result.deleted ?? 'all'} projections`);
        setTimeout(() => window.location.reload(), 800);
      }
    } catch (err: any) {
      setMsg(`❌ Clear failed: ${err.message}`);
    }
    setClearing(false);
    setTimeout(() => setMsg(''), 5000);
  };


  return (
    <div className="card" style={{ padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div className="section-label" style={{ marginBottom:0 }}>Projections Management</div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-outline" onClick={() => fileRef.current?.click()} disabled={saving || clearing}>
            {saving ? '⏳ Uploading…' : '⬆ Upload CSV'}
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={handleUpload} />
          <button className="btn-danger" onClick={handleClear} disabled={clearing || saving}>
            {clearing ? '⏳ Clearing…' : players.length > 0 ? `🗑 Clear all (${players.length})` : '🗑 Clear today'}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:6, padding:'8px 12px', color:'#93c5fd', fontSize:12, marginBottom:12 }}>
          {msg}
        </div>
      )}

      <div style={{ fontSize:11, color:'#475569', marginBottom:10, lineHeight:1.6 }}>
        <strong style={{ color:'#94a3b8' }}>Recommended workflow:</strong> (1) Upload DraftKings salary CSV first — sets salary + position for all players. (2) Upload theBatX pitchers CSV. (3) Upload theBatX hitters CSV. The files merge automatically by player name.
      </div>

      <div style={{ fontSize:11, color:'#475569', marginBottom:8 }}>
        Showing projections for: <span style={{ color:'#94a3b8' }}>{new Date().toISOString().split('T')[0]}</span>
        {' · '}{loading ? 'Loading…' : `${players.length} players loaded`}
      </div>

      {loading ? <LoadingSkeleton rows={8} cols={8} /> : players.length === 0 ? (
        <EmptyState message="No projections found for today. Upload a CSV above — make sure the date on your CSV matches today." />
      ) : (
        <div style={{ maxHeight:450, overflowY:'auto' }}>
          <table className="data-table">
            <thead><tr>
              <th>Player</th><th>Tm</th><th>Pos</th><th>Proj FP</th>
              <th>Own%</th><th>HR/K</th><th>SB/IP</th><th>Salary</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {players.map((p:any) => (
                <tr key={p.id}>
                  <td style={{ fontWeight:500, fontSize:13 }}>{p.player_name}</td>
                  <td><TeamLogo abbr={p.team||'?'} size={20} /></td>
                  <td style={{ fontSize:12 }}>{p.position}</td>
                  <td>
                    {editId===p.id && editField==='proj_fpts'
                      ? <input className="input-field" style={{ width:60, padding:'2px 6px', fontSize:12 }}
                          value={editVal} onChange={e=>setEditVal(e.target.value)}
                          onBlur={commitEdit} onKeyDown={e=>e.key==='Enter'&&commitEdit()} autoFocus />
                      : <span className="neon-blue" style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, cursor:'pointer', textDecoration:'underline dotted' }}
                          onClick={()=>startEdit(p.id,'proj_fpts',p.proj_fpts)}>
                          {p.proj_fpts}
                        </span>
                    }
                  </td>
                  <td style={{ fontSize:12 }}>{p.proj_ownership>0?`${p.proj_ownership}%`:'—'}</td>
                  <td style={{ fontSize:12 }}>{p.proj_hr>0?p.proj_hr:p.proj_pitching_k>0?`${p.proj_pitching_k}K`:'—'}</td>
                  <td style={{ fontSize:12 }}>{p.proj_sb>0?`${p.proj_sb}SB`:p.proj_ip>0?`${p.proj_ip}IP`:'—'}</td>
                  <td style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:12 }}>{p.salary>0?fmt$(p.salary):'—'}</td>
                  <td>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="btn-outline" style={{ padding:'2px 8px', fontSize:11 }}
                        onClick={()=>startEdit(p.id,'proj_fpts',p.proj_fpts)}>Edit</button>
                      <button className="btn-danger" onClick={()=>remove(p.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Injuries ─────────────────────────────────────────────── */
function InjuriesSection() {
  const { token } = useAuth();
  const [injuries, setInjuries] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ player_name:'', team:'', status:'Day-to-Day', description:'' });

  useEffect(() => {
    fetch('/api/injuries')
      .then(r=>r.json())
      .then(d=>{ setInjuries(Array.isArray(d)?d:[]); setLoading(false); })
      .catch(()=>setLoading(false));
  }, []);

  const addInjury = async () => {
    if (!form.player_name) return;
    await fetch('/api/injuries', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const d = await fetch('/api/injuries').then(r=>r.json());
    setInjuries(Array.isArray(d)?d:[]);
    setShowAdd(false);
    setForm({ player_name:'', team:'', status:'Day-to-Day', description:'' });
  };

  const deleteInjury = async (id:number) => {
    await fetch(`/api/injuries?id=${id}`, {
      method:'DELETE',
      headers:{ Authorization:`Bearer ${token}` },
    });
    setInjuries(prev=>prev.filter(i=>i.id!==id));
  };

  const STATUS_COLORS: Record<string,{bg:string;color:string}> = {
    'Active':       { bg:'rgba(34,197,94,0.15)',  color:'#22c55e' },
    'Day-to-Day':   { bg:'rgba(251,191,36,0.15)', color:'#f59e0b' },
    '10-Day IL':    { bg:'rgba(239,68,68,0.15)',  color:'#ef4444' },
    '60-Day IL':    { bg:'rgba(239,68,68,0.2)',   color:'#f87171' },
    'Out':          { bg:'rgba(239,68,68,0.25)',  color:'#fca5a5' },
  };

  return (
    <div className="card" style={{ padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div className="section-label" style={{ marginBottom:0 }}>Injury & Status Report</div>
        <button className="btn-primary" style={{ fontSize:12 }} onClick={()=>setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ Add Report'}
        </button>
      </div>

      {showAdd && (
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:14, marginBottom:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={{ fontSize:11, color:'#94a3b8', display:'block', marginBottom:3 }}>Player Name</label>
              <input className="input-field" placeholder="Aaron Judge" value={form.player_name}
                onChange={e=>setForm(f=>({...f,player_name:e.target.value}))} />
            </div>
            <div>
              <label style={{ fontSize:11, color:'#94a3b8', display:'block', marginBottom:3 }}>Team</label>
              <input className="input-field" placeholder="NYY" value={form.team}
                onChange={e=>setForm(f=>({...f,team:e.target.value}))} />
            </div>
            <div>
              <label style={{ fontSize:11, color:'#94a3b8', display:'block', marginBottom:3 }}>Status</label>
              <select className="input-field" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                {Object.keys(STATUS_COLORS).map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#94a3b8', display:'block', marginBottom:3 }}>Description</label>
              <input className="input-field" placeholder="Hamstring tightness…" value={form.description}
                onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
            </div>
          </div>
          <button className="btn-primary" style={{ fontSize:12 }} onClick={addInjury}>Save Report</button>
        </div>
      )}

      {loading ? <LoadingSkeleton rows={5} cols={4} /> : injuries.length===0 ? (
        <EmptyState message="No injury reports. Add one above or they will auto-populate from RSS feeds." />
      ) : (
        injuries.map((inj:any) => {
          const sc = STATUS_COLORS[inj.status] || STATUS_COLORS['Day-to-Day'];
          return (
            <div key={inj.id} style={{ display:'flex', gap:12, padding:'11px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ flexShrink:0 }}>
                <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif", background:sc.bg, color:sc.color, whiteSpace:'nowrap' }}>
                  {inj.status}
                </span>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <span style={{ fontWeight:500, fontSize:13 }}>{inj.player_name}</span>
                  {inj.team && <TeamLogo abbr={inj.team} size={18} />}
                </div>
                {inj.description && <div style={{ fontSize:12, color:'#94a3b8' }}>{inj.description}</div>}
                <div style={{ fontSize:10, color:'#475569', marginTop:3 }}>
                  Updated {new Date(inj.updated_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
                </div>
              </div>
              <button className="btn-danger" style={{ alignSelf:'center', flexShrink:0 }}
                onClick={()=>deleteInjury(inj.id)}>Del</button>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ── Users ────────────────────────────────────────────────── */
function UsersSection() {
  const { users, loading, updateUser } = useAdminUsers();
  return (
    <div className="card" style={{ padding:16 }}>
      <div className="section-label">User Management</div>
      {loading ? <LoadingSkeleton rows={6} cols={5} /> : users.length===0 ? (
        <EmptyState message="No users yet." />
      ) : (
        <table className="data-table">
          <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Plan</th><th>Joined</th><th>Change Role</th></tr></thead>
          <tbody>
            {users.map((u:any) => (
              <tr key={u.id}>
                <td style={{ fontWeight:500 }}>{u.username}</td>
                <td style={{ color:'#64748b', fontSize:12 }}>{u.email}</td>
                <td>
                  <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif", background:u.role==='admin'?'rgba(139,92,246,0.2)':'rgba(255,255,255,0.06)', color:u.role==='admin'?'#a78bfa':'#94a3b8' }}>
                    {u.role}
                  </span>
                </td>
                <td>
                  <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif", background:u.subscription==='free'?'rgba(255,255,255,0.06)':'rgba(251,191,36,0.15)', color:u.subscription==='free'?'#64748b':'#f59e0b' }}>
                    {u.subscription}
                  </span>
                </td>
                <td style={{ color:'#64748b', fontSize:12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <select className="input-field" style={{ width:100, padding:'3px 6px', fontSize:11 }}
                    value={u.role} onChange={e=>updateUser(u.id,{role:e.target.value})}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── Scoring Rules ────────────────────────────────────────── */
function ScoringSection() {
  const DK = [
    {stat:'Single',pts:3},{stat:'Double',pts:5},{stat:'Triple',pts:8},{stat:'Home Run',pts:10},
    {stat:'RBI',pts:2},{stat:'Run',pts:2},{stat:'Walk (batter)',pts:2},{stat:'HBP',pts:2},
    {stat:'Stolen Base',pts:5},{stat:'Inning Pitched',pts:2.25},{stat:'Strikeout (pitcher)',pts:2},
    {stat:'Win',pts:4},{stat:'Earned Run',pts:-2},{stat:'Hit Allowed',pts:-0.6},{stat:'Walk (pitcher)',pts:-0.6},
  ];
  return (
    <div className="card" style={{ padding:16 }}>
      <div className="section-label">DraftKings MLB Scoring Rules</div>
      <div style={{ fontSize:12, color:'#64748b', marginBottom:14 }}>
        These values are used to calculate projected fantasy points. Edit in Supabase → scoring_rules table to customize.
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <div style={{ fontSize:11, color:'#3b82f6', fontFamily:"'Barlow Condensed',sans-serif", textTransform:'uppercase', letterSpacing:'.1em', marginBottom:8 }}>Hitting</div>
          {DK.slice(0,9).map(r=>(
            <div key={r.stat} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:13 }}>
              <span style={{ color:'#94a3b8' }}>{r.stat}</span>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, color:r.pts>0?'#22c55e':'#ef4444' }}>{r.pts>0?'+':''}{r.pts}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize:11, color:'#a78bfa', fontFamily:"'Barlow Condensed',sans-serif", textTransform:'uppercase', letterSpacing:'.1em', marginBottom:8 }}>Pitching</div>
          {DK.slice(9).map(r=>(
            <div key={r.stat} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:13 }}>
              <span style={{ color:'#94a3b8' }}>{r.stat}</span>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, color:r.pts>0?'#22c55e':'#ef4444' }}>{r.pts>0?'+':''}{r.pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Stack Projections ───────────────────────────────────────── */
function StackSection() {
  const { token } = useAuth();
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true); setMsg('Uploading...');
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l:string) => l.trim());
      const headers = lines[0].toLowerCase().split(',').map((h:string) => h.trim());
      const stacks = lines.slice(1).map((line:string) => {
        const cols = line.split(',');
        const get = (names: string[]) => {
          for (const n of names) { const i = headers.indexOf(n); if (i>=0) return cols[i]?.trim()||'0'; }
          return '0';
        };
        return {
          team: get(['team','tm']),
          implied_runs: parseFloat(get(['implied_runs','implied','ir']))||0,
          team_total:   parseFloat(get(['team_total','total','tt']))||0,
          over_under:   parseFloat(get(['over_under','ou']))||0,
          spread:       parseFloat(get(['spread','line']))||0,
        };
      }).filter((s:any) => s.team);
      const res = await fetch('/api/stack-projections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stacks }),
      });
      const data = await res.json();
      setMsg(data.uploaded ? `Uploaded ${data.uploaded} teams` : `Error: ${data.error}`);
    } catch (err:any) { setMsg(`Error: ${err.message}`); }
    setSaving(false);
    if (e.target) e.target.value = '';
  };

  return (
    <div className="card" style={{ padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div className="section-label" style={{ marginBottom:0 }}>Stack Projections</div>
        <button className="btn-outline" onClick={() => fileRef.current?.click()} disabled={saving}>
          {saving ? 'Uploading...' : 'Upload CSV'}
        </button>
        <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={handleUpload}/>
      </div>
      {msg && <div style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:6, padding:'8px 12px', color:'#93c5fd', fontSize:12, marginBottom:10 }}>{msg}</div>}
      <div style={{ fontSize:11, color:'#475569', lineHeight:1.6 }}>
        CSV columns: <strong>team, implied_runs, team_total, over_under, spread</strong><br/>
        Implied runs boost stacks in the optimizer automatically.
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [section, setSection] = useState('projections');
  return (
    <div style={{ display:'grid', gridTemplateColumns:'190px 1fr', gap:16, minHeight:500 }}>
      {/* Sidebar */}
      <div className="card" style={{ padding:10, alignSelf:'start' }}>
        <div className="section-label" style={{ padding:'4px 8px' }}>Admin Panel</div>
        {SIDEBAR.map(item => (
          <button key={item.id} onClick={()=>setSection(item.id)} style={{
            display:'flex', alignItems:'center', gap:8, width:'100%',
            padding:'9px 10px', borderRadius:6, border:'none', cursor:'pointer', textAlign:'left',
            background: section===item.id?'rgba(59,130,246,0.15)':'transparent',
            color: section===item.id?'#93c5fd':'#64748b',
            fontFamily:"'Barlow',sans-serif", fontSize:13, marginBottom:2, transition:'all .15s',
          }}>
            <span style={{ fontSize:14 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {section==='projections' && <ProjectionsSection />}
        {section==='stacks'      && <StackSection />}
        {section==='injuries'    && <InjuriesSection />}
        {section==='users'       && <UsersSection />}
        {section==='scoring'     && <ScoringSection />}
      </div>
    </div>
  );
}
