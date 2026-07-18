import { Platform } from 'react-native';

/**
 * PWA wiring (ADR 0007): registers the service worker and links the
 * manifest so the app is installable and works offline after the first
 * load. Web-only and production-only — during `expo start` the service
 * worker would fight the dev server's hot reload.
 */
export function setupPwa(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.webmanifest';
    document.head.appendChild(link);
  }
  const theme = document.createElement('meta');
  theme.name = 'theme-color';
  theme.content = '#0B0D11';
  document.head.appendChild(theme);

  if (__DEV__) return;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // offline cache is progressive enhancement — never block the app
    });
  }
}
