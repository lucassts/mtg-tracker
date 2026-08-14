// Shared UI — charts, device shell, tab bar

function Icon({ name, size = 20, stroke = 'currentColor', strokeWidth = 1.8 }) {
  const s = { width: size, height: size, fill: 'none', stroke, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><line x1="12" y1="18" x2="12" y2="22" /></>,
    keyboard: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M6 10h0M10 10h0M14 10h0M18 10h0M6 14h0M10 14h0M14 14h0M18 14h0M7 14h10" /></>,
    form: <><rect x="4" y="3" width="16" height="18" rx="2" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="12" y2="16" /></>,
    stats: <><line x1="4" y1="20" x2="4" y2="10" /><line x1="10" y1="20" x2="10" y2="4" /><line x1="16" y1="20" x2="16" y2="13" /><line x1="22" y1="20" x2="2" y2="20" /></>,
    list: <><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    chev: <polyline points="9 18 15 12 9 6" />,
    check: <polyline points="20 6 9 17 4 12" />,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
    back: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
    heart: <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></>,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></>,
  };
  return <svg viewBox="0 0 24 24" style={s}>{paths[name]}</svg>;
}

function TabBar({ active, onNav, dark = false }) {
  const items = [
    { id: 'life',     l: 'Life',     i: 'heart'    },
    { id: 'stats',    l: 'Stats',    i: 'stats'    },
    { id: 'home',     l: 'Record',   i: 'mic',  center: true },
    { id: 'history',  l: 'Matches',  i: 'list'     },
    { id: 'settings', l: 'Settings', i: 'settings' },
  ];
  return (
    <div className={`tabbar${dark ? ' dark' : ''}`} style={{ gridTemplateColumns: '1fr 1fr 68px 1fr 1fr' }}>
      {items.map(it => (
        <button key={it.id}
          className={`tab${active === it.id ? ' active' : ''}`}
          onClick={() => onNav(it.id)}
          style={it.center ? { position: 'relative', padding: 0 } : {}}>
          {it.center ? (
            <div style={{
              width: 56, height: 56, borderRadius: 999,
              background: active === it.id ? 'var(--accent)' : 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
              boxShadow: active === it.id
                ? '0 0 0 4px rgba(212,95,60,0.2), 0 8px 20px rgba(0,0,0,0.2)'
                : '0 4px 14px rgba(0,0,0,0.18)',
              transition: 'background 0.2s, box-shadow 0.2s',
            }}>
              <Icon name="mic" size={24} stroke="#fff" strokeWidth={active === it.id ? 2.2 : 1.8} />
            </div>
          ) : (
            <>
              <div className="tab-icon">
                <Icon name={it.i} size={20} strokeWidth={active === it.id ? 2 : 1.6} />
              </div>
              <div>{it.l}</div>
            </>
          )}
        </button>
      ))}
    </div>
  );
}

// ───────────────────────── Charts ─────────────────────────
function ChartDonut({ value = 0, size = 88, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const off = C * (1 - value / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--ink)" strokeWidth={stroke}
        strokeDasharray={C} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x={size/2} y={size/2 + 2} textAnchor="middle" dominantBaseline="middle"
        fontFamily="Inter" fontWeight="700" fontSize={size * 0.24} fill="var(--ink)">
        {value}%
      </text>
    </svg>
  );
}

function ChartLine({ points, w = 296, h = 90 }) {
  if (!points || points.length < 2) {
    return <div style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: 'center', padding: 20 }}>Not enough data</div>;
  }
  const max = Math.max(...points, 10);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);
  const pad = 12;
  const coords = points.map((p, i) => ({
    x: pad + (i / (points.length - 1)) * (w - pad * 2),
    y: h - 18 - ((p - min) / range) * (h - 32),
  }));
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const area = path + ` L ${coords[coords.length-1].x} ${h-18} L ${pad} ${h-18} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <line x1={pad} y1={h-18} x2={w-pad} y2={h-18} stroke="var(--line)" />
      <line x1={pad} y1={(h-18)/2+4} x2={w-pad} y2={(h-18)/2+4} stroke="var(--line)" strokeDasharray="2 3" />
      <path d={area} fill="var(--ink)" fillOpacity="0.06" />
      <path d={path} fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinejoin="round" />
      {coords.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r="2.5" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.5" />)}
      <text x={pad} y="10" fontFamily="JetBrains Mono" fontSize="9" fill="var(--ink-3)">{max}%</text>
      <text x={pad} y={h-4} fontFamily="JetBrains Mono" fontSize="9" fill="var(--ink-3)">{min}%</text>
    </svg>
  );
}

function ChartSplit({ left, right, leftLabel = 'On the play', rightLabel = 'On the draw', w = 296 }) {
  const total = left + right || 1;
  const lw = (left / total) * (w - 4);
  return (
    <svg width={w} height={66} viewBox={`0 0 ${w} 66`}>
      <text x="2" y="11" fontFamily="JetBrains Mono" fontSize="9"
        fill="var(--ink-3)">{leftLabel.toUpperCase()}</text>
      <text x={w-2} y="11" textAnchor="end" fontFamily="JetBrains Mono" fontSize="9"
        fill="var(--ink-3)">{rightLabel.toUpperCase()}</text>
      <rect x="2" y="18" width={lw} height="20" fill="var(--ink)" rx="2" />
      <rect x={2+lw+3} y="18" width={w-7-lw} height="20" fill="var(--ink-5)" rx="2" />
      <text x={8} y="33" fontFamily="Inter" fontSize="11" fontWeight="600" fill="var(--surface)">{left}%</text>
      <text x={w-8} y="33" textAnchor="end" fontFamily="Inter" fontSize="11" fontWeight="600" fill="var(--ink)">{right}%</text>
      <text x="2" y="58" fontFamily="JetBrains Mono" fontSize="9" fill="var(--ink-3)">
        Δ {Math.abs(left - right)}% difference
      </text>
    </svg>
  );
}

function ChartBars({ data, w = 296, h = 20 }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map(d => d.v), 1);
  const rowH = 28;
  const totalH = data.length * rowH;
  return (
    <svg width={w} height={totalH} viewBox={`0 0 ${w} ${totalH}`}>
      {data.map((d, i) => {
        const y = i * rowH;
        const barW = (d.v / max) * (w - 100);
        return (
          <g key={i}>
            <text x="0" y={y + rowH/2 + 4} fontFamily="Inter" fontSize="11" fill="var(--ink-2)">{d.l}</text>
            <rect x="84" y={y + 6} width={barW} height="16" fill="var(--ink)" rx="2" />
            <text x={84 + barW + 6} y={y + rowH/2 + 4} fontFamily="JetBrains Mono" fontSize="10" fill="var(--ink-3)">{d.v}{d.suffix || ''}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DeckList({ rows }) {
  if (!rows || !rows.length) return <div style={{ fontSize: 11, color: 'var(--ink-4)', padding: 8 }}>No matches match your filters.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{r.l}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>
            {r.wins}W · {r.losses}L
          </div>
          <div style={{
            width: 48, textAlign: 'right',
            fontFamily: 'Inter', fontSize: 13, fontWeight: 700,
            color: r.wr >= 50 ? 'var(--good)' : 'var(--bad)',
          }}>{r.wr}%</div>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── Phone Shell ─────────────────────────
function Phone({ children, dark = false }) {
  return (
    <div className="phone-shadow" style={{
      width: 380, height: 800, overflow: 'hidden',
      position: 'relative', background: dark ? 'var(--dark)' : 'var(--bg)',
      borderRadius: 48,
    }}>
      {/* status bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 30px 8px', fontFamily: '-apple-system, system-ui',
          fontSize: 14, fontWeight: 600, color: dark ? '#fff' : 'var(--ink)',
        }}>
          <span>9:41</span>
          <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
            <svg width="16" height="10" viewBox="0 0 16 10"><rect x="0" y="6" width="3" height="4" rx="0.5" fill="currentColor" /><rect x="4" y="4" width="3" height="6" rx="0.5" fill="currentColor" /><rect x="8" y="2" width="3" height="8" rx="0.5" fill="currentColor" /><rect x="12" y="0" width="3" height="10" rx="0.5" fill="currentColor" /></svg>
            <svg width="22" height="11" viewBox="0 0 22 11"><rect x="0.5" y="0.5" width="19" height="10" rx="2.5" fill="none" stroke="currentColor" opacity="0.4" /><rect x="2" y="2" width="16" height="7" rx="1" fill="currentColor" /></svg>
          </span>
        </div>
      </div>
      {/* dynamic island */}
      <div style={{
        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
        width: 110, height: 32, borderRadius: 24, background: '#000', zIndex: 20,
      }} />
      {/* content area — paddingTop clears status bar, paddingBottom reserved for Android nav */}
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        paddingTop: 48, paddingBottom: 0,
      }}>
        {children}
      </div>
      {/* home indicator (iOS style) */}
      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        width: 130, height: 4, borderRadius: 999,
        background: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)', zIndex: 30,
      }} />
    </div>
  );
}

// ───────────────────────── DeckSelector ─────────────────────────
// Searchable deck picker: "Create one" always on top, then last 5 used,
// then full format deck list. Filters as user types.
function DeckSelector({ value, onChange, format = 'Commander', recentDecks = [], placeholder = 'Search or create deck…' }) {
  const [query, setQuery] = React.useState(value || '');
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef(null);
  const containerRef = React.useRef(null);

  React.useEffect(() => { setQuery(value || ''); }, [value]);

  React.useEffect(() => {
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Inline deck DB so we don't depend on external global timing
  const DECKS = {
    Commander: ['Atraxa, Praetors\' Voice','Edgar Markov','Krenko, Mob Boss','Yuriko, the Tiger\'s Shadow','Kinnan, Bonder Prodigy','Urza, Lord High Artificer','Tymna / Thrasios','Kaalia of the Vast','Omnath, Locus of Creation','Meren of Clan Nel Toth','The Ur-Dragon','Kenrith, the Returned King','Korvold, Fae-Cursed King','Najeela, the Blade-Blossom','Prosper, Tome-Bound','Zur the Enchanter','Sisay, Weatherlight Captain','Breya, Etherium Shaper'],
    Modern: ['Burn','UW Control','Hammer Time','Living End','Tron','Murktide Regent','Amulet Titan','Rhinos','Yawgmoth','Hardened Scales','Merfolk','Infect','Death\'s Shadow','Storm','Grixis Control','Izzet Prowess','Humans','Eldrazi Tron'],
    Standard: ['Esper Midrange','Domain Ramp','Azorius Soldiers','Mono-Red Aggro','Jund Midrange','Grixis Midrange','Selesnya Tokens','Rakdos Reanimator','White Weenie','5c Ramp','Abzan Midrange','Temur Tempo'],
    Pioneer: ['Rakdos Midrange','Lotus Field Combo','Azorius Spirits','Mono-Red Aggro','Green Devotion','Abzan Greasefang','Izzet Phoenix','Heroic','Bant Humans','Niv to Light'],
    Legacy: ['Delver','Death and Taxes','Storm','Reanimator','Sneak and Show','Elves','Miracles','Lands','Dark Depths'],
    Pauper: ['Faeries','Burn','Affinity','Bogles','Familiars','Stompy','Caw-Gate','Mono-Black Control','Dimir Faeries'],
  };
  const db = DECKS[format] || [];
  const last5 = recentDecks.slice(0, 5);
  const allSuggestions = [...new Set([...last5, ...db])];
  const filtered = query.trim()
    ? allSuggestions.filter(d => d.toLowerCase().includes(query.toLowerCase()))
    : allSuggestions.slice(0, 10);

  const select = (deck) => { onChange(deck); setQuery(deck); setOpen(false); };
  const createNew = () => { const val = query.trim() || 'New Deck'; onChange(val); setQuery(val); setOpen(false); };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true); onChange(e.target.value); }}
        style={{
          width: '100%', fontSize: 13, padding: '8px 12px',
          border: '1px solid var(--line)', borderRadius: 8,
          background: 'var(--surface)', fontFamily: 'var(--ui)',
          outline: 'none',
        }}
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 10, zIndex: 100, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {/* Create new — always on top */}
          <div
            onClick={createNew}
            style={{
              padding: '9px 12px', fontSize: 12, fontWeight: 600,
              color: 'var(--accent)', cursor: 'pointer',
              borderBottom: '1px solid var(--line-2)',
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--surface)',
              position: 'sticky', top: 0,
            }}
          >
            <Icon name="plus" size={14} stroke="var(--accent)" /> Create "{query.trim() || 'new deck'}"
          </div>

          {/* Section: last used (only when no query) */}
          {!query.trim() && last5.length > 0 && (
            <>
              <div className="label" style={{ padding: '6px 12px 2px', fontSize: 9 }}>Recently used</div>
              {last5.map(d => (
                <div key={d} onClick={() => select(d)} style={{
                  padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--ink)',
                  borderBottom: '1px solid var(--line-2)',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >{d}</div>
              ))}
              <div className="label" style={{ padding: '6px 12px 2px', fontSize: 9 }}>All decks</div>
            </>
          )}

          {/* Filtered list */}
          {filtered.filter(d => !last5.includes(d) || query.trim()).map(d => (
            <div key={d} onClick={() => select(d)} style={{
              padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--ink)',
              borderBottom: '1px solid var(--line-2)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >{d}</div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--ink-4)' }}>
              No matches — use "Create" above.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── MatchForm ─────────────────────────
// Shared form used by Review, Home overlay, and History edit
function MatchForm({ initial, settings, recentDecks = [], onSave, onCancel, title = 'Looks right?', subtitle = 'Tap any field to fix it.', conf = {} }) {
  const toDateInput = (iso) => {
    if (!iso) return new Date().toISOString().slice(0, 10);
    return new Date(iso).toISOString().slice(0, 10);
  };

  const [match, setMatch] = React.useState({
    won: true, format: settings.defaultFormat,
    myDeck: settings.defaultDeck || '',
    oppDeck: '', archetype: 'Midrange',
    onPlay: false, notes: '',
    date: new Date().toISOString(),
    ...initial,
  });
  const [dateInput, setDateInput] = React.useState(() => toDateInput((initial || {}).date));

  const set = (k, v) => setMatch(m => ({ ...m, [k]: v }));

  const handleDateChange = (val) => {
    setDateInput(val);
    if (val) {
      // preserve time from original, just change the date part
      const orig = new Date(match.date);
      const [y, mo, d] = val.split('-').map(Number);
      orig.setFullYear(y, mo - 1, d);
      set('date', orig.toISOString());
    }
  };

  const ConfBadge = ({ level }) => {
    if (!level || level === 'high') return null;
    const map = {
      default: { label: 'DEFAULT', color: 'var(--ink-3)', bg: 'var(--bg-2)' },
      low:     { label: 'LOW CONF', color: '#b45309', bg: '#fef3c7' },
      missing: { label: 'MISSING',  color: 'var(--bad)', bg: 'var(--bad-soft)' },
    }[level] || {};
    return (
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
        padding: '2px 6px', borderRadius: 3, marginLeft: 6,
        color: map.color, background: map.bg, fontFamily: 'var(--mono)',
      }}>{map.label}</span>
    );
  };

  const Field = ({ label, confKey, children }) => (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--line-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <div className="label">{label}</div>
        <ConfBadge level={conf[confKey]} />
      </div>
      {children}
    </div>
  );

  const lowCount = Object.values(conf).filter(c => c === 'low' || c === 'missing').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '0 0 12px', flex: 1, overflowY: 'auto' }}>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>{title}</h2>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '4px 0 0' }}>
            {lowCount > 0 ? `${lowCount} field${lowCount > 1 ? 's need' : ' needs'} attention · ${subtitle}` : subtitle}
          </p>
        </div>

        {/* Date */}
        <Field label="Date" confKey="date">
          <input
            type="date"
            value={dateInput}
            onChange={e => handleDateChange(e.target.value)}
            style={{
              width: '100%', fontSize: 13, padding: '8px 12px',
              border: '1px solid var(--line)', borderRadius: 8,
              background: 'var(--surface)', fontFamily: 'var(--ui)',
              color: 'var(--ink)', appearance: 'none',
            }}
          />
        </Field>

        {/* Result */}
        <Field label="Result" confKey="won">
          <div className="segmented">
            <button className={match.won ? 'active' : ''} onClick={() => set('won', true)}>Win</button>
            <button className={!match.won ? 'active' : ''} onClick={() => set('won', false)}>Loss</button>
          </div>
        </Field>

        {/* Format */}
        <Field label="Format" confKey="format">
          <div className="segmented">
            {['Commander','Modern','Standard','Pioneer','Legacy','Other'].map(f => (
              <button key={f} className={match.format === f ? 'active' : ''} onClick={() => set('format', f)}
                style={{ fontSize: 10 }}>{f}</button>
            ))}
          </div>
        </Field>

        {/* My deck */}
        <Field label="My deck" confKey="myDeck">
          <DeckSelector value={match.myDeck} onChange={v => set('myDeck', v)}
            format={match.format} recentDecks={recentDecks} />
        </Field>

        {/* Opponent deck */}
        <Field label="Opponent deck" confKey="oppDeck">
          <DeckSelector value={match.oppDeck} onChange={v => set('oppDeck', v)}
            format={match.format} recentDecks={recentDecks} placeholder="Search or type opponent's deck…" />
        </Field>

        {/* Play/draw */}
        <Field label="On the play / draw" confKey="onPlay">
          <div className="segmented">
            <button className={match.onPlay ? 'active' : ''} onClick={() => set('onPlay', true)}>On the play</button>
            <button className={!match.onPlay ? 'active' : ''} onClick={() => set('onPlay', false)}>On the draw</button>
          </div>
        </Field>

        {/* Archetype */}
        <Field label="Opponent archetype" confKey="archetype">
          <div className="segmented">
            {['Aggro','Midrange','Control','Combo','Stax'].map(a => (
              <button key={a} className={match.archetype === a ? 'active' : ''} onClick={() => set('archetype', a)}
                style={{ fontSize: 10 }}>{a}</button>
            ))}
          </div>
        </Field>

        {/* Notes */}
        <Field label="Notes (optional)" confKey="notes">
          <textarea value={match.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Any thoughts about the match…"
            style={{
              width: '100%', fontSize: 12, padding: '8px 10px',
              border: '1px solid var(--line)', borderRadius: 8,
              background: 'var(--surface)', fontFamily: 'var(--ui)',
              resize: 'none', height: 64, lineHeight: 1.5,
            }} />
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 10, paddingTop: 10 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => onSave(match)}>
          <Icon name="check" size={16} /> Save match
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  Icon, TabBar, Phone,
  ChartDonut, ChartLine, ChartSplit, ChartBars, DeckList,
  DeckSelector, MatchForm,
});
