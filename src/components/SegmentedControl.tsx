import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface Option {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  options: Option[] | string[];
  value: string;
  onChange: (v: string) => void;
  fontSize?: number;
}

export function SegmentedControl({ options, value, onChange, fontSize = 11 }: SegmentedControlProps) {
  const normalized: Option[] = options.map(o =>
    typeof o === 'string' ? { label: o, value: o } : o
  );

  return (
    <View style={styles.container}>
      {normalized.map(opt => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.btn, active && styles.btnActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.label, { fontSize }, active && styles.labelActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    padding: 3,
  },
  btn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  btnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 1,
    elevation: 1,
  },
  label: {
    fontFamily: 'Inter',
    fontWeight: '500',
    color: colors.ink3,
  },
  labelActive: {
    color: colors.ink,
  },
});
