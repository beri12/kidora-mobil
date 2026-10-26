import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Tokens, TokenStore } from './client';

const KEY = 'kidora.session.v1';

/**
 * Tokens live in the Keychain (iOS) / Keystore-backed storage (Android),
 * never in AsyncStorage or SQLite. Reads are cached in memory so a burst of
 * requests doesn't hit the secure store once each.
 */
let cache: Tokens | null | undefined;

const isWeb = Platform.OS === 'web';

export const secureTokenStore: TokenStore = {
  async get() {
    if (cache !== undefined) return cache;
    try {
      const raw = isWeb ? null : await SecureStore.getItemAsync(KEY);
      cache = raw ? (JSON.parse(raw) as Tokens) : null;
    } catch {
      cache = null;
    }
    return cache;
  },
  async set(tokens) {
    cache = tokens;
    if (!isWeb) {
      await SecureStore.setItemAsync(KEY, JSON.stringify(tokens), {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
    }
  },
  async clear() {
    cache = null;
    if (!isWeb) await SecureStore.deleteItemAsync(KEY).catch(() => undefined);
  },
};
