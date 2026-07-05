import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

/**
 * Phase-end signals (RF-02): sound + haptic in the foreground, a local
 * notification scheduled for the exact phase boundary when backgrounded.
 * Every call is failure-tolerant — a broken speaker must never break the
 * session.
 */

let player: AudioPlayer | null = null;

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

export async function requestNotificationPermission(): Promise<void> {
  try {
    await Notifications.requestPermissionsAsync();
  } catch {
    // user said no — background alerts simply won't fire
  }
}

export async function schedulePhaseEndNotification(
  secondsFromNow: number,
  title: string,
  body: string,
): Promise<string | null> {
  if (secondsFromNow < 1) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
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
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // nothing scheduled
  }
}
