import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { colors } from '../../theme/colors';

interface ChartLineProps {
  points: number[];
  w?: number;
  h?: number;
}

export function ChartLine({ points, w = 300, h = 90 }: ChartLineProps) {
  if (!points || points.length < 2) {
    return (
      <Text style={styles.empty}>Dados insuficientes</Text>
    );
  }

  const max = Math.max(...points, 10);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);
  const pad = 12;

  const coords = points.map((p, i) => ({
    x: pad + (i / (points.length - 1)) * (w - pad * 2),
    y: h - 18 - ((p - min) / range) * (h - 32),
  }));

  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const area = path + ` L ${coords[coords.length - 1].x} ${h - 18} L ${pad} ${h - 18} Z`;

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Line x1={pad} y1={h - 18} x2={w - pad} y2={h - 18} stroke={colors.line} strokeWidth={1} />
      <Line x1={pad} y1={(h - 18) / 2 + 4} x2={w - pad} y2={(h - 18) / 2 + 4}
        stroke={colors.line} strokeWidth={1} strokeDasharray="2 3" />
      <Path d={area} fill={colors.ink} fillOpacity={0.06} />
      <Path d={path} fill="none" stroke={colors.ink} strokeWidth={1.8} strokeLinejoin="round" />
      {coords.map((c, i) => (
        <Circle key={i} cx={c.x} cy={c.y} r={2.5}
          fill={colors.surface} stroke={colors.ink} strokeWidth={1.5} />
      ))}
      <SvgText x={pad} y={10} fontFamily="JetBrainsMono" fontSize={9} fill={colors.ink3}>{max}%</SvgText>
      <SvgText x={pad} y={h - 4} fontFamily="JetBrainsMono" fontSize={9} fill={colors.ink3}>{min}%</SvgText>
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 11, color: colors.ink4, textAlign: 'center', padding: 20, fontFamily: 'Inter' },
});
