import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BACKEND_URL_STORAGE_KEY = 'backend_url';

const getEnvBackendUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  const extraUrl =
    extra?.EXPO_PUBLIC_BACKEND_URL || extra?.BACKEND_URL || extra?.backendUrl || '';

  return envUrl || extraUrl || '';
};

export const normalizeBackendUrl = (url: string) => {
  return url.trim().replace(/\/+$/, '');
};

export const isValidBackendUrl = (url: string) => {
  return /^https?:\/\//i.test(url);
};

export const buildApiUrl = (baseUrl: string, path: string) => {
  const normalizedBase = normalizeBackendUrl(baseUrl);
  if (!normalizedBase) return '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

export const getBackendUrl = async () => {
  const stored = await AsyncStorage.getItem(BACKEND_URL_STORAGE_KEY);
  if (stored) return normalizeBackendUrl(stored);

  const envUrl = getEnvBackendUrl();
  return envUrl ? normalizeBackendUrl(envUrl) : '';
};

export const setBackendUrl = async (url: string) => {
  const normalized = normalizeBackendUrl(url);
  if (!normalized) {
    await AsyncStorage.removeItem(BACKEND_URL_STORAGE_KEY);
    return '';
  }
  await AsyncStorage.setItem(BACKEND_URL_STORAGE_KEY, normalized);
  return normalized;
};

export const apiFetch = async (path: string, options?: RequestInit) => {
  const baseUrl = await getBackendUrl();
  if (!baseUrl) {
    const error = new Error('BACKEND_URL_NOT_SET');
    (error as Error & { code?: string }).code = 'BACKEND_URL_NOT_SET';
    throw error;
  }
  const url = buildApiUrl(baseUrl, path);
  return fetch(url, options);
};

export const testBackendConnection = async (url: string) => {
  const baseUrl = normalizeBackendUrl(url);
  if (!baseUrl) {
    throw new Error('BACKEND_URL_NOT_SET');
  }
  const response = await fetch(buildApiUrl(baseUrl, '/api'));
  if (!response.ok) {
    throw new Error(`HTTP_${response.status}`);
  }
  return response.json();
};
