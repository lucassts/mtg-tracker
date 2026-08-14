import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState, View, Text, Pressable, StyleSheet } from 'react-native';
import { registerRootComponent } from 'expo';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { TabNavigator } from './src/navigation/TabNavigator';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { useStore } from './src/store/useStore';
import { colors } from './src/theme/colors';
import { fontAssets } from './src/theme/typography';
import { useInviteLink } from './src/hooks/useInviteLink';

// Segura a splash até as fontes entrarem, senão a primeira tela pisca na fonte
// do sistema e reflui.
void SplashScreen.preventAutoHideAsync();

function AppRoot() {
  const onboarded = useStore(s => s.settings.onboarded);
  const flushTelemetry = useStore(s => s.flushTelemetry);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  // Convite aberto por link ou QR — resolve sozinho e avisa o resultado.
  const invite = useInviteLink();

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

  // Falha ao carregar fonte não impede o app de abrir: o texto sai na fonte do
  // sistema, o que é feio mas utilizável.
  React.useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
    if (fontError) console.warn('[App] fontes não carregadas:', fontError);
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (!onboarded) {
    return <OnboardingScreen />;
  }

  // O download do modelo (~350 MB) acontece sob demanda, dentro da aba Gravar.
  // Trancar o app inteiro atrás dele impedia até de usar o contador de vida.
  return (
    <NavigationContainer>
      <TabNavigator />
      {invite.banner && (
        <View style={[styles.banner, invite.banner.kind === 'error' && styles.bannerError]}>
          <Text style={styles.bannerText}>{invite.banner.message}</Text>
          <Pressable onPress={invite.dismiss} hitSlop={10}>
            <Text style={styles.bannerClose}>✕</Text>
          </Pressable>
        </View>
      )}
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
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.ink,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  bannerError: { backgroundColor: colors.bad },
  bannerText: { flex: 1, color: '#fff', fontSize: 13, fontFamily: 'Inter', lineHeight: 18 },
  bannerClose: { color: 'rgba(255,255,255,0.7)', fontSize: 14, paddingHorizontal: 4 },
});

registerRootComponent(App);
