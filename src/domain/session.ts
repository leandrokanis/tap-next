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
  sets: SessionSetRecord[];
}
