/**
 * Minimal localStorage facade for the *.web.ts data modules — the web dev
 * preview persists to the browser instead of SQLite. Typed locally so the
 * project does not need the DOM lib.
 */
interface WebStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const storage = (globalThis as unknown as { localStorage: WebStorage }).localStorage;

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  storage.setItem(key, JSON.stringify(value));
}

export function remove(key: string): void {
  storage.removeItem(key);
}
