import {
  completedAllPhases,
  currentPhase,
  EngineState,
  phaseRemaining,
} from '../engine/engine';

/**
 * Session sound/haptic vocabulary (RF-18): every event has its own signal,
 * so the practitioner can follow the session without looking at the screen.
 */
export type AlertEvent =
  | 'countinTick'
  | 'go'
  | 'isometryEnd'
  | 'restStart'
  | 'restEnd'
  | 'sessionDone';

/**
 * Signal for a state transition, derived from the phase just left. Entering
 * a phase by explicit tap (rest → leadin/work) is silent — the tap is the
 * feedback; the isometry→rest boundary plays isometryEnd only, never
 * stacking restStart on the same instant.
 */
export function transitionEvent(prev: EngineState, next: EngineState): AlertEvent | null {
  if (prev.status === 'finished') return null;
  if (next.status === 'finished' && completedAllPhases(next)) return 'sessionDone';
  if (next.phaseIndex === prev.phaseIndex) return null;

  const from = prev.phases[prev.phaseIndex];
  const to = currentPhase(next);
  if (!from) return null;
  if (from.type === 'work' && from.mode === 'time') return 'isometryEnd';
  if (from.type === 'leadin' && to?.type === 'work') return 'go';
  if (from.type === 'work' && to?.type === 'rest') return 'restStart';
  return null;
}

/**
 * Current count-in number (3 → 2 → 1) while a leadin runs; null elsewhere.
 * The provider ticks a sound every time this value changes (RF-17).
 */
export function leadinCount(state: EngineState, at: number): number | null {
  if (state.status !== 'running') return null;
  if (currentPhase(state)?.type !== 'leadin') return null;
  const remaining = phaseRemaining(state, at) ?? 0;
  return Math.max(1, Math.ceil(remaining));
}
