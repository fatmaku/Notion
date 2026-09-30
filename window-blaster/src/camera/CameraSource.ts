import type { FrameSource } from './FrameSource';

export interface CameraOptions {
  idealWidth?: number;
  idealHeight?: number;
  deviceId?: string;
}

/** Maps getUserMedia errors to German user-facing messages. */
export function explainCameraError(e: unknown): string {
  const name = (e as { name?: string })?.name ?? '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Kamerazugriff wurde abgelehnt. Bitte in den Browser-/System-Einstellungen für diese Seite erlauben.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Keine Kamera gefunden.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Die Kamera wird gerade von einer anderen App benutzt.';
    case 'OverconstrainedError':
      return 'Die Kamera unterstützt die gewünschte Auflösung nicht.';
    default:
      return typeof location !== 'undefined' && location.protocol !== 'https:' && location.hostname !== 'localhost' ? 'Kamera braucht eine sichere Verbindung (https).' : `Kamera-Fehler: ${name || String(e)}`;
  }
}

/**
 * Rear camera via getUserMedia with lens preference (main lens, not ultra-wide),
 * automatic re-acquisition after the tab was backgrounded (iOS ends the track)
 * and a settings readout for diagnostics.
 */
export class CameraSource implements FrameSource {
  readonly kind = 'camera' as const;
  width = 0;
  height = 0;
  private stream: MediaStream | null = null;
  private readonly endedCbs = new Set<() => void>();
  private stopped = true;
  private readonly onVisibility = () => {
    if (document.visibilityState !== 'visible' || this.stopped) return;
    const track = this.stream?.getVideoTracks()[0];
    if (!track || track.readyState === 'ended' || track.muted) void this.restart();
  };

  constructor(
    readonly video: HTMLVideoElement,
    private readonly opts: CameraOptions = {},
  ) {}

  private constraints(deviceId?: string): MediaStreamConstraints {
    const v: MediaTrackConstraints = {
      width: { ideal: this.opts.idealWidth ?? 1280 },
      height: { ideal: this.opts.idealHeight ?? 720 },
      frameRate: { ideal: 30, max: 60 },
    };
    if (deviceId) v.deviceId = { exact: deviceId };
    else v.facingMode = { ideal: 'environment' };
    return { video: v, audio: false };
  }

  async start(): Promise<void> {
    this.stopped = false;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(this.constraints(this.opts.deviceId));
    } catch (e) {
      if ((e as { name?: string })?.name === 'OverconstrainedError') stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      else throw e;
    }
    // Prefer the main rear lens on multi-camera phones (labels are only readable after permission).
    if (!this.opts.deviceId) {
      const better = await this.pickMainRearLens(stream).catch(() => null);
      if (better) {
        try {
          const s2 = await navigator.mediaDevices.getUserMedia(this.constraints(better));
          stream.getTracks().forEach((t) => t.stop());
          stream = s2;
        } catch {
          /* keep the first stream */
        }
      }
    }
    this.stream = stream;
    const track = stream.getVideoTracks()[0];
    track.addEventListener('ended', () => {
      if (!this.stopped) for (const cb of this.endedCbs) cb();
    });
    this.video.srcObject = stream;
    this.video.muted = true;
    this.video.playsInline = true;
    await this.video.play().catch(() => undefined);
    await new Promise<void>((res) => {
      if (this.video.videoWidth) return res();
      const on = () => {
        this.video.removeEventListener('loadedmetadata', on);
        res();
      };
      this.video.addEventListener('loadedmetadata', on);
      setTimeout(res, 3000);
    });
    this.width = this.video.videoWidth;
    this.height = this.video.videoHeight;
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private async pickMainRearLens(current: MediaStream): Promise<string | null> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === 'videoinput');
    if (cams.length <= 1) return null;
    const curId = current.getVideoTracks()[0]?.getSettings().deviceId;
    const cur = cams.find((c) => c.deviceId === curId);
    const isRear = (l: string) => /back|rear|environment|rück|hinten|world/i.test(l);
    const isSpecial = (l: string) => /ultra|wide|tele|zoom|0[.,]5|macro|depth|infrared|ir /i.test(l);
    if (cur && isRear(cur.label) && !isSpecial(cur.label)) return null;
    const candidates = cams.filter((c) => isRear(c.label) && !isSpecial(c.label));
    return candidates[0]?.deviceId ?? null;
  }

  async restart(): Promise<void> {
    const wasStopped = this.stopped;
    this.stopStream();
    if (wasStopped) return;
    try {
      await this.start();
    } catch {
      for (const cb of this.endedCbs) cb();
    }
  }

  private stopStream(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video.srcObject) this.video.srcObject = null;
  }

  stop(): void {
    this.stopped = true;
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.stopStream();
  }

  onEnded(cb: () => void): () => void {
    this.endedCbs.add(cb);
    return () => this.endedCbs.delete(cb);
  }

  settings(): MediaTrackSettings | null {
    return this.stream?.getVideoTracks()[0]?.getSettings() ?? null;
  }
}
