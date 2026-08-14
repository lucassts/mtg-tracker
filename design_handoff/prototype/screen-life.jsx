// Life Tracking Screen

function LifeScreen({ settings }) {
  // Determine if format is 1v1 or multiplayer
  const fmt = settings.defaultFormat || 'Commander';
  const is1v1 = ['Modern', 'Standard', 'Pioneer', 'Legacy', 'Pauper'].includes(fmt);
  const defaultStart = ['Commander', 'Other'].includes(fmt) ? 40 : 20;

  const [phase, setPhase] = React.useState(() => is1v1 ? 'game' : 'setup'); // setup | game
  const [playerCount, setPlayerCount] = React.useState(is1v1 ? 2 : 4);
  const [startLife, setStartLife] = React.useState(defaultStart);
  const [lives, setLives] = React.useState([]);
  const [resetAnim, setResetAnim] = React.useState(false);
  const [confirmReset, setConfirmReset] = React.useState(false);

  const initGame = (count, start) => {
    setLives(Array.from({ length: count }, (_, i) => ({ id: i, life: start, name: `P${i + 1}` })));
    setPhase('game');
  };

  React.useEffect(() => {
    if (is1v1) initGame(2, defaultStart);
  }, []);

  const adjust = (idx, delta) => {
    setLives(prev => prev.map((p, i) => i === idx ? { ...p, life: p.life + delta } : p));
  };

  const doReset = () => {
    setResetAnim(true);
    setLives(prev => prev.map(p => ({ ...p, life: startLife })));
    setConfirmReset(false);
    setTimeout(() => setResetAnim(false), 600);
  };

  // ── Setup screen (player count selection) ──
  if (phase === 'setup') {
    return (
      <div className="page" style={{ background: 'var(--dark)', color: '#fff' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '24px 28px' }}>
          <div>
            <div className="label" style={{ color: '#6b685c', textAlign: 'center' }}>Life Tracking</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, margin: '8px 0 0', textAlign: 'center' }}>
              How many players?
            </h1>
          </div>

          {/* Player count grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, width: '100%' }}>
            {[2, 3, 4, 5, 6].map(n => (
              <button key={n} onClick={() => setPlayerCount(n)} style={{
                padding: '18px 0', borderRadius: 14,
                background: playerCount === n ? 'var(--accent)' : 'var(--dark-2)',
                border: playerCount === n ? 'none' : '1px solid var(--dark-3)',
                color: playerCount === n ? '#fff' : '#9e9a8b',
                fontSize: 28, fontWeight: 700, cursor: 'pointer',
                gridColumn: n === 2 ? 'span 1' : undefined,
              }}>{n}</button>
            ))}
          </div>

          {/* Starting life */}
          <div style={{ width: '100%' }}>
            <div className="label" style={{ color: '#6b685c', marginBottom: 10, textAlign: 'center' }}>Starting life total</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[20, 30, 40].map(n => (
                <button key={n} onClick={() => setStartLife(n)} style={{
                  flex: 1, padding: '14px 0', borderRadius: 10,
                  background: startLife === n ? '#fff' : 'var(--dark-2)',
                  border: startLife === n ? 'none' : '1px solid var(--dark-3)',
                  color: startLife === n ? 'var(--dark)' : '#9e9a8b',
                  fontSize: 20, fontWeight: 700, cursor: 'pointer',
                }}>{n}</button>
              ))}
            </div>
          </div>

          <button
            onClick={() => initGame(playerCount, startLife)}
            className="btn btn-primary"
            style={{ width: '100%', padding: 16, fontSize: 16, background: 'var(--accent)', borderColor: 'transparent' }}>
            Start →
          </button>
        </div>
      </div>
    );
  }

  // ── Game screen ──
  const count = lives.length;

  // Layout: 1v1 = 2 halves rotated; 3 = 2+1; 4 = 2x2; 5 = 2+2+1; 6 = 2x3
  const layouts = {
    2: [[0, 1]],           // will be rendered specially
    3: [[0, 1], [2]],
    4: [[0, 1], [2, 3]],
    5: [[0, 1], [2, 3], [4]],
    6: [[0, 1], [2, 3], [4, 5]],
  };

  const is2p = count === 2;

  return (
    <div style={{
      height: '100%', overflow: 'hidden', background: '#0e0d09',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      {/* Discrete reset button — top center */}
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}>
        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} style={{
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 999, padding: '5px 14px', color: 'rgba(255,255,255,0.35)',
            fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.08em',
            cursor: 'pointer', backdropFilter: 'blur(8px)',
          }}>↺ reset</button>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={doReset} style={{
              background: 'var(--accent)', border: 'none',
              borderRadius: 999, padding: '6px 14px', color: '#fff',
              fontSize: 11, fontFamily: 'var(--mono)', cursor: 'pointer',
            }}>Reset to {startLife}</button>
            <button onClick={() => setConfirmReset(false)} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: 999, padding: '6px 14px', color: 'rgba(255,255,255,0.6)',
              fontSize: 11, fontFamily: 'var(--mono)', cursor: 'pointer',
            }}>Cancel</button>
          </div>
        )}
        {!is1v1 && (
          <button onClick={() => setPhase('setup')} style={{
            background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.2)', fontSize: 10,
            fontFamily: 'var(--mono)', cursor: 'pointer', letterSpacing: '0.06em',
          }}>change players</button>
        )}
      </div>

      {/* 2-player: special rotated layout */}
      {is2p ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, transform: 'rotate(180deg)' }}>
            <PlayerCell player={lives[0]} onAdjust={d => adjust(0, d)} flipped />
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ flex: 1 }}>
            <PlayerCell player={lives[1]} onAdjust={d => adjust(1, d)} />
          </div>
        </div>
      ) : (
        /* Multi-player: row-based grid */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {(layouts[count] || []).map((row, ri) => (
            <div key={ri} style={{ flex: 1, display: 'flex', borderTop: ri > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
              {row.map((idx, ci) => (
                <div key={idx} style={{ flex: 1, borderLeft: ci > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                  <PlayerCell player={lives[idx]} onAdjust={d => adjust(idx, d)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerCell({ player, onAdjust, flipped = false }) {
  const [delta, setDelta] = React.useState(0);
  const [showDelta, setShowDelta] = React.useState(false);
  const holdRef = React.useRef(null);
  const holdCountRef = React.useRef(0);
  const deltaTimerRef = React.useRef(null);

  const handleAdjust = (d) => {
    onAdjust(d);
    setDelta(prev => prev + d);
    setShowDelta(true);
    clearTimeout(deltaTimerRef.current);
    deltaTimerRef.current = setTimeout(() => { setShowDelta(false); setDelta(0); }, 1800);
  };

  const startHold = (d) => {
    holdCountRef.current = 0;
    handleAdjust(d);
    holdRef.current = setInterval(() => {
      holdCountRef.current++;
      const step = holdCountRef.current > 20 ? 5 : 1;
      handleAdjust(d * step);
    }, holdCountRef.current > 20 ? 80 : 150);
  };
  const stopHold = () => clearInterval(holdRef.current);

  React.useEffect(() => () => { clearInterval(holdRef.current); clearTimeout(deltaTimerRef.current); }, []);

  const isDead = player.life <= 0;
  const isLow = player.life <= 5 && player.life > 0;

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: isDead ? 'rgba(180,60,40,0.18)' : 'transparent',
      transition: 'background 0.4s',
    }}>
      {/* Tap zones: left = -1, right = +1 */}
      <button
        onMouseDown={() => startHold(-1)} onMouseUp={stopHold} onMouseLeave={stopHold}
        onTouchStart={e => { e.preventDefault(); startHold(-1); }} onTouchEnd={stopHold}
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '38%',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
          paddingLeft: 18, color: 'rgba(255,255,255,0.15)',
          fontSize: 32, fontWeight: 200,
        }}
      >−</button>
      <button
        onMouseDown={() => startHold(1)} onMouseUp={stopHold} onMouseLeave={stopHold}
        onTouchStart={e => { e.preventDefault(); startHold(1); }} onTouchEnd={stopHold}
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '38%',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          paddingRight: 18, color: 'rgba(255,255,255,0.15)',
          fontSize: 32, fontWeight: 200,
        }}
      >+</button>

      {/* Center: player name + life */}
      <div style={{ textAlign: 'center', pointerEvents: 'none', position: 'relative' }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
        }}>{player.name}</div>
        <div style={{
          fontSize: 80, fontWeight: 700, lineHeight: 1,
          color: isDead ? '#c0422a' : isLow ? '#e07a40' : '#fff',
          letterSpacing: -2,
          transition: 'color 0.3s',
        }}>{player.life}</div>
        {/* Delta indicator */}
        {showDelta && delta !== 0 && (
          <div style={{
            position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600,
            color: delta > 0 ? '#6fcf97' : '#eb5757',
          }}>{delta > 0 ? `+${delta}` : delta}</div>
        )}
      </div>
    </div>
  );
}

window.LifeScreen = LifeScreen;
