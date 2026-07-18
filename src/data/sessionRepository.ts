import { SessionRecord } from '../domain/session';
import { readJson, writeJson } from './webStorage';

const KEY = 'tapnext.sessions';

export async function insertSession(record: SessionRecord): Promise<void> {
  const all = readJson<SessionRecord[]>(KEY, []);
  if (all.some((s) => s.id === record.id)) return; // idempotent, like SQLite
  writeJson(KEY, [...all, record]);
}

export async function listSessions(): Promise<SessionRecord[]> {
  return readJson<SessionRecord[]>(KEY, []).sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  return readJson<SessionRecord[]>(KEY, []).find((s) => s.id === id) ?? null;
}

export async function updateSessionSet(
  sessionId: string,
  position: number,
  changes: { reps?: number; weight?: number },
): Promise<void> {
  const all = readJson<SessionRecord[]>(KEY, []);
  writeJson(
    KEY,
    all.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            sets: session.sets.map((set, i) => (i === position ? { ...set, ...changes } : set)),
          }
        : session,
    ),
  );
}

export async function deleteSession(id: string): Promise<void> {
  writeJson(
    KEY,
    readJson<SessionRecord[]>(KEY, []).filter((s) => s.id !== id),
  );
}
