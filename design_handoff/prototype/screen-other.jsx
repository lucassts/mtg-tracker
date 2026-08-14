// History, Settings, Onboarding, ManageDecks

function HistoryScreen({ matches, settings, recentDecks, onUpdateMatch }) {
  const [editMatch, setEditMatch] = React.useState(null);

  const grouped = React.useMemo(() => {
    const g = {};
    matches.forEach(m => {
      const d = new Date(m.date);
      const key = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      if (!g[key]) g[key] = [];
      g[key].push(m);
    });
    return g;
  }, [matches]);

  if (editMatch) {
    return (
      <div className="page" style={{ background: 'var(--bg)' }}>
        <div style={{ padding: '14px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn-ghost btn" style={{ padding: '6px 12px' }} onClick={() => setEditMatch(null)}>
            <Icon name="back" size={16} /> Back
          </button>
          <div className="label">{new Date(editMatch.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 20px 0' }}>
          <MatchForm
            initial={editMatch}
            settings={settings}
            recentDecks={recentDecks}
            onSave={(updated) => { onUpdateMatch({ ...editMatch, ...updated }); setEditMatch(null); }}
            onCancel={() => setEditMatch(null)}
            title="Edit match"
            subtitle="Update any field."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="page-scroll">
        <div>
          <h1 className="page-title">Matches</h1>
          <div className="label" style={{ marginTop: 4 }}>{matches.length} total</div>
        </div>
        {Object.entries(grouped).map(([day, ms]) => (
          <div key={day}>
            <div className="label" style={{ padding: '0 0 6px' }}>{day}</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {ms.map((m, i) => (
                <button key={m.id} onClick={() => setEditMatch(m)} style={{
                  width: '100%', background: 'transparent', border: 'none', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  borderBottom: i < ms.length - 1 ? '1px solid var(--line-2)' : 'none',
                  cursor: 'pointer',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: m.won ? 'var(--good-soft)' : 'var(--bad-soft)',
                    color: m.won ? 'var(--good)' : 'var(--bad)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>{m.won ? 'W' : 'L'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>vs {m.oppDeck || '—'}</div>
                    <div className="label" style={{ marginTop: 2, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                      {m.myDeck} · {m.format} · {m.onPlay ? 'Play' : 'Draw'}
                    </div>
                  </div>
                  <Icon name="edit" size={14} stroke="var(--ink-4)" />
                </button>
              ))}
            </div>
          </div>
        ))}
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

function ManageDecksScreen({ matches, onBack, onRenameDecks }) {
  const decks = React.useMemo(() => {
    const map = {};
    matches.forEach(m => {
      if (m.myDeck) {
        if (!map[m.myDeck]) map[m.myDeck] = { count: 0, wins: 0, format: m.format };
        map[m.myDeck].count++;
        if (m.won) map[m.myDeck].wins++;
      }
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, wr: Math.round(v.wins / v.count * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [matches]);

  const [query, setQuery] = React.useState('');
  const [editing, setEditing] = React.useState(null); // deck name being edited
  const [editValue, setEditValue] = React.useState('');
  const filtered = query ? decks.filter(d => d.name.toLowerCase().includes(query.toLowerCase())) : decks;

  const startEdit = (name) => { setEditing(name); setEditValue(name); };
  const confirmEdit = () => {
    if (editValue.trim() && editValue.trim() !== editing && onRenameDecks) {
      onRenameDecks(editing, editValue.trim());
    }
    setEditing(null);
  };

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div style={{ padding: '14px 20px 0', display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn-ghost btn" style={{ padding: '6px 12px' }} onClick={onBack}>
          <Icon name="back" size={16} /> Settings
        </button>
        <h1 className="page-title" style={{ fontSize: 18, margin: 0 }}>My Decks</h1>
      </div>
      <div className="page-scroll">
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search decks…"
          style={{
            width: '100%', fontSize: 13, padding: '8px 12px',
            border: '1px solid var(--line)', borderRadius: 8,
            background: 'var(--surface)', fontFamily: 'var(--ui)',
          }} />
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.length === 0 && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-4)', textAlign: 'center' }}>No decks yet.</div>
          )}
          {filtered.map((d, i) => (
            <div key={d.name} className="row" style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--line-2)' : 'none', flexWrap: 'wrap', gap: 8 }}>
              {editing === d.name ? (
                <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditing(null); }}
                    style={{
                      flex: 1, fontSize: 13, padding: '6px 10px',
                      border: '1.5px solid var(--ink)', borderRadius: 7,
                      background: 'var(--surface)', fontFamily: 'var(--ui)',
                      outline: 'none',
                    }}
                  />
                  <button onClick={confirmEdit} style={{
                    background: 'var(--ink)', color: '#fff', border: 'none',
                    borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600,
                  }}>Save</button>
                  <button onClick={() => setEditing(null)} style={{
                    background: 'var(--bg-2)', color: 'var(--ink-3)', border: 'none',
                    borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer',
                  }}>✕</button>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
                    <div className="label" style={{ marginTop: 2, textTransform: 'none', letterSpacing: 0 }}>
                      {d.format} · {d.count} match{d.count !== 1 ? 'es' : ''}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'Inter', fontSize: 14, fontWeight: 700,
                    color: d.wr >= 50 ? 'var(--good)' : 'var(--bad)', marginRight: 4,
                  }}>{d.wr}%</div>
                  <button onClick={() => startEdit(d.name)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--ink-4)',
                  }}>
                    <Icon name="edit" size={15} stroke="var(--ink-4)" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

function SettingsScreen({ settings, matches, onChange, onImport }) {
  const [showDecks, setShowDecks] = React.useState(false);
  const [importStatus, setImportStatus] = React.useState(null); // null | 'ok' | 'err'
  const [importCount, setImportCount] = React.useState(0);
  const importRef = React.useRef();
  const set = (k, v) => onChange({ ...settings, [k]: v });

  const exportCSV = () => {
    const headers = ['date','format','myDeck','oppDeck','archetype','onPlay','won','notes'];
    const rows = matches.map(m =>
      headers.map(h => {
        const v = m[h];
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
        if (v == null) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mtg-matches.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const parseVal = (h, v) => {
          v = v.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
          if (h === 'onPlay' || h === 'won') return v.toUpperCase() === 'TRUE';
          return v;
        };
        const imported = lines.slice(1).filter(l => l.trim()).map((line, idx) => {
          // CSV-aware split respecting quoted fields
          const cols = [];
          let cur = '', inQ = false;
          for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') { inQ = !inQ; }
            else if (line[i] === ',' && !inQ) { cols.push(cur); cur = ''; }
            else cur += line[i];
          }
          cols.push(cur);
          const obj = { id: 'imp_' + Date.now() + '_' + idx };
          headers.forEach((h, i) => { if (h) obj[h] = parseVal(h, cols[i] || ''); });
          if (!obj.date) obj.date = new Date().toISOString();
          return obj;
        });
        setImportCount(imported.length);
        setImportStatus('ok');
        if (onImport) onImport(imported);
        e.target.value = '';
        setTimeout(() => setImportStatus(null), 3500);
      } catch(err) {
        setImportStatus('err');
        e.target.value = '';
        setTimeout(() => setImportStatus(null), 3500);
      }
    };
    reader.readAsText(file);
  };

  const ALL_FORMATS = ['Commander','Modern','Standard','Pioneer','Legacy','Pauper','Draft','Other'];

  const LANGUAGES = [
    { code: 'en-US', label: 'English', sub: 'English (US)' },
    { code: 'pt-BR', label: 'Português', sub: 'Portuguese (Brazil)' },
    { code: 'ja-JP', label: '日本語', sub: 'Japanese' },
  ];

  const handleRenameDecks = (oldName, newName) => {
    // Propagate rename up through onChange on matches — stored in settings as a renames map
    onChange({ ...settings, deckRenames: { ...(settings.deckRenames || {}), [oldName]: newName } });
  };

  if (showDecks) return <ManageDecksScreen matches={matches} onBack={() => setShowDecks(false)} onRenameDecks={handleRenameDecks} />;

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="page-scroll">
        <h1 className="page-title">Settings</h1>

        <div>
          <div className="label" style={{ padding: '4px 8px 6px' }}>Defaults</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '12px 16px' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Default format</div>
                <div className="label" style={{ marginTop: 2, textTransform: 'none', letterSpacing: 0 }}>
                  Used when audio doesn't mention one
                </div>
              </div>
              <select
                value={settings.defaultFormat}
                onChange={e => set('defaultFormat', e.target.value)}
                style={{
                  width: '100%', fontSize: 13, padding: '8px 12px',
                  border: '1px solid var(--line)', borderRadius: 8,
                  background: 'var(--surface)', fontFamily: 'var(--ui)',
                  color: 'var(--ink)', appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: 32,
                  cursor: 'pointer',
                }}
              >
                {ALL_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '12px 16px' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Default deck</div>
                <div className="label" style={{ marginTop: 2, textTransform: 'none', letterSpacing: 0 }}>
                  Used when audio doesn't mention one
                </div>
              </div>
              <DeckSelector
                value={settings.defaultDeck}
                onChange={v => set('defaultDeck', v)}
                format={settings.defaultFormat}
                recentDecks={[...new Set(matches.map(m => m.myDeck).filter(Boolean))].slice(0, 5)}
                placeholder="Choose or create default deck…"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="label" style={{ padding: '4px 8px 6px' }}>Language</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {LANGUAGES.map((lang, i) => (
              <button
                key={lang.code}
                onClick={() => set('language', lang.code)}
                className="row"
                style={{
                  width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
                  borderBottom: i < LANGUAGES.length - 1 ? '1px solid var(--line-2)' : 'none',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{lang.label}</div>
                  <div className="label" style={{ marginTop: 2, textTransform: 'none', letterSpacing: 0 }}>{lang.sub}</div>
                </div>
                {(settings.language || 'en-US') === lang.code && (
                  <Icon name="check" size={16} stroke="var(--ink)" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label" style={{ padding: '4px 8px 6px' }}>Privacy</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="row">
              <Icon name="shield" size={18} stroke="var(--ink-3)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>On-device processing</div>
                <div className="label" style={{ marginTop: 2, textTransform: 'none', letterSpacing: 0 }}>
                  Audio never leaves your phone
                </div>
              </div>
              <div className="badge"><span className="dot" /><span>Always on</span></div>
            </div>
            <div className="row">
              <Icon name="share" size={18} stroke="var(--ink-3)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Share anonymous results</div>
                <div className="label" style={{ marginTop: 2, textTransform: 'none', letterSpacing: 0 }}>
                  Format + archetype + outcome only
                </div>
              </div>
              <button className={`toggle${settings.shareAnon ? ' on' : ''}`} onClick={() => set('shareAnon', !settings.shareAnon)} />
            </div>
          </div>
        </div>

        <div>
          <div className="label" style={{ padding: '4px 8px 6px' }}>Data</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <button onClick={exportCSV} className="row" style={{
              width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
            }}>
              <Icon name="share" size={18} stroke="var(--ink-3)" />
              <div style={{ flex: 1, fontSize: 13 }}>Export all matches (.csv)</div>
              <Icon name="chev" size={14} stroke="var(--ink-4)" />
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
            <button onClick={() => importRef.current && importRef.current.click()} className="row" style={{
              width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
              borderTop: '1px solid var(--line-2)',
            }}>
              <Icon name="list" size={18} stroke="var(--ink-3)" />
              <div style={{ flex: 1, fontSize: 13 }}>Import matches (.csv)</div>
              {importStatus === 'ok' && (
                <span style={{ fontSize: 11, color: 'var(--good)', fontWeight: 600 }}>
                  +{importCount} imported
                </span>
              )}
              {importStatus === 'err' && (
                <span style={{ fontSize: 11, color: 'var(--bad)', fontWeight: 600 }}>
                  Invalid file
                </span>
              )}
              {!importStatus && <Icon name="chev" size={14} stroke="var(--ink-4)" />}
            </button>
            <button onClick={() => setShowDecks(true)} className="row" style={{
              width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
            }}>
              <Icon name="list" size={18} stroke="var(--ink-3)" />
              <div style={{ flex: 1, fontSize: 13 }}>Manage decks</div>
              <Icon name="chev" size={14} stroke="var(--ink-4)" />
            </button>
            <div className="row" style={{ borderBottom: 'none' }}>
              <Icon name="trash" size={18} stroke="var(--bad)" />
              <div style={{ flex: 1, fontSize: 13, color: 'var(--bad)' }}>Delete all data</div>
              <Icon name="chev" size={14} stroke="var(--bad)" />
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 11, color: 'var(--ink-4)' }}>
          MTG Tracker · v1.0 · <span style={{ fontFamily: 'var(--mono)' }}>on-device · one purchase</span>
        </div>
      </div>
    </div>
  );
}

function OnboardingScreen({ onDone }) {
  const [step, setStep] = React.useState(1);
  const [fmt, setFmt] = React.useState('Commander');
  const [deck, setDeck] = React.useState('');
  const [share, setShare] = React.useState(true);

  const next = () => step < 4 ? setStep(step + 1) : onDone({ defaultFormat: fmt, defaultDeck: deck, shareAnon: share });

  const Dots = () => (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{
          width: i === step ? 20 : 6, height: 6, borderRadius: 999,
          background: i === step ? 'var(--ink)' : 'var(--ink-5)',
          transition: 'all 0.25s',
        }} />
      ))}
    </div>
  );

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div style={{ flex: 1, padding: '28px 24px 0', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {step === 1 && (
          <>
            <div className="badge" style={{ alignSelf: 'flex-start' }}>
              <span className="dot" /><span>100% on-device</span>
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.1, margin: 0 }}>
              Your matches stay on your phone.
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
              The AI runs locally. No cloud, no accounts, no subscriptions — you bought it once, it's yours.
            </p>
            <div className="card" style={{ padding: 14, marginTop: 6 }}>
              <div className="label" style={{ marginBottom: 8 }}>How it works</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                1. Hold the mic & describe your match<br/>
                2. Release → processed on-device<br/>
                3. Review the extracted data & save
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="label">Step 2 of 4</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.2, margin: 0 }}>
              What's your main format?
            </h1>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0, lineHeight: 1.4 }}>
              When your audio doesn't mention a format, we'll assume this one.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { l: 'Commander', s: 'EDH · 4p' }, { l: 'Modern', s: '1v1' },
                { l: 'Standard', s: '1v1' }, { l: 'Pioneer', s: '1v1' },
                { l: 'Legacy', s: '1v1' }, { l: 'Pauper', s: '1v1' },
                { l: 'Draft', s: 'Limited' }, { l: 'Other', s: '\u2014' },
              ].map(f => (
                <button key={f.l} onClick={() => setFmt(f.l)} style={{
                  textAlign: 'left', padding: '12px 14px',
                  background: fmt === f.l ? 'var(--surface)' : 'var(--surface-2)',
                  border: fmt === f.l ? '1.5px solid var(--ink)' : '1px solid var(--line)',
                  borderRadius: 10,
                }}>
                  <div style={{ fontSize: 14, fontWeight: fmt === f.l ? 600 : 500 }}>{f.l}</div>
                  <div className="label" style={{ marginTop: 2 }}>{f.s}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="label">Step 3 of 4</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.2, margin: 0 }}>
              What's your default deck?
            </h1>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0, lineHeight: 1.4 }}>
              When your audio doesn't mention a deck, we'll assume this one. Leave blank to always specify.
            </p>
            <DeckSelector
              value={deck}
              onChange={setDeck}
              format={fmt}
              recentDecks={[]}
              placeholder="Search or create your main deck…"
            />
            <div className="card" style={{ padding: 12, background: 'var(--surface-2)' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                <b>Tip —</b> if you play many decks, skip this and name your deck in each recording.
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="label">Step 4 of 4</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.2, margin: 0 }}>
              Help improve the meta?
            </h1>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0, lineHeight: 1.4 }}>
              Optional · fully anonymous. No personal data leaves your device.
            </p>
            <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Share anonymous results</div>
                <div className="label" style={{ marginTop: 4, textTransform: 'none', letterSpacing: 0, fontSize: 11, lineHeight: 1.5 }}>
                  Only outcomes, formats & archetypes — never voice, notes, or identity.
                </div>
              </div>
              <button className={`toggle${share ? ' on' : ''}`} onClick={() => setShare(!share)} />
            </div>
            <div className="card" style={{ padding: 12, background: 'var(--surface-2)' }}>
              <div className="label" style={{ marginBottom: 6 }}>What gets shared</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-2)', lineHeight: 1.75 }}>
                ✓ win/loss · format · archetype<br/>
                ✗ voice · notes · names · location
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ padding: '12px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Dots />
        <button className="btn btn-primary" style={{ width: '100%', padding: 14, fontSize: 14 }} onClick={next}>
          {step === 4 ? 'Start tracking \u2192' : 'Continue \u2192'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { HistoryScreen, SettingsScreen, OnboardingScreen, ManageDecksScreen });
