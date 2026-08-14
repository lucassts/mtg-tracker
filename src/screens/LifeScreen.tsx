import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { colors } from '../theme/colors';
import { PlayerCell } from '../components/PlayerCell';
import { CountersModal, emptyCounters, emptyMana } from '../components/CountersModal';
import { useStore } from '../store/useStore';
import { Format, PlayerCounters, TableCounters } from '../types';
import { useT } from '../i18n/useT';

const ONE_V_ONE_FORMATS: Format[] = ['Modern', 'Standard', 'Pioneer', 'Legacy', 'Pauper'];

type LayoutRow = number[];

const LAYOUTS: Record<number, LayoutRow[]> = {
  2: [[0, 1]],
  3: [[0, 1], [2]],
  4: [[0, 1], [2, 3]],
  5: [[0, 1], [2, 3], [4]],
  6: [[0, 1], [2, 3], [4, 5]],
};

interface Player {
  id: number;
  life: number;
  name: string;
}

export function LifeScreen() {
  const insets = useSafeAreaInsets();
  // Partida de Commander passa de uma hora; a tela não pode dormir no meio.
  useKeepAwake();
  const t = useT();
  const lf = t.life;
  const settings = useStore(s => s.settings);
  const fmt = settings.defaultFormat || 'Commander';
  const is1v1 = ONE_V_ONE_FORMATS.includes(fmt as Format);
  const defaultStart = ['Commander', 'Other'].includes(fmt) ? 40 : 20;

  const [phase, setPhase] = React.useState<'setup' | 'game'>(is1v1 ? 'game' : 'setup');
  const [playerCount, setPlayerCount] = React.useState(is1v1 ? 2 : 4);
  const [startLife, setStartLife] = React.useState(defaultStart);
  const [lives, setLives] = React.useState<Player[]>(() => {
    if (is1v1) {
      return Array.from({ length: 2 }, (_, i) => ({ id: i, life: defaultStart, name: `J${i + 1}` }));
    }
    return [];
  });
  const [confirmReset, setConfirmReset] = React.useState(false);

  // ── Contadores (storm, mana, veneno, energia, experiência, dano de comandante) ──
  const [showCounters, setShowCounters] = React.useState(false);
  const [table, setTable] = React.useState<TableCounters>({ storm: 0 });
  const [counters, setCounters] = React.useState<Record<number, PlayerCounters>>({});

  const resetCounters = () => {
    setTable({ storm: 0 });
    setCounters({});
  };

  /** Novo turno: zera storm e esvazia o mana pool de todos. O resto persiste. */
  const newTurn = () => {
    setTable({ storm: 0 });
    setCounters(prev => {
      const next: Record<number, PlayerCounters> = {};
      Object.entries(prev).forEach(([k, v]) => {
        next[Number(k)] = { ...v, mana: emptyMana() };
      });
      return next;
    });
  };

  const initGame = (count: number, start: number) => {
    setLives(Array.from({ length: count }, (_, i) => ({
      id: i,
      life: start,
      name: `J${i + 1}`,
    })));
    resetCounters();
    setPhase('game');
  };

  const adjust = (idx: number, delta: number) => {
    setLives(prev => prev.map((p, i) => i === idx ? { ...p, life: p.life + delta } : p));
  };

  const doReset = () => {
    setLives(prev => prev.map(p => ({ ...p, life: startLife })));
    resetCounters();
    setConfirmReset(false);
  };

  /** Soma tudo que está fora do zero, para o badge do botão de contadores. */
  const activeCounters = React.useMemo(() => {
    let n = table.storm > 0 ? 1 : 0;
    Object.values(counters).forEach(pc => {
      if (Object.values(pc.mana).some(v => v > 0)) n++;
      if (pc.poison > 0) n++;
      if (pc.energy > 0) n++;
      if (pc.experience > 0) n++;
      if (Object.values(pc.cmdDamage).some(v => v > 0)) n++;
    });
    return n;
  }, [table, counters]);

  // ── Setup screen ──
  if (phase === 'setup') {
    return (
      <View style={[styles.setupPage, { paddingTop: insets.top }]}>
        <View style={styles.setupContent}>
          <View>
            <Text style={styles.setupLabel}>{lf.setupLabel}</Text>
            <Text style={styles.setupH1}>{lf.setupTitle}</Text>
          </View>

          <View style={styles.playerGrid}>
            {[2, 3, 4, 5, 6].map(n => (
              <Pressable
                key={n}
                onPress={() => setPlayerCount(n)}
                style={[
                  styles.playerBtn,
                  playerCount === n && styles.playerBtnActive,
                ]}
              >
                <Text style={[styles.playerBtnText, playerCount === n && styles.playerBtnTextActive]}>
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>

          <View>
            <Text style={styles.lifeLabel}>{lf.startLife}</Text>
            <View style={styles.lifeRow}>
              {[20, 30, 40].map(n => (
                <Pressable
                  key={n}
                  onPress={() => setStartLife(n)}
                  style={[
                    styles.lifeBtn,
                    startLife === n && styles.lifeBtnActive,
                  ]}
                >
                  <Text style={[styles.lifeBtnText, startLife === n && styles.lifeBtnTextActive]}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            style={styles.startBtn}
            onPress={() => initGame(playerCount, startLife)}
          >
            <Text style={styles.startBtnText}>{lf.start}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Game screen ──
  const count = lives.length;
  const is2p = count === 2;
  const layout = LAYOUTS[count] || LAYOUTS[4];

  return (
    <View style={styles.gamePage}>
      {/* Reset + contadores */}
      <View style={[styles.resetContainer, { top: insets.top + 8 }]}>
        {!confirmReset ? (
          <View style={styles.topRow}>
            <Pressable onPress={() => setConfirmReset(true)} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>{lf.reset}</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowCounters(true)}
              style={[styles.resetBtn, activeCounters > 0 && styles.countersBtnOn]}
            >
              <Text style={[styles.resetBtnText, activeCounters > 0 && styles.countersBtnTextOn]}>
                {lf.counters}
                {activeCounters > 0 ? ` · ${activeCounters}` : ''}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.resetConfirm}>
            <Pressable onPress={doReset} style={styles.resetConfirmYes}>
              <Text style={styles.resetConfirmYesText}>{lf.resetTo(startLife)}</Text>
            </Pressable>
            <Pressable onPress={() => setConfirmReset(false)} style={styles.resetConfirmNo}>
              <Text style={styles.resetConfirmNoText}>{lf.cancelReset}</Text>
            </Pressable>
          </View>
        )}
        {!is1v1 && (
          <Pressable onPress={() => setPhase('setup')}>
            <Text style={styles.changePlayers}>{lf.changePlayers}</Text>
          </Pressable>
        )}
      </View>

      {/* 2-player: rotated layout */}
      {is2p ? (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, transform: [{ rotate: '180deg' }] }}>
            <PlayerCell player={lives[0]} onAdjust={d => adjust(0, d)} />
          </View>
          <View style={styles.dividerH} />
          <View style={{ flex: 1 }}>
            <PlayerCell player={lives[1]} onAdjust={d => adjust(1, d)} />
          </View>
        </View>
      ) : (
        /* Multiplayer: row-based grid */
        <View style={{ flex: 1 }}>
          {layout.map((row, ri) => (
            <View
              key={ri}
              style={[
                styles.layoutRow,
                ri > 0 && styles.layoutRowBorder,
              ]}
            >
              {row.map((idx, ci) => (
                <View
                  key={idx}
                  style={[
                    { flex: 1 },
                    ci > 0 && styles.layoutColBorder,
                  ]}
                >
                  <PlayerCell player={lives[idx]} onAdjust={d => adjust(idx, d)} />
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      <CountersModal
        visible={showCounters}
        onClose={() => setShowCounters(false)}
        players={lives.map(p => ({ id: p.id, name: p.name }))}
        table={table}
        onTableChange={setTable}
        counters={counters}
        onCountersChange={setCounters}
        onNewTurn={newTurn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  setupPage: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  setupContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    padding: 28,
  },
  setupLabel: {
    fontSize: 9.5,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#6b685c',
    textAlign: 'center',
  },
  setupH1: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Inter',
    letterSpacing: -0.5,
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  playerBtn: {
    width: '30%',
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: colors.dark2,
    borderWidth: 1,
    borderColor: colors.dark3,
    alignItems: 'center',
  },
  playerBtnActive: {
    backgroundColor: colors.accent,
    borderColor: 'transparent',
  },
  playerBtnText: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: '#9e9a8b',
  },
  playerBtnTextActive: { color: '#fff' },
  lifeLabel: {
    fontSize: 9.5,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#6b685c',
    textAlign: 'center',
    marginBottom: 10,
  },
  lifeRow: { flexDirection: 'row', gap: 10, width: '100%' },
  lifeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.dark2,
    borderWidth: 1,
    borderColor: colors.dark3,
    alignItems: 'center',
  },
  lifeBtnActive: { backgroundColor: '#fff', borderColor: 'transparent' },
  lifeBtnText: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: '#9e9a8b',
  },
  lifeBtnTextActive: { color: colors.dark },
  startBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: '#fff',
  },
  gamePage: {
    flex: 1,
    backgroundColor: colors.lifeBg,
    position: 'relative',
  },
  resetContainer: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 6,
    zIndex: 20,
  },
  resetBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  resetBtnText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.8,
  },
  topRow: { flexDirection: 'row', gap: 8 },
  countersBtnOn: {
    backgroundColor: 'rgba(212,95,60,0.22)',
    borderColor: 'rgba(212,95,60,0.5)',
  },
  countersBtnTextOn: { color: '#e88a6b' },
  resetConfirm: { flexDirection: 'row', gap: 6 },
  resetConfirmYes: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  resetConfirmYesText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'JetBrainsMono',
  },
  resetConfirmNo: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  resetConfirmNoText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontFamily: 'JetBrainsMono',
  },
  changePlayers: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.6,
  },
  dividerH: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  layoutRow: { flex: 1, flexDirection: 'row' },
  layoutRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  layoutColBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.08)' },
});
