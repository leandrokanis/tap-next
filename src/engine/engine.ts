import { SessionRecord, SessionSetRecord, SessionSource } from '../domain/session';
import { Workout } from '../domain/workout';
import { expandPhases, Phase, WorkPhase } from './phases';

export type EngineStatus = 'running' | 'paused' | 'finished';

/** Entry countdown before every timed set (RF-17): 3 → 2 → 1 → go. */
export const COUNTDOWN_SECONDS = 3;

export interface LoggedSet extends SessionSetRecord {
  exerciseIndex: number;
}

/** Ajuste prospectivo pendente para o próximo set (RF-06). */
export interface UpcomingOverride {
  reps?: number;
  weight?: number;
  /** Seconds; overrides the duration of the upcoming timed set. */
  duration?: number;
}

/**
 * Immutable session state. All timestamps are epoch seconds; callers pass
 * "now" into every transition, which keeps the engine pure and lets the
 * shared fixtures (fixtures/engine/) simulate any clock.
 *
 * Mirrors SessionEngine.swift — behavior changes require a fixture change
 * and an equivalent change on the Swift side, in the same PR.
 */
export interface EngineState {
  workout: Workout;
  phases: Phase[];
  /** phases.length means every phase was completed. */
  phaseIndex: number;
  status: EngineStatus;
  startedAt: number;
  /** Start of the current phase, shifted forward on resume so that
   * `now - phaseStartedAt` is always the active elapsed time. For timed
   * works this already includes the entry countdown (start is 3 s in the
   * future when the phase is entered). */
  phaseStartedAt: number;
  pausedAt: number | null;
  /** Total seconds spent paused across the session. */
  pausedSeconds: number;
  /** Set when the session ends; freezes the session clock. */
  finishedAt: number | null;
  completedSets: LoggedSet[];
  /** Prospective adjustment applied (and cleared) when the next work set
   * is logged. Set during prepare via wheel pickers / Digital Crown (RF-06). */
  upcomingOverride: UpcomingOverride | null;
  /**
   * Original end of the rest that preceded the current prepare phase
   * (ADR 0006). Kept even when the rest was cut short, so overtime only
   * starts once the prescribed rest has fully elapsed. Shifted on resume
   * like phaseStartedAt. Null when the prepare has no preceding rest.
   */
  restDeadline: number | null;
}

export function start(workout: Workout, at: number): EngineState {
  return {
    workout,
    phases: expandPhases(workout),
    phaseIndex: 0,
    status: 'running',
    startedAt: at,
    phaseStartedAt: at,
    pausedAt: null,
    pausedSeconds: 0,
    finishedAt: null,
    completedSets: [],
    upcomingOverride: null,
    restDeadline: null,
  };
}

export function currentPhase(state: EngineState): Phase | null {
  return state.phases[state.phaseIndex] ?? null;
}

/** Duration of a timed work phase with any prospective override applied. */
function effectiveWorkDuration(state: EngineState, phase: WorkPhase): number | undefined {
  if (phase.mode !== 'time') return undefined;
  return state.upcomingOverride?.duration ?? phase.duration;
}

/** Active seconds elapsed in the current phase. */
export function phaseElapsed(state: EngineState, at: number): number {
  if (state.status === 'finished') return 0;
  const reference = state.status === 'paused' ? state.pausedAt! : at;
  return Math.max(0, reference - state.phaseStartedAt);
}

/** Seconds left in a timed phase; null for untimed (reps/prepare) phases. */
export function phaseRemaining(state: EngineState, at: number): number | null {
  const phase = currentPhase(state);
  if (!phase) return null;
  const duration =
    phase.type === 'work' ? effectiveWorkDuration(state, phase) : phase.type === 'rest' ? phase.duration : undefined;
  if (duration === undefined) return null;
  return Math.max(0, duration - phaseElapsed(state, at));
}

/**
 * Seconds left in the 3-2-1 entry countdown of a timed set (RF-17);
 * 0 once the set is actually running, null outside work phases.
 */
export function countdownRemaining(state: EngineState, at: number): number | null {
  if (state.status === 'finished') return null;
  const phase = currentPhase(state);
  if (phase?.type !== 'work') return null;
  const reference = state.status === 'paused' ? state.pausedAt! : at;
  return Math.max(0, state.phaseStartedAt - reference);
}

/**
 * Overtime (RF-19 / ADR 0006): seconds past the original end of the rest
 * that preceded the current prepare phase. 0 while that deadline hasn't
 * passed (e.g. rest cut short); null when the prepare has no preceding
 * rest, and null outside prepare/rest phases. During a running rest it is
 * 0 by construction (rests auto-advance at their boundary).
 */
export function phaseOvertime(state: EngineState, at: number): number | null {
  if (state.status === 'finished') return null;
  const phase = currentPhase(state);
  if (phase?.type === 'rest') {
    return Math.max(0, phaseElapsed(state, at) - phase.duration);
  }
  if (phase?.type !== 'prepare' || state.restDeadline === null) return null;
  const reference = state.status === 'paused' ? state.pausedAt! : at;
  return Math.max(0, reference - state.restDeadline);
}

/** Active session duration (pauses excluded, frozen once finished). */
export function sessionElapsed(state: EngineState, at: number): number {
  const reference =
    state.status === 'finished' ? state.finishedAt! : state.status === 'paused' ? state.pausedAt! : at;
  return Math.max(0, reference - state.startedAt - state.pausedSeconds);
}

/**
 * Manual advance — the single explicit action. In prepare it starts the set
 * (Iniciar); in work it completes a reps set or ends a timed set early; in
 * rest it cuts the rest short, opening the next prepare (RF-04).
 */
export function next(state: EngineState, at: number): EngineState {
  if (state.status !== 'running') return state;
  return advance(state, at, at);
}

/**
 * Clock tick. Auto-advances timed WORK phases (isometrics) whose duration
 * elapsed AND rests at their boundary (into the next prepare — ADR 0006),
 * cascading with exact boundary times so long ticks (app woken after
 * backgrounding) don't drift. Prepare phases never auto-advance: no
 * exercise ever starts without an explicit `next`.
 */
export function tick(state: EngineState, at: number): EngineState {
  let s = state;
  while (s.status === 'running') {
    const phase = currentPhase(s);
    if (!phase || phase.type === 'prepare') break;
    const duration = phase.type === 'work' ? effectiveWorkDuration(s, phase) : phase.duration;
    if (duration === undefined) break;
    const boundary = s.phaseStartedAt + duration;
    if (at < boundary) break;
    s = advance(s, boundary, boundary);
  }
  return s;
}

export function pause(state: EngineState, at: number): EngineState {
  if (state.status !== 'running') return state;
  return { ...state, status: 'paused', pausedAt: at };
}

export function resume(state: EngineState, at: number): EngineState {
  if (state.status !== 'paused') return state;
  const pausedFor = Math.max(0, at - state.pausedAt!);
  return {
    ...state,
    status: 'running',
    pausedAt: null,
    pausedSeconds: state.pausedSeconds + pausedFor,
    phaseStartedAt: state.phaseStartedAt + pausedFor,
    restDeadline: state.restDeadline === null ? null : state.restDeadline + pausedFor,
  };
}

/** End the session now ("Salvar e sair"). Does not log the in-flight set. */
export function finish(state: EngineState, at: number): EngineState {
  if (state.status === 'finished') return state;
  const s = state.status === 'paused' ? resume(state, at) : state;
  return { ...s, status: 'finished', finishedAt: at };
}

/**
 * Prospective adjustment (RF-06): merge reps/weight/duration into the
 * pending override for the UPCOMING work set. Applied and cleared when that
 * set is logged; sets logged with an override are flagged `adjusted`.
 */
export function setUpcomingOverride(
  state: EngineState,
  patch: UpcomingOverride,
): EngineState {
  return {
    ...state,
    upcomingOverride: {
      ...state.upcomingOverride,
      ...(patch.reps !== undefined ? { reps: patch.reps } : {}),
      ...(patch.weight !== undefined ? { weight: patch.weight } : {}),
      ...(patch.duration !== undefined ? { duration: patch.duration } : {}),
    },
  };
}

export function completedAllPhases(state: EngineState): boolean {
  return state.phaseIndex >= state.phases.length;
}

export function summarize(
  state: EngineState,
  at: number,
  meta: { id: string; source: SessionSource },
): SessionRecord {
  return {
    id: meta.id,
    workoutName: state.workout.name,
    startedAt: new Date(state.startedAt * 1000).toISOString(),
    durationSeconds: Math.round(sessionElapsed(state, at)),
    status: completedAllPhases(state) ? 'completed' : 'partial',
    source: meta.source,
    plannedSets: state.phases.filter((p) => p.type === 'work').length,
    sets: state.completedSets.map(({ exerciseIndex: _exerciseIndex, ...record }) => record),
  };
}

/**
 * Move past the current phase. `completedAt` is when the phase actually
 * ended (its exact boundary for auto-advance), which becomes the next
 * phase's start — shifted by the entry countdown when a prepare opens a
 * timed set. Leaving a rest records its original deadline for overtime;
 * logging a work set consumes any pending override.
 */
function advance(state: EngineState, at: number, completedAt: number): EngineState {
  const phase = currentPhase(state);
  if (!phase) return state;

  const logsWork = phase.type === 'work';
  const completedSets = logsWork
    ? [...state.completedSets, logFor(state, phase, at)]
    : state.completedSets;

  const phaseIndex = state.phaseIndex + 1;
  const nextPhase = state.phases[phaseIndex];
  const entersTimedWork =
    phase.type === 'prepare' && nextPhase?.type === 'work' && nextPhase.mode === 'time';

  const finished = phaseIndex >= state.phases.length;
  return {
    ...state,
    phaseIndex,
    phaseStartedAt: entersTimedWork ? completedAt + COUNTDOWN_SECONDS : completedAt,
    status: finished ? 'finished' : state.status,
    finishedAt: finished ? completedAt : state.finishedAt,
    completedSets,
    upcomingOverride: logsWork ? null : state.upcomingOverride,
    restDeadline:
      phase.type === 'rest' ? state.phaseStartedAt + phase.duration : null,
  };
}

function logFor(state: EngineState, phase: WorkPhase, at: number): LoggedSet {
  const exercise = state.workout.exercises[phase.exerciseIndex];
  const override = state.upcomingOverride;
  const logged: LoggedSet = {
    exerciseIndex: phase.exerciseIndex,
    exercise: exercise.name,
    setIndex: phase.setNumber,
  };
  if (exercise.mode === 'reps') {
    logged.reps = override?.reps ?? exercise.reps;
  } else {
    const duration = effectiveWorkDuration(state, phase) ?? 0;
    const held = Math.min(phaseElapsed(state, at), duration);
    logged.durationSeconds = Math.round(held);
  }
  const weight = override?.weight ?? exercise.weight;
  if (weight !== undefined) logged.weight = weight;
  if (
    override &&
    (override.reps !== undefined || override.weight !== undefined || override.duration !== undefined)
  ) {
    logged.adjusted = true;
  }
  return logged;
}
