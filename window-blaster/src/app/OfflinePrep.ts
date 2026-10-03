import { Emitter } from '../core/events';

export type OfflineState = 'unknown' | 'checking' | 'ready' | 'missing' | 'downloading' | 'error' | 'unsupported';

interface AssetEntry {
  path: string;
  size: number;
}

/**
 * Makes the game playable without any network: downloads the heavy files
 * (MediaPipe WASM runtime + detector model, ~34 MB) into the same Cache Storage
 * the service worker serves from, reports progress and remembers the state.
 */
export class OfflinePrep {
  readonly events = new Emitter<{ change: OfflineState }>();
  state: OfflineState = 'unknown';
  progress = 0;
  totalBytes = 0;
  missingBytes = 0;
  error = '';
  private assets: AssetEntry[] = [];
  /** Must equal the service worker's cache name (src/sw.ts). */
  private readonly cacheName = `wb-${__APP_VERSION__}-${__BUILD_ID__}`;

  constructor(private readonly base: string) {}

  private url(p: string): string {
    return new URL(p, new URL(this.base, location.href)).href;
  }

  private set(s: OfflineState): void {
    this.state = s;
    this.events.emit('change', s);
  }

  get supported(): boolean {
    return typeof caches !== 'undefined' && window.isSecureContext;
  }

  async check(): Promise<OfflineState> {
    if (!this.supported) {
      this.set('unsupported');
      return this.state;
    }
    this.set('checking');
    try {
      const res = await fetch(this.url('offline-assets.json'), { cache: 'no-cache' });
      if (!res.ok) throw new Error('no manifest');
      this.assets = ((await res.json()) as { files: AssetEntry[] }).files;
      let missing = 0;
      let total = 0;
      for (const a of this.assets) {
        total += a.size;
        // any Window Blaster cache counts: right after an update the service worker may still be
        // copying the offline data from the previous version's cache into the new one
        if (!(await caches.match(this.url(a.path)))) missing += a.size;
      }
      this.totalBytes = total;
      this.missingBytes = missing;
      this.set(missing === 0 ? 'ready' : 'missing');
    } catch {
      // dev server or no manifest: nothing to prepare
      this.set('unknown');
    }
    return this.state;
  }

  /** Downloads whatever is missing. Safe to call repeatedly. */
  async prepare(): Promise<boolean> {
    if (this.state === 'downloading') return false;
    if (this.state !== 'missing' && this.state !== 'error') await this.check();
    if (this.state !== 'missing' && this.state !== 'error') return this.state === 'ready';
    this.set('downloading');
    this.progress = 0;
    try {
      const cache = await caches.open(this.cacheName);
      let done = 0;
      const total = this.totalBytes || 1;
      for (const a of this.assets) {
        const u = this.url(a.path);
        if (await caches.match(u)) {
          done += a.size;
          this.progress = done / total;
          this.events.emit('change', this.state);
          continue;
        }
        const res = await fetch(u, { cache: 'no-cache' });
        if (!res.ok || !res.body) throw new Error(`${a.path}: ${res.status}`);
        // stream to report progress, then store a fresh Response
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let got = 0;
        for (;;) {
          const { done: d, value } = await reader.read();
          if (d) break;
          chunks.push(value);
          got += value.byteLength;
          this.progress = (done + got) / total;
          this.events.emit('change', this.state);
        }
        const blob = new Blob(chunks as BlobPart[], { type: res.headers.get('content-type') ?? 'application/octet-stream' });
        await cache.put(u, new Response(blob, { status: 200, headers: { 'content-type': blob.type, 'content-length': String(blob.size) } }));
        done += a.size;
      }
      this.missingBytes = 0;
      this.progress = 1;
      try {
        await navigator.storage?.persist?.();
      } catch {
        /* optional */
      }
      this.set('ready');
      return true;
    } catch (e) {
      this.error = String((e as Error).message ?? e);
      this.set('error');
      return false;
    }
  }

  /** Human readable size of the missing part. */
  get missingLabel(): string {
    return `${(this.missingBytes / 1048576).toFixed(0)} MB`;
  }
}
