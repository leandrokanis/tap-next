import { EngineState } from '../engine/engine';
import { readJson, remove, writeJson } from './webStorage';

const KEY = 'tapnext.activeSession';

export async function saveSnapshot(state: EngineState): Promise<void> {
  writeJson(KEY, state);
}

export async function loadSnapshot(): Promise<EngineState | null> {
  return readJson<EngineState | null>(KEY, null);
}

export async function clearSnapshot(): Promise<void> {
  remove(KEY);
}
