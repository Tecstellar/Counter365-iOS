import { otaUpdateService } from '../src/services/otaUpdateService';

jest.mock('expo-updates', () => ({
  isEnabled: true,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

import * as Updates from 'expo-updates';

describe('OTA Update Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('checkForUpdate returns isAvailable: true when an update is on server', async () => {
    // Temporarily disable __DEV__ for test
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = false;

    (Updates.checkForUpdateAsync as jest.Mock).mockResolvedValueOnce({
      isAvailable: true,
      manifest: { id: 'test-manifest-123' },
    });

    const result = await otaUpdateService.checkForUpdate();
    expect(result.isAvailable).toBe(true);
    expect(result.manifest).toEqual({ id: 'test-manifest-123' });

    (global as any).__DEV__ = originalDev;
  });

  test('checkForUpdate safely returns isAvailable: false in local dev mode', async () => {
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = true;

    const result = await otaUpdateService.checkForUpdate();
    expect(result.isAvailable).toBe(false);
    expect(result.isDev).toBe(true);

    (global as any).__DEV__ = originalDev;
  });

  test('fetchAndApplyUpdate calls fetchUpdateAsync and reloadAsync', async () => {
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = false;

    (Updates.fetchUpdateAsync as jest.Mock).mockResolvedValueOnce({});
    (Updates.reloadAsync as jest.Mock).mockResolvedValueOnce(undefined);

    const result = await otaUpdateService.fetchAndApplyUpdate();
    expect(result.success).toBe(true);
    expect(Updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
    expect(Updates.reloadAsync).toHaveBeenCalledTimes(1);

    (global as any).__DEV__ = originalDev;
  });
});
