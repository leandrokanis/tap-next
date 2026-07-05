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
  it('interleaves rests between sets, adds restAfterExercise, no trailing rest', () => {
    expect(expandPhases(workout)).toEqual([
      { type: 'work', exerciseIndex: 0, setNumber: 1, mode: 'reps' },
      { type: 'rest', exerciseIndex: 0, afterSetNumber: 1, duration: 60 },
      { type: 'work', exerciseIndex: 0, setNumber: 2, mode: 'reps' },
      { type: 'rest', exerciseIndex: 0, afterSetNumber: 2, duration: 120 },
      { type: 'work', exerciseIndex: 1, setNumber: 1, mode: 'time', duration: 30 },
      { type: 'rest', exerciseIndex: 1, afterSetNumber: 1, duration: 15 },
      { type: 'work', exerciseIndex: 1, setNumber: 2, mode: 'time', duration: 30 },
    ]);
  });

  it('omits rest phases when restBetweenSets is absent or zero', () => {
    const noRest: Workout = {
      version: 1,
      name: 'X',
      exercises: [{ name: 'A', mode: 'reps', sets: 3, reps: 15, restBetweenSets: 0 }],
    };
    expect(expandPhases(noRest).every((p) => p.type === 'work')).toBe(true);
    expect(expandPhases(noRest)).toHaveLength(3);
  });
});
