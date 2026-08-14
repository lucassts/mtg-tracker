import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface BadgeProps {
  label: string;
  dot?: boolean;
  dotColor?: string;
  style?: object;
}

export function Badge({ label, dot = true, dotColor = colors.good, style }: BadgeProps) {
  return (
    <View style={[styles.badge, style]}>
      {dot && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
      {/*
        Maiúsculas em JS, e não por `textTransform`: o Android mede o texto
        antes de aplicar a transformação, então a versão maiúscula transborda
        a largura calculada e o fim da frase some. Aqui a medição já vê o
        texto final.
      */}
      <Text style={styles.label}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    // Sem isto o badge estica com o container e o "pill" vira uma barra.
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  label: {
    fontFamily: 'JetBrainsMono',
    fontSize: 9.5,
    letterSpacing: 0.8,
    // O espaçamento entre letras sobra depois do último caractere; sem esta
    // folga o Android come o final da frase.
    paddingRight: 1,
    color: colors.ink2,
  },
});
