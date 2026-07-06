import { Workout } from '../../domain/workout';
import * as engine from '../../engine/engine';
import { leadinCount, transitionEvent } from '../sessionEvents';

const mixed: Workout = {
  version: 1,
  name: 'Costas + core',
  exercises: [
    { name: 'Remada', mode: 'reps', sets: 2, reps: 12, restBetweenSets: 60 },
    { name: 'Prancha', mode: 'time', sets: 1, duration: 30 },
  ],
};

const timed: Workout = {
  version: 1,
  name: 'Fisio core',
  exercises: [{ name: 'Prancha', mode: 'time', sets: 2, duration: 30, restBetweenSets: 15 }],
};

describe('transitionEvent', () => {
  it('leadin → work emits go', () => {
    const prev = engine.start(timed, 0); // leadin
    const next = engine.tick(prev, 3); // work
    expect(transitionEvent(prev, next)).toBe('go');
  });

  it('timed work → rest emits isometryEnd, not restStart', () => {
    let s = engine.start(timed, 0);
    s = engine.tick(s, 3); // work
    const next = engine.tick(s, 33); // rest
    expect(transitionEvent(s, next)).toBe('isometryEnd');
  });

  it('timed work ended early by next still emits isometryEnd', () => {
    let s = engine.start(timed, 0);
    s = engine.tick(s, 3); // work
    const next = engine.next(s, 10); // rest, early
    expect(transitionEvent(s, next)).toBe('isometryEnd');
  });

  it('reps work → rest emits restStart', () => {
    const prev = engine.start(mixed, 0); // reps work
    const next = engine.next(prev, 30); // rest
    expect(transitionEvent(prev, next)).toBe('restStart');
  });

  it('rest → leadin emits nothing (the count-in ticks take over)', () => {
    let s = engine.start(timed, 0);
    s = engine.tick(s, 3); // work
    s = engine.tick(s, 33); // rest
    const next = engine.next(s, 48); // leadin set 2
    expect(engine.currentPhase(s)?.type).toBe('rest');
    expect(engine.currentPhase(next)?.type).toBe('leadin');
    expect(transitionEvent(s, next)).toBeNull();
  });

  it('reps work → next set without rest emits nothing (tap is the feedback)', () => {
    const noRest: Workout = {
      version: 1,
      name: 'X',
      exercises: [{ name: 'Remada', mode: 'reps', sets: 2, reps: 10, restBetweenSets: 0 }],
    };
    const prev = engine.start(noRest, 0);
    const next = engine.next(prev, 30); // straight to work set 2
    expect(engine.currentPhase(next)?.type).toBe('work');
    expect(transitionEvent(prev, next)).toBeNull();
  });

  it('completing the whole session emits sessionDone (overrides isometryEnd)', () => {
    let s = engine.start(timed, 0);
    s = engine.tick(s, 3);
    s = engine.tick(s, 33); // rest
    s = engine.next(s, 48); // leadin set 2
    s = engine.tick(s, 51); // work set 2
    const next = engine.tick(s, 81); // finished
    expect(next.status).toBe('finished');
    expect(transitionEvent(s, next)).toBe('sessionDone');
  });

  it('no phase change emits nothing', () => {
    const s = engine.start(timed, 0);
    expect(transitionEvent(s, engine.tick(s, 1))).toBeNull();
  });
});

describe('leadinCount', () => {
  it('counts 3 → 2 → 1 across the count-in', () => {
    const s = engine.start(timed, 0);
    expect(leadinCount(s, 0)).toBe(3);
    expect(leadinCount(s, 0.5)).toBe(3);
    expect(leadinCount(s, 1.2)).toBe(2);
    expect(leadinCount(s, 2.4)).toBe(1);
  });

  it('is null outside a leadin or when paused', () => {
    let s = engine.start(mixed, 0); // reps work
    expect(leadinCount(s, 1)).toBeNull();
    s = engine.start(timed, 0);
    s = engine.pause(s, 1);
    expect(leadinCount(s, 2)).toBeNull();
  });
});
