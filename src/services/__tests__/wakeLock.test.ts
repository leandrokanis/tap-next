import { acquireWakeLock, releaseWakeLock } from '../wakeLock';

type MutableNavigator = { wakeLock?: { request: jest.Mock } };
const nav = navigator as unknown as MutableNavigator;

describe('wakeLock (best-effort, ADR 0007)', () => {
  afterEach(async () => {
    await releaseWakeLock();
    delete nav.wakeLock;
  });

  it('sem navigator.wakeLock: no-op silencioso', async () => {
    delete nav.wakeLock;
    await expect(acquireWakeLock()).resolves.toBeUndefined();
    await expect(releaseWakeLock()).resolves.toBeUndefined();
  });

  it('com suporte: adquire e libera o sentinel', async () => {
    const release = jest.fn().mockResolvedValue(undefined);
    nav.wakeLock = { request: jest.fn().mockResolvedValue({ release }) };
    await acquireWakeLock();
    expect(nav.wakeLock.request).toHaveBeenCalledWith('screen');
    await releaseWakeLock();
    expect(release).toHaveBeenCalled();
  });

  it('request rejeitado não propaga exceção', async () => {
    nav.wakeLock = { request: jest.fn().mockRejectedValue(new Error('denied')) };
    await expect(acquireWakeLock()).resolves.toBeUndefined();
  });
});
