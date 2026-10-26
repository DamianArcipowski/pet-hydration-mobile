import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL;

const TOKEN_KEY = 'pethydration_token';
let token = null;
let onUnauthorized = null;

export async function loadToken() {
  token = await SecureStore.getItemAsync(TOKEN_KEY);
  return token;
}

export async function saveToken(newToken) {
  token = newToken;
  await SecureStore.setItemAsync(TOKEN_KEY, newToken);
}

export async function clearToken() {
  token = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export async function apiFetch(url, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 && token && onUnauthorized) onUnauthorized();
  return res;
}