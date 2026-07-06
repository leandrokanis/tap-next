import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { AlertEvent } from '../session/sessionEvents';

/**
 * Session signals (RF-18): one synthesized sound per event (see
 * scripts/generate-sounds.js) + a matching haptic in the foreground, a
 * local notification scheduled for the exact phase boundary when
 * backgrounded. Every call is failure-tolerant — a broken speaker must
 * never break the session. expo-notifications has no web support, so it is
 * loaded lazily and only on native.
 */

type NotificationsModule = typeof import('expo-notifications');

/** Event → asset name, the palette contract (tested: no two share a file). */
export const SOUND_FILES: Record<AlertEvent, string> = {
  countinTick: 'countin-tick.wav',
  go: 'go.wav',
  isometryEnd: 'isometry-end.wav',
  restStart: 'rest-start.wav',
  restEnd: 'rest-end.wav',
  sessionDone: 'session-done.wav',
};

/* eslint-disable @typescript-eslint/no-require-imports */
const SOUND_MODULES: Record<AlertEvent, number> = {
  countinTick: require('../../assets/sounds/countin-tick.wav'),
  go: require('../../assets/sounds/go.wav'),
  isometryEnd: require('../../assets/sounds/isometry-end.wav'),
  restStart: require('../../assets/sounds/rest-start.wav'),
  restEnd: require('../../assets/sounds/rest-end.wav'),
  sessionDone: require('../../assets/sounds/session-done.wav'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

const HAPTICS: Record<AlertEvent, () => Promise<void>> = {
  countinTick: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  go: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  isometryEnd: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  restStart: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  restEnd: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  sessionDone: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

let players: Partial<Record<AlertEvent, AudioPlayer>> = {};

function notifications(): NotificationsModule | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

/** Foreground phase-end alerts come from in-app sound/haptics; scheduled
 * notifications must stay silent while the app is visible. */
export function initNotifications(): void {
  const module = notifications();
  if (!module) return;
  module.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: false,
    }),
  });
  module.requestPermissionsAsync().catch(() => {});
}

export async function prepareAudio(): Promise<void> {
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    players = Object.fromEntries(
      (Object.keys(SOUND_MODULES) as AlertEvent[]).map((event) => [
        event,
        createAudioPlayer(SOUND_MODULES[event]),
      ]),
    );
  } catch {
    players = {};
  }
}

/** Play the event's own sound + haptic (RF-18). */
export function signal(event: AlertEvent): void {
  try {
    HAPTICS[event]().catch(() => {});
  } catch {
    // haptics unavailable
  }
  try {
    const player = players[event];
    if (player) {
      player.seekTo(0);
      player.play();
    }
  } catch {
    // audio unavailable
  }
}

export async function schedulePhaseEndNotification(
  secondsFromNow: number,
  title: string,
  body: string,
): Promise<string | null> {
  const module = notifications();
  if (!module || secondsFromNow < 1) return null;
  try {
    return await module.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: {
        type: module.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.ceil(secondsFromNow),
        repeats: false,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelScheduledNotifications(): Promise<void> {
  try {
    await notifications()?.cancelAllScheduledNotificationsAsync();
  } catch {
    // nothing scheduled
  }
}
