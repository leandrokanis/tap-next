import { Workout } from '../../domain/workout';
import * as engine from '../engine';

const workout: Workout = {
  version: 1,
  name: 'Pernas A',
  exercises: [
    { name: 'Agachamento', mode: 'reps', sets: 2, reps: 10, weight: 60, restBetweenSets: 90 },
  ],
};

describe('summarize', () => {
  it('produces a completed SessionRecord with logged sets', () => {
    let s = engine.start(workout, 1000);
    s = engine.next(s, 1040);
    s = engine.tick(s, 1130);
    s = engine.next(s, 1170);

    const record = engine.summarize(s, 1200, { id: 'abc', source: 'iphone' });
    expect(record).toEqual({
      id: 'abc',
      workoutName: 'Pernas A',
      startedAt: new Date(1000 * 1000).toISOString(),
      durationSeconds: 170,
      status: 'completed',
      source: 'iphone',
      sets: [
        { exercise: 'Agachamento', setIndex: 1, reps: 10, weight: 60 },
        { exercise: 'Agachamento', setIndex: 2, reps: 10, weight: 60 },
      ],
    });
  });

  it('marks user-finished sessions as partial and excludes paused time', () => {
    let s = engine.start(workout, 0);
    s = engine.next(s, 30);
    s = engine.pause(s, 40);
    s = engine.resume(s, 100);
    s = engine.finish(s, 120);

    const record = engine.summarize(s, 500, { id: 'x', source: 'watch' });
    expect(record.status).toBe('partial');
    expect(record.durationSeconds).toBe(60);
    expect(record.source).toBe('watch');
    expect(record.sets).toHaveLength(1);
  });
});
