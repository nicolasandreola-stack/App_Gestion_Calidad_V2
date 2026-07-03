import { GlobalCloudData } from './types';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchGlobalData(): Promise<GlobalCloudData> {
  const res = await fetch('/api/sync/get');
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
  return fetch('/api/sync/push', {
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
