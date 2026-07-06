import { parseSnapshot } from '../activeSession';
import * as engine from '../../engine/engine';
import { Workout } from '../../domain/workout';

const workout: Workout = {
  version: 1,
  name: 'Fisio core',
  exercises: [{ name: 'Prancha', mode: 'time', sets: 1, duration: 30 }],
};

describe('parseSnapshot', () => {
  it('round-trips a current EngineState losslessly', () => {
    const state = engine.start(workout, 1000);
    expect(parseSnapshot(JSON.stringify(state))).toEqual(state);
  });

  it('hydrates pre-leadin snapshots (no leadinSeconds) with 0', () => {
    const state = engine.start(workout, 1000);
    const legacy: Record<string, unknown> = { ...state };
    delete legacy.leadinSeconds;

    const parsed = parseSnapshot(JSON.stringify(legacy));
    expect(parsed).not.toBeNull();
    expect(parsed!.leadinSeconds).toBe(0);
    expect(engine.sessionElapsed(parsed!, 1010)).toBeGreaterThanOrEqual(0);
  });

  it('returns null for corrupt payloads', () => {
    expect(parseSnapshot('{nope')).toBeNull();
  });
});
