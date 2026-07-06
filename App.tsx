import './src/i18n';

import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_700Bold,
  Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
  IBMPlexMono_700Bold,
} from '@expo-google-fonts/ibm-plex-mono';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';

import { insertSession } from './src/data/sessionRepository';
import { subscribeToWatchSessions, pushWorkoutsToWatch } from './src/data/watchSync';
import { listWorkouts } from './src/data/workoutRepository';
import { RootStackParamList } from './src/navigation/types';
import HistoryDetailScreen from './src/screens/HistoryDetailScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import HomeScreen from './src/screens/HomeScreen';
import ImportScreen from './src/screens/ImportScreen';
import SessionScreen from './src/screens/SessionScreen';
import WorkoutDetailScreen from './src/screens/WorkoutDetailScreen';
import { SessionProvider } from './src/session/SessionProvider';
import { initNotifications, prepareAudio } from './src/services/alerts';
import { colors } from './src/ui/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    primary: colors.accent,
    border: colors.borderCard,
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    IBMPlexMono_700Bold,
  });

  useEffect(() => {
    prepareAudio();
    initNotifications();
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

  if (!fontsLoaded) return null;

  return (
    <SessionProvider>
      <NavigationContainer theme={theme}>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'none' }} />
          <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
          <Stack.Screen name="Import" component={ImportScreen} />
          <Stack.Screen name="Session" component={SessionScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ animation: 'none' }} />
          <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SessionProvider>
  );
}
