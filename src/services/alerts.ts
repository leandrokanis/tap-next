import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Session signals (RF-18): every moment of the session has its own sound —
 * entry countdown, exercise start, isometry end, rest start, rest end
 * (preparation opens) and session done — so the user recognizes what
 * happened without looking at the screen. Sound + haptic in the foreground,
 * a local notification scheduled for the exact phase boundary when
 * backgrounded. Every call is failure-tolerant — a broken speaker must
 * never break the session. expo-notifications has no web support, so it is
 * loaded lazily and only on native.
 */

export type SessionEvent =
  | 'countdownTick'
  | 'exerciseStart'
  | 'isoEnd'
  | 'restStart'
  | 'restEnd'
  | 'sessionDone';

type NotificationsModule = typeof import('expo-notifications');

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

const HAPTICS: Record<SessionEvent, () => Promise<unknown>> = {
  countdownTick: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  exerciseStart: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  isoEnd: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  restStart: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  restEnd: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  sessionDone: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

const players = new Map<SessionEvent, AudioPlayer>();

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
    for (const [event, source] of Object.entries(SOUND_SOURCES) as [SessionEvent, number][]) {
      players.set(event, createAudioPlayer(source));
    }
  } catch {
    players.clear();
  }
}

/** Plays the event's sound + haptic (RF-18). */
export function signalEvent(event: SessionEvent): void {
  try {
    HAPTICS[event]().catch(() => {});
  } catch {
    // haptics unavailable
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
