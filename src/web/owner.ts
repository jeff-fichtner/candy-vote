/**
 * The owner key this device holds, if any. A setup link (`/#owner=<key>`) opened once on the owner's
 * phone stores the key in this browser; every request that changes something sends it as a bearer
 * token. The server decides whether the key is right; this module only keeps it.
 */
const STORAGE_KEY = 'candy-vote-owner-key';

function read(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Takes the key out of a setup link, if the page was opened with one: stores it and removes it from
 * the address bar, so it is not left in the browser's history or shown on screen.
 */
export function claimKeyFromLocation(): void {
  const match = /^#owner=(.+)$/.exec(window.location.hash);
  if (!match) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, decodeURIComponent(match[1]));
  } catch {
    // Storage is blocked (private browsing): the device stays a viewer.
  }
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

/** Whether this device holds a key at all (the server still checks it). */
export function hasKey(): boolean {
  return read() !== null;
}

/** Forgets the key, after the server has refused it. */
export function forgetKey(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
}

/** The Authorization header for a request, when this device holds a key. */
export function ownerHeaders(): Record<string, string> {
  const key = read();
  return key ? { Authorization: `Bearer ${key}` } : {};
}
