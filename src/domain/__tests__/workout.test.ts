import { parseWorkout } from '../workout';

const valid = {
  version: 1,
  name: 'Pernas A',
  exercises: [
    { name: 'Agachamento', mode: 'reps', sets: 3, reps: 10, weight: 60, restBetweenSets: 90 },
    { name: 'Prancha', mode: 'time', sets: 3, duration: 30, restBetweenSets: 15 },
  ],
};

describe('parseWorkout', () => {
  it('accepts a valid workout', () => {
    const result = parseWorkout(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.workout.exercises).toHaveLength(2);
  });

  it('rejects non-objects with a root error', () => {
    expect(parseWorkout('nope')).toEqual({
      ok: false,
      errors: [{ path: '', code: 'expectedObject' }],
    });
  });

  it('positions errors at the offending field', () => {
    const broken = {
      ...valid,
      exercises: [valid.exercises[0], { name: 'Prancha', mode: 'time', sets: 'três', duration: 30 }],
    };
    const result = parseWorkout(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([{ path: 'exercises[1].sets', code: 'expectedNumber' }]);
    }
  });

  it('requires reps for reps mode and duration for time mode', () => {
    const broken = {
      version: 1,
      name: 'X',
      exercises: [
        { name: 'A', mode: 'reps', sets: 3 },
        { name: 'B', mode: 'time', sets: 2 },
      ],
    };
    const result = parseWorkout(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ path: 'exercises[0].reps', code: 'required' });
      expect(result.errors).toContainEqual({ path: 'exercises[1].duration', code: 'required' });
    }
  });

  it('collects every error instead of stopping at the first', () => {
    const broken = { version: 2, name: '', exercises: [] };
    const result = parseWorkout(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ path: 'version', code: 'unsupportedVersion' });
      expect(result.errors).toContainEqual({ path: 'name', code: 'expectedString' });
      expect(result.errors).toContainEqual({ path: 'exercises', code: 'emptyExercises' });
    }
  });

  it('rejects negative and non-integer counts', () => {
    const broken = {
      version: 1,
      name: 'X',
      exercises: [{ name: 'A', mode: 'reps', sets: 2.5, reps: -1, weight: -3 }],
    };
    const result = parseWorkout(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ path: 'exercises[0].sets', code: 'expectedInteger' });
      expect(result.errors).toContainEqual({ path: 'exercises[0].reps', code: 'notPositive' });
      expect(result.errors).toContainEqual({ path: 'exercises[0].weight', code: 'negative' });
    }
  });
});
