import { Workout } from '../../domain/workout';
import { expandPhases } from '../phases';

const workout: Workout = {
  version: 1,
  name: 'Costas + core',
  exercises: [
    { name: 'Remada', mode: 'reps', sets: 2, reps: 12, restBetweenSets: 60, restAfterExercise: 120 },
    { name: 'Prancha', mode: 'time', sets: 2, duration: 30, restBetweenSets: 15 },
  ],
};

describe('expandPhases', () => {
  it('precede cada série com prepare, intercala rests, sem rest final (ADR 0006)', () => {
    expect(expandPhases(workout)).toEqual([
      { type: 'prepare', exerciseIndex: 0, setNumber: 1, mode: 'reps' },
      { type: 'work', exerciseIndex: 0, setNumber: 1, mode: 'reps' },
      { type: 'rest', exerciseIndex: 0, afterSetNumber: 1, duration: 60 },
      { type: 'prepare', exerciseIndex: 0, setNumber: 2, mode: 'reps' },
      { type: 'work', exerciseIndex: 0, setNumber: 2, mode: 'reps' },
      { type: 'rest', exerciseIndex: 0, afterSetNumber: 2, duration: 120 },
      { type: 'prepare', exerciseIndex: 1, setNumber: 1, mode: 'time' },
      { type: 'work', exerciseIndex: 1, setNumber: 1, mode: 'time', duration: 30 },
      { type: 'rest', exerciseIndex: 1, afterSetNumber: 1, duration: 15 },
      { type: 'prepare', exerciseIndex: 1, setNumber: 2, mode: 'time' },
      { type: 'work', exerciseIndex: 1, setNumber: 2, mode: 'time', duration: 30 },
    ]);
  });

  it('sem descanso: alterna prepare/work, sem fases rest', () => {
    const noRest: Workout = {
      version: 1,
      name: 'X',
      exercises: [{ name: 'A', mode: 'reps', sets: 3, reps: 15, restBetweenSets: 0 }],
    };
    const phases = expandPhases(noRest);
    expect(phases.every((p) => p.type === 'work' || p.type === 'prepare')).toBe(true);
    expect(phases).toHaveLength(6);
    expect(phases.filter((p) => p.type === 'work')).toHaveLength(3);
  });
});
