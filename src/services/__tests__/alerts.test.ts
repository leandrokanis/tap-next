// Native boundaries — unavailable under Jest.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

import { AlertEvent } from '../../session/sessionEvents';
import { SOUND_FILES } from '../alerts';

const EVENTS: AlertEvent[] = [
  'countinTick',
  'go',
  'isometryEnd',
  'restStart',
  'restEnd',
  'sessionDone',
];

describe('sound palette (RF-18)', () => {
  it('maps every event to a sound', () => {
    EVENTS.forEach((event) => {
      expect(SOUND_FILES[event]).toMatch(/\.wav$/);
    });
  });

  it('no two events share the same sound', () => {
    const files = EVENTS.map((event) => SOUND_FILES[event]);
    expect(new Set(files).size).toBe(EVENTS.length);
  });
});
