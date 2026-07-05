import { SessionRecord } from '../domain/session';
import { Workout } from '../domain/workout';

export interface ExportBundle {
  app: 'tap-next';
  exportVersion: 1;
  exportedAt: string;
  workouts: Workout[];
  sessions: SessionRecord[];
}

/** Everything the user owns, as one JSON document (RF-14). */
export function buildExportBundle(
  workouts: Workout[],
  sessions: SessionRecord[],
  exportedAt: Date,
): ExportBundle {
  return {
    app: 'tap-next',
    exportVersion: 1,
    exportedAt: exportedAt.toISOString(),
    workouts,
    sessions,
  };
}
