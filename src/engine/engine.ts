import { SessionRecord, SessionSetRecord, SessionSource } from '../domain/session';
import { Workout } from '../domain/workout';
import { expandPhases, Phase, WorkPhase } from './phases';

export type EngineStatus = 'running' | 'paused' | 'finished';

export interface LoggedSet extends SessionSetRecord {
  exerciseIndex: number;
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
  /** Set when the session ends; freezes the session clock. */
  finishedAt: number | null;
  completedSets: LoggedSet[];
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
  const duration = phase?.type === 'rest' ? phase.duration : phase?.duration;
  if (duration === undefined) return null;
  return Math.max(0, duration - phaseElapsed(state, at));
}

/** Active session duration (pauses excluded, frozen once finished). */
export function sessionElapsed(state: EngineState, at: number): number {
  const reference =
    state.status === 'finished' ? state.finishedAt! : state.status === 'paused' ? state.pausedAt! : at;
  return Math.max(0, reference - state.startedAt - state.pausedSeconds);
}

/**
 * Manual advance — the big Next button. Completes a reps set, ends a timed
 * work phase early (logging actual seconds held) or skips a rest.
 */
export function next(state: EngineState, at: number): EngineState {
  if (state.status !== 'running') return state;
  return advance(state, at, at);
}

/**
 * Clock tick. Auto-advances timed phases whose duration elapsed, cascading
 * across consecutive timed phases using exact boundary times so long ticks
 * (app woken after backgrounding) don't drift.
 */
export function tick(state: EngineState, at: number): EngineState {
  let s = state;
  while (s.status === 'running') {
    const phase = currentPhase(s);
    const duration = phase?.type === 'rest' ? phase.duration : phase?.duration;
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

/** Adjust a logged set during rest (steppers / Digital Crown). */
export function updateLoggedSet(
  state: EngineState,
  update: { exerciseIndex: number; setIndex: number; reps?: number; weight?: number },
): EngineState {
  const completedSets = state.completedSets.map((set) =>
    set.exerciseIndex === update.exerciseIndex && set.setIndex === update.setIndex
      ? {
          ...set,
          ...(update.reps !== undefined ? { reps: update.reps } : {}),
          ...(update.weight !== undefined ? { weight: update.weight } : {}),
        }
      : set,
  );
  return { ...state, completedSets };
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
    sets: state.completedSets.map(({ exerciseIndex: _exerciseIndex, ...record }) => record),
  };
}

/**
 * Move past the current phase. `completedAt` is when the phase actually
 * ended (its exact boundary for auto-advance), which becomes the next
 * phase's start.
 */
function advance(state: EngineState, at: number, completedAt: number): EngineState {
  const phase = currentPhase(state);
  if (!phase) return state;

  const completedSets =
    phase.type === 'work' ? [...state.completedSets, logFor(state, phase, at)] : state.completedSets;

  const phaseIndex = state.phaseIndex + 1;
  const finished = phaseIndex >= state.phases.length;
  return {
    ...state,
    phaseIndex,
    phaseStartedAt: completedAt,
    status: finished ? 'finished' : state.status,
    finishedAt: finished ? completedAt : state.finishedAt,
    completedSets,
  };
}

function logFor(state: EngineState, phase: WorkPhase, at: number): LoggedSet {
  const exercise = state.workout.exercises[phase.exerciseIndex];
  const logged: LoggedSet = {
    exerciseIndex: phase.exerciseIndex,
    exercise: exercise.name,
    setIndex: phase.setNumber,
  };
  if (exercise.mode === 'reps') {
    logged.reps = exercise.reps;
  } else {
    const held = Math.min(phaseElapsed(state, at), phase.duration ?? 0);
    logged.durationSeconds = Math.round(held);
  }
  if (exercise.weight !== undefined) logged.weight = exercise.weight;
  return logged;
}
