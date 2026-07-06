import { SessionRecord, SessionSetRecord, SessionSource, SessionStatus } from '../domain/session';

export interface SessionRow {
  id: string;
  workout_name: string;
  started_at: string;
  duration_seconds: number;
  status: string;
  source: string;
  planned_sets: number | null;
}

export interface SessionSetRow {
  session_id: string;
  position: number;
  exercise: string;
  set_index: number;
  reps: number | null;
  weight: number | null;
  duration_seconds: number | null;
  adjusted: number | null;
}

export function sessionToRow(record: SessionRecord): SessionRow {
  return {
    id: record.id,
    workout_name: record.workoutName,
    started_at: record.startedAt,
    duration_seconds: record.durationSeconds,
    status: record.status,
    source: record.source,
    planned_sets: record.plannedSets ?? null,
  };
}

export function setToRow(sessionId: string, position: number, set: SessionSetRecord): SessionSetRow {
  return {
    session_id: sessionId,
    position,
    exercise: set.exercise,
    set_index: set.setIndex,
    reps: set.reps ?? null,
    weight: set.weight ?? null,
    duration_seconds: set.durationSeconds ?? null,
    adjusted: set.adjusted ? 1 : null,
  };
}

export function rowToSession(row: SessionRow, setRows: SessionSetRow[]): SessionRecord {
  return {
    id: row.id,
    workoutName: row.workout_name,
    startedAt: row.started_at,
    durationSeconds: row.duration_seconds,
    status: row.status as SessionStatus,
    source: row.source as SessionSource,
    ...(row.planned_sets !== null && row.planned_sets !== undefined
      ? { plannedSets: row.planned_sets }
      : {}),
    sets: setRows
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        exercise: s.exercise,
        setIndex: s.set_index,
        ...(s.reps !== null ? { reps: s.reps } : {}),
        ...(s.weight !== null ? { weight: s.weight } : {}),
        ...(s.duration_seconds !== null ? { durationSeconds: s.duration_seconds } : {}),
        ...(s.adjusted ? { adjusted: true } : {}),
      })),
  };
}
