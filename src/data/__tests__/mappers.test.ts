import { SessionRecord } from '../../domain/session';
import { buildExportBundle } from '../export';
import { rowToSession, sessionToRow, setToRow } from '../mappers';

const record: SessionRecord = {
  id: 's1',
  workoutName: 'Pernas A',
  startedAt: '2026-07-05T14:02:11.000Z',
  durationSeconds: 2880,
  status: 'partial',
  source: 'watch',
  sets: [
    { exercise: 'Agachamento', setIndex: 1, reps: 10, weight: 60 },
    { exercise: 'Prancha', setIndex: 1, durationSeconds: 30 },
  ],
};

describe('session mappers', () => {
  it('round-trips a session through rows', () => {
    const row = sessionToRow(record);
    const setRows = record.sets.map((s, i) => setToRow(record.id, i, s));
    expect(rowToSession(row, setRows)).toEqual(record);
  });

  it('orders sets by position regardless of query order', () => {
    const row = sessionToRow(record);
    const setRows = record.sets.map((s, i) => setToRow(record.id, i, s)).reverse();
    expect(rowToSession(row, setRows).sets[0].exercise).toBe('Agachamento');
  });
});

describe('buildExportBundle', () => {
  it('wraps workouts and sessions with export metadata', () => {
    const workout = { version: 1 as const, name: 'X', exercises: [] };
    const bundle = buildExportBundle([workout], [record], new Date('2026-07-05T10:00:00Z'));
    expect(bundle).toEqual({
      app: 'tap-next',
      exportVersion: 1,
      exportedAt: '2026-07-05T10:00:00.000Z',
      workouts: [workout],
      sessions: [record],
    });
  });
});
