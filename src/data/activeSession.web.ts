import { EngineState } from '../engine/engine';
import { readJson, remove, writeJson } from './webStorage';

const KEY = 'tapnext.activeSession';

/** Mirrors activeSession.ts — see SNAPSHOT_VERSION there (ADR 0006). */
export const SNAPSHOT_VERSION = 2;

interface SnapshotEnvelope {
  v: number;
  state: EngineState;
}

export async function saveSnapshot(state: EngineState): Promise<void> {
  writeJson(KEY, { v: SNAPSHOT_VERSION, state } satisfies SnapshotEnvelope);
}

export async function loadSnapshot(): Promise<EngineState | null> {
  const envelope = readJson<Partial<SnapshotEnvelope> | null>(KEY, null);
  if (!envelope || envelope.v !== SNAPSHOT_VERSION || !envelope.state) return null;
  return envelope.state;
}

export async function clearSnapshot(): Promise<void> {
  remove(KEY);
}
