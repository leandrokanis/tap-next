import * as Crypto from 'expo-crypto';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useTranslation } from 'react-i18next';

import { clearSnapshot, saveSnapshot } from '../data/activeSession';
import { insertSession } from '../data/sessionRepository';
import { SessionRecord } from '../domain/session';
import { Workout } from '../domain/workout';
import * as engine from '../engine/engine';
import { EngineState } from '../engine/engine';
import {
  cancelScheduledNotifications,
  schedulePhaseEndNotification,
  signal,
} from '../services/alerts';
import { leadinCount, transitionEvent } from './sessionEvents';

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
  /** Ajuste prospectivo do PRÓXIMO set durante o descanso (RF-06). */
  setUpcomingOverride(patch: { reps?: number; weight?: number }): void;
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
  const { t } = useTranslation();
  const [state, setState] = useState<EngineState | null>(null);
  const [now, setNow] = useState(nowSeconds());
  /** Estado anterior, para derivar o evento sonoro da transição (RF-18). */
  const previousRef = useRef<EngineState | null>(null);
  /** Fase de descanso que já teve o sinal de "zerou" disparado (RF-02b). */
  const restSignaledRef = useRef<number>(-1);
  /** Último número do count-in que já emitiu tick (RF-17). */
  const leadinTickedRef = useRef<number | null>(null);
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

  // Phase transitions: event-specific signal (RF-18), snapshot.
  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = state;
    if (!state) {
      restSignaledRef.current = -1;
      leadinTickedRef.current = null;
      return;
    }
    if (!previous || previous === state) return;
    const event = transitionEvent(previous, state);
    if (event) signal(event);
    if (state.phaseIndex !== previous.phaseIndex) {
      leadinTickedRef.current = null;
      saveSnapshot(state).catch(() => {});
    }
  }, [state]);

  // Count-in 3 → 2 → 1: um tick por segundo do leadin (RF-17).
  useEffect(() => {
    if (!state) return;
    const count = leadinCount(state, now);
    if (count === null) return;
    if (leadinTickedRef.current === count) return;
    leadinTickedRef.current = count;
    signal('countinTick');
  }, [state, now]);

  // Descanso zerou (RF-02b): o motor não avança sozinho, então o fim do
  // descanso não muda phaseIndex — o sinal dispara aqui, uma vez por fase.
  useEffect(() => {
    if (!state || state.status !== 'running') return;
    const phase = engine.currentPhase(state);
    if (phase?.type !== 'rest') return;
    if (restSignaledRef.current === state.phaseIndex) return;
    if ((engine.phaseRemaining(state, now) ?? 1) > 0) return;
    restSignaledRef.current = state.phaseIndex;
    signal('restEnd');
  }, [state, now]);

  // Background: schedule a local notification for the current timed phase.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (appState) => {
      const current = stateRef.current;
      if (appState === 'active') {
        cancelScheduledNotifications();
        return;
      }
      if (appState !== 'background' || !current || current.status !== 'running') return;
      const remaining = engine.phaseRemaining(current, nowSeconds());
      if (remaining === null) return;
      const phase = engine.currentPhase(current);
      const label = nextUpLabel(current, t);
      schedulePhaseEndNotification(
        remaining,
        phase?.type === 'rest' ? t('session.restOverTitle') : t('session.phaseOverTitle'),
        label ? t('session.restOverBody', { label }) : '',
      );
    });
    return () => subscription.remove();
  }, [t]);

  const startSession = useCallback((workout: Workout) => {
    const s = engine.start(workout, nowSeconds());
    previousRef.current = s;
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
    previousRef.current = paused;
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

  const setUpcomingOverride = useCallback((patch: { reps?: number; weight?: number }) => {
    setState((current) => (current ? engine.setUpcomingOverride(current, patch) : current));
  }, []);

  const persist = useCallback(async (finished: EngineState): Promise<SessionRecord> => {
    const record = engine.summarize(finished, nowSeconds(), {
      id: Crypto.randomUUID(),
      source: 'iphone',
    });
    await insertSession(record);
    await clearSnapshot();
    await cancelScheduledNotifications();
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
    await cancelScheduledNotifications();
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

function nextUpLabel(
  state: EngineState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const following = state.phases[state.phaseIndex + 1];
  if (!following) return '';
  if (following.type === 'rest') return t('session.rest');
  // leadin and work both name the set they belong to.
  const exercise = state.workout.exercises[following.exerciseIndex];
  return t('session.nextUpSet', { exercise: exercise.name, set: following.setNumber });
}
