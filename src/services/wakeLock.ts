/**
 * Screen Wake Lock (ADR 0007): keeps the screen on during an active session
 * so timers and alerts stay visible at the gym. Best-effort — browsers
 * without the API (or with the request denied) no-op silently; the session
 * itself never depends on it.
 */

type WakeLockSentinel = { release(): Promise<void>; addEventListener?: unknown };

interface WakeLockNavigator {
  wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinel> };
}

let sentinel: WakeLockSentinel | null = null;
let wanted = false;
let visibilityHooked = false;

async function request(): Promise<void> {
  const nav = (typeof navigator !== 'undefined' ? navigator : undefined) as
    | WakeLockNavigator
    | undefined;
  if (!nav?.wakeLock) return;
  try {
    sentinel = await nav.wakeLock.request('screen');
  } catch {
    sentinel = null;
  }
}

/** The OS releases the lock when the tab hides; re-acquire on return. */
function hookVisibility(): void {
  if (visibilityHooked || typeof document === 'undefined' || !document.addEventListener) return;
  visibilityHooked = true;
  document.addEventListener('visibilitychange', () => {
    if (wanted && document.visibilityState === 'visible') request();
  });
}

export async function acquireWakeLock(): Promise<void> {
  wanted = true;
  hookVisibility();
  await request();
}

export async function releaseWakeLock(): Promise<void> {
  wanted = false;
  const current = sentinel;
  sentinel = null;
  try {
    await current?.release();
  } catch {
    // already released
  }
}
