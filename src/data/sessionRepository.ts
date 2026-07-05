import { SessionRecord } from '../domain/session';
import { getDatabase } from './database';
import { rowToSession, SessionRow, SessionSetRow, sessionToRow, setToRow } from './mappers';

/**
 * Insert is idempotent by id (INSERT OR IGNORE): the Watch may re-deliver a
 * session through transferUserInfo, and replays must not duplicate history
 * (ADR 0005).
 */
export async function insertSession(record: SessionRecord): Promise<void> {
  const db = await getDatabase();
  const row = sessionToRow(record);
  const result = await db.runAsync(
    'INSERT OR IGNORE INTO sessions (id, workout_name, started_at, duration_seconds, status, source) VALUES (?, ?, ?, ?, ?, ?)',
    row.id,
    row.workout_name,
    row.started_at,
    row.duration_seconds,
    row.status,
    row.source,
  );
  if (result.changes === 0) return; // replay — history already has it
  for (let position = 0; position < record.sets.length; position++) {
    const s = setToRow(record.id, position, record.sets[position]);
    await db.runAsync(
      'INSERT INTO session_sets (session_id, position, exercise, set_index, reps, weight, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?)',
      s.session_id,
      s.position,
      s.exercise,
      s.set_index,
      s.reps,
      s.weight,
      s.duration_seconds,
    );
  }
}

export async function listSessions(): Promise<SessionRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SessionRow>(
    'SELECT * FROM sessions ORDER BY started_at DESC',
  );
  const sessions: SessionRecord[] = [];
  for (const row of rows) {
    sessions.push(rowToSession(row, await setsFor(row.id)));
  }
  return sessions;
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE id = ?', id);
  if (!row) return null;
  return rowToSession(row, await setsFor(id));
}

export async function updateSessionSet(
  sessionId: string,
  position: number,
  changes: { reps?: number; weight?: number },
): Promise<void> {
  const db = await getDatabase();
  if (changes.reps !== undefined) {
    await db.runAsync(
      'UPDATE session_sets SET reps = ? WHERE session_id = ? AND position = ?',
      changes.reps,
      sessionId,
      position,
    );
  }
  if (changes.weight !== undefined) {
    await db.runAsync(
      'UPDATE session_sets SET weight = ? WHERE session_id = ? AND position = ?',
      changes.weight,
      sessionId,
      position,
    );
  }
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sessions WHERE id = ?', id);
}

async function setsFor(sessionId: string): Promise<SessionSetRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<SessionSetRow>(
    'SELECT * FROM session_sets WHERE session_id = ? ORDER BY position ASC',
    sessionId,
  );
}
