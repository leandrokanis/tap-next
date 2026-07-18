import { SessionRecord } from '../../domain/session';
import { buildExportBundle } from '../export';

const record: SessionRecord = {
  id: 's1',
  workoutName: 'Pernas A',
  startedAt: '2026-07-05T14:02:11.000Z',
  durationSeconds: 2880,
  status: 'partial',
  source: 'iphone',
  plannedSets: 6,
  sets: [
    { exercise: 'Agachamento', setIndex: 1, reps: 10, weight: 60 },
    { exercise: 'Agachamento', setIndex: 2, reps: 8, weight: 65, adjusted: true },
    { exercise: 'Prancha', setIndex: 1, durationSeconds: 30 },
  ],
};

describe('buildExportBundle', () => {
  it('wraps workouts and sessions with export metadata', () => {
    const workout = { version: 1 as const, name: 'X', exercises: [] };
    const bundle = buildExportBundle([workout], [record], new Date('2026-07-05T10:00:00Z'));
    expect(bundle).toEqual({
      app: 'tap-next',
      exportVersion: 1,
      exportedAt: '2026-07-05T10:00:00.000Z',
      workouts: [workout],
      sessions: [record],
    });
  });
});
