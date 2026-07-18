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

export interface JsonPosition {
  /** 1-based. */
  line: number;
  /** 1-based. */
  column: number;
}

/**
 * Locates a validation-error path (e.g. "exercises[1].sets") inside the raw
 * JSON text the user pasted, so the import screen can point at the exact
 * line/column (RF-13). Returns the position of the value at the path, the
 * position of the nearest enclosing container when the final segment is
 * missing, or null when the text isn't parseable JSON.
 */
export function locateJsonPath(text: string, path: string): JsonPosition | null {
  try {
    JSON.parse(text);
  } catch {
    return null;
  }
  const scanner = new JsonScanner(text, parsePathSegments(path));
  try {
    scanner.skipWhitespace();
    scanner.scanValue([]);
  } catch (found) {
    if (found instanceof FoundPosition) return found.position;
    return null;
  }
  return scanner.bestMatch;
}

type PathSegment = string | number;

function parsePathSegments(path: string): PathSegment[] {
  if (path === '') return [];
  const segments: PathSegment[] = [];
  for (const part of path.split('.')) {
    const match = part.match(/^([^[]*)((\[\d+\])*)$/);
    if (!match) return segments;
    if (match[1]) segments.push(match[1]);
    for (const idx of match[2].matchAll(/\[(\d+)\]/g)) segments.push(Number(idx[1]));
  }
  return segments;
}

/** Thrown to unwind the scan as soon as the target path is reached. */
class FoundPosition {
  constructor(public position: JsonPosition) {}
}

class JsonScanner {
  private index = 0;
  private line = 1;
  private column = 1;
  /** Deepest container position on the target path seen so far. */
  bestMatch: JsonPosition | null = null;

  constructor(
    private text: string,
    private target: PathSegment[],
  ) {}

  scanValue(path: PathSegment[]): void {
    if (this.onTargetPath(path) && path.length === this.target.length) {
      throw new FoundPosition(this.position());
    }
    if (this.onTargetPath(path)) this.bestMatch = this.position();
    const ch = this.peek();
    if (ch === '{') return this.scanObject(path);
    if (ch === '[') return this.scanArray(path);
    if (ch === '"') {
      this.scanString();
      return;
    }
    this.scanScalar();
  }

  private scanObject(path: PathSegment[]): void {
    this.consume('{');
    this.skipWhitespace();
    if (this.peek() === '}') return void this.consume('}');
    for (;;) {
      this.skipWhitespace();
      const key = this.scanString();
      this.skipWhitespace();
      this.consume(':');
      this.skipWhitespace();
      this.scanValue([...path, key]);
      this.skipWhitespace();
      if (this.peek() === ',') {
        this.consume(',');
        continue;
      }
      this.consume('}');
      return;
    }
  }

  private scanArray(path: PathSegment[]): void {
    this.consume('[');
    this.skipWhitespace();
    if (this.peek() === ']') return void this.consume(']');
    for (let i = 0; ; i++) {
      this.skipWhitespace();
      this.scanValue([...path, i]);
      this.skipWhitespace();
      if (this.peek() === ',') {
        this.consume(',');
        continue;
      }
      this.consume(']');
      return;
    }
  }

  private scanString(): string {
    this.consume('"');
    let out = '';
    while (this.index < this.text.length) {
      const ch = this.text[this.index];
      if (ch === '\\') {
        out += this.text[this.index + 1] ?? '';
        this.step();
        this.step();
        continue;
      }
      if (ch === '"') {
        this.step();
        return out;
      }
      out += ch;
      this.step();
    }
    throw new Error('unterminated string');
  }

  private scanScalar(): void {
    const start = this.index;
    while (this.index < this.text.length && !/[\s,\]}]/.test(this.text[this.index])) this.step();
    if (this.index === start) throw new Error('unexpected character');
  }

  private onTargetPath(path: PathSegment[]): boolean {
    if (path.length > this.target.length) return false;
    return path.every((segment, i) => segment === this.target[i]);
  }

  skipWhitespace(): void {
    while (this.index < this.text.length && /\s/.test(this.text[this.index])) this.step();
  }

  private consume(expected: string): void {
    if (this.text[this.index] !== expected) throw new Error(`expected ${expected}`);
    this.step();
  }

  private peek(): string {
    const ch = this.text[this.index];
    if (ch === undefined) throw new Error('unexpected end');
    return ch;
  }

  private step(): void {
    if (this.text[this.index] === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    this.index++;
  }

  private position(): JsonPosition {
    return { line: this.line, column: this.column };
  }
}

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
