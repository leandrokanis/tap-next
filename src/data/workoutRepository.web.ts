import * as Crypto from 'expo-crypto';

import { Workout } from '../domain/workout';
import { readJson, writeJson } from './webStorage';
import type { StoredWorkout } from './workoutRepository';

export type { StoredWorkout };

const KEY = 'tapnext.workouts';

export async function saveWorkout(workout: Workout): Promise<StoredWorkout> {
  const stored: StoredWorkout = {
    id: Crypto.randomUUID(),
    workout,
    createdAt: new Date().toISOString(),
  };
  writeJson(KEY, [...readJson<StoredWorkout[]>(KEY, []), stored]);
  return stored;
}

export async function listWorkouts(): Promise<StoredWorkout[]> {
  return readJson<StoredWorkout[]>(KEY, []);
}

export async function getWorkout(id: string): Promise<StoredWorkout | null> {
  return readJson<StoredWorkout[]>(KEY, []).find((w) => w.id === id) ?? null;
}

export async function deleteWorkout(id: string): Promise<void> {
  writeJson(
    KEY,
    readJson<StoredWorkout[]>(KEY, []).filter((w) => w.id !== id),
  );
}
