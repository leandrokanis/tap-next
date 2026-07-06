import { SessionSetRecord } from '../domain/session';
import { Workout } from '../domain/workout';

/** m:ss (aceita horas implicitamente: 75:02). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Nº de séries prescritas no treino. */
export function totalSets(workout: Workout): number {
  return workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
}

const ASSUMED_REPS_SET_SECONDS = 40;

/** Estimativa de duração (~N min): trabalho + descansos prescritos. */
export function estimateMinutes(workout: Workout): number {
  let seconds = 0;
  workout.exercises.forEach((ex, i) => {
    const perSet = ex.mode === 'time' ? (ex.duration ?? 0) : ASSUMED_REPS_SET_SECONDS;
    seconds += ex.sets * perSet;
    seconds += (ex.sets - 1) * (ex.restBetweenSets ?? 0);
    if (i < workout.exercises.length - 1) seconds += ex.restAfterExercise ?? 0;
  });
  return Math.max(1, Math.round(seconds / 60 / 5) * 5);
}

/** Σ reps × kg das séries registradas. */
export function tonnageKg(sets: SessionSetRecord[]): number {
  return sets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weight ?? 0), 0);
}

/** 9060 → "9.060" (pt-BR) / "9,060" (en). */
export function formatInt(value: number, locale: string): string {
  return Math.round(value).toLocaleString(locale);
}

/**
 * Dia relativo p/ "Última: …". Retorna chave i18n + count:
 * hoje · ontem · há N dias · (null ⇒ usar data localizada).
 */
export function relativeDay(
  iso: string,
  now: Date,
): { key: 'common.today' | 'common.yesterday' | 'common.daysAgo'; count?: number } | null {
  const then = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(then)) / 86_400_000);
  if (days <= 0) return { key: 'common.today' };
  if (days === 1) return { key: 'common.yesterday' };
  if (days < 30) return { key: 'common.daysAgo', count: days };
  return null;
}
