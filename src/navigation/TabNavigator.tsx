import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';

import { HomeScreen } from '../screens/HomeScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LifeScreen } from '../screens/LifeScreen';
import { Icon } from '../components/Icon';
import { colors } from '../theme/colors';
import { useT } from '../i18n/useT';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Review" component={ReviewScreen} />
    </HomeStack.Navigator>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const n = t.nav;
  const activeTab = state.routes[state.index].name;
  const isDark = activeTab === 'Life';

  const tabs = [
    { name: 'Life', label: n.life, icon: 'heart' },
    { name: 'Stats', label: n.stats, icon: 'stats' },
    { name: 'HomeStack', label: n.record, icon: 'mic', center: true },
    { name: 'History', label: n.history, icon: 'list' },
    { name: 'Settings', label: n.settings, icon: 'settings' },
  ];

  return (
    <View style={[
      styles.tabBar,
      {
        paddingBottom: insets.bottom || 8,
        backgroundColor: isDark ? colors.dark : colors.surface,
        borderTopColor: isDark ? colors.dark3 : colors.line,
      }
    ]}>
      {tabs.map((tab) => {
        const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
        const isFocused = state.index === routeIndex;
        const onPress = () => {
          // O alvo do evento é a CHAVE da rota, não o nome: é por ela que o
          // React Navigation entrega o `tabPress` ao listener da tela. Com o
          // nome, o evento saía e não chegava em ninguém — que é o motivo de
          // tocar na aba já aberta não fazer nada.
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes[routeIndex]?.key,
            canPreventDefault: true,
          });
          if (!event.defaultPrevented) {
            if (tab.name === 'HomeStack') {
              // Sempre reseta o stack para Home, independente de onde estava
              navigation.dispatch(
                CommonActions.navigate({
                  name: 'HomeStack',
                  params: { screen: 'Home' },
                })
              );
            } else if (!isFocused) {
              navigation.navigate(tab.name);
            }
          }
        };

        if (tab.center) {
          return (
            <View key={tab.name} style={styles.centerTabWrap}>
              <Pressable onPress={onPress} style={[
                styles.fab,
                { backgroundColor: isFocused ? colors.accent : colors.ink },
              ]}>
                <Icon name="mic" size={24} stroke="#fff" strokeWidth={isFocused ? 2.2 : 1.8} />
              </Pressable>
            </View>
          );
        }

        const inactiveColor = isDark ? '#6b685c' : colors.ink4;
        const activeColor = isDark ? '#fff' : colors.ink;

        return (
          <Pressable key={tab.name} onPress={onPress} style={styles.tabItem}>
            <Icon
              name={tab.icon}
              size={20}
              stroke={isFocused ? activeColor : inactiveColor}
              strokeWidth={isFocused ? 2 : 1.6}
            />
            <Text style={[
              styles.tabLabel,
              { color: isFocused ? activeColor : inactiveColor, fontWeight: isFocused ? '600' : '400' }
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Life" component={LifeScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="HomeStack" component={HomeStackNavigator} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    paddingBottom: 4,
    minHeight: 52,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'Inter',
  },
  centerTabWrap: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ translateY: -20 }],
  },
});
