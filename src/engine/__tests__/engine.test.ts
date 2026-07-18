import { Workout } from '../../domain/workout';
import * as engine from '../engine';

const workout: Workout = {
  version: 1,
  name: 'Pernas A',
  exercises: [
    { name: 'Agachamento', mode: 'reps', sets: 2, reps: 10, weight: 60, restBetweenSets: 90 },
  ],
};

const timed: Workout = {
  version: 1,
  name: 'Core',
  exercises: [{ name: 'Prancha', mode: 'time', sets: 2, duration: 30, restBetweenSets: 15 }],
};

describe('summarize', () => {
  it('produces a completed SessionRecord with logged sets', () => {
    let s = engine.start(workout, 1000); // prepare set 1
    s = engine.next(s, 1000); // work 1
    s = engine.next(s, 1040); // rest (boundary 1130)
    s = engine.tick(s, 1140); // rest auto-opens prepare set 2 (ADR 0006)
    expect(engine.currentPhase(s)?.type).toBe('prepare');
    s = engine.next(s, 1140); // work 2
    s = engine.next(s, 1170); // finished

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
    s = engine.next(s, 0); // work 1
    s = engine.next(s, 30); // rest
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

  it('finishing during prepare does not log an in-flight set', () => {
    let s = engine.start(workout, 0); // prepare set 1
    s = engine.finish(s, 10);
    expect(s.completedSets).toHaveLength(0);
    expect(engine.summarize(s, 10, { id: 'p', source: 'iphone' }).status).toBe('partial');
  });
});

describe('prepare & overtime (RF-19, ADR 0006)', () => {
  it('rest auto-opens prepare at its boundary and overtime counts from there', () => {
    let s = engine.start(workout, 0);
    s = engine.next(s, 0); // work 1
    s = engine.next(s, 30); // rest, boundary 120

    expect(engine.phaseOvertime(s, 50)).toBe(0);
    s = engine.tick(s, 200); // 80s past the boundary
    expect(engine.currentPhase(s)?.type).toBe('prepare');
    expect(engine.phaseOvertime(s, 200)).toBe(80);

    s = engine.next(s, 200); // work 2
    expect(engine.currentPhase(s)?.type).toBe('work');
    expect(engine.phaseOvertime(s, 200)).toBeNull();
  });

  it('pause during prepare freezes overtime; resume shifts the deadline', () => {
    let s = engine.start(workout, 0);
    s = engine.next(s, 0);
    s = engine.next(s, 30); // rest, boundary 120
    s = engine.tick(s, 120); // prepare set 2
    s = engine.pause(s, 130);
    expect(engine.phaseOvertime(s, 500)).toBe(10);
    s = engine.resume(s, 170); // paused 40s → deadline 160
    expect(engine.phaseOvertime(s, 175)).toBe(15);
  });

  it('prepare without a preceding rest has null overtime', () => {
    const s = engine.start(workout, 0);
    expect(engine.phaseOvertime(s, 10)).toBeNull();
  });
});

describe('entry countdown (RF-17)', () => {
  it('pausing during the countdown resumes it where it stopped', () => {
    let s = engine.start(timed, 0); // prepare
    s = engine.next(s, 0); // work starts at 3
    expect(engine.countdownRemaining(s, 1)).toBe(2);
    s = engine.pause(s, 1);
    s = engine.resume(s, 11); // paused 10s → work starts at 13
    expect(engine.countdownRemaining(s, 11)).toBe(2);
    expect(engine.phaseRemaining(s, 13)).toBe(30);
  });

  it('reps sets have no countdown', () => {
    let s = engine.start(workout, 0);
    s = engine.next(s, 5);
    expect(engine.countdownRemaining(s, 5)).toBe(0);
  });
});

describe('prospective override (RF-06)', () => {
  it('applies the override set in prepare to that very set — including the first', () => {
    let s = engine.start(workout, 0); // prepare set 1
    s = engine.setUpcomingOverride(s, { reps: 8 });
    s = engine.setUpcomingOverride(s, { weight: 65 }); // merges
    s = engine.next(s, 0); // work 1
    s = engine.next(s, 30); // logs set 1 with override
    expect(s.completedSets[0]).toMatchObject({
      setIndex: 1,
      reps: 8,
      weight: 65,
      adjusted: true,
    });
    expect(s.upcomingOverride).toBeNull(); // consumed
  });

  it('duration override changes the effective length of a timed set', () => {
    let s = engine.start(timed, 0);
    s = engine.setUpcomingOverride(s, { duration: 45 });
    s = engine.next(s, 0); // work starts at 3, boundary 48
    s = engine.tick(s, 40);
    expect(engine.currentPhase(s)?.type).toBe('work');
    expect(engine.phaseRemaining(s, 40)).toBe(8);
    s = engine.tick(s, 48);
    expect(s.completedSets[0]).toMatchObject({ durationSeconds: 45, adjusted: true });
  });
});

describe('snapshot round-trip', () => {
  it('EngineState survives JSON round-trip with the v2 fields', () => {
    let s = engine.start(workout, 0);
    s = engine.next(s, 0);
    s = engine.next(s, 30); // rest
    s = engine.tick(s, 120); // prepare with restDeadline
    const revived = JSON.parse(JSON.stringify(s)) as engine.EngineState;
    expect(revived).toEqual(s);
    expect(engine.phaseOvertime(revived, 135)).toBe(15);
  });
});
