import { SessionRecord } from '../domain/session';
import { Workout } from '../domain/workout';

/**
 * iPhone side of the WatchConnectivity bridge (ADR 0005):
 * - workouts flow iPhone → Watch via application context (last state wins);
 * - finished sessions flow Watch → iPhone via userInfo transfers, inserted
 *   idempotently by the caller.
 *
 * react-native-watch-connectivity is a native module; it is absent in Expo
 * Go and in Jest, so it is loaded lazily and every entry point degrades to
 * a no-op when unavailable.
 */

interface WatchConnectivityModule {
  updateApplicationContext(context: Record<string, unknown>): void;
  watchEvents: {
    on(event: 'user-info', cb: (userInfo: Record<string, unknown>) => void): () => void;
  };
}

function loadModule(): WatchConnectivityModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-watch-connectivity') as WatchConnectivityModule;
  } catch {
    return null;
  }
}

export function pushWorkoutsToWatch(workouts: Workout[]): void {
  const wc = loadModule();
  if (!wc) return;
  try {
    wc.updateApplicationContext({ workouts });
  } catch {
    // No paired watch / session not activated — nothing to do.
  }
}

export function subscribeToWatchSessions(
  onSession: (session: SessionRecord) => void,
): () => void {
  const wc = loadModule();
  if (!wc) return () => {};
  return wc.watchEvents.on('user-info', (userInfo) => {
    if (userInfo?.type === 'session' && userInfo.session) {
      onSession(userInfo.session as SessionRecord);
    }
  });
}
