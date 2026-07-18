import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { clearSnapshot, saveSnapshot } from '../data/activeSession';
import { insertSession } from '../data/sessionRepository';
import { SessionRecord } from '../domain/session';
import { Workout } from '../domain/workout';
import * as engine from '../engine/engine';
import { EngineState } from '../engine/engine';
import { SessionEvent, signalEvent } from '../services/alerts';
import { acquireWakeLock, releaseWakeLock } from '../services/wakeLock';

const TICK_MS = 250;

const nowSeconds = () => Date.now() / 1000;

interface SessionContextValue {
  state: EngineState | null;
  /** Re-render clock for countdowns, epoch seconds. */
  now: number;
  startSession(workout: Workout): void;
  resumeFromSnapshot(state: EngineState): void;
  next(): void;
  pause(): void;
  resume(): void;
  /** Ajuste prospectivo do PRÓXIMO set, feito na Preparação (RF-06). */
  setUpcomingOverride(patch: { reps?: number; weight?: number; duration?: number }): void;
  /** "Salvar e sair" — persists a (possibly partial) record. */
  finishAndSave(): Promise<SessionRecord>;
  /** Persists a fully-completed session (engine already finished). */
  saveCompleted(): Promise<SessionRecord>;
  discard(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession outside SessionProvider');
  return value;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EngineState | null>(null);
  const [now, setNow] = useState(nowSeconds());
  const phaseIndexRef = useRef<number>(-1);
  const stateRef = useRef<EngineState | null>(null);
  stateRef.current = state;

  // Clock: drive countdowns and auto-advance timed phases.
  useEffect(() => {
    if (!state || state.status !== 'running') return;
    const interval = setInterval(() => {
      const at = nowSeconds();
      setNow(at);
      setState((current) => (current ? engine.tick(current, at) : current));
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [state?.status, state !== null]);

  // Phase transitions: per-event signal (RF-18), snapshot.
  useEffect(() => {
    if (!state) {
      phaseIndexRef.current = -1;
      return;
    }
    if (phaseIndexRef.current === -1) {
      phaseIndexRef.current = state.phaseIndex;
      return;
    }
    if (state.phaseIndex !== phaseIndexRef.current) {
      phaseIndexRef.current = state.phaseIndex;
      const event = transitionEvent(state);
      if (event) signalEvent(event);
      saveSnapshot(state).catch(() => {});
    }
  }, [state?.phaseIndex, state]);

  // Contagem de entrada 3-2-1 (RF-17): um sinal por segundo + "vai".
  const countdownRef = useRef<{ phaseIndex: number; last: number }>({ phaseIndex: -1, last: 0 });
  useEffect(() => {
    if (!state || state.status !== 'running') return;
    const phase = engine.currentPhase(state);
    if (phase?.type !== 'work' || phase.mode !== 'time') return;
    const remaining = Math.ceil(engine.countdownRemaining(state, now) ?? 0);
    const ref = countdownRef.current;
    if (ref.phaseIndex !== state.phaseIndex) {
      countdownRef.current = { phaseIndex: state.phaseIndex, last: remaining };
      if (remaining > 0) signalEvent('countdownTick');
      return;
    }
    if (remaining === ref.last) return;
    ref.last = remaining;
    signalEvent(remaining > 0 ? 'countdownTick' : 'exerciseStart');
  }, [state, now]);

  // Keep the screen on while a session is active (ADR 0007); best-effort.
  useEffect(() => {
    if (!state) return;
    acquireWakeLock();
    return () => {
      releaseWakeLock();
    };
  }, [state !== null]);

  const startSession = useCallback((workout: Workout) => {
    const s = engine.start(workout, nowSeconds());
    phaseIndexRef.current = s.phaseIndex;
    setState(s);
    saveSnapshot(s).catch(() => {});
  }, []);

  const resumeFromSnapshot = useCallback((snapshot: EngineState) => {
    // Time kept flowing while we were dead; pause at the snapshot's last
    // known moment so the user resumes deliberately.
    const paused =
      snapshot.status === 'running'
        ? { ...snapshot, status: 'paused' as const, pausedAt: snapshot.phaseStartedAt }
        : snapshot;
    phaseIndexRef.current = paused.phaseIndex;
    setState(paused);
  }, []);

  const next = useCallback(() => {
    setState((current) => (current ? engine.next(current, nowSeconds()) : current));
  }, []);

  const pause = useCallback(() => {
    setState((current) => (current ? engine.pause(current, nowSeconds()) : current));
  }, []);

  const resume = useCallback(() => {
    setState((current) => (current ? engine.resume(current, nowSeconds()) : current));
  }, []);

  const setUpcomingOverride = useCallback(
    (patch: { reps?: number; weight?: number; duration?: number }) => {
      setState((current) => (current ? engine.setUpcomingOverride(current, patch) : current));
    },
    [],
  );

  const persist = useCallback(async (finished: EngineState): Promise<SessionRecord> => {
    const record = engine.summarize(finished, nowSeconds(), {
      id: globalThis.crypto.randomUUID(),
      source: 'iphone',
    });
    await insertSession(record);
    await clearSnapshot();
    setState(null);
    return record;
  }, []);

  const finishAndSave = useCallback(async (): Promise<SessionRecord> => {
    const current = stateRef.current;
    if (!current) throw new Error('no active session');
    return persist(engine.finish(current, nowSeconds()));
  }, [persist]);

  const saveCompleted = useCallback(async (): Promise<SessionRecord> => {
    const current = stateRef.current;
    if (!current) throw new Error('no active session');
    return persist(current);
  }, [persist]);

  const discard = useCallback(async () => {
    await clearSnapshot();
    setState(null);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        state,
        now,
        startSession,
        resumeFromSnapshot,
        next,
        pause,
        resume,
        setUpcomingOverride,
        finishAndSave,
        saveCompleted,
        discard,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Which RF-18 event a phase transition produced, derived from the phase the
 * session just entered and the one before it.
 */
function transitionEvent(state: EngineState): SessionEvent | null {
  if (state.status === 'finished') {
    return engine.completedAllPhases(state) ? 'sessionDone' : null;
  }
  const entered = engine.currentPhase(state);
  const previous = state.phases[state.phaseIndex - 1];
  if (!entered) return null;
  if (entered.type === 'work') {
    // Timed sets announce themselves via the 3-2-1 countdown effect.
    return entered.mode === 'time' ? null : 'exerciseStart';
  }
  if (entered.type === 'rest') {
    return previous?.type === 'work' && previous.mode === 'time' ? 'isoEnd' : 'restStart';
  }
  // Entered a prepare: the preparation opened (after a rest or directly).
  return 'restEnd';
}

