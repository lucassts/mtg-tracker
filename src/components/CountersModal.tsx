import React from 'react';
import {
  View, Text, Pressable, Modal, ScrollView, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { MANA_COLORS, ManaColor, PlayerCounters, TableCounters } from '../types';
import { useT } from '../i18n/useT';

/** Cor de cada pip de mana. Segue as cores canônicas do jogo, não a paleta do app. */
const MANA_STYLE: Record<ManaColor, { bg: string; fg: string }> = {
  W: { bg: '#f4f1de', fg: '#3b382c' },
  U: { bg: '#3d7fc1', fg: '#ffffff' },
  B: { bg: '#4a4750', fg: '#ffffff' },
  R: { bg: '#c9482c', fg: '#ffffff' },
  G: { bg: '#3d8f5c', fg: '#ffffff' },
  C: { bg: '#a8a294', fg: '#2a2820' },
};

/** Limites que decidem a partida — passar deles pinta o número de vermelho. */
const POISON_LETHAL = 10;
const CMD_LETHAL = 21;

export function emptyMana(): Record<ManaColor, number> {
  return { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
}

export function emptyCounters(): PlayerCounters {
  return { mana: emptyMana(), poison: 0, energy: 0, experience: 0, cmdDamage: {} };
}

// ─── Stepper: [−] rótulo valor [+] ──────────────────────────

function Stepper({
  label, value, onChange, danger, min = 0,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  danger?: boolean;
  min?: number;
}) {
  const bump = (d: number) => {
    const next = Math.max(min, value + d);
    if (next === value) return;
    Haptics.selectionAsync();
    onChange(next);
  };

  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={() => bump(-1)}
          hitSlop={6}
          style={[styles.stepBtn, value <= min && styles.stepBtnOff]}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={[styles.stepperValue, danger && styles.stepperValueDanger]}>
          {value}
        </Text>
        <Pressable onPress={() => bump(1)} hitSlop={6} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Pip de mana ────────────────────────────────────────────

function ManaPip({
  color, value, onChange,
}: {
  color: ManaColor;
  value: number;
  onChange: (next: number) => void;
}) {
  const style = MANA_STYLE[color];
  return (
    <View style={styles.pipWrap}>
      <Pressable
        onPress={() => { Haptics.selectionAsync(); onChange(value + 1); }}
        style={[styles.pip, { backgroundColor: style.bg }, value > 0 && styles.pipActive]}
      >
        <Text style={[styles.pipLetter, { color: style.fg }]}>{color}</Text>
      </Pressable>
      <Text style={[styles.pipValue, value > 0 && styles.pipValueOn]}>{value}</Text>
      <Pressable
        onPress={() => { if (value > 0) { Haptics.selectionAsync(); onChange(value - 1); } }}
        hitSlop={8}
        style={[styles.pipMinus, value === 0 && styles.pipMinusOff]}
      >
        <Text style={styles.pipMinusText}>−</Text>
      </Pressable>
    </View>
  );
}

// ─── Modal ──────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  players: { id: number; name: string }[];
  table: TableCounters;
  onTableChange: (next: TableCounters) => void;
  counters: Record<number, PlayerCounters>;
  onCountersChange: (next: Record<number, PlayerCounters>) => void;
  /** Zera storm e o mana pool de todos. */
  onNewTurn: () => void;
}

export function CountersModal({
  visible, onClose, players, table, onTableChange, counters, onCountersChange, onNewTurn,
}: Props) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const c = t.counters;

  // 'table' = aba da mesa; número = índice do jogador
  const [tab, setTab] = React.useState<'table' | number>('table');

  // Se o número de jogadores cair, a aba aberta pode deixar de existir.
  React.useEffect(() => {
    if (typeof tab === 'number' && tab >= players.length) setTab('table');
  }, [players.length, tab]);

  const patch = (idx: number, partial: Partial<PlayerCounters>) => {
    const base = counters[idx] ?? emptyCounters();
    onCountersChange({ ...counters, [idx]: { ...base, ...partial } });
  };

  const setStorm = (n: number) => {
    Haptics.selectionAsync();
    onTableChange({ ...table, storm: Math.max(0, n) });
  };

  // O efeito acima corrige a aba órfã, mas só depois deste render. Até lá,
  // `players[tab]` pode não existir — daí a checagem dupla.
  const playerTab = typeof tab === 'number' && tab < players.length ? tab : null;
  const current = playerTab !== null ? (counters[playerTab] ?? emptyCounters()) : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.grabber} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>{c.title}</Text>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
          </View>

          {/* Abas */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
          >
            <Pressable
              onPress={() => setTab('table')}
              style={[styles.tab, tab === 'table' && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === 'table' && styles.tabTextActive]}>
                {c.tableTab}
              </Text>
            </Pressable>
            {players.map((p, i) => (
              <Pressable
                key={p.id}
                onPress={() => setTab(i)}
                style={[styles.tab, tab === i && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>
                  {p.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {tab === 'table' ? (
              <>
                {/* Storm */}
                <View style={styles.stormCard}>
                  <Text style={styles.blockLabel}>{c.storm}</Text>
                  <Text style={styles.stormHint}>{c.stormHint}</Text>
                  <View style={styles.stormRow}>
                    <Pressable
                      onPress={() => setStorm(table.storm - 1)}
                      style={[styles.stormBtn, table.storm === 0 && styles.stormBtnOff]}
                    >
                      <Text style={styles.stormBtnText}>−</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setStorm(table.storm + 1)}
                      style={styles.stormValueZone}
                    >
                      <Text style={styles.stormValue}>{table.storm}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setStorm(table.storm + 1)}
                      style={[styles.stormBtn, styles.stormBtnAccent]}
                    >
                      <Text style={styles.stormBtnText}>+</Text>
                    </Pressable>
                  </View>
                  <Pressable onPress={() => setStorm(0)} style={styles.linkBtn}>
                    <Text style={styles.linkBtnText}>{c.clearStorm}</Text>
                  </Pressable>
                </View>

                {/* Novo turno */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onNewTurn();
                  }}
                  style={styles.turnBtn}
                >
                  <Text style={styles.turnBtnText}>{c.newTurn}</Text>
                </Pressable>
                <Text style={styles.turnHint}>{c.newTurnHint}</Text>
              </>
            ) : current && playerTab !== null ? (
              <>
                {/* Mana pool */}
                <View style={styles.block}>
                  <View style={styles.blockHeader}>
                    <Text style={styles.blockLabel}>{c.mana}</Text>
                    <Pressable
                      onPress={() => patch(playerTab, { mana: emptyMana() })}
                      hitSlop={8}
                    >
                      <Text style={styles.linkBtnText}>{c.emptyPool}</Text>
                    </Pressable>
                  </View>
                  <View style={styles.pipGrid}>
                    {MANA_COLORS.map(color => (
                      <ManaPip
                        key={color}
                        color={color}
                        value={current.mana[color]}
                        onChange={n => patch(playerTab, { mana: { ...current.mana, [color]: n } })}
                      />
                    ))}
                  </View>
                </View>

                {/* Contadores do jogador */}
                <View style={styles.block}>
                  <Text style={styles.blockLabel}>{c.playerCounters}</Text>
                  <Stepper
                    label={c.poison}
                    value={current.poison}
                    danger={current.poison >= POISON_LETHAL}
                    onChange={n => patch(playerTab, { poison: n })}
                  />
                  <Stepper
                    label={c.energy}
                    value={current.energy}
                    onChange={n => patch(playerTab, { energy: n })}
                  />
                  <Stepper
                    label={c.experience}
                    value={current.experience}
                    onChange={n => patch(playerTab, { experience: n })}
                  />
                </View>

                {/* Dano de comandante */}
                {players.length > 1 && (
                  <View style={styles.block}>
                    <Text style={styles.blockLabel}>{c.cmdDamage}</Text>
                    <Text style={styles.blockHint}>{c.cmdDamageHint(players[playerTab].name)}</Text>
                    {players.map((from, fromIdx) => {
                      if (fromIdx === playerTab) return null;
                      const dmg = current.cmdDamage[fromIdx] ?? 0;
                      return (
                        <Stepper
                          key={from.id}
                          label={c.cmdFrom(from.name)}
                          value={dmg}
                          danger={dmg >= CMD_LETHAL}
                          onChange={n => patch(playerTab, {
                            cmdDamage: { ...current.cmdDamage, [fromIdx]: n },
                          })}
                        />
                      );
                    })}
                  </View>
                )}
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: '#16150f',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  header: { paddingHorizontal: 20, paddingTop: 10 },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter',
    letterSpacing: -0.3,
    color: '#fff',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  closeText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },

  tabs: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tabActive: { backgroundColor: '#d45f3c', borderColor: 'transparent' },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.5)',
  },
  tabTextActive: { color: '#fff' },

  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: 20, paddingBottom: 12, gap: 14 },

  block: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    gap: 10,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockLabel: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
  },
  blockHint: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.32)',
    marginTop: -4,
    lineHeight: 16,
  },

  // Storm
  stormCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,95,60,0.35)',
    backgroundColor: 'rgba(212,95,60,0.08)',
    padding: 16,
    gap: 6,
    alignItems: 'center',
  },
  stormHint: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.35)',
  },
  stormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  stormBtn: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stormBtnAccent: { backgroundColor: '#d45f3c' },
  stormBtnOff: { opacity: 0.35 },
  stormBtnText: { color: '#fff', fontSize: 26, fontWeight: '400', lineHeight: 30 },
  stormValueZone: { minWidth: 96, alignItems: 'center', paddingVertical: 4 },
  stormValue: {
    fontSize: 64,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: '#fff',
    letterSpacing: -2,
    lineHeight: 68,
  },

  linkBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  linkBtnText: {
    fontSize: 11,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.4)',
  },

  turnBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  turnBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'Inter' },
  turnHint: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: -8,
  },

  // Mana pips
  pipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  pipWrap: { width: '15%', alignItems: 'center', gap: 4 },
  pip: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
  },
  pipActive: { opacity: 1 },
  pipLetter: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter' },
  pipValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.28)',
  },
  pipValueOn: { color: '#fff' },
  pipMinus: {
    width: 26,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pipMinusOff: { opacity: 0.3 },
  pipMinusText: { color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 17 },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 2,
  },
  stepperLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.75)',
  },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stepBtnOff: { opacity: 0.3 },
  stepBtnText: { color: '#fff', fontSize: 18, lineHeight: 21 },
  stepperValue: {
    minWidth: 30,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: '#fff',
  },
  stepperValueDanger: { color: '#e0603f' },
});
