import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Crypto from 'expo-crypto';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { clearSnapshot, loadSnapshot } from '../data/activeSession';
import { insertSession } from '../data/sessionRepository';
import { listSessions } from '../data/sessionRepository';
import { deleteWorkout, listWorkouts, StoredWorkout } from '../data/workoutRepository';
import { pushWorkoutsToWatch } from '../data/watchSync';
import { SessionRecord } from '../domain/session';
import * as engine from '../engine/engine';
import { EngineState } from '../engine/engine';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../session/SessionProvider';
import {
  AppModal,
  Badge,
  Card,
  MonoLabel,
  RoundIconButton,
  SegmentedTabs,
} from '../ui/components';
import { showAlert } from '../ui/dialogs';
import { estimateMinutes, formatInt, relativeDay, tonnageKg, totalSets } from '../ui/format';
import { colors, fonts, spacing } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/** Lista de treinos (mock 2.1) + modal de retomada pós-crash (mock 2.4). */
export default function HomeScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { resumeFromSnapshot } = useSession();
  const [workouts, setWorkouts] = useState<StoredWorkout[]>([]);
  const [lastByWorkout, setLastByWorkout] = useState<Map<string, SessionRecord>>(new Map());
  const [snapshot, setSnapshot] = useState<EngineState | null>(null);

  const reload = useCallback(() => {
    listWorkouts().then(setWorkouts).catch(() => {});
    listSessions()
      .then((sessions) => {
        // listSessions vem ordenado por startedAt desc — o primeiro de cada nome é o último feito.
        const map = new Map<string, SessionRecord>();
        for (const s of sessions) {
          if (!map.has(s.workoutName)) map.set(s.workoutName, s);
        }
        setLastByWorkout(map);
      })
      .catch(() => {});
    loadSnapshot()
      .then((s) => setSnapshot(s && s.status !== 'finished' ? s : null))
      .catch(() => {});
  }, []);

  useFocusEffect(reload);

  const handleResume = () => {
    if (!snapshot) return;
    resumeFromSnapshot(snapshot);
    setSnapshot(null);
    navigation.navigate('Session');
  };

  const handleSavePartial = async () => {
    if (!snapshot) return;
    const now = Date.now() / 1000;
    const finished = engine.finish(snapshot, now);
    const record = engine.summarize(finished, now, {
      id: Crypto.randomUUID(),
      source: 'iphone',
    });
    await insertSession(record);
    await clearSnapshot();
    setSnapshot(null);
    reload();
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
      <View style={styles.header}>
        <Text style={styles.title}>{t('home.title')}</Text>
        {/* "+" saiu na v2 (criar treino por UI é não-objetivo); o glifo de
            importar mantém a única rota de entrada de treinos. */}
        <RoundIconButton
          glyph="↓"
          size={44}
          accent
          bordered
          onPress={() => navigation.navigate('Import')}
          testID="go-import"
          accessibilityLabel={t('home.import')}
        />
      </View>

      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: spacing.m }}
        ListEmptyComponent={<Text style={styles.empty}>{t('home.empty')}</Text>}
        renderItem={({ item }) => (
          <WorkoutCard
            stored={item}
            last={lastByWorkout.get(item.workout.name)}
            locale={i18n.language}
            onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
            onLongPress={() => handleDelete(item)}
          />
        )}
      />

      <SegmentedTabs
        tabs={[
          { label: t('home.tabWorkouts') },
          { label: t('home.tabHistory'), testID: 'go-history' },
        ]}
        activeIndex={0}
        onPress={(i) => {
          if (i === 1) navigation.navigate('History');
        }}
      />

      <AppModal
        visible={snapshot !== null}
        icon="!"
        title={t('home.resumeTitle')}
        body={snapshot ? resumeBody(snapshot, t) : undefined}
        testID="resume-banner"
        actions={[
          { label: t('home.resume'), onPress: handleResume, testID: 'resume-session' },
          {
            label: t('home.savePartial'),
            onPress: handleSavePartial,
            variant: 'secondary',
            testID: 'save-partial-snapshot',
          },
          {
            label: t('home.discard'),
            onPress: handleDiscardSnapshot,
            variant: 'text-danger',
            testID: 'discard-snapshot',
          },
        ]}
      />
    </View>
  );
}

function WorkoutCard({
  stored,
  last,
  locale,
  onPress,
  onLongPress,
}: {
  stored: StoredWorkout;
  last?: SessionRecord;
  locale: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { t } = useTranslation();
  const workout = stored.workout;
  const rel = last ? relativeDay(last.startedAt, new Date()) : null;
  const doneToday = rel?.key === 'common.today';

  const lastLine = last
    ? [
        rel ? t(rel.key, { count: rel.count }) : new Date(last.startedAt).toLocaleDateString(locale),
        last.status === 'completed'
          ? t('history.completed')
          : last.plannedSets
            ? t('home.partialShort', { done: last.sets.length, total: last.plannedSets })
            : t('history.partial'),
        last.source === 'watch'
          ? t('home.doneOnWatch')
          : tonnageKg(last.sets) > 0
            ? `${formatInt(tonnageKg(last.sets), locale)} kg`
            : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <Pressable
      testID={`workout-${workout.name}`}
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <Card
        big
        style={doneToday ? [styles.card, { borderColor: 'rgba(77,163,255,0.3)' }] : styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{workout.name}</Text>
          {doneToday ? <Badge label={t('home.today')} filled /> : null}
        </View>
        <MonoLabel size={12} tracking={1} style={{ marginTop: 8 }}>
          {[
            t('home.exercises', { count: workout.exercises.length }),
            t('history.sets', { count: totalSets(workout) }),
            t('home.approxMin', { count: estimateMinutes(workout) }),
          ].join(' · ')}
        </MonoLabel>
        {lastLine ? (
          <Text style={styles.cardLast}>{t('home.lastPrefix', { when: lastLine })}</Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

function resumeBody(
  snapshot: EngineState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const now = Date.now() / 1000;
  const reference = snapshot.status === 'paused' ? snapshot.pausedAt! : snapshot.phaseStartedAt;
  const minutes = Math.max(1, Math.round((now - reference) / 60));
  const phase = engine.currentPhase(snapshot);

  let phaseLabel = snapshot.workout.name;
  if (phase) {
    const exerciseFor = (index: number) => snapshot.workout.exercises[index];
    if (phase.type === 'rest') {
      const following = snapshot.phases[snapshot.phaseIndex + 1];
      const label =
        following?.type === 'work'
          ? t('session.exerciseSet', {
              exercise: exerciseFor(following.exerciseIndex).name,
              set: following.setNumber,
              total: exerciseFor(following.exerciseIndex).sets,
            })
          : exerciseFor(phase.exerciseIndex).name;
      phaseLabel = t('home.phaseRest', { label });
    } else {
      phaseLabel = t('home.phaseWork', {
        label: t('session.exerciseSet', {
          exercise: exerciseFor(phase.exerciseIndex).name,
          set: phase.setNumber,
          total: exerciseFor(phase.exerciseIndex).sets,
        }),
      });
    }
  }

  return t('home.resumeBody', { workout: snapshot.workout.name, minutes, phase: phaseLabel });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 74,
    paddingHorizontal: 20,
    paddingBottom: 46,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontFamily: fonts.heavy,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1,
    color: colors.text,
  },
  empty: {
    fontFamily: fonts.regular,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    fontFamily: fonts.heavy,
    fontSize: 22,
    color: colors.text,
    flexShrink: 1,
  },
  cardLast: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMid,
    marginTop: 10,
  },
});
