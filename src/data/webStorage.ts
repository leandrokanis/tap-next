/**
 * Minimal localStorage facade for the data layer (ADR 0007) — the PWA
 * persists everything in the browser. Typed locally so the project does
 * not need the DOM lib. IndexedDB is backlog if data outgrows this.
 */
interface WebStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Resolved lazily so test stubs (and non-browser contexts) are honored. */
function storage(): WebStorage {
  return (globalThis as unknown as { localStorage: WebStorage }).localStorage;
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  storage().setItem(key, JSON.stringify(value));
}

export function remove(key: string): void {
  storage().removeItem(key);
}
