/**
 * Which address a SECOND device (another phone, a Quest headset, the glasses' phone) should open,
 * shown as QR codes on the "📲 Auf anderes Gerät" screen.
 *
 * - online: the public HTTPS copy of the game (GitHub Pages) – nothing to trust, no Mac needed.
 * - quest:  Meta's "Web Launch" page that sends the online address to a Quest headset (the
 *           headset itself cannot scan URL QR codes); only for https targets.
 * - mac:    the Mac launcher's phone setup page (same Wi-Fi, certificate steps, works offline).
 * - here:   this page's own address (development / any other server on the LAN).
 */
export type ShareKind = 'online' | 'quest' | 'mac' | 'here';

export interface ShareTarget {
  kind: ShareKind;
  url: string;
}

export interface ShareInputs {
  /** configured public address ('' = none), with trailing slash */
  publicUrl: string;
  /** this page's app root (origin + base path) */
  appRoot: string;
  /** the public copy answered (or we are on it) */
  publicLive: boolean;
  /** setup page of a Mac launcher that serves this page, if any */
  macSetupUrl: string | null;
  /** this page's own server answers right now (an installed copy far away from its server does not) */
  hereReachable: boolean;
}

/** Web Launch link that opens `url` in the Quest browser (https only). */
export function questLaunchUrl(url: string): string {
  return `https://www.oculus.com/open_url/?url=${encodeURIComponent(url)}`;
}

function isLoopback(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
  } catch {
    return true;
  }
}

/** Pure choice of targets, best first (unit-tested). */
export function pickTargets(i: ShareInputs): ShareTarget[] {
  const out: ShareTarget[] = [];
  const onPublic = !!i.publicUrl && i.appRoot.startsWith(i.publicUrl);
  if (i.publicUrl && (onPublic || i.publicLive)) {
    out.push({ kind: 'online', url: i.publicUrl });
    if (i.publicUrl.startsWith('https://')) out.push({ kind: 'quest', url: questLaunchUrl(i.publicUrl) });
  }
  if (!onPublic && i.macSetupUrl) out.push({ kind: 'mac', url: i.macSetupUrl });
  // a plain LAN/dev address is only useful when nothing better exists and another device can reach it
  if (!out.some((t) => t.kind === 'online' || t.kind === 'mac') && i.hereReachable && !isLoopback(i.appRoot)) out.push({ kind: 'here', url: i.appRoot });
  return out;
}

const LIVE_KEY = 'wb.publicLive';

async function fetchJson(url: string, ms: number): Promise<Record<string, unknown> | null> {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = setTimeout(() => ctl?.abort(), ms);
  try {
    const r = await fetch(url, { cache: 'no-store', signal: ctl?.signal });
    if (!r.ok) return null;
    return (await r.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** The Mac launcher answers /wb-status (bypassed by the service worker); GitHub Pages does not. */
export async function launcherStatus(): Promise<{ setupUrl: string; publicUrl: string } | null> {
  if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return null;
  const s = await fetchJson(new URL('/wb-status', location.origin).href, 2500);
  if (!s || s.ok !== true) return null;
  return { setupUrl: typeof s.setupUrl === 'string' ? s.setupUrl : '', publicUrl: typeof s.publicUrl === 'string' ? s.publicUrl : '' };
}

/**
 * Loads an image without Origin/Referer headers (a CORS fetch would tell the public host this
 * page's LAN address). Resolves true when it loads.
 */
function imageLoads(src: string, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') return resolve(false);
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    const t = setTimeout(() => {
      img.src = '';
      resolve(false);
    }, ms);
    img.onload = () => {
      clearTimeout(t);
      resolve(true);
    };
    img.onerror = () => {
      clearTimeout(t);
      resolve(false);
    };
    img.src = src;
  });
}

/** Is the public copy online? Remembers the last answer for offline moments. */
export async function publicIsLive(publicUrl: string): Promise<boolean> {
  if (!publicUrl) return false;
  const live = await imageLoads(`${publicUrl}icons/icon-192.png?wbping=${Date.now()}`, 5000);
  try {
    if (live) localStorage.setItem(LIVE_KEY, '1');
    else if (navigator.onLine) localStorage.removeItem(LIVE_KEY);
    else return localStorage.getItem(LIVE_KEY) === '1';
  } catch {
    /* storage blocked */
  }
  return live;
}

export function appRoot(): string {
  return new URL(import.meta.env.BASE_URL, location.href).href;
}

/** Running from the public copy (GitHub Pages) rather than a Mac launcher or dev server. */
export function onPublicCopy(): boolean {
  return !!__PUBLIC_URL__ && appRoot().startsWith(__PUBLIC_URL__);
}

/** Does this page's own server answer? (`wbping` passes the service worker untouched) */
async function hereAnswers(root: string): Promise<boolean> {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = setTimeout(() => ctl?.abort(), 2500);
  try {
    const r = await fetch(`${root}?wbping=1`, { cache: 'no-store', signal: ctl?.signal });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/** Collects everything and returns the targets (never throws). */
export async function shareTargets(publicUrl: string = __PUBLIC_URL__): Promise<ShareTarget[]> {
  const root = appRoot();
  const onPublic = !!publicUrl && root.startsWith(publicUrl);
  const [launcher, live, here] = await Promise.all([
    onPublic ? Promise.resolve(null) : launcherStatus(),
    onPublic ? Promise.resolve(true) : publicIsLive(publicUrl),
    onPublic ? Promise.resolve(false) : hereAnswers(root),
  ]);
  return pickTargets({ publicUrl, appRoot: root, publicLive: live, macSetupUrl: launcher?.setupUrl || null, hereReachable: here });
}
