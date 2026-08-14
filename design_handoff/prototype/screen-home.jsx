// Home screen — idle + recording + processing + overlays

function HomeScreen({ settings, recentDecks, onMatchCaptured, onDirectSave, onNav }) {
  const [state, setState] = React.useState('idle'); // idle | recording | processing
  const [overlay, setOverlay] = React.useState(null); // null | 'type' | 'form'
  const [typeText, setTypeText] = React.useState('');
  const [elapsed, setElapsed] = React.useState(0);
  const timerRef = React.useRef(null);
  const startRef = React.useRef(0);

  const start = () => {
    if (state !== 'idle' || overlay) return;
    setState('recording');
    startRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 100);
  };
  const stop = () => {
    if (state !== 'recording') return;
    clearInterval(timerRef.current);
    if (elapsed < 1.2) {setState('idle');return;}
    setState('processing');
    setTimeout(() => {
      onMatchCaptured({ duration: elapsed });
    }, 2200);
  };
  React.useEffect(() => () => clearInterval(timerRef.current), []);

  const fmt = (t) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const dark = state !== 'idle' && !overlay;

  const handleTypeSubmit = () => {
    if (!typeText.trim()) return;
    setOverlay(null);
    setTypeText('');
    onMatchCaptured({ fromText: typeText });
  };

  return (
    <div className="page" style={{
      background: dark ? 'var(--dark)' : 'var(--bg)',
      transition: 'background 0.35s ease',
      color: dark ? '#fff' : 'var(--ink)',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="label" style={{ color: dark ? '#8a887a' : 'var(--ink-3)' }}>
            {state === 'recording' ? 'Recording' : state === 'processing' ? 'Processing on-device' : 'How\'d it go?'}
          </div>
          {state === 'idle' && !overlay &&
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
              Default: <b style={{ color: 'var(--ink)' }}>{settings.defaultFormat}</b>
              {settings.defaultDeck && <> · <b style={{ color: 'var(--ink)' }}>{settings.defaultDeck}</b></>}
            </div>
          }
        </div>
        <div className="badge" style={{
          background: dark ? 'var(--dark-2)' : 'var(--surface)',
          borderColor: dark ? 'var(--dark-3)' : 'var(--line)',
          color: dark ? '#d6d3c7' : 'var(--ink-2)'
        }}>
          <span className="dot" style={{ background: state === 'recording' ? 'var(--accent)' : 'var(--good)' }} />
          <span>On-device</span>
        </div>
      </div>

      {/* Top cluster */}
      <div style={{ padding: '24px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        {state === 'idle' &&
        <>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 42, fontWeight: 600, letterSpacing: 3, color: dark ? 'var(--dark-3)' : 'var(--ink-5)' }}>0:00</div>
            <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 3 }}>
              {Array.from({ length: 32 }).map((_, i) =>
            <div key={i} style={{ width: 3, height: 8, borderRadius: 1.5, background: 'var(--ink-5)', opacity: 0.5 }} />
            )}
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-2)', textAlign: 'center', maxWidth: 280, lineHeight: 1.45 }}>
              Hold the button and tell me about your match.
            </div>
          </>
        }
        {state === 'recording' &&
        <>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 42, fontWeight: 600, letterSpacing: 3, color: '#fff' }}>{fmt(elapsed)}</div>
            <Waveform active />
            <div style={{ fontSize: 14, color: '#b5b29f', textAlign: 'center' }}>Release when you're done.</div>
          </>
        }
        {state === 'processing' &&
        <>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 42, fontWeight: 600, letterSpacing: 3, color: '#b5b29f' }}>{fmt(elapsed)}</div>
            <div className="spinner" style={{ width: 40, height: 40, marginTop: 8 }} />
            <div style={{ fontSize: 14, color: '#b5b29f', textAlign: 'center', maxWidth: 280, lineHeight: 1.45 }}>
              Extracting match details on-device…<br />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#6b685c' }}>Gemma 3n · {Math.floor(elapsed * 10) / 10}s audio</span>
            </div>
          </>
        }
      </div>

      <div style={{ flex: 1 }} />

      {/* Labels row — shown above buttons only when idle */}
      {state === 'idle' &&
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        gap: '18px', padding: '0 24px 6px'
      }}>
          <div style={{
          width: 52, textAlign: 'center',
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: dark ? '#6b685c' : 'var(--ink-4)'
        }}>Type</div>
          <div style={{ width: 168, textAlign: 'center',
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: dark ? '#6b685c' : 'var(--ink-4)'
        }}>Hold mic</div>
          <div style={{
          width: 52, textAlign: 'center',
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: dark ? '#6b685c' : 'var(--ink-4)'
        }}>Form</div>
        </div>
      }
      {state !== 'idle' &&
      <div style={{ textAlign: 'center', padding: '0 0 6px',
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: dark ? '#6b685c' : 'var(--ink-3)'
      }}>
          {state === 'recording' ? 'Release to process' : 'Please wait…'}
        </div>
      }

      {/* Bottom: alt buttons flanking big mic */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px 16px', gap: "22px", margin: "0px" }}>
        <button className={`btn-icon${dark ? ' dark' : ''}`}
        style={{ width: 52, height: 52, opacity: state === 'idle' ? 1 : 0.3, pointerEvents: state === 'idle' ? 'auto' : 'none', transition: 'opacity 0.25s' }}
        onClick={() => setOverlay('type')} title="Type instead">
          <Icon name="keyboard" size={22} />
        </button>

        <div style={{ position: 'relative', flexShrink: 0, height: "16px", width: "1px" }}>
          {state === 'recording' && <><div className="pulse-ring" /><div className="pulse-ring delay" /></>}
          <button
            onMouseDown={start} onMouseUp={stop} onMouseLeave={stop}
            onTouchStart={(e) => {e.preventDefault();start();}}
            onTouchEnd={(e) => {e.preventDefault();stop();}}
            disabled={state === 'processing'}
            style={{
              position: 'relative', zIndex: 2,
              width: 168, height: 168, borderRadius: 999,
              border: state === 'idle' ? '1.5px solid var(--ink)' : 'none',
              background: state === 'idle' ? 'var(--surface)' : 'var(--accent)',
              boxShadow: state === 'recording' ?
              '0 0 0 10px rgba(220,95,60,0.18), 0 20px 40px rgba(220,95,60,0.35)' :
              '0 10px 30px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
              color: state === 'idle' ? 'var(--ink)' : '#fff',
              transition: 'all 0.25s ease',
              cursor: state === 'processing' ? 'not-allowed' : 'pointer',
              touchAction: 'none'
            }}
            aria-label="Hold to record">
            <Icon name="mic" size={52} strokeWidth={state === 'idle' ? 1.8 : 2.2} />
          </button>
        </div>

        <button className={`btn-icon${dark ? ' dark' : ''}`}
        style={{ width: 52, height: 52, opacity: state === 'idle' ? 1 : 0.3, pointerEvents: state === 'idle' ? 'auto' : 'none', transition: 'opacity 0.25s' }}
        onClick={() => setOverlay('form')} title="Fill form instead">
          <Icon name="form" size={22} />
        </button>
      </div>

      {/* ── Type overlay ── */}
      {overlay === 'type' &&
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(247,246,242,0.96)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 24, zIndex: 50
      }}>
          <div style={{ width: '100%', maxWidth: 340 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Describe your match</h2>
              <button onClick={() => setOverlay(null)} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', padding: 4 }}>
                <Icon name="x" size={20} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 12px', lineHeight: 1.5 }}>
              Type just like you'd say it — "Lost to Burn with my Atraxa, was on the draw."
            </p>
            <textarea
            autoFocus
            value={typeText}
            onChange={(e) => setTypeText(e.target.value)}
            placeholder="e.g. Beat Edgar Markov with Atraxa, I was on the play, good game"
            style={{
              width: '100%', fontSize: 13, padding: '10px 12px',
              border: '1.5px solid var(--line)', borderRadius: 10,
              background: 'var(--surface)', fontFamily: 'var(--ui)',
              resize: 'none', height: 110, lineHeight: 1.5, outline: 'none'
            }} />
          
            <div className="badge" style={{ marginTop: 8, marginBottom: 14 }}>
              <span className="dot" /><span>Processed on-device after submit</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => {setOverlay(null);setTypeText('');}}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleTypeSubmit}
            disabled={!typeText.trim()}>
                <Icon name="check" size={16} /> Process
              </button>
            </div>
          </div>
        </div>
      }

      {/* ── Form overlay ── */}
      {overlay === 'form' &&
      <div style={{
        position: 'absolute', inset: 0, background: 'var(--bg)',
        display: 'flex', flexDirection: 'column', padding: '16px 20px 16px',
        zIndex: 50, overflowY: 'auto'
      }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="label">Manual entry</div>
            <button onClick={() => setOverlay(null)} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', padding: 4 }}>
              <Icon name="x" size={20} />
            </button>
          </div>
          <div style={{ flex: 1 }}>
            <MatchForm
            initial={{ format: settings.defaultFormat, myDeck: settings.defaultDeck || '' }}
            settings={settings}
            recentDecks={recentDecks}
            onSave={(match) => {onDirectSave(match);setOverlay(null);}}
            onCancel={() => setOverlay(null)}
            title="New match"
            subtitle="Fill in what you know." />
          
          </div>
        </div>
      }
    </div>);

}

function Waveform({ active }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, [active]);
  const bars = Array.from({ length: 36 }).map((_, i) => {
    const base = Math.abs(Math.sin((i + tick * 0.3) * 0.5)) * 0.7 + 0.3;
    const seed = (i * 13 + tick * 7) % 23;
    return base * (8 + seed % 18) * 1.3 + 6;
  });
  return (
    <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 3 }}>
      {bars.map((h, i) =>
      <div key={i} style={{ width: 3, height: `${h}px`, borderRadius: 1.5,
        background: active ? 'var(--accent)' : 'var(--ink-5)', transition: 'height 0.08s ease' }} />
      )}
    </div>);

}

window.HomeScreen = HomeScreen;