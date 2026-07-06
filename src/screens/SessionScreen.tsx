import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import * as engine from '../engine/engine';
import { LoggedSet } from '../engine/engine';
import { RestPhase, WorkPhase } from '../engine/phases';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../session/SessionProvider';
import {
  AppModal,
  Badge,
  BigCTA,
  Card,
  MonoLabel,
  NextUpBar,
  ProgressSegments,
  RoundIconButton,
  StatCard,
  StepperField,
  TimerText,
} from '../ui/components';
import { formatClock, formatInt, relativeDay, tonnageKg } from '../ui/format';
import { ProgressRing } from '../ui/ProgressRing';
import { colors, fonts, radii, spacing } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Session'>;

export default function SessionScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const session = useSession();
  const { state, now } = session;
  const [finishModal, setFinishModal] = useState(false);

  if (!state) return <View style={styles.container} />;

  const completedAll = engine.completedAllPhases(state);
  if (state.status === 'finished') {
    if (!completedAll) return <View style={styles.container} />;
    return <SummaryView navigation={navigation} />;
  }

  const phase = engine.currentPhase(state);
  if (!phase) return <View style={styles.container} />;

  const paused = state.status === 'paused';
  const totalSets = state.phases.filter((p) => p.type === 'work').length;
  const doneSets = state.completedSets.length;

  const handleFinishSave = () => {
    setFinishModal(false);
    session.finishAndSave().then(() => navigation.popToTop());
  };
  const handleFinishDiscard = () => {
    setFinishModal(false);
    session.discard().then(() => navigation.popToTop());
  };

  return (
    <View style={styles.container} testID="session-screen">
      <View style={styles.header}>
        <MonoLabel size={12} tracking={1} testID="session-clock">
          {paused
            ? t('session.paused')
            : t('session.clockLabel', { time: formatClock(engine.sessionElapsed(state, now)) })}
        </MonoLabel>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <RoundIconButton
            glyph={paused ? '▶' : '❚❚'}
            onPress={paused ? session.resume : session.pause}
            testID="pause-button"
            accessibilityLabel={paused ? t('session.resume') : t('session.pause')}
          />
          <RoundIconButton
            glyph="✕"
            onPress={() => setFinishModal(true)}
            testID="finish-button"
            accessibilityLabel={t('session.finish')}
          />
        </View>
      </View>

      <View style={{ marginBottom: 30 }}>
        <ProgressSegments
          total={state.workout.exercises.length}
          done={phase.exerciseIndex + 1}
        />
      </View>

      {phase.type === 'work' ? (
        <WorkView phase={phase} />
      ) : (
        <RestView phase={phase} />
      )}

      <AppModal
        visible={finishModal}
        icon="!"
        title={t('session.finishTitle')}
        body={t('session.finishBody', { done: doneSets, total: totalSets })}
        testID="finish-modal"
        actions={[
          { label: t('session.finishSave'), onPress: handleFinishSave, variant: 'secondary' },
          {
            label: t('session.finishContinue'),
            onPress: () => setFinishModal(false),
            variant: 'primary',
          },
          { label: t('session.finishDiscard'), onPress: handleFinishDiscard, variant: 'text-danger' },
        ]}
      />
    </View>
  );
}

/** Execução — reps (1.2) e isometria (1.5). */
function WorkView({ phase }: { phase: WorkPhase }) {
  const { t } = useTranslation();
  const session = useSession();
  const state = session.state!;
  const now = session.now;

  const exercise = state.workout.exercises[phase.exerciseIndex];
  const elapsed = engine.phaseElapsed(state, now);
  const remaining = engine.phaseRemaining(state, now);
  const isTimed = phase.mode === 'time';

  const prescription = isTimed
    ? t('session.isoPrescription', { count: phase.duration ?? 0 })
    : [
        t('session.reps', { count: exercise.reps ?? 0 }),
        exercise.weight !== undefined ? t('session.kg', { count: exercise.weight }) : null,
      ]
        .filter(Boolean)
        .join(' · ');

  return (
    <View style={{ flex: 1 }} testID="work-phase">
      <MonoLabel tone="accent" size={12}>
        {t('session.exerciseOf', {
          current: phase.exerciseIndex + 1,
          total: state.workout.exercises.length,
        })}
      </MonoLabel>
      <Text style={styles.exerciseName} testID="exercise-name">
        {exercise.name}
      </Text>
      <View style={styles.setRow}>
        <Text style={styles.setLabel}>
          {t('session.setOfCap', { current: phase.setNumber })}{' '}
          <Text style={{ color: colors.textDim, fontFamily: fonts.medium }}>
            {t('session.ofTotal', { total: exercise.sets })}
          </Text>
        </Text>
        <Text style={styles.prescription}>{prescription}</Text>
      </View>

      {isTimed ? (
        <View style={styles.center}>
          <ProgressRing progress={(remaining ?? 0) / (phase.duration || 1)}>
            <View style={{ alignItems: 'center' }}>
              <TimerText size="m" testID="phase-clock">
                {formatClock(remaining ?? 0)}
              </TimerText>
              <MonoLabel style={{ marginTop: 8 }}>{t('session.hold')}</MonoLabel>
            </View>
          </ProgressRing>
          <Text style={styles.hint}>{t('session.isoHint')}</Text>
        </View>
      ) : (
        <View style={styles.center}>
          <MonoLabel tracking={3} style={{ marginBottom: 6 }}>
            {t('session.setTime')}
          </MonoLabel>
          <TimerText size="l" testID="phase-clock">
            {formatClock(elapsed)}
          </TimerText>
        </View>
      )}

      <View style={{ marginBottom: 12 }}>
        <WorkNextUp phase={phase} />
      </View>
      {isTimed ? (
        <BigCTA
          label={t('session.endEarly')}
          variant="secondary"
          height={64}
          onPress={session.next}
          testID="next-button"
        />
      ) : (
        <BigCTA label={t('session.next')} onPress={session.next} testID="next-button" />
      )}
    </View>
  );
}

/** Barra A SEGUIR durante o work: o que vem depois desta série. */
function WorkNextUp({ phase }: { phase: WorkPhase }) {
  const { t } = useTranslation();
  const { state } = useSession();
  const following = state!.phases[state!.phaseIndex + 1];
  const exercise = state!.workout.exercises[phase.exerciseIndex];

  if (!following) {
    return (
      <NextUpBar label={t('session.nextUpLabel')} title={t('session.summaryTitle')} />
    );
  }
  if (following.type === 'rest') {
    const afterRest = state!.phases[state!.phaseIndex + 2];
    const detail =
      afterRest?.type === 'work'
        ? t('session.toSet', {
            set: afterRest.setNumber,
            total: state!.workout.exercises[afterRest.exerciseIndex].sets,
          })
        : undefined;
    return (
      <NextUpBar
        label={t('session.nextUpLabel')}
        title={t('session.restNext', { count: following.duration })}
        detail={detail}
      />
    );
  }
  const nextExercise = state!.workout.exercises[following.exerciseIndex];
  return (
    <NextUpBar
      label={t('session.nextUpLabel')}
      title={t('session.nextUpSet', { exercise: nextExercise.name, set: following.setNumber })}
      detail={
        following.exerciseIndex === phase.exerciseIndex
          ? t('session.toSet', { set: following.setNumber, total: exercise.sets })
          : undefined
      }
    />
  );
}

/** Descanso (1.3) e overtime (1.4), com registro prospectivo (RF-06). */
function RestView({ phase }: { phase: RestPhase }) {
  const { t } = useTranslation();
  const session = useSession();
  const state = session.state!;
  const now = session.now;

  const remaining = engine.phaseRemaining(state, now) ?? 0;
  const overtime = engine.phaseOvertime(state, now) ?? 0;
  const inOvertime = overtime > 0;
  const lastSet = state.completedSets[state.completedSets.length - 1];

  const nextWork = state.phases[state.phaseIndex + 1];
  const nextWorkPhase = nextWork?.type === 'work' ? nextWork : null;
  const nextExercise = nextWorkPhase
    ? state.workout.exercises[nextWorkPhase.exerciseIndex]
    : null;
  const override = state.upcomingOverride;
  const upcomingReps = override?.reps ?? nextExercise?.reps ?? 0;
  const upcomingWeight = override?.weight ?? nextExercise?.weight ?? 0;

  return (
    <View style={{ flex: 1 }} testID="rest-phase">
      {!inOvertime && lastSet ? (
        <View style={styles.savedChip}>
          <View style={styles.savedCheck}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.onAccent }}>✓</Text>
          </View>
          <Text style={styles.savedText}>
            {t('session.setSaved', { set: lastSet.setIndex })} —{' '}
            <Text style={{ color: colors.text, fontFamily: fonts.monoSemiBold }}>
              {loggedSummary(lastSet, t)}
            </Text>
          </Text>
        </View>
      ) : null}

      {inOvertime ? (
        <View style={[styles.center, { flex: 0, marginTop: 34 }]}>
          <View style={styles.overtimePill}>
            <View style={styles.overtimeDot} />
            <MonoLabel tone="warning" size={12} weight="semibold">
              {t('session.restZeroed')}
            </MonoLabel>
          </View>
          <TimerText size="xl" tone="warning" testID="phase-clock">
            {`+${formatClock(overtime)}`}
          </TimerText>
          <Text style={[styles.hint, { marginTop: 14 }]}>
            {t('session.overtimeHint', { count: phase.duration })}
          </Text>
          <Text style={styles.tapReady}>{t('session.tapReady')}</Text>
        </View>
      ) : (
        <View style={[styles.center, { flex: 0, marginTop: 8 }]}>
          <MonoLabel tone="accent" tracking={3} style={{ marginBottom: 6 }}>
            {t('session.rest')}
          </MonoLabel>
          <TimerText size="xl" tone="accent" testID="phase-clock">
            {formatClock(remaining)}
          </TimerText>
          <MonoLabel size={12} style={{ marginTop: 10 }}>
            {t('session.restOf', { time: formatClock(phase.duration) })}
          </MonoLabel>
        </View>
      )}

      <View style={{ flex: 1 }} />

      {inOvertime || !nextExercise || !nextWorkPhase ? (
        <View style={{ marginBottom: 12 }}>
          <NextUpBar
            label={t('session.nextUpLabel')}
            title={
              nextExercise && nextWorkPhase
                ? t('session.exerciseSet', {
                    exercise: nextExercise.name,
                    set: nextWorkPhase.setNumber,
                    total: nextExercise.sets,
                  })
                : t('session.summaryTitle')
            }
            detail={
              nextExercise
                ? [
                    override?.reps ?? nextExercise.reps,
                    upcomingWeight ? t('session.kg', { count: upcomingWeight }) : null,
                  ]
                    .filter((v) => v !== undefined && v !== null)
                    .join(' · ')
                : undefined
            }
          />
        </View>
      ) : (
        <Card big style={styles.prospectiveCard} testID="set-log">
          <View style={styles.prospectiveHeader}>
            <MonoLabel tone="accent" size={10} weight="semibold">
              {t('session.nextUpLabel')}
            </MonoLabel>
            <Text style={styles.prospectiveTitle}>
              {t('session.exerciseSet', {
                exercise: nextExercise.name,
                set: nextWorkPhase.setNumber,
                total: nextExercise.sets,
              })}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {nextWorkPhase.mode === 'reps' ? (
              <StepperField
                label={t('session.repsShort')}
                value={upcomingReps}
                step={1}
                min={0}
                onChange={(reps) => session.setUpcomingOverride({ reps })}
                testID="log-reps"
              />
            ) : null}
            <StepperField
              label={t('session.kgShort')}
              value={upcomingWeight}
              step={2.5}
              min={0}
              onChange={(weight) => session.setUpcomingOverride({ weight })}
              testID="log-weight"
            />
          </View>
        </Card>
      )}

      <BigCTA
        label={t('session.startNext')}
        variant={inOvertime ? 'glow' : 'primary'}
        onPress={session.next}
        testID="next-button"
      />
    </View>
  );
}

/** Resumo pós-conclusão (1.6). */
function SummaryView({
  navigation,
}: {
  navigation: Props['navigation'];
}) {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const state = session.state!;
  const [saving, setSaving] = useState(false);

  const startedAt = new Date(state.startedAt * 1000);
  const rel = relativeDay(startedAt.toISOString(), new Date());
  const when = rel ? t(rel.key, { count: rel.count }) : startedAt.toLocaleDateString(i18n.language);
  const time = startedAt.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  const duration = formatClock(engine.sessionElapsed(state, state.finishedAt ?? state.startedAt));
  const kg = tonnageKg(state.completedSets);
  const hasAdjusted = state.completedSets.some((s) => s.adjusted);

  const byExercise = useMemo(() => {
    const groups = new Map<number, LoggedSet[]>();
    state.completedSets.forEach((set) => {
      const list = groups.get(set.exerciseIndex) ?? [];
      list.push(set);
      groups.set(set.exerciseIndex, list);
    });
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [state.completedSets]);

  const handleConclude = () => {
    if (saving) return;
    setSaving(true);
    session.saveCompleted().then(() => navigation.popToTop());
  };

  return (
    <View style={styles.container} testID="session-summary">
      <View style={styles.summaryHeader}>
        <View style={styles.summaryCheck}>
          <Text style={{ fontFamily: fonts.heavy, fontSize: 26, color: colors.onAccent }}>✓</Text>
        </View>
        <Text style={styles.summaryTitle}>{t('session.summaryTitle')}</Text>
        <MonoLabel size={12} style={{ marginTop: 8 }}>
          {`${state.workout.name} · ${when}, ${time}`}
        </MonoLabel>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        <StatCard value={duration} label={t('session.duration')} />
        <StatCard value={String(state.completedSets.length)} label={t('session.setsLabel')} />
        <StatCard value={formatInt(kg, i18n.language)} label={t('session.kgTotal')} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: spacing.s }}>
        {byExercise.map(([exerciseIndex, sets]) => (
          <Card key={exerciseIndex} style={styles.summaryRow}>
            <Text style={styles.summaryExercise}>
              {state.workout.exercises[exerciseIndex]?.name ?? sets[0].exercise}
            </Text>
            <Text style={styles.summarySets}>
              {sets.map((set, i) => (
                <Text key={i} style={set.adjusted ? { color: colors.accent } : undefined}>
                  {(i > 0 ? '  ' : '') + setSummary(set)}
                </Text>
              ))}
            </Text>
          </Card>
        ))}
      </ScrollView>

      {hasAdjusted ? (
        <View style={{ alignItems: 'center', marginVertical: 12 }}>
          <MonoLabel size={11} tracking={1}>
            {t('session.adjustedNote')}
          </MonoLabel>
        </View>
      ) : (
        <View style={{ height: 12 }} />
      )}
      <BigCTA
        label={t('session.conclude')}
        height={68}
        variant={saving ? 'disabled' : 'primary'}
        onPress={handleConclude}
        testID="conclude-button"
      />
    </View>
  );
}

function loggedSummary(
  set: LoggedSet,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (set.durationSeconds !== undefined) return t('detail.seconds', { count: set.durationSeconds });
  return [
    set.reps !== undefined ? t('session.reps', { count: set.reps }) : null,
    set.weight !== undefined ? t('session.kg', { count: set.weight }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function setSummary(set: LoggedSet): string {
  if (set.durationSeconds !== undefined) return `${set.durationSeconds}s`;
  if (set.weight !== undefined) return `${set.reps ?? 0}·${set.weight}`;
  return String(set.reps ?? 0);
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
    marginBottom: 14,
  },
  exerciseName: {
    fontFamily: fonts.heavy,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1,
    color: colors.text,
    marginTop: 10,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 14,
    marginTop: 14,
  },
  setLabel: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  prescription: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 15,
    color: colors.textMid,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textDim,
    marginTop: 18,
    textAlign: 'center',
  },
  tapReady: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 15,
    color: colors.text,
    marginTop: 30,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.accentSoftBg,
    borderWidth: 1,
    borderColor: colors.accentSoftBorder,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  savedCheck: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMid,
  },
  overtimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningSoftBg,
    borderWidth: 1,
    borderColor: colors.warningSoftBorder,
    borderRadius: radii.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  overtimeDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.warning,
  },
  prospectiveCard: {
    padding: 18,
    marginBottom: 12,
  },
  prospectiveHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  prospectiveTitle: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 14,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  summaryHeader: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  summaryCheck: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  summaryTitle: {
    fontFamily: fonts.heavy,
    fontSize: 30,
    letterSpacing: -0.5,
    color: colors.text,
  },
  summaryRow: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryExercise: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    flexShrink: 1,
  },
  summarySets: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    color: colors.textMid,
  },
});
