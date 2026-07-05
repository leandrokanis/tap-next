import * as fs from 'fs';
import * as path from 'path';

import { parseWorkout, Workout } from '../../domain/workout';
import * as engine from '../engine';
import { EngineState } from '../engine';

/**
 * Runs the shared fixtures in fixtures/engine/ — the executable spec both
 * the TS and the Swift engines must satisfy (see ADR 0002). The Swift
 * counterpart is FixtureTests.swift in watch/TapNextEngine.
 */

interface EventStep {
  at?: number;
  event: 'start' | 'next' | 'tick' | 'pause' | 'resume' | 'finish' | 'updateSet';
  exerciseIndex?: number;
  setIndex?: number;
  reps?: number;
  weight?: number;
}

interface Expectation {
  status?: engine.EngineStatus;
  phase?: 'work' | 'rest' | 'done';
  exercise?: string;
  setNumber?: number;
  remaining?: number | null;
  elapsed?: number;
  sessionElapsed?: number;
  completedSets?: number;
  completedAll?: boolean;
  lastSet?: Record<string, unknown>;
}

interface Fixture {
  name: string;
  workout: unknown;
  steps: Array<EventStep | { expect: Expectation }>;
}

const fixturesDir = path.join(__dirname, '..', '..', '..', 'fixtures', 'engine');
const files = fs
  .readdirSync(fixturesDir)
  .filter((f) => f.endsWith('.json'))
  .sort();

describe('shared engine fixtures', () => {
  test('fixtures exist', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const fixture: Fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, file), 'utf8'));
    test(`${file}: ${fixture.name}`, () => runFixture(fixture));
  }
});

function runFixture(fixture: Fixture): void {
  const parsed = parseWorkout(fixture.workout);
  if (!parsed.ok) {
    throw new Error(`fixture workout invalid: ${JSON.stringify(parsed.errors)}`);
  }
  let state: EngineState | null = null;
  let lastAt = 0;

  fixture.steps.forEach((step, index) => {
    if ('event' in step) {
      lastAt = step.at ?? lastAt;
      state = applyEvent(state, step, parsed.workout, lastAt);
    } else {
      if (!state) throw new Error(`step ${index}: expect before start`);
      assertExpectation(state, step.expect, lastAt, `step ${index}`);
    }
  });
}

function applyEvent(
  state: EngineState | null,
  step: EventStep,
  workout: Workout,
  at: number,
): EngineState {
  if (step.event === 'start') return engine.start(workout, at);
  if (!state) throw new Error(`event ${step.event} before start`);
  switch (step.event) {
    case 'next':
      return engine.next(state, at);
    case 'tick':
      return engine.tick(state, at);
    case 'pause':
      return engine.pause(state, at);
    case 'resume':
      return engine.resume(state, at);
    case 'finish':
      return engine.finish(state, at);
    case 'updateSet':
      return engine.updateLoggedSet(state, {
        exerciseIndex: step.exerciseIndex!,
        setIndex: step.setIndex!,
        reps: step.reps,
        weight: step.weight,
      });
    default:
      throw new Error(`unknown event ${step.event as string}`);
  }
}

function assertExpectation(
  state: EngineState,
  expected: Expectation,
  at: number,
  label: string,
): void {
  const phase = engine.currentPhase(state);

  if (expected.status !== undefined) {
    expect(`${label} status=${state.status}`).toBe(`${label} status=${expected.status}`);
  }
  if (expected.phase !== undefined) {
    const actual = state.status === 'finished' ? 'done' : phase?.type;
    expect(`${label} phase=${actual}`).toBe(`${label} phase=${expected.phase}`);
  }
  if (expected.exercise !== undefined) {
    const name = phase ? state.workout.exercises[phase.exerciseIndex].name : undefined;
    expect(`${label} exercise=${name}`).toBe(`${label} exercise=${expected.exercise}`);
  }
  if (expected.setNumber !== undefined) {
    const setNumber = phase?.type === 'work' ? phase.setNumber : phase?.afterSetNumber;
    expect(`${label} setNumber=${setNumber}`).toBe(`${label} setNumber=${expected.setNumber}`);
  }
  if (expected.remaining !== undefined) {
    const remaining = engine.phaseRemaining(state, at);
    const rounded = remaining === null ? null : Math.round(remaining);
    expect(`${label} remaining=${rounded}`).toBe(`${label} remaining=${expected.remaining}`);
  }
  if (expected.elapsed !== undefined) {
    const elapsed = Math.round(engine.phaseElapsed(state, at));
    expect(`${label} elapsed=${elapsed}`).toBe(`${label} elapsed=${expected.elapsed}`);
  }
  if (expected.sessionElapsed !== undefined) {
    const elapsed = Math.round(engine.sessionElapsed(state, at));
    expect(`${label} sessionElapsed=${elapsed}`).toBe(
      `${label} sessionElapsed=${expected.sessionElapsed}`,
    );
  }
  if (expected.completedSets !== undefined) {
    expect(`${label} completedSets=${state.completedSets.length}`).toBe(
      `${label} completedSets=${expected.completedSets}`,
    );
  }
  if (expected.completedAll !== undefined) {
    expect(`${label} completedAll=${engine.completedAllPhases(state)}`).toBe(
      `${label} completedAll=${expected.completedAll}`,
    );
  }
  if (expected.lastSet !== undefined) {
    const last = state.completedSets[state.completedSets.length - 1];
    expect(last).toMatchObject(expected.lastSet);
  }
}
