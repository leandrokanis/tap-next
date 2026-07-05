import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { showAlert } from '../ui/dialogs';

import { clearSnapshot, loadSnapshot } from '../data/activeSession';
import { deleteWorkout, listWorkouts, StoredWorkout } from '../data/workoutRepository';
import { pushWorkoutsToWatch } from '../data/watchSync';
import { EngineState } from '../engine/engine';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../session/SessionProvider';
import { SmallButton } from '../ui/components';
import { colors, spacing } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { startSession, resumeFromSnapshot } = useSession();
  const [workouts, setWorkouts] = useState<StoredWorkout[]>([]);
  const [snapshot, setSnapshot] = useState<EngineState | null>(null);

  const reload = useCallback(() => {
    listWorkouts().then(setWorkouts).catch(() => {});
    loadSnapshot()
      .then((s) => setSnapshot(s && s.status !== 'finished' ? s : null))
      .catch(() => {});
  }, []);

  useFocusEffect(reload);

  const handleStart = (stored: StoredWorkout) => {
    startSession(stored.workout);
    navigation.navigate('Session');
  };

  const handleResume = () => {
    if (!snapshot) return;
    resumeFromSnapshot(snapshot);
    setSnapshot(null);
    navigation.navigate('Session');
  };

  const handleDiscardSnapshot = () => {
    clearSnapshot().then(() => setSnapshot(null));
  };

  const handleDelete = (stored: StoredWorkout) => {
    showAlert(t('home.deleteWorkoutTitle'), t('home.deleteWorkoutBody', { name: stored.workout.name }), [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('history.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteWorkout(stored.id);
          const remaining = await listWorkouts();
          setWorkouts(remaining);
          pushWorkoutsToWatch(remaining.map((w) => w.workout));
        },
      },
    ]);
  };

  return (
    <View style={styles.container} testID="home-screen">
      {snapshot && (
        <View style={styles.banner} testID="resume-banner">
          <Text style={styles.bannerTitle}>{t('home.resumeTitle')}</Text>
          <Text style={styles.bannerBody}>
            {t('home.resumeBody', { workout: snapshot.workout.name })}
          </Text>
          <View style={styles.row}>
            <SmallButton label={t('home.resume')} tone="accent" onPress={handleResume} testID="resume-session" />
            <SmallButton label={t('home.discard')} tone="danger" onPress={handleDiscardSnapshot} testID="discard-snapshot" />
          </View>
        </View>
      )}

      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.s, paddingBottom: spacing.xl }}
        ListEmptyComponent={<Text style={styles.empty}>{t('home.empty')}</Text>}
        renderItem={({ item }) => (
          <Pressable
            testID={`workout-${item.workout.name}`}
            accessibilityRole="button"
            onPress={() => handleStart(item)}
            onLongPress={() => handleDelete(item)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.workout.name}</Text>
              <Text style={styles.cardSubtitle}>
                {t('home.exercises', { count: item.workout.exercises.length })}
              </Text>
            </View>
            <Text style={styles.start}>{t('home.start')} ›</Text>
          </Pressable>
        )}
      />

      <View style={styles.row}>
        <SmallButton label={t('home.import')} onPress={() => navigation.navigate('Import')} testID="go-import" />
        <SmallButton label={t('home.history')} onPress={() => navigation.navigate('History')} testID="go-history" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.m,
    gap: spacing.m,
  },
  banner: {
    backgroundColor: colors.card,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.m,
    gap: spacing.s,
  },
  bannerTitle: { color: colors.warning, fontWeight: '700', fontSize: 16 },
  bannerBody: { color: colors.text, fontSize: 15 },
  row: { flexDirection: 'row', gap: spacing.s, justifyContent: 'center' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing.xl, fontSize: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  cardSubtitle: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  start: { color: colors.accent, fontSize: 16, fontWeight: '700' },
});
