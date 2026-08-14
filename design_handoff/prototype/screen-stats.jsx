// Stats (Dashboard A) — with functional filters

function StatsScreen({ matches }) {
  const [filters, setFilters] = React.useState({
    format: 'Commander', deck: 'All', oppDeck: 'All', period: '30d', result: 'All',
  });

  const filtered = React.useMemo(() => applyFilters(matches, filters), [matches, filters]);
  const stats = React.useMemo(() => computeStats(filtered), [filtered]);

  const formats = ['All', ...Array.from(new Set(matches.map(m => m.format)))];
  const decks = ['All', ...Array.from(new Set(matches.map(m => m.myDeck)))];
  const oppDecks = ['All', ...Array.from(new Set(matches.map(m => m.oppDeck)))];
  const periods = ['7d', '30d', '90d', 'All'];
  const results = ['All', 'Wins', 'Losses'];

  const activeCount = Object.values(filters).filter(v => v && v !== 'All' && v !== '30d').length;

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="page-scroll" style={{ gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <h1 className="page-title">Stats</h1>
            <div className="label" style={{ marginTop: 4 }}>
              {stats.total} matches · {stats.wins}W–{stats.losses}L
            </div>
          </div>
        </div>

        {/* Filters — applies to ALL charts below */}
        <div className="card" style={{ padding: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="label">Filters · applies to all charts</div>
            <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
              {activeCount} active
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FilterSelect label="Format" value={filters.format} options={formats}
              onChange={v => setFilters(f => ({ ...f, format: v }))} />
            <FilterSelect label="My deck" value={filters.deck} options={decks}
              onChange={v => setFilters(f => ({ ...f, deck: v }))} />
            <FilterSelect label="Opp deck" value={filters.oppDeck} options={oppDecks}
              onChange={v => setFilters(f => ({ ...f, oppDeck: v }))} />
            <FilterSelect label="Period" value={filters.period} options={periods}
              onChange={v => setFilters(f => ({ ...f, period: v }))} />
            <FilterSelect label="Result" value={filters.result} options={results}
              onChange={v => setFilters(f => ({ ...f, result: v }))} />
          </div>
        </div>

        {stats.total === 0 ? (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No matches match</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Try relaxing a filter above.</div>
          </div>
        ) : (
          <>
            {/* Summary strip */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 14,
              alignItems: 'center', padding: '4px 4px',
            }}>
              <ChartDonut value={stats.wr} size={90} />
              <div>
                <div className="label">Matches</div>
                <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{stats.total}</div>
                <div className="label" style={{ marginTop: 4 }}>{stats.wins}W · {stats.losses}L</div>
              </div>
              <div>
                <div className="label">Streak</div>
                <div style={{
                  fontSize: 24, fontWeight: 700, lineHeight: 1,
                  color: stats.streakType ? 'var(--good)' : 'var(--bad)',
                }}>
                  {stats.streakType ? '+' : ''}{stats.streak}
                </div>
                <div className="label" style={{ marginTop: 4 }}>
                  {stats.streakType ? 'Wins' : 'Losses'}
                </div>
              </div>
            </div>

            {/* Evolution */}
            <div className="chart">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="chart-title">Win rate over time</div>
                <div className="chart-sub">5-match rolling</div>
              </div>
              <ChartLine points={stats.evolution} w={308} h={90} />
            </div>

            {/* On play / on draw */}
            <div className="chart">
              <div className="chart-title">On the play vs. on the draw</div>
              <ChartSplit left={stats.onPlayWR} right={stats.onDrawWR} w={308} />
            </div>

            {/* Per deck */}
            {stats.decks.length > 0 && (
              <div className="chart">
                <div className="chart-title">Win rate by my deck</div>
                <DeckList rows={stats.decks} />
              </div>
            )}

            {/* Opponents */}
            {stats.opponents.length > 0 && (
              <div className="chart">
                <div className="chart-title">Most faced opponents</div>
                <ChartBars data={stats.opponents} w={308} />
              </div>
            )}

            {/* vs archetype */}
            {stats.archetypes.length > 0 && (
              <div className="chart">
                <div className="chart-title">Win rate vs archetype</div>
                <ChartBars data={stats.archetypes.map(a => ({ ...a, suffix: '%' }))} w={308} />
              </div>
            )}
          </>
        )}

        <div style={{ height: 12 }} />
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="label" style={{ width: 62 }}>{label}</div>
      <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <button key={opt}
            className={`chip${value === opt ? ' active' : ''}`}
            style={{ padding: '4px 10px', fontSize: 10.5 }}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

window.StatsScreen = StatsScreen;
