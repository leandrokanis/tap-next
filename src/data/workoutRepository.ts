import * as Crypto from 'expo-crypto';

import { Workout } from '../domain/workout';
import { getDatabase } from './database';

export interface StoredWorkout {
  id: string;
  workout: Workout;
  createdAt: string;
}

interface WorkoutRow {
  id: string;
  json: string;
  created_at: string;
}

export async function saveWorkout(workout: Workout): Promise<StoredWorkout> {
  const db = await getDatabase();
  const stored: StoredWorkout = {
    id: Crypto.randomUUID(),
    workout,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    'INSERT INTO workouts (id, name, json, created_at) VALUES (?, ?, ?, ?)',
    stored.id,
    workout.name,
    JSON.stringify(workout),
    stored.createdAt,
  );
  return stored;
}

export async function listWorkouts(): Promise<StoredWorkout[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<WorkoutRow>(
    'SELECT id, json, created_at FROM workouts ORDER BY created_at ASC',
  );
  return rows.map((row) => ({
    id: row.id,
    workout: JSON.parse(row.json) as Workout,
    createdAt: row.created_at,
  }));
}

export async function getWorkout(id: string): Promise<StoredWorkout | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<WorkoutRow>(
    'SELECT id, json, created_at FROM workouts WHERE id = ?',
    id,
  );
  if (!row) return null;
  return { id: row.id, workout: JSON.parse(row.json) as Workout, createdAt: row.created_at };
}

export async function deleteWorkout(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM workouts WHERE id = ?', id);
}
