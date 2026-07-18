import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

/**
 * Session signals (RF-18): every moment of the session has its own sound —
 * entry countdown, exercise start, isometry end, rest start, rest end
 * (preparation opens) and session done — so the user recognizes what
 * happened without looking at the screen. Web Audio via expo-audio plus
 * `navigator.vibrate` where the device supports it (ADR 0007). Every call
 * is failure-tolerant — a broken speaker must never break the session.
 */

export type SessionEvent =
  | 'countdownTick'
  | 'exerciseStart'
  | 'isoEnd'
  | 'restStart'
  | 'restEnd'
  | 'sessionDone';

/* eslint-disable @typescript-eslint/no-require-imports */
const SOUND_SOURCES: Record<SessionEvent, number> = {
  countdownTick: require('../../assets/sounds/countdown-tick.wav'),
  exerciseStart: require('../../assets/sounds/go.wav'),
  isoEnd: require('../../assets/sounds/iso-end.wav'),
  restStart: require('../../assets/sounds/rest-start.wav'),
  restEnd: require('../../assets/sounds/rest-end.wav'),
  sessionDone: require('../../assets/sounds/session-done.wav'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

/** Vibration patterns (ms) per event, used where `navigator.vibrate` exists. */
const VIBRATIONS: Record<SessionEvent, number | number[]> = {
  countdownTick: 40,
  exerciseStart: [80, 40, 120],
  isoEnd: [120, 60, 120],
  restStart: 80,
  restEnd: [80, 40, 80, 40, 160],
  sessionDone: [120, 60, 120, 60, 240],
};

const players = new Map<SessionEvent, AudioPlayer>();

export async function prepareAudio(): Promise<void> {
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    for (const [event, source] of Object.entries(SOUND_SOURCES) as [SessionEvent, number][]) {
      players.set(event, createAudioPlayer(source));
    }
  } catch {
    players.clear();
  }
}

/** Plays the event's sound + vibration (RF-18). */
export function signalEvent(event: SessionEvent): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(VIBRATIONS[event]);
    }
  } catch {
    // vibration unavailable
  }
  try {
    const player = players.get(event);
    if (player) {
      player.seekTo(0);
      player.play();
    }
  } catch {
    // audio unavailable
  }
}
