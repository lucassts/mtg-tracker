import React from 'react';
import Svg, { Rect, Text as SvgText, ClipPath, Defs, G } from 'react-native-svg';
import { colors } from '../../theme/colors';

interface BarItem {
  l: string;
  v: number;
  suffix?: string;
}

interface ChartBarsProps {
  data: BarItem[];
  w?: number;
  /** Quando true, cada barra fica verde (v>=50) ou vermelha (v<50) */
  colorize?: boolean;
}

const LABEL_W = 110; // área reservada para o rótulo
const VAL_W   = 34;  // área reservada para o valor à direita
const BAR_X   = LABEL_W + 6;

export function ChartBars({ data, w = 300, colorize = false }: ChartBarsProps) {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map(d => d.v), 1);
  const rowH = 28;
  const totalH = data.length * rowH;
  const barMaxW = Math.max(w - BAR_X - VAL_W - 4, 10);

  return (
    <Svg width={w} height={totalH} viewBox={`0 0 ${w} ${totalH}`}>
      <Defs>
        {/* Clip para os rótulos não vazarem sobre as barras */}
        <ClipPath id="labelClip">
          <Rect x="0" y="0" width={LABEL_W} height={totalH} />
        </ClipPath>
      </Defs>

      {data.map((d, i) => {
        const y = i * rowH;
        const barW = (d.v / max) * barMaxW;
        const valX = BAR_X + barW + 5;

        const barColor = colorize
        ? (d.v >= 50 ? colors.good : colors.bad)
        : colors.ink;

      return (
          <G key={i}>
            {/* Rótulo — clipped, alinhado à direita da área de label */}
            <SvgText
              clipPath="url(#labelClip)"
              x={LABEL_W - 4}
              y={y + rowH / 2 + 4}
              textAnchor="end"
              fontFamily="Inter"
              fontSize="11"
              fill={colors.ink2}
            >
              {d.l}
            </SvgText>

            {/* Barra */}
            <Rect x={BAR_X} y={y + 6} width={barW} height="16" fill={barColor} rx="2" />

            {/* Valor */}
            <SvgText
              x={Math.min(valX, w - 2)}
              y={y + rowH / 2 + 4}
              fontFamily="JetBrainsMono"
              fontSize="10"
              fill={colors.ink3}
            >
              {d.v}{d.suffix || ''}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
