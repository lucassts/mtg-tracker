import React from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Tinta de fundo das zonas de toque. Fica forte na borda externa — onde o
 * polegar cai — e some antes de chegar no número, para não competir com ele.
 */
const MINUS_TINT = ['rgba(192,66,42,0.30)', 'rgba(192,66,42,0.06)', 'transparent'] as const;
const PLUS_TINT = ['rgba(45,138,94,0.30)', 'rgba(45,138,94,0.06)', 'transparent'] as const;
const TINT_STOPS = [0, 0.55, 1] as const;

interface Player {
  id: number;
  life: number;
  name: string;
}

interface PlayerCellProps {
  player: Player;
  onAdjust: (delta: number) => void;
  flipped?: boolean;
}

export function PlayerCell({ player, onAdjust }: PlayerCellProps) {
  const [delta, setDelta] = React.useState(0);
  const [showDelta, setShowDelta] = React.useState(false);
  const holdRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdCountRef = React.useRef(0);
  const isHoldingRef = React.useRef(false);
  const deltaTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = React.useRef(new Animated.Value(0)).current;

  if (!player) return null;

  const handleAdjust = (d: number) => {
    onAdjust(d);
    setDelta(prev => prev + d);
    setShowDelta(true);
    opacity.setValue(1);
    if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
    deltaTimerRef.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setShowDelta(false);
        setDelta(0);
      });
    }, 1400);
  };

  const stopHold = () => {
    isHoldingRef.current = false;
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
    holdCountRef.current = 0;
  };

  const startHold = (d: number) => {
    stopHold(); // Limpa qualquer hold anterior
    isHoldingRef.current = true;
    holdCountRef.current = 0;
    handleAdjust(d);

    const tick = () => {
      if (!isHoldingRef.current) return;
      holdCountRef.current++;
      const fast = holdCountRef.current > 20;
      const step = fast ? 5 : 1;
      handleAdjust(d > 0 ? step : -step);
      holdRef.current = setTimeout(tick, fast ? 80 : 150);
    };

    holdRef.current = setTimeout(tick, 400); // delay inicial antes de começar repeat
  };

  React.useEffect(() => () => {
    stopHold();
    if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
  }, []);

  const isDead = player.life <= 0;
  const isLow = player.life <= 5 && player.life > 0;
  const lifeColor = isDead ? '#c0422a' : isLow ? '#e07a40' : '#fff';

  return (
    <View style={[styles.cell, isDead && styles.deadCell]}>
      <Pressable
        onPressIn={() => startHold(-1)}
        onPressOut={stopHold}
        onLongPress={() => {}} // evita que o sistema cancele o touch
        delayLongPress={10000}
        style={styles.leftZone}
      >
        <LinearGradient
          colors={MINUS_TINT}
          locations={TINT_STOPS}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Text style={styles.zoneLabel}>−</Text>
      </Pressable>

      <Pressable
        onPressIn={() => startHold(1)}
        onPressOut={stopHold}
        onLongPress={() => {}}
        delayLongPress={10000}
        style={styles.rightZone}
      >
        <LinearGradient
          colors={PLUS_TINT}
          locations={TINT_STOPS}
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0, y: 0.5 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Text style={styles.zoneLabel}>+</Text>
      </Pressable>

      <View style={styles.center} pointerEvents="none">
        <Text style={styles.playerName}>{player.name}</Text>
        <View style={styles.lifeWrap}>
          {showDelta && delta !== 0 && (
            <Animated.Text style={[
              styles.deltaText,
              { color: delta > 0 ? '#6fcf97' : '#eb5757', opacity },
            ]}>
              {delta > 0 ? `+${delta}` : delta}
            </Animated.Text>
          )}
          <Text style={[styles.lifeTotal, { color: lifeColor }]}>
            {player.life}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deadCell: {
    backgroundColor: 'rgba(180,60,40,0.18)',
  },
  leftZone: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: '38%',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 18,
  },
  rightZone: {
    position: 'absolute',
    right: 0, top: 0, bottom: 0,
    width: '38%',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 18,
  },
  zoneLabel: {
    fontSize: 32,
    fontWeight: '200',
    color: 'rgba(255,255,255,0.15)',
  },
  center: { alignItems: 'center' },
  playerName: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  lifeWrap: { alignItems: 'center' },
  lifeTotal: {
    fontSize: 80,
    fontWeight: '700',
    lineHeight: 84,
    letterSpacing: -2,
  },
  deltaText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
});
