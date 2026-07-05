import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Phase-end signals (RF-02): sound + haptic in the foreground, a local
 * notification scheduled for the exact phase boundary when backgrounded.
 * Every call is failure-tolerant — a broken speaker must never break the
 * session. expo-notifications has no web support, so it is loaded lazily
 * and only on native.
 */

type NotificationsModule = typeof import('expo-notifications');

let player: AudioPlayer | null = null;

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    player = createAudioPlayer(require('../../assets/beep.wav'));
  } catch {
    player = null;
  }
}

export function signalPhaseEnd(): void {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // haptics unavailable
  }
  try {
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
