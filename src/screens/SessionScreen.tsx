import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import * as engine from '../engine/engine';
import { LoggedSet } from '../engine/engine';
import { Phase, PreparePhase, RestPhase, WorkPhase } from '../engine/phases';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../session/SessionProvider';
import {
  AppModal,
  BigCTA,
  Card,
  MonoLabel,
  NextUpBar,
  ProgressSegments,
  RoundIconButton,
  StatCard,
  TimerText,
} from '../ui/components';
import { formatClock, formatInt, relativeDay, tonnageKg } from '../ui/format';
import { ProgressRing } from '../ui/ProgressRing';
import { SetDots } from '../ui/SetDots';
import { colors, fonts, radii, spacing } from '../ui/theme';
import { WheelPicker } from '../ui/WheelPicker';

type Props = NativeStackScreenProps<RootStackParamList, 'Session'>;

/**
 * Sessão v2 (protótipo v2.1 / ADR 0006): anatomia de tela única — cabeçalho,
 * barra segmentada, rótulo do momento, nome do exercício, pontos de série,
 * palco central (única zona que muda), barra A SEGUIR e botão principal.
 */
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
  const exercise = state.workout.exercises[phase.exerciseIndex];
  const totalSets = state.phases.filter((p) => p.type === 'work').length;
  const doneSets = state.completedSets.length;
  const doneForExercise = state.completedSets.filter(
    (s) => s.exerciseIndex === phase.exerciseIndex,
  ).length;
  const currentSetNumber = phase.type === 'rest' ? phase.afterSetNumber + 1 : phase.setNumber;
  const overtime = engine.phaseOvertime(state, now);

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

      <View style={{ marginBottom: 22 }}>
        <ProgressSegments
          total={state.workout.exercises.length}
          done={phase.exerciseIndex + 1}
        />
      </View>

      <View style={styles.momentRow}>
        <MonoLabel tone="accent" size={12} weight="semibold" tracking={2} testID="moment-label">
          {t(momentKey(phase))}
        </MonoLabel>
        <MomentInfo phase={phase} overtime={overtime} />
      </View>

      <Text style={styles.exerciseName} testID="exercise-name">
        {exercise.name}
      </Text>
      <View style={styles.dotsRow}>
        <SetDots
          total={exercise.sets}
          done={doneForExercise}
          current={currentSetNumber}
          testID="set-dots"
        />
        <View style={styles.dotsDivider} />
        <Text style={styles.prescription} testID="prescription">
          {prescriptionText(state, phase, t)}
        </Text>
      </View>

      {phase.type === 'prepare' ? (
        <PrepareStage phase={phase} />
      ) : phase.type === 'work' ? (
        <WorkStage phase={phase} />
      ) : (
        <RestStage phase={phase} />
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

function momentKey(phase: Phase): string {
  if (phase.type === 'prepare') return 'session.preparation';
  if (phase.type === 'work') return 'session.execution';
  return 'session.rest';
}

/** Info à direita do rótulo do momento: overtime âmbar, dica ou vazio. */
function MomentInfo({ phase, overtime }: { phase: Phase; overtime: number | null }) {
  const { t } = useTranslation();
  if (phase.type === 'prepare') {
    if (overtime !== null && overtime > 0) {
      return (
        <MonoLabel tone="warning" size={14} weight="semibold" testID="overtime-label">
          {`+${formatClock(overtime)}`}
        </MonoLabel>
      );
    }
    return <MonoLabel size={12}>{t('session.whenReady')}</MonoLabel>;
  }
  if (phase.type === 'rest') {
    return <MonoLabel size={12}>{t('session.restZeroOpens')}</MonoLabel>;
  }
  return <View />;
}

/** Prescrição vigente ao lado dos pontos (RF-01), override incluído. */
function prescriptionText(
  state: engine.EngineState,
  phase: Phase,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const exercise = state.workout.exercises[phase.exerciseIndex];
  const override = state.upcomingOverride;
  if (exercise.mode === 'time') {
    return t('session.isoPrescription', {
      count: override?.duration ?? exercise.duration ?? 0,
    });
  }
  const reps = override?.reps ?? exercise.reps ?? 0;
  const weight = override?.weight ?? exercise.weight;
  return [
    t('session.reps', { count: reps }),
    weight !== undefined ? t('session.kg', { count: weight }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

const REPS_VALUES = Array.from({ length: 50 }, (_, i) => i + 1);
const KG_VALUES = Array.from({ length: 121 }, (_, i) => i * 2.5);
const SEC_VALUES = Array.from({ length: 120 }, (_, i) => (i + 1) * 5);

const nearest = (values: number[], v: number) =>
  values.reduce((best, cur) => (Math.abs(cur - v) < Math.abs(best - v) ? cur : best), values[0]);

/** Preparação (RF-19): rodas de ajuste + INICIAR. */
function PrepareStage({ phase }: { phase: PreparePhase }) {
  const { t } = useTranslation();
  const session = useSession();
  const state = session.state!;

  const exercise = state.workout.exercises[phase.exerciseIndex];
  const override = state.upcomingOverride;

  return (
    <View style={{ flex: 1 }} testID="prepare-phase">
      <View style={styles.wheelsRow}>
        {phase.mode === 'reps' ? (
          <>
            <WheelPicker
              label={t('session.repsShort')}
              values={REPS_VALUES}
              value={nearest(REPS_VALUES, override?.reps ?? exercise.reps ?? 10)}
              onChange={(reps) => session.setUpcomingOverride({ reps })}
              testID="prepare-reps"
            />
            <View style={styles.wheelsDivider} />
            <WheelPicker
              label={t('session.kgShort')}
              values={KG_VALUES}
              value={nearest(KG_VALUES, override?.weight ?? exercise.weight ?? 0)}
              onChange={(weight) => session.setUpcomingOverride({ weight })}
              format={(v) => String(v % 1 === 0 ? v : v.toFixed(1))}
              testID="prepare-weight"
            />
          </>
        ) : (
          <>
            <WheelPicker
              label={t('session.secShort')}
              values={SEC_VALUES}
              value={nearest(SEC_VALUES, override?.duration ?? exercise.duration ?? 30)}
              onChange={(duration) => session.setUpcomingOverride({ duration })}
              testID="prepare-duration"
            />
            {exercise.weight !== undefined ? (
              <>
                <View style={styles.wheelsDivider} />
                <WheelPicker
                  label={t('session.kgShort')}
                  values={KG_VALUES}
                  value={nearest(KG_VALUES, override?.weight ?? exercise.weight)}
                  onChange={(weight) => session.setUpcomingOverride({ weight })}
                  format={(v) => String(v % 1 === 0 ? v : v.toFixed(1))}
                  testID="prepare-weight"
                />
              </>
            ) : null}
          </>
        )}
      </View>
      <Text style={styles.hintCenter}>{t('session.adjustHint')}</Text>
      <View style={{ marginBottom: 12 }}>
        <UpNextBar />
      </View>
      <BigCTA label={t('session.start')} onPress={session.next} testID="prepare-start" />
    </View>
  );
}

/** Execução — reps (cronômetro progressivo) ou tempo (anel + 3-2-1). */
function WorkStage({ phase }: { phase: WorkPhase }) {
  const { t } = useTranslation();
  const session = useSession();
  const state = session.state!;
  const now = session.now;

  const elapsed = engine.phaseElapsed(state, now);
  const remaining = engine.phaseRemaining(state, now);
  const countdown = engine.countdownRemaining(state, now) ?? 0;
  const isTimed = phase.mode === 'time';
  const duration =
    (state.upcomingOverride?.duration ?? phase.duration) || 1;

  return (
    <View style={{ flex: 1 }} testID="work-phase">
      {isTimed ? (
        <View style={styles.center}>
          {countdown > 0 ? (
            <View style={{ alignItems: 'center' }} testID="entry-countdown">
              <TimerText size="xl" tone="accent">
                {String(Math.ceil(countdown))}
              </TimerText>
              <MonoLabel tracking={3} style={{ marginTop: 8 }}>
                {t('session.getReady')}
              </MonoLabel>
            </View>
          ) : (
            <ProgressRing progress={(remaining ?? 0) / duration}>
              <View style={{ alignItems: 'center' }}>
                <TimerText size="m" testID="phase-clock">
                  {formatClock(remaining ?? 0)}
                </TimerText>
                <MonoLabel style={{ marginTop: 8 }}>{t('session.hold')}</MonoLabel>
              </View>
            </ProgressRing>
          )}
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
        <UpNextBar />
      </View>
      {isTimed ? (
        <BigCTA
          label={t('session.endEarly')}
          variant="secondary"
          height={64}
          onPress={session.next}
          testID="end-early"
        />
      ) : (
        <BigCTA label={t('session.next')} onPress={session.next} testID="next-button" />
      )}
    </View>
  );
}

/** Descanso (RF-02b): anel regressivo, sem edição; abre a Preparação sozinho. */
function RestStage({ phase }: { phase: RestPhase }) {
  const { t } = useTranslation();
  const session = useSession();
  const state = session.state!;
  const now = session.now;

  const remaining = engine.phaseRemaining(state, now) ?? 0;
  const lastSet = state.completedSets[state.completedSets.length - 1];

  return (
    <View style={{ flex: 1 }} testID="rest-phase">
      <View style={styles.center}>
        <ProgressRing progress={remaining / (phase.duration || 1)}>
          <View style={{ alignItems: 'center' }}>
            <TimerText size="m" tone="accent" testID="phase-clock">
              {formatClock(remaining)}
            </TimerText>
            <MonoLabel size={11} tracking={2} style={{ marginTop: 8 }}>
              {t('session.restOf', { time: formatClock(phase.duration) })}
            </MonoLabel>
          </View>
        </ProgressRing>
      </View>

      {lastSet ? (
        <View style={styles.savedChip} testID="set-log">
          <View style={styles.savedCheck}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.onAccent }}>✓</Text>
          </View>
          <Text style={styles.savedText}>
            {t('session.setSaved', { set: lastSet.setIndex })}
          </Text>
          <Text style={styles.savedValue}>{loggedSummary(lastSet, t)}</Text>
        </View>
      ) : null}

      <View style={{ marginBottom: 12 }}>
        <AfterBar />
      </View>
      <BigCTA label={t('session.startNext')} onPress={session.next} testID="skip-rest" />
    </View>
  );
}

/**
 * Barra A SEGUIR (prepare/work): o que vem depois da série atual —
 * descanso e a próxima série, ou o resumo.
 */
function UpNextBar() {
  const { t } = useTranslation();
  const { state } = useSession();
  const phase = engine.currentPhase(state!)!;
  // From prepare, the phase after the upcoming work; from work, the next phase.
  const lookahead = phase.type === 'prepare' ? 2 : 1;
  const following = state!.phases[state!.phaseIndex + lookahead];

  if (!following) {
    return <NextUpBar label={t('session.nextUpLabel')} title={t('session.summaryTitle')} />;
  }
  if (following.type === 'rest') {
    const afterRest = state!.phases[state!.phaseIndex + lookahead + 1];
    const detail =
      afterRest && afterRest.type !== 'rest'
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
      detail={t('session.toSet', {
        set: following.setNumber,
        total: nextExercise.sets,
      })}
    />
  );
}

/** Barra DEPOIS no descanso: antecipação de dois passos (próximo exercício). */
function AfterBar() {
  const { t } = useTranslation();
  const { state } = useSession();
  const phases = state!.phases;
  const index = state!.phaseIndex;
  // The work right after this rest belongs to the same exercise; DEPOIS
  // announces the first work of a DIFFERENT exercise (or the summary).
  const nextWork = phases
    .slice(index + 1)
    .find((p): p is WorkPhase => p.type === 'work');
  const afterWork = nextWork
    ? phases
        .slice(index + 1)
        .find(
          (p): p is WorkPhase => p.type === 'work' && p.exerciseIndex !== nextWork.exerciseIndex,
        )
    : undefined;

  if (!afterWork) {
    return <NextUpBar label={t('session.after')} title={t('session.summaryTitle')} />;
  }
  const exercise = state!.workout.exercises[afterWork.exerciseIndex];
  const detail =
    exercise.mode === 'time'
      ? t('session.isoPrescription', { count: exercise.duration ?? 0 })
      : [
          `${exercise.sets} × ${exercise.reps ?? 0}`,
          exercise.weight !== undefined ? t('session.kg', { count: exercise.weight }) : null,
        ]
          .filter(Boolean)
          .join(' · ');
  return <NextUpBar label={t('session.after')} title={exercise.name} detail={detail} />;
}

/** Resumo pós-conclusão (RF-20). */
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
  momentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 16,
    minHeight: 22,
  },
  exerciseName: {
    fontFamily: fonts.heavy,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1,
    color: colors.text,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    marginBottom: 8,
  },
  dotsDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  prescription: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 14,
    color: colors.textMid,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  wheelsDivider: {
    width: 1,
    height: 140,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  hint: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textDim,
    marginTop: 18,
    textAlign: 'center',
  },
  hintCenter: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textDim,
    textAlign: 'center',
    marginBottom: 14,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radii.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  savedCheck: {
    width: 18,
    height: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedText: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  savedValue: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    color: colors.textDim,
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
