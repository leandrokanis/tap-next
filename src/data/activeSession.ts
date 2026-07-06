import { EngineState } from '../engine/engine';
import { getDatabase } from './database';

const KEY = 'activeSession';

/**
 * Crash-recovery snapshot (RF-08). The session provider saves on every
 * phase transition; on launch the app offers to resume a pending snapshot.
 * EngineState is plain data, so JSON round-trips losslessly.
 */
export async function saveSnapshot(state: EngineState): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)',
    KEY,
    JSON.stringify(state),
  );
}

export async function loadSnapshot(): Promise<EngineState | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', KEY);
  if (!row) return null;
  return parseSnapshot(row.value);
}

/**
 * Snapshots written before the leadin phase existed lack `leadinSeconds` —
 * hydrate them with 0 (mirror of the Swift decoder's default).
 */
export function parseSnapshot(value: string): EngineState | null {
  try {
    const state = JSON.parse(value) as EngineState;
    return { ...state, leadinSeconds: state.leadinSeconds ?? 0 };
  } catch {
    return null;
  }
}

export async function clearSnapshot(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM kv WHERE key = ?', KEY);
}
