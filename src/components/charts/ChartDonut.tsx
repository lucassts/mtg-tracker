import React from 'react';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { colors } from '../../theme/colors';

interface ChartDonutProps {
  value?: number;
  size?: number;
  stroke?: number;
}

export function ChartDonut({ value = 0, size = 88, stroke = 10 }: ChartDonutProps) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const off = C * (1 - value / 100);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={colors.line} strokeWidth={stroke}
      />
      <Circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={colors.ink} strokeWidth={stroke}
        strokeDasharray={`${C} ${C}`}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <SvgText
        x={size / 2} y={size / 2 + 2}
        textAnchor="middle"
        fontFamily="Inter"
        fontWeight="700"
        fontSize={size * 0.24}
        fill={colors.ink}
      >
        {value}%
      </SvgText>
    </Svg>
  );
}
