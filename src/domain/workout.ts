export type ExerciseMode = 'reps' | 'time';

export interface Exercise {
  name: string;
  mode: ExerciseMode;
  sets: number;
  /** Required when mode === 'reps'. */
  reps?: number;
  /** Seconds. Required when mode === 'time'. */
  duration?: number;
  /** Prescribed load in kg. */
  weight?: number;
  /** Seconds of rest between sets of this exercise. Absent or 0 = none. */
  restBetweenSets?: number;
  /** Seconds of rest after the last set, before the next exercise. */
  restAfterExercise?: number;
  notes?: string;
}

export interface Workout {
  version: 1;
  name: string;
  exercises: Exercise[];
}

export type ValidationCode =
  | 'required'
  | 'expectedObject'
  | 'expectedArray'
  | 'expectedString'
  | 'expectedNumber'
  | 'expectedInteger'
  | 'notPositive'
  | 'negative'
  | 'invalidMode'
  | 'unsupportedVersion'
  | 'emptyExercises';

export interface ValidationError {
  /** e.g. "exercises[2].sets" */
  path: string;
  code: ValidationCode;
}

export type ParseResult =
  | { ok: true; workout: Workout }
  | { ok: false; errors: ValidationError[] };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Validates an already-JSON.parsed value against workout schema v1.
 * Collects every error instead of stopping at the first one, so the
 * import screen can point at each offending field.
 */
export function parseWorkout(input: unknown): ParseResult {
  const errors: ValidationError[] = [];
  const err = (path: string, code: ValidationCode) => errors.push({ path, code });

  if (!isObject(input)) {
    return { ok: false, errors: [{ path: '', code: 'expectedObject' }] };
  }

  if (input.version === undefined) err('version', 'required');
  else if (input.version !== 1) err('version', 'unsupportedVersion');

  if (input.name === undefined) err('name', 'required');
  else if (typeof input.name !== 'string' || input.name.trim() === '') err('name', 'expectedString');

  if (input.exercises === undefined) err('exercises', 'required');
  else if (!Array.isArray(input.exercises)) err('exercises', 'expectedArray');
  else if (input.exercises.length === 0) err('exercises', 'emptyExercises');
  else {
    input.exercises.forEach((ex, i) => validateExercise(ex, `exercises[${i}]`, err));
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, workout: input as unknown as Workout };
}

function validateExercise(
  ex: unknown,
  path: string,
  err: (path: string, code: ValidationCode) => void,
): void {
  if (!isObject(ex)) {
    err(path, 'expectedObject');
    return;
  }

  if (ex.name === undefined) err(`${path}.name`, 'required');
  else if (typeof ex.name !== 'string' || ex.name.trim() === '') err(`${path}.name`, 'expectedString');

  const mode = ex.mode;
  if (mode === undefined) err(`${path}.mode`, 'required');
  else if (mode !== 'reps' && mode !== 'time') err(`${path}.mode`, 'invalidMode');

  checkCount(ex.sets, `${path}.sets`, true, err);
  if (mode === 'reps') checkCount(ex.reps, `${path}.reps`, true, err);
  if (mode === 'time') checkCount(ex.duration, `${path}.duration`, true, err);

  checkOptionalNonNegative(ex.weight, `${path}.weight`, false, err);
  checkOptionalNonNegative(ex.restBetweenSets, `${path}.restBetweenSets`, true, err);
  checkOptionalNonNegative(ex.restAfterExercise, `${path}.restAfterExercise`, true, err);

  if (ex.notes !== undefined && typeof ex.notes !== 'string') err(`${path}.notes`, 'expectedString');
}

/** Required positive integer (sets, reps, duration). */
function checkCount(
  v: unknown,
  path: string,
  integer: boolean,
  err: (path: string, code: ValidationCode) => void,
): void {
  if (v === undefined) return err(path, 'required');
  if (typeof v !== 'number' || Number.isNaN(v)) return err(path, 'expectedNumber');
  if (integer && !Number.isInteger(v)) return err(path, 'expectedInteger');
  if (v <= 0) return err(path, 'notPositive');
}

/** Optional number ≥ 0 (weight, rests). */
function checkOptionalNonNegative(
  v: unknown,
  path: string,
  integer: boolean,
  err: (path: string, code: ValidationCode) => void,
): void {
  if (v === undefined) return;
  if (typeof v !== 'number' || Number.isNaN(v)) return err(path, 'expectedNumber');
  if (integer && !Number.isInteger(v)) return err(path, 'expectedInteger');
  if (v < 0) return err(path, 'negative');
}
