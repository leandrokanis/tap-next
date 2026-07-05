import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';

import * as engine from '../engine/engine';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../session/SessionProvider';
import { BigButton, SmallButton, Stepper } from '../ui/components';
import { colors, spacing } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Session'>;

export default function SessionScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const session = useSession();
  const { state, now } = session;
  const savedRef = useRef(false);

  const completedAll = state ? engine.completedAllPhases(state) : false;

  // Full completion: persist once, celebrate, go home.
  useEffect(() => {
    if (!state || state.status !== 'finished' || !completedAll || savedRef.current) return;
    savedRef.current = true;
    const sets = state.completedSets.length;
    const minutes = Math.max(1, Math.round(engine.sessionElapsed(state, now) / 60));
    session.saveCompleted().then(() => {
      Alert.alert(t('session.completedTitle'), t('session.completedBody', { sets, minutes }), [
        { text: t('session.ok'), onPress: () => navigation.popToTop() },
      ]);
    });
  }, [state, completedAll, now, session, t, navigation]);

  if (!state || (state.status === 'finished' && completedAll)) {
    return <View style={styles.container} />;
  }

  const phase = engine.currentPhase(state);
  if (!phase) return <View style={styles.container} />;

  const exercise = state.workout.exercises[phase.exerciseIndex];
  const totalSets = state.phases.filter((p) => p.type === 'work').length;
  const doneSets = state.completedSets.length;
  const remaining = engine.phaseRemaining(state, now);
  const elapsed = engine.phaseElapsed(state, now);
  const paused = state.status === 'paused';
  const lastSet = state.completedSets[state.completedSets.length - 1];

  const handleFinish = () => {
    Alert.alert(
      t('session.finishTitle'),
      t('session.finishBody', { done: doneSets, total: totalSets }),
      [
        {
          text: t('session.finishSave'),
          onPress: () => session.finishAndSave().then(() => navigation.popToTop()),
        },
        {
          text: t('session.finishDiscard'),
          style: 'destructive',
          onPress: () => session.discard().then(() => navigation.popToTop()),
        },
        { text: t('session.finishContinue'), style: 'cancel' },
      ],
    );
  };

  return (
    <View style={styles.container} testID="session-screen">
      <View style={styles.header}>
        <Text style={styles.workoutName}>{state.workout.name}</Text>
        <Text style={styles.sessionClock} testID="session-clock">
          {formatSeconds(engine.sessionElapsed(state, now))}
        </Text>
      </View>

      {phase.type === 'work' ? (
        <View style={styles.phaseCard} testID="work-phase">
          <Text style={styles.exerciseName} testID="exercise-name">
            {exercise.name}
          </Text>
          <Text style={styles.setOf}>
            {t('session.setOf', { current: phase.setNumber, total: exercise.sets })}
          </Text>
          <Text style={styles.prescription}>
            {exercise.mode === 'reps' ? t('session.reps', { count: exercise.reps }) : null}
            {exercise.mode === 'reps' && exercise.weight !== undefined ? ' · ' : ''}
            {exercise.weight !== undefined ? t('session.kg', { count: exercise.weight }) : ''}
          </Text>
          {exercise.notes ? <Text style={styles.notes}>{exercise.notes}</Text> : null}
          <Text style={styles.bigClock} testID="phase-clock">
            {phase.mode === 'time' ? formatSeconds(remaining ?? 0) : formatSeconds(elapsed)}
          </Text>
        </View>
      ) : (
        <View style={styles.phaseCard} testID="rest-phase">
          <Text style={styles.restLabel}>{t('session.rest')}</Text>
          <Text style={styles.bigClock} testID="phase-clock">
            {formatSeconds(remaining ?? 0)}
          </Text>

          {lastSet && (lastSet.reps !== undefined || lastSet.weight !== undefined) && (
            <View style={styles.logCard} testID="set-log">
              <Text style={styles.logTitle}>{t('session.setDone', { set: lastSet.setIndex })}</Text>
              {lastSet.reps !== undefined && (
                <Stepper
                  label="reps"
                  value={lastSet.reps}
                  step={1}
                  min={0}
                  testID="log-reps"
                  onChange={(reps) =>
                    session.updateSet({
                      exerciseIndex: lastSet.exerciseIndex,
                      setIndex: lastSet.setIndex,
                      reps,
                    })
                  }
                />
              )}
              {lastSet.weight !== undefined && (
                <Stepper
                  label="kg"
                  value={lastSet.weight}
                  step={2.5}
                  min={0}
                  testID="log-weight"
                  onChange={(weight) =>
                    session.updateSet({
                      exerciseIndex: lastSet.exerciseIndex,
                      setIndex: lastSet.setIndex,
                      weight,
                    })
                  }
                />
              )}
            </View>
          )}

          <Text style={styles.nextUp}>{t('session.nextUp', { label: nextUpLabel() })}</Text>
        </View>
      )}

      <BigButton label={t('session.next')} onPress={session.next} testID="next-button" />

      <View style={styles.controls}>
        <SmallButton
          label={paused ? t('session.resume') : t('session.pause')}
          onPress={paused ? session.resume : session.pause}
          testID="pause-button"
        />
        <SmallButton label={t('session.finish')} tone="danger" onPress={handleFinish} testID="finish-button" />
      </View>
    </View>
  );

  function nextUpLabel(): string {
    const following = state!.phases[state!.phaseIndex + 1];
    if (!following) return '—';
    if (following.type === 'rest') return t('session.rest');
    const nextExercise = state!.workout.exercises[following.exerciseIndex];
    return t('session.nextUpSet', { exercise: nextExercise.name, set: following.setNumber });
  }
}

function formatSeconds(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.m,
    gap: spacing.m,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workoutName: { color: colors.textDim, fontSize: 16, fontWeight: '600' },
  sessionClock: { color: colors.textDim, fontSize: 16, fontVariant: ['tabular-nums'] },
  phaseCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.l,
    gap: spacing.s,
  },
  exerciseName: { color: colors.text, fontSize: 32, fontWeight: '800', textAlign: 'center' },
  setOf: { color: colors.textDim, fontSize: 18 },
  prescription: { color: colors.accent, fontSize: 22, fontWeight: '700' },
  notes: { color: colors.textDim, fontSize: 15, fontStyle: 'italic' },
  bigClock: {
    color: colors.text,
    fontSize: 72,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  restLabel: { color: colors.warning, fontSize: 24, fontWeight: '700' },
  logCard: {
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    gap: spacing.s,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  logTitle: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  nextUp: { color: colors.textDim, fontSize: 16 },
  controls: { flexDirection: 'row', gap: spacing.s, justifyContent: 'center' },
});
