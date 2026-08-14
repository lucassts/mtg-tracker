import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState, View, StyleSheet } from 'react-native';
import { registerRootComponent } from 'expo';

import { TabNavigator } from './src/navigation/TabNavigator';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { useStore } from './src/store/useStore';
import { colors } from './src/theme/colors';

function AppRoot() {
  const onboarded = useStore(s => s.settings.onboarded);
  const flushTelemetry = useStore(s => s.flushTelemetry);

  // Tenta esvaziar a fila anônima ao abrir e sempre que o app volta ao primeiro
  // plano — é quando a conexão costuma estar de volta. Sem fila ou com o
  // compartilhamento desligado, isso é um no-op.
  React.useEffect(() => {
    void flushTelemetry();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void flushTelemetry();
    });
    return () => sub.remove();
  }, [flushTelemetry]);

  if (!onboarded) {
    return <OnboardingScreen />;
  }

  // O download do modelo (~350 MB) acontece sob demanda, dentro da aba Gravar.
  // Trancar o app inteiro atrás dele impedia até de usar o contador de vida.
  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root}>
          <AppRoot />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});

registerRootComponent(App);
