import React from 'react';
import {
  View, Text, Pressable, Modal, ScrollView, StyleSheet, Animated, PanResponder,
  NativeSyntheticEvent, NativeScrollEvent, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  MANA_COLORS, ManaColor, PlayerCounters, TableCounters, CounterPrefs,
} from '../types';
import { useT } from '../i18n/useT';
import { scrollPagerTo } from '../utils/scrollPagerTo';

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

/** Campos incrementáveis de um jogador. `mana`, `cmdDamage` e `custom` usam chave. */
type BumpField = 'mana' | 'poison' | 'energy' | 'experience' | 'cmdDamage' | 'custom';

export function emptyMana(): Record<ManaColor, number> {
  return { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
}

export function emptyCounters(): PlayerCounters {
  return { mana: emptyMana(), poison: 0, energy: 0, experience: 0, cmdDamage: {}, custom: {} };
}

// ─── Stepper: [−] rótulo valor [+] ──────────────────────────

/**
 * Emite variação (+1/−1) em vez de valor absoluto de propósito. Toque rápido
 * — que é a norma no turno de storm — leria um valor obsoleto e perderia
 * incrementos se cada toque calculasse `value + 1` a partir da prop.
 */
function Stepper({
  label, value, onDelta, danger,
}: {
  label: string;
  value: number;
  onDelta: (d: number) => void;
  danger?: boolean;
}) {
  const bump = (d: number) => {
    if (d < 0 && value <= 0) return;
    Haptics.selectionAsync();
    onDelta(d);
  };

  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={() => bump(-1)}
          hitSlop={6}
          style={[styles.stepBtn, value <= 0 && styles.stepBtnOff]}
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
  color, value, onDelta,
}: {
  color: ManaColor;
  value: number;
  onDelta: (d: number) => void;
}) {
  const style = MANA_STYLE[color];
  return (
    <View style={styles.pipWrap}>
      <Pressable
        onPress={() => { Haptics.selectionAsync(); onDelta(1); }}
        style={[styles.pip, { backgroundColor: style.bg }, value > 0 && styles.pipActive]}
      >
        <Text style={[styles.pipLetter, { color: style.fg }]}>{color}</Text>
      </Pressable>
      <Text style={[styles.pipValue, value > 0 && styles.pipValueOn]}>{value}</Text>
      <Pressable
        onPress={() => { if (value > 0) { Haptics.selectionAsync(); onDelta(-1); } }}
        hitSlop={8}
        style={[styles.pipMinus, value === 0 && styles.pipMinusOff]}
      >
        <Text style={styles.pipMinusText}>−</Text>
      </Pressable>
    </View>
  );
}

// ─── Página de um jogador ───────────────────────────────────

function PlayerPage({
  width, index, players, counters, prefs, onPatch, onBump,
}: {
  width: number;
  index: number;
  players: { id: number; name: string }[];
  counters: PlayerCounters;
  prefs: CounterPrefs;
  /** Substituição direta — usada por ações que não são incremento. */
  onPatch: (partial: Partial<PlayerCounters>) => void;
  /** Incremento por variação, imune a toque rápido. */
  onBump: (field: BumpField, delta: number, key?: string) => void;
}) {
  const t = useT();
  const c = t.counters;

  const visibleCustom = prefs.custom.filter(cc => cc.enabled);
  const hasPlayerCounters =
    prefs.poison || prefs.energy || prefs.experience || visibleCustom.length > 0;

  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Mana pool */}
      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockLabel}>{c.mana}</Text>
          <Pressable onPress={() => onPatch({ mana: emptyMana() })} hitSlop={8}>
            <Text style={styles.linkBtnText}>{c.emptyPool}</Text>
          </Pressable>
        </View>
        <View style={styles.pipGrid}>
          {MANA_COLORS.map(color => (
            <ManaPip
              key={color}
              color={color}
              value={counters.mana[color]}
              onDelta={d => onBump('mana', d, color)}
            />
          ))}
        </View>
      </View>

      {/* Contadores do jogador */}
      {hasPlayerCounters && (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>{c.playerCounters}</Text>

          {prefs.poison && (
            <Stepper
              label={c.poison}
              value={counters.poison}
              danger={counters.poison >= POISON_LETHAL}
              onDelta={d => onBump('poison', d)}
            />
          )}
          {prefs.energy && (
            <Stepper
              label={c.energy}
              value={counters.energy}
              onDelta={d => onBump('energy', d)}
            />
          )}
          {prefs.experience && (
            <Stepper
              label={c.experience}
              value={counters.experience}
              onDelta={d => onBump('experience', d)}
            />
          )}
          {visibleCustom.map(cc => (
            <Stepper
              key={cc.id}
              label={cc.name}
              value={counters.custom[cc.id] ?? 0}
              onDelta={d => onBump('custom', d, cc.id)}
            />
          ))}
        </View>
      )}

      {/* Dano de comandante */}
      {prefs.commanderDamage && players.length > 1 && (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>{c.cmdDamage}</Text>
          <Text style={styles.blockHint}>{c.cmdDamageHint(players[index].name)}</Text>
          {players.map((from, fromIdx) => {
            if (fromIdx === index) return null;
            const dmg = counters.cmdDamage[fromIdx] ?? 0;
            return (
              <Stepper
                key={from.id}
                label={c.cmdFrom(from.name)}
                value={dmg}
                danger={dmg >= CMD_LETHAL}
                onDelta={d => onBump('cmdDamage', d, String(fromIdx))}
              />
            );
          })}
        </View>
      )}

      {!hasPlayerCounters && !prefs.commanderDamage && (
        <Text style={styles.allHiddenHint}>{c.allHidden}</Text>
      )}
    </ScrollView>
  );
}

// ─── Modal ──────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  players: { id: number; name: string }[];
  table: TableCounters;
  /** Recebe função de atualização, não valor pronto: ver o comentário do Stepper. */
  onTableChange: (update: (prev: TableCounters) => TableCounters) => void;
  counters: Record<number, PlayerCounters>;
  onCountersChange: (
    update: (prev: Record<number, PlayerCounters>) => Record<number, PlayerCounters>
  ) => void;
  prefs: CounterPrefs;
  /** Zera storm e o mana pool de todos. */
  onNewTurn: () => void;
}

export function CountersModal({
  visible, onClose, players, table, onTableChange,
  counters, onCountersChange, prefs, onNewTurn,
}: Props) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const c = t.counters;

  const [page, setPage] = React.useState(0);
  // O sheet ocupa a largura inteira, então a janela já dá a largura da página.
  // Medir com onLayout era uma dependência a mais para o mesmo número.
  const { width } = useWindowDimensions();
  const pagerRef = React.useRef<ScrollView>(null);

  // Se o número de jogadores cair, a página aberta pode deixar de existir.
  React.useEffect(() => {
    if (page >= players.length) setPage(0);
  }, [players.length, page]);

  const goTo = (i: number) => {
    setPage(i);
    scrollPagerTo(pagerRef, i * width);
  };

  /**
   * O deslize é a fonte da verdade; a barra de abas reflete onde ele parou.
   * Escuta `onScroll` e não só o fim da inércia porque no navegador rolar com
   * trackpad ou roda do mouse nunca dispara o evento de inércia.
   */
  const onPagerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== page && next >= 0 && next < players.length) {
      Haptics.selectionAsync();
      setPage(next);
    }
  };

  /**
   * Arrastar para baixo fecha a folha.
   *
   * O gesto vive só no cabeçalho de propósito: a página do jogador rola na
   * vertical, e um PanResponder na folha inteira roubaria essa rolagem.
   * A alça no topo é justamente a área que a pessoa já usa para isso.
   */
  const dragY = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) dragY.setValue(0);
  }, [visible, dragY]);

  const dismiss = React.useCallback(() => {
    Animated.timing(dragY, {
      toValue: 600,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      dragY.setValue(0);
      onClose();
    });
  }, [dragY, onClose]);

  const dragHandlers = React.useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && g.dy > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        // Só para baixo: puxar para cima não deve descolar a folha do fundo.
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 110 || g.vy > 0.8) {
          dismiss();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    }),
    [dragY, dismiss]
  );

  const patch = (idx: number, partial: Partial<PlayerCounters>) => {
    onCountersChange(prev => {
      const base = prev[idx] ?? emptyCounters();
      return { ...prev, [idx]: { ...base, ...partial } };
    });
  };

  /** Incremento a partir do estado corrente — nunca da prop já renderizada. */
  const bump = (idx: number, field: BumpField, delta: number, key?: string) => {
    onCountersChange(prev => {
      const base = prev[idx] ?? emptyCounters();
      let next: PlayerCounters;

      if (field === 'mana' && key) {
        const cur = base.mana[key as ManaColor] ?? 0;
        next = { ...base, mana: { ...base.mana, [key]: Math.max(0, cur + delta) } };
      } else if (field === 'cmdDamage' && key) {
        const cur = base.cmdDamage[Number(key)] ?? 0;
        next = { ...base, cmdDamage: { ...base.cmdDamage, [Number(key)]: Math.max(0, cur + delta) } };
      } else if (field === 'custom' && key) {
        const cur = base.custom[key] ?? 0;
        next = { ...base, custom: { ...base.custom, [key]: Math.max(0, cur + delta) } };
      } else {
        const f = field as 'poison' | 'energy' | 'experience';
        next = { ...base, [f]: Math.max(0, base[f] + delta) };
      }

      return { ...prev, [idx]: next };
    });
  };

  const bumpStorm = (delta: number) => {
    Haptics.selectionAsync();
    onTableChange(prev => ({ ...prev, storm: Math.max(0, prev.storm + delta) }));
  };

  const clearStorm = () => {
    Haptics.selectionAsync();
    onTableChange(prev => ({ ...prev, storm: 0 }));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 8, transform: [{ translateY: dragY }] },
          ]}
        >
          {/* Cabeçalho — também é a alça de arrastar */}
          <View style={styles.header} {...dragHandlers.panHandlers}>
            <View style={styles.grabber} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>{c.title}</Text>
              <Pressable onPress={dismiss} hitSlop={10} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
          </View>

          {/*
            Storm fica fora do pager de propósito: é contador da mesa, não do
            jogador, e continuar visível ao trocar de jogador é o ponto.
          */}
          <View style={styles.stormBar}>
            <View style={styles.stormLeft}>
              <Text style={styles.stormLabel}>{c.storm}</Text>
              <Text style={styles.stormHint}>{c.stormHint}</Text>
            </View>
            <View style={styles.stormControls}>
              <Pressable
                onPress={() => bumpStorm(-1)}
                hitSlop={6}
                style={[styles.stormBtn, table.storm === 0 && styles.stormBtnOff]}
              >
                <Text style={styles.stormBtnText}>−</Text>
              </Pressable>
              <Text style={styles.stormValue}>{table.storm}</Text>
              <Pressable
                onPress={() => bumpStorm(1)}
                hitSlop={6}
                style={[styles.stormBtn, styles.stormBtnAccent]}
              >
                <Text style={styles.stormBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.stormActions}>
            <Pressable onPress={clearStorm} hitSlop={6}>
              <Text style={styles.linkBtnText}>{c.clearStorm}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onNewTurn();
              }}
              hitSlop={6}
            >
              <Text style={styles.linkBtnText}>{c.newTurn}</Text>
            </Pressable>
          </View>

          {/* Abas de jogador */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
          >
            {players.map((p, i) => (
              <Pressable
                key={p.id}
                onPress={() => goTo(i)}
                style={[styles.tab, page === i && styles.tabActive]}
              >
                <Text style={[styles.tabText, page === i && styles.tabTextActive]}>
                  {p.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Páginas — uma por jogador, navegáveis por deslize */}
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onPagerScroll}
            scrollEventThrottle={32}
            style={styles.pager}
            // Sem isto, o scroll vertical de dentro rouba o gesto horizontal.
            directionalLockEnabled
          >
            {players.map((p, i) => (
              <PlayerPage
                key={p.id}
                width={width}
                index={i}
                players={players}
                counters={counters[i] ?? emptyCounters()}
                prefs={prefs}
                onPatch={partial => patch(i, partial)}
                onBump={(field, delta, key) => bump(i, field, delta, key)}
              />
            ))}
          </ScrollView>

          <Text style={styles.swipeHint}>{c.swipeHint}</Text>
        </Animated.View>
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
    height: '86%',
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

  // Barra de storm, persistente
  stormBar: {
    marginHorizontal: 20,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,95,60,0.35)',
    backgroundColor: 'rgba(212,95,60,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stormLeft: { flex: 1 },
  stormLabel: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  stormHint: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.32)',
    marginTop: 2,
  },
  stormControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stormBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stormBtnAccent: { backgroundColor: '#d45f3c' },
  stormBtnOff: { opacity: 0.35 },
  stormBtnText: { color: '#fff', fontSize: 20, lineHeight: 23 },
  stormValue: {
    minWidth: 40,
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: '#fff',
    letterSpacing: -1,
  },
  stormActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingTop: 8,
  },

  tabs: { paddingHorizontal: 20, paddingVertical: 12, gap: 10 },
  // Círculo do mesmo diâmetro dos pips de mana — não uma pílula alongada.
  tab: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tabActive: { backgroundColor: '#d45f3c', borderColor: 'transparent' },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.5)',
  },
  tabTextActive: { color: '#fff' },

  pager: { flex: 1 },
  pageContent: { paddingHorizontal: 20, paddingBottom: 16, gap: 14 },
  swipeHint: {
    textAlign: 'center',
    fontSize: 10,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.22)',
    paddingTop: 6,
  },

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
  allHiddenHint: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.32)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  linkBtnText: {
    fontSize: 11,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.45)',
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
  stepperValueDanger: { color: '#ff5a45' },
});
