import { Workout } from '../domain/workout';

/** Count-in before every timed set (RF-17, ADR 0006). */
export const LEADIN_SECONDS = 3;

/**
 * Preparation count-in before a timed work set (3 → 2 → 1 → go). Auto-
 * advances into its work; logs nothing; excluded from sessionElapsed.
 */
export interface LeadinPhase {
  type: 'leadin';
  exerciseIndex: number;
  /** Set the count-in prepares for. 1-based. */
  setNumber: number;
  duration: number;
}

export interface WorkPhase {
  type: 'work';
  exerciseIndex: number;
  /** 1-based. */
  setNumber: number;
  mode: 'reps' | 'time';
  /** Seconds, present when mode === 'time'. */
  duration?: number;
}

export interface RestPhase {
  type: 'rest';
  /** Exercise the rest belongs to (the one just performed). */
  exerciseIndex: number;
  /** Set just completed, for "set X done" display during rest. */
  afterSetNumber: number;
  duration: number;
}

export type Phase = LeadinPhase | WorkPhase | RestPhase;

/**
 * Expands a workout into the flat phase sequence the engine walks through.
 * Mirrors PhaseExpansion.swift — behavior changes require a fixture change.
 *
 * Rules: restBetweenSets between sets of one exercise; restAfterExercise
 * after its last set when another exercise follows; no trailing rest; a
 * leadin count-in before EVERY timed work set (RF-17).
 */
export function expandPhases(workout: Workout): Phase[] {
  const phases: Phase[] = [];
  workout.exercises.forEach((ex, exerciseIndex) => {
    for (let setNumber = 1; setNumber <= ex.sets; setNumber++) {
      if (ex.mode === 'time') {
        phases.push({
          type: 'leadin',
          exerciseIndex,
          setNumber,
          duration: LEADIN_SECONDS,
        });
      }
      phases.push({
        type: 'work',
        exerciseIndex,
        setNumber,
        mode: ex.mode,
        ...(ex.mode === 'time' ? { duration: ex.duration } : {}),
      });
      const isLastSet = setNumber === ex.sets;
      if (!isLastSet && (ex.restBetweenSets ?? 0) > 0) {
        phases.push({
          type: 'rest',
          exerciseIndex,
          afterSetNumber: setNumber,
          duration: ex.restBetweenSets!,
        });
      }
    }
    const isLastExercise = exerciseIndex === workout.exercises.length - 1;
    if (!isLastExercise && (ex.restAfterExercise ?? 0) > 0) {
      phases.push({
        type: 'rest',
        exerciseIndex,
        afterSetNumber: ex.sets,
        duration: ex.restAfterExercise!,
      });
    }
  });
  return phases;
}
