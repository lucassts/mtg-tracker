import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface WaveformProps {
  active?: boolean;
}

// Simple animated waveform using state + interval (no native modules needed)
export function Waveform({ active = false }: WaveformProps) {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(id);
  }, [active]);

  const bars = Array.from({ length: 32 }).map((_, i) => {
    if (!active) return 8;
    const base = Math.abs(Math.sin((i + tick * 0.3) * 0.5)) * 0.7 + 0.3;
    const seed = (i * 13 + tick * 7) % 23;
    return Math.max(4, Math.min(40, base * (8 + seed % 18) * 1.3 + 4));
  });

  return (
    <View style={styles.container}>
      {bars.map((h, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: h,
              backgroundColor: active ? colors.accent : colors.ink5,
              opacity: active ? 1 : 0.5,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
  },
});
