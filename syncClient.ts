import { GlobalCloudData } from './types';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const ID_TOKEN_KEY = 'v25_id_token';

export function setStoredIdToken(token: string) {
  localStorage.setItem(ID_TOKEN_KEY, token);
}

function getStoredIdToken(): string | null {
  return localStorage.getItem(ID_TOKEN_KEY);
}

// Clears the local session so App re-renders LoginScreen. Called on logout and
// whenever the API says our token isn't valid anymore (expired, or revoked).
export function clearSession() {
  localStorage.removeItem(ID_TOKEN_KEY);
  localStorage.removeItem('v25_current_session');
}

// Attaches the Google ID token every API call needs now that the backend
// verifies it. On a 401 (missing/expired/invalid token) the session is
// cleared and the page reloads straight to the login screen, since a Google
// ID token can't be silently refreshed without the GSI prompt UI.
export async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredIdToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearSession();
    window.location.reload();
  }
  return res;
}

export async function fetchGlobalData(): Promise<GlobalCloudData> {
  const res = await authedFetch('/api/sync/get');
  if (!res.ok) {
    throw new Error('No se pudo obtener la información de la nube para fusionar. Abortando para no perder datos.');
  }
  const data = await res.json();
  if (!data.users || Array.isArray(data.users)) {
    data.users = {};
  }
  return data as GlobalCloudData;
}

async function pushGlobalData(globalData: GlobalCloudData): Promise<Response> {
  return authedFetch('/api/sync/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(globalData),
  });
}

/**
 * Fetches the latest cloud state, lets `applyChanges` merge local edits into it,
 * then pushes the result. If the sheet changed since the fetch (someone else's
 * save, or a manual edit), the push is rejected with 409 instead of silently
 * overwriting them — this retries from a fresh fetch instead of giving up.
 */
export async function fetchMergePush(
  applyChanges: (fresh: GlobalCloudData) => GlobalCloudData | void,
  maxAttempts = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const fresh = await fetchGlobalData();
    const result = applyChanges(fresh) || fresh;
    result.lastUpdate = new Date().toISOString();

    const res = await pushGlobalData(result);
    if (res.ok) return;

    if (res.status === 409 && attempt < maxAttempts) {
      await sleep(300 * attempt);
      continue;
    }
    throw new Error('Upload Failed');
  }
}
