import * as Updates from 'expo-updates';

export interface OtaCheckResult {
  isAvailable: boolean;
  isDev?: boolean;
  manifest?: any;
  error?: string;
}

export interface OtaApplyResult {
  success: boolean;
  error?: string;
}

/**
 * Service to handle Over-The-Air (OTA) EAS Updates.
 * Gracefully handles development mode (__DEV__) and standalone builds.
 */
export const otaUpdateService = {
  /**
   * Checks if an OTA update is published and available for this app runtime.
   */
  async checkForUpdate(): Promise<OtaCheckResult> {
    // In local development (Expo Go or Metro), OTA updates are not active
    if (__DEV__ || !Updates.isEnabled) {
      return { isAvailable: false, isDev: true };
    }

    try {
      const update = await Updates.checkForUpdateAsync();
      return {
        isAvailable: update.isAvailable,
        manifest: update.manifest,
      };
    } catch (err: any) {
      console.warn('OTA update check notice:', err?.message || err);
      return {
        isAvailable: false,
        error: err?.message || 'Could not check for OTA updates',
      };
    }
  },

  /**
   * Fetches the new OTA bundle and reloads the application immediately.
   */
  async fetchAndApplyUpdate(): Promise<OtaApplyResult> {
    if (__DEV__ || !Updates.isEnabled) {
      return { success: true };
    }

    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
      return { success: true };
    } catch (err: any) {
      console.error('Failed to fetch and apply OTA update:', err);
      return {
        success: false,
        error: err?.message || 'Failed to download and apply update',
      };
    }
  },
};
