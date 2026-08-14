import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Wrapper que aplica automaticamente o padding correto de safe area
 * nas bordas superior e inferior, evitando sobreposição com status bar
 * e barra de navegação do Android.
 */
interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: object;
  backgroundColor?: string;
  /** Se false, não adiciona paddingTop (para telas que controlam o próprio topo) */
  topInset?: boolean;
  /** Se false, não adiciona paddingBottom (para telas que têm tab bar ou controlam o próprio bottom) */
  bottomInset?: boolean;
}

export function ScreenWrapper({
  children,
  style,
  backgroundColor,
  topInset = true,
  bottomInset = false,
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.base,
        backgroundColor ? { backgroundColor } : null,
        topInset ? { paddingTop: insets.top } : null,
        bottomInset ? { paddingBottom: insets.bottom } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
});
