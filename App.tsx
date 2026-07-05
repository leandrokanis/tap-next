import './src/i18n';

import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { insertSession } from './src/data/sessionRepository';
import { subscribeToWatchSessions, pushWorkoutsToWatch } from './src/data/watchSync';
import { listWorkouts } from './src/data/workoutRepository';
import { RootStackParamList } from './src/navigation/types';
import HistoryDetailScreen from './src/screens/HistoryDetailScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import HomeScreen from './src/screens/HomeScreen';
import ImportScreen from './src/screens/ImportScreen';
import SessionScreen from './src/screens/SessionScreen';
import { SessionProvider } from './src/session/SessionProvider';
import { prepareAudio, requestNotificationPermission } from './src/services/alerts';
import { colors } from './src/ui/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Alerts scheduled for phase ends must not pop while the app is foregrounded
// — the in-app sound/haptic covers that case.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    primary: colors.accent,
    border: colors.border,
  },
};

export default function App() {
  const { t } = useTranslation();

  useEffect(() => {
    prepareAudio();
    requestNotificationPermission();
    // Watch → iPhone: sessions arrive whenever the devices reconnect
    // (idempotent insert, ADR 0005). iPhone → Watch: seed current workouts.
    const unsubscribe = subscribeToWatchSessions((session) => {
      insertSession(session).catch(() => {});
    });
    listWorkouts()
      .then((all) => pushWorkoutsToWatch(all.map((w) => w.workout)))
      .catch(() => {});
    return unsubscribe;
  }, []);

  return (
    <SessionProvider>
      <NavigationContainer theme={theme}>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: t('home.title') }} />
          <Stack.Screen name="Import" component={ImportScreen} options={{ title: t('import.title') }} />
          <Stack.Screen
            name="Session"
            component={SessionScreen}
            options={{ headerShown: false, gestureEnabled: false }}
          />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: t('history.title') }} />
          <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} options={{ title: '' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SessionProvider>
  );
}
