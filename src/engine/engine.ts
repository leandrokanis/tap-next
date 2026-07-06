import { SessionRecord, SessionSetRecord, SessionSource } from '../domain/session';
import { Workout } from '../domain/workout';
import { expandPhases, Phase, WorkPhase } from './phases';

export type EngineStatus = 'running' | 'paused' | 'finished';

export interface LoggedSet extends SessionSetRecord {
  exerciseIndex: number;
}

/** Ajuste prospectivo pendente para o próximo set (RF-06). */
export interface UpcomingOverride {
  reps?: number;
  weight?: number;
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
   * `now - phaseStartedAt` is always the active elapsed time. */
  phaseStartedAt: number;
  pausedAt: number | null;
  /** Total seconds spent paused across the session. */
  pausedSeconds: number;
  /** Active seconds spent in completed leadin count-ins — preparation time,
   * excluded from sessionElapsed like pauses (RF-17, ADR 0006). */
  leadinSeconds: number;
  /** Set when the session ends; freezes the session clock. */
  finishedAt: number | null;
  completedSets: LoggedSet[];
  /** Prospective adjustment applied (and cleared) when the next work set
   * is logged. Set during rest via steppers / Digital Crown (RF-06). */
  upcomingOverride: UpcomingOverride | null;
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
    leadinSeconds: 0,
    finishedAt: null,
    completedSets: [],
    upcomingOverride: null,
  };
}

export function currentPhase(state: EngineState): Phase | null {
  return state.phases[state.phaseIndex] ?? null;
}

/** Active seconds elapsed in the current phase. */
export function phaseElapsed(state: EngineState, at: number): number {
  if (state.status === 'finished') return 0;
  const reference = state.status === 'paused' ? state.pausedAt! : at;
  return Math.max(0, reference - state.phaseStartedAt);
}

/** Seconds left in a timed phase; null for untimed (reps) phases. */
export function phaseRemaining(state: EngineState, at: number): number | null {
  const phase = currentPhase(state);
  const duration = phase?.duration;
  if (duration === undefined) return null;
  return Math.max(0, duration - phaseElapsed(state, at));
}

/**
 * Seconds past a rest's prescribed duration (RF-02b). 0 while the rest is
 * still counting down; null outside a rest phase.
 */
export function phaseOvertime(state: EngineState, at: number): number | null {
  const phase = currentPhase(state);
  if (phase?.type !== 'rest') return null;
  return Math.max(0, phaseElapsed(state, at) - phase.duration);
}

/**
 * Active session duration (pauses and leadin count-ins excluded, frozen
 * once finished). The session clock holds still during a count-in — the
 * preparation is not training time (RF-17).
 */
export function sessionElapsed(state: EngineState, at: number): number {
  const reference =
    state.status === 'finished' ? state.finishedAt! : state.status === 'paused' ? state.pausedAt! : at;
  const base = reference - state.startedAt - state.pausedSeconds - state.leadinSeconds;
  return Math.max(0, base - liveLeadinSeconds(state, at));
}

/** Active time in an in-flight leadin, so the exclusion applies live. */
function liveLeadinSeconds(state: EngineState, at: number): number {
  if (currentPhase(state)?.type !== 'leadin') return 0;
  if (state.status === 'finished') {
    return Math.max(0, state.finishedAt! - state.phaseStartedAt);
  }
  return phaseElapsed(state, at);
}

/**
 * Manual advance — the big Next button. Completes a reps set, ends a timed
 * work phase early (logging actual seconds held) or starts the next work
 * from a rest (running or in overtime).
 */
export function next(state: EngineState, at: number): EngineState {
  if (state.status !== 'running') return state;
  return advance(state, at, at);
}

/**
 * Clock tick. Auto-advances timed WORK phases (isometrics) whose duration
 * elapsed, cascading across consecutive timed works using exact boundary
 * times so long ticks (app woken after backgrounding) don't drift.
 *
 * Rests never auto-advance (RF-02b): past their boundary they stay put,
 * counting overtime, until an explicit `next`.
 */
export function tick(state: EngineState, at: number): EngineState {
  let s = state;
  while (s.status === 'running') {
    const phase = currentPhase(s);
    if (!phase || phase.type === 'rest') break;
    const duration = phase.duration;
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
  };
}

/** End the session now ("Salvar e sair"). Does not log the in-flight set. */
export function finish(state: EngineState, at: number): EngineState {
  if (state.status === 'finished') return state;
  const s = state.status === 'paused' ? resume(state, at) : state;
  return { ...s, status: 'finished', finishedAt: at };
}

/**
 * Prospective adjustment (RF-06): merge reps/weight into the pending
 * override for the UPCOMING work set. Applied and cleared when that set is
 * logged; sets logged with an override are flagged `adjusted`.
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
 * phase's start. Logging a work set consumes any pending override.
 */
function advance(state: EngineState, at: number, completedAt: number): EngineState {
  const phase = currentPhase(state);
  if (!phase) return state;

  const logsWork = phase.type === 'work';
  const completedSets = logsWork
    ? [...state.completedSets, logFor(state, phase, at)]
    : state.completedSets;
  const leadinSeconds =
    phase.type === 'leadin'
      ? state.leadinSeconds + Math.max(0, completedAt - state.phaseStartedAt)
      : state.leadinSeconds;

  const phaseIndex = state.phaseIndex + 1;
  const finished = phaseIndex >= state.phases.length;
  return {
    ...state,
    phaseIndex,
    leadinSeconds,
    phaseStartedAt: completedAt,
    status: finished ? 'finished' : state.status,
    finishedAt: finished ? completedAt : state.finishedAt,
    completedSets,
    upcomingOverride: logsWork ? null : state.upcomingOverride,
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
    const held = Math.min(phaseElapsed(state, at), phase.duration ?? 0);
    logged.durationSeconds = Math.round(held);
  }
  const weight = override?.weight ?? exercise.weight;
  if (weight !== undefined) logged.weight = weight;
  if (override && (override.reps !== undefined || override.weight !== undefined)) {
    logged.adjusted = true;
  }
  return logged;
}
