export type SessionStatus = 'completed' | 'partial';
export type SessionSource = 'iphone' | 'watch';

export interface SessionSetRecord {
  exercise: string;
  /** 1-based set number within the exercise. */
  setIndex: number;
  reps?: number;
  /** kg */
  weight?: number;
  /** Actual seconds held, for time-mode sets. */
  durationSeconds?: number;
  /** True when the set was adjusted prospectively during rest (RF-06). */
  adjusted?: boolean;
}

export interface SessionRecord {
  id: string;
  workoutName: string;
  /** ISO 8601. */
  startedAt: string;
  /** Active seconds — pauses excluded. */
  durationSeconds: number;
  status: SessionStatus;
  source: SessionSource;
  /** Total sets prescribed by the workout (for "partial n/m" badges). */
  plannedSets?: number;
  sets: SessionSetRecord[];
}
