import { NETWORK_TIMEOUT_MESSAGE } from './api';

const DEFAULT_TIMEOUT_MS = 10000;

if (!global.__THOWIL_FETCH_TIMEOUT_PATCHED__) {
  const originalFetch = global.fetch.bind(global);

  global.fetch = async (input, init = {}) => {
    if (init.signal) {
      return originalFetch(input, init);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      return await originalFetch(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(NETWORK_TIMEOUT_MESSAGE);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  global.__THOWIL_FETCH_TIMEOUT_PATCHED__ = true;
}
