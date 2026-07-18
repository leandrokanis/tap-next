import { EngineState } from '../engine/engine';
import { getDatabase } from './database';

const KEY = 'activeSession';

/**
 * Snapshot format version. Bumped when EngineState changes shape in a way
 * older snapshots can't satisfy (v2: prepare phases + restDeadline,
 * ADR 0006). Older/unversioned snapshots are discarded on load — safer than
 * resuming into a phase list the engine no longer understands.
 */
export const SNAPSHOT_VERSION = 2;

interface SnapshotEnvelope {
  v: number;
  state: EngineState;
}

/**
 * Crash-recovery snapshot (RF-08). The session provider saves on every
 * phase transition; on launch the app offers to resume a pending snapshot.
 * EngineState is plain data, so JSON round-trips losslessly.
 */
export async function saveSnapshot(state: EngineState): Promise<void> {
  const db = await getDatabase();
  const envelope: SnapshotEnvelope = { v: SNAPSHOT_VERSION, state };
  await db.runAsync(
    'INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)',
    KEY,
    JSON.stringify(envelope),
  );
}

export async function loadSnapshot(): Promise<EngineState | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', KEY);
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.value) as Partial<SnapshotEnvelope>;
    if (parsed.v !== SNAPSHOT_VERSION || !parsed.state) return null;
    return parsed.state;
  } catch {
    return null;
  }
}

export async function clearSnapshot(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM kv WHERE key = ?', KEY);
}
