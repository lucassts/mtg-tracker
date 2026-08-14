// Review / Edit screen — shown after processing completes

function ReviewScreen({ settings, recentDecks, onSave, onCancel }) {
  const initial = {
    won: true,
    format: settings.defaultFormat,
    myDeck: settings.defaultDeck || '',
    oppDeck: 'Edgar Markov',
    archetype: 'Aggro',
    onPlay: false,
    notes: '',
  };

  const conf = {
    format: 'default', // fell back to default — not mentioned in audio
    myDeck: 'high',
    oppDeck: 'high',
    archetype: 'low',  // model wasn't sure
    onPlay: 'high',
  };

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div style={{ padding: '14px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn-ghost btn" style={{ padding: '6px 12px' }} onClick={onCancel}>
          <Icon name="back" size={16} /> Re-record
        </button>
        <div className="badge"><span className="dot" /><span>Extracted locally</span></div>
      </div>

      {/* Transcript */}
      <div style={{ padding: '10px 20px 0' }}>
        <div className="card" style={{ padding: 10 }}>
          <div className="label" style={{ marginBottom: 5 }}>Transcript · 0:23</div>
          <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.5, fontStyle: 'italic' }}>
            "Just played Atraxa against an Edgar Markov deck — I was on the draw. Good game."
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 20px 0' }}>
        <MatchForm
          initial={initial}
          settings={settings}
          recentDecks={recentDecks}
          conf={conf}
          onSave={onSave}
          onCancel={onCancel}
          title="Looks right?"
          subtitle="Tap any field to fix it."
        />
      </div>
    </div>
  );
}

window.ReviewScreen = ReviewScreen;
