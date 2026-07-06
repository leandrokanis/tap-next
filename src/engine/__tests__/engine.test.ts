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
    // Rest zeroes at 1130 but holds in overtime (RF-02b) — tick must not advance.
    s = engine.tick(s, 1140);
    expect(engine.currentPhase(s)?.type).toBe('rest');
    s = engine.next(s, 1140);
    s = engine.next(s, 1170);

    const record = engine.summarize(s, 1200, { id: 'abc', source: 'iphone' });
    expect(record).toEqual({
      id: 'abc',
      workoutName: 'Pernas A',
      startedAt: new Date(1000 * 1000).toISOString(),
      durationSeconds: 170,
      status: 'completed',
      source: 'iphone',
      plannedSets: 2,
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
    expect(record.plannedSets).toBe(2);
    expect(record.sets).toHaveLength(1);
  });
});

describe('rest overtime (RF-02b)', () => {
  it('holds the rest past its boundary and counts overtime', () => {
    let s = engine.start(workout, 0);
    s = engine.next(s, 30); // logs set 1, rest of 90s starts

    expect(engine.phaseOvertime(s, 50)).toBe(0);
    s = engine.tick(s, 200); // 80s past the boundary
    expect(engine.currentPhase(s)?.type).toBe('rest');
    expect(engine.phaseRemaining(s, 200)).toBe(0);
    expect(engine.phaseOvertime(s, 200)).toBe(80);

    s = engine.next(s, 200);
    expect(engine.currentPhase(s)?.type).toBe('work');
    expect(engine.phaseOvertime(s, 200)).toBeNull();
  });

  it('returns null overtime outside rest phases', () => {
    const s = engine.start(workout, 0);
    expect(engine.phaseOvertime(s, 10)).toBeNull();
  });
});

describe('prospective override (RF-06)', () => {
  it('applies the override to the NEXT logged set and flags it adjusted', () => {
    let s = engine.start(workout, 0);
    s = engine.next(s, 30); // set 1 logged with prescription
    s = engine.setUpcomingOverride(s, { reps: 8 });
    s = engine.setUpcomingOverride(s, { weight: 65 }); // merges
    expect(s.completedSets[0]).toMatchObject({ setIndex: 1, reps: 10, weight: 60 });
    expect(s.completedSets[0].adjusted).toBeUndefined();

    s = engine.next(s, 60); // start set 2
    s = engine.next(s, 90); // log set 2 with override
    expect(s.completedSets[1]).toMatchObject({
      setIndex: 2,
      reps: 8,
      weight: 65,
      adjusted: true,
    });
    expect(s.upcomingOverride).toBeNull(); // consumed
  });
});
