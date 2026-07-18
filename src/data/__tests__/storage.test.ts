/**
 * Round-trip da camada de dados sobre localStorage (ADR 0007) — o browser é
 * a única persistência do app. jsdom não está no preset; um stub mínimo de
 * localStorage cobre o contrato usado por webStorage.ts.
 */

const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
};

import { Workout } from '../../domain/workout';
import * as engine from '../../engine/engine';
import { clearSnapshot, loadSnapshot, saveSnapshot } from '../activeSession';
import { insertSession, listSessions } from '../sessionRepository';
import { deleteWorkout, listWorkouts, saveWorkout } from '../workoutRepository';

const workout: Workout = {
  version: 1,
  name: 'Pernas A',
  exercises: [
    { name: 'Agachamento', mode: 'reps', sets: 2, reps: 10, weight: 60, restBetweenSets: 90 },
  ],
};

beforeEach(() => store.clear());

describe('workoutRepository (localStorage)', () => {
  it('um treino salvo sobrevive a um novo acesso ao storage', async () => {
    const stored = await saveWorkout(workout);
    const listed = await listWorkouts();
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(stored.id);
    expect(listed[0].workout).toEqual(workout);
  });

  it('deleteWorkout remove só o treino apontado', async () => {
    const a = await saveWorkout(workout);
    await saveWorkout({ ...workout, name: 'Push B' });
    await deleteWorkout(a.id);
    const listed = await listWorkouts();
    expect(listed).toHaveLength(1);
    expect(listed[0].workout.name).toBe('Push B');
  });
});

describe('sessionRepository (localStorage)', () => {
  it('insere idempotente e lista por data decrescente', async () => {
    const base = {
      workoutName: 'Pernas A',
      durationSeconds: 100,
      status: 'completed' as const,
      source: 'iphone' as const,
      sets: [],
    };
    await insertSession({ ...base, id: 'a', startedAt: '2026-07-01T10:00:00Z' });
    await insertSession({ ...base, id: 'b', startedAt: '2026-07-02T10:00:00Z' });
    await insertSession({ ...base, id: 'a', startedAt: '2026-07-01T10:00:00Z' }); // dupe
    const all = await listSessions();
    expect(all.map((s) => s.id)).toEqual(['b', 'a']);
  });
});

describe('activeSession snapshot (RF-08)', () => {
  it('snapshot v2 com prepare/restDeadline round-trips', async () => {
    let s = engine.start(workout, 0);
    s = engine.next(s, 0); // work 1
    s = engine.next(s, 30); // rest
    s = engine.tick(s, 120); // prepare com restDeadline
    await saveSnapshot(s);
    const revived = await loadSnapshot();
    expect(revived).toEqual(s);
    expect(engine.phaseOvertime(revived!, 135)).toBe(15);
  });

  it('snapshot de formato antigo é descartado', async () => {
    store.set('tapnext.activeSession', JSON.stringify({ workout, phaseIndex: 0 }));
    expect(await loadSnapshot()).toBeNull();
  });

  it('clearSnapshot apaga o pendente', async () => {
    await saveSnapshot(engine.start(workout, 0));
    await clearSnapshot();
    expect(await loadSnapshot()).toBeNull();
  });
});
