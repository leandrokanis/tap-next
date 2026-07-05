import { Alert, AlertButton, Platform } from 'react-native';

interface WebDialogs {
  alert(message: string): void;
  confirm(message: string): boolean;
}

const web = globalThis as unknown as WebDialogs;

/**
 * Cross-platform dialog: native Alert on iOS/Android, window.confirm on the
 * web dev preview. On web, OK maps to the first non-cancel button and
 * Cancel to the cancel button — three-way dialogs lose their middle option
 * (acceptable for a browser preview; the real UX is native).
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;
  if (!buttons || buttons.length === 0) {
    web.alert(text);
    return;
  }

  const cancel = buttons.find((b) => b.style === 'cancel');
  const primary = buttons.find((b) => b.style !== 'cancel');
  if (!primary) {
    web.alert(text);
    cancel?.onPress?.();
    return;
  }

  const confirmed = web.confirm(`${text}\n\n[OK] ${primary.text ?? 'OK'}`);
  if (confirmed) primary.onPress?.();
  else cancel?.onPress?.();
}
