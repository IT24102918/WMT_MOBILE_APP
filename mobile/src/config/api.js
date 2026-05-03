import Constants from 'expo-constants';

const DEFAULT_API_PORT = '8080';
const DEPLOYED_API_BASE = 'https://wmt-mobile-app-3.onrender.com';
const DEFAULT_TIMEOUT_MS = 30000;

const stripTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const extractHost = (value) => {
  if (!value || typeof value !== 'string') return null;

  const withoutProtocol = value.replace(/^[a-z]+:\/\//i, '');
  const hostPort = withoutProtocol.split('/')[0];
  const host = hostPort.split(':')[0];

  return host || null;
};

const buildDevApiBase = () => {
  const hostCandidates = [
    Constants.expoConfig?.hostUri,
    Constants.manifest2?.extra?.expoClient?.hostUri,
    Constants.linkingUri,
  ];

  const host = hostCandidates.map(extractHost).find(Boolean);
  return host ? `http://${host}:${DEFAULT_API_PORT}` : null;
};

export const API_BASE = (() => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return stripTrailingSlash(envUrl);
  }

  const useLocalApi = process.env.EXPO_PUBLIC_USE_LOCAL_API?.trim().toLowerCase() === 'true';
  if (useLocalApi) {
    const devBase = buildDevApiBase();
    if (devBase) {
      return devBase;
    }

    return `http://localhost:${DEFAULT_API_PORT}`;
  }

  return DEPLOYED_API_BASE;
})();

export const NETWORK_TIMEOUT_MESSAGE =
  'Network request timed out. Check that the deployed backend is awake and reachable, or set EXPO_PUBLIC_API_URL to a reachable API server.';

export const buildApiUrl = (path) => `${API_BASE}${path}`;

export const resolveApiMediaUrl = (value) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return buildApiUrl(value);
  return value;
};

export async function requestJson(path, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildApiUrl(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: options.signal ?? controller.signal,
    });

    const rawText = await response.text();
    const data = rawText ? JSON.parse(rawText) : null;

    if (!response.ok) {
      throw new Error(data?.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(NETWORK_TIMEOUT_MESSAGE);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function requestMultipart(path, formData, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildApiUrl(path), {
      ...options,
      headers: {
        ...(options.headers || {}),
      },
      body: formData,
      signal: options.signal ?? controller.signal,
    });

    const rawText = await response.text();
    const data = rawText ? JSON.parse(rawText) : null;

    if (!response.ok) {
      throw new Error(data?.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(NETWORK_TIMEOUT_MESSAGE);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
