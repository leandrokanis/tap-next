import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getWorkout, StoredWorkout } from '../data/workoutRepository';
import { Exercise } from '../domain/workout';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../session/SessionProvider';
import { Badge, BigCTA, Card, MonoLabel, RoundIconButton } from '../ui/components';
import { estimateMinutes, totalSets } from '../ui/format';
import { colors, fonts, spacing } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutDetail'>;

/** Pré-sessão (mock 1.1): o treino inteiro à vista, um toque para começar. */
export default function WorkoutDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { startSession } = useSession();
  const [stored, setStored] = useState<StoredWorkout | null>(null);

  useEffect(() => {
    getWorkout(route.params.workoutId).then(setStored);
  }, [route.params.workoutId]);

  if (!stored) return <View style={styles.container} />;
  const workout = stored.workout;

  const handleStart = () => {
    startSession(workout);
    navigation.navigate('Session');
  };

  return (
    <View style={styles.container} testID="workout-detail-screen">
      <View style={styles.header}>
        <RoundIconButton glyph="‹" onPress={navigation.goBack} testID="back-button" />
        <MonoLabel>{t('detail.header')}</MonoLabel>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.title}>{workout.name}</Text>
      <View style={styles.metaRow}>
        <MonoLabel tracking={1} size={12}>
          {t('home.exercises', { count: workout.exercises.length })}
        </MonoLabel>
        <MonoLabel tracking={1} size={12}>
          {t('history.sets', { count: totalSets(workout) })}
        </MonoLabel>
        <MonoLabel tracking={1} size={12}>
          {t('home.approxMin', { count: estimateMinutes(workout) })}
        </MonoLabel>
      </View>

      <FlatList
        data={workout.exercises}
        keyExtractor={(ex, i) => `${i}-${ex.name}`}
        contentContainerStyle={{ gap: spacing.s, paddingBottom: spacing.m }}
        renderItem={({ item, index }) => <ExerciseRow exercise={item} index={index} />}
      />

      <BigCTA label={t('detail.start')} height={76} onPress={handleStart} testID="start-session" />
    </View>
  );
}

function ExerciseRow({ exercise, index }: { exercise: Exercise; index: number }) {
  const { t } = useTranslation();
  const prescription =
    exercise.mode === 'time'
      ? [
          `${exercise.sets} × ${t('detail.seconds', { count: exercise.duration ?? 0 })}`,
          t('detail.isometric'),
          exercise.restBetweenSets ? t('detail.pause', { count: exercise.restBetweenSets }) : null,
        ]
      : [
          `${exercise.sets} × ${exercise.reps ?? 0}`,
          exercise.weight !== undefined ? t('session.kg', { count: exercise.weight }) : null,
          exercise.restBetweenSets ? t('detail.rest', { count: exercise.restBetweenSets }) : null,
        ];

  return (
    <Card style={styles.exerciseRow}>
      <Text style={styles.exerciseIndex}>{index + 1}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <Text style={styles.exerciseMeta}>{prescription.filter(Boolean).join(' · ')}</Text>
      </View>
      {exercise.mode === 'time' ? <Badge label={t('detail.timeBadge')} /> : null}
    </Card>
  );
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
    marginBottom: 22,
  },
  title: {
    fontFamily: fonts.heavy,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 12,
    marginBottom: 22,
  },
  exerciseRow: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  exerciseIndex: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: colors.accent,
    width: 20,
  },
  exerciseName: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
  },
  exerciseMeta: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    color: colors.textDim,
    marginTop: 4,
  },
});
