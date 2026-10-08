import type { Storage } from './Storage';
import type { Lang } from '../ui/i18n';
import type { GlassesCal } from '../render/Layers';
import type { XrView } from '../xr/XrPlayer';

export interface SettingsData {
  /** UI language */
  lang: Lang;
  sound: boolean;
  music: boolean;
  /** 0..100 */
  sfxVolume: number;
  musicVolume: number;
  /** fewer detections per second, fewer particles, 30 fps rendering */
  battery: boolean;
  haptics: boolean;
  /** Horizontal field of view of the camera in degrees (landscape). */
  hfovDeg: number;
  invertPan: boolean;
  invertTilt: boolean;
  cameraLatencyMs: number;
  debug: boolean;
  nickname: string;
  poleDetector: boolean;
  stretchFill: boolean;
  /** Base round length in seconds; 0 = endless. */
  roundSeconds: number;
  showBoxes: boolean;
  safetyAcceptedAt: number;
  /** 0 = entspannt, 1 = normal, 2 = hart (bird density, hit tolerance) */
  difficulty: number;
  leftHanded: boolean;
  /** See-through display glasses (XREAL, VITURE, …): hide the camera image, draw effects only */
  glasses: boolean;
  /** alignment of the drawn effects with the real view through the glasses */
  glassesCal: GlassesCal;
  /** the player has aligned the glasses at least once */
  glassesAligned: boolean;
  /** shooter aiming with relative drags – the phone works like a laptop touchpad */
  touchpad: boolean;
  /** play rounds inside the headset view (WebXR) when the browser offers it */
  headset: boolean;
  /** headset view: floating screen or AR overlay on the real cars */
  xrView: XrView;
  /** AR-overlay alignment (scale, shift) */
  xrCal: GlassesCal;
  /** chosen camera (deviceId), '' = automatic */
  cameraId: string;
}

export const DEFAULT_SETTINGS: SettingsData = {
  lang: 'de',
  sound: true,
  music: true,
  sfxVolume: 80,
  musicVolume: 60,
  battery: false,
  haptics: true,
  hfovDeg: 69,
  invertPan: false,
  invertTilt: false,
  cameraLatencyMs: 80,
  debug: false,
  nickname: '',
  poleDetector: false,
  stretchFill: true,
  roundSeconds: 60,
  showBoxes: false,
  safetyAcceptedAt: 0,
  difficulty: 1,
  leftHanded: false,
  glasses: false,
  glassesCal: { k: 1, dx: 0, dy: 0 },
  glassesAligned: false,
  touchpad: false,
  headset: false,
  xrView: 'screen',
  xrCal: { k: 1, dx: 0, dy: 0 },
  cameraId: '',
};

/** Keeps a stored calibration inside sane bounds (old or hand-edited storage). */
export function sanitizeCal(c: Partial<GlassesCal> | null | undefined): GlassesCal {
  const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
  return { k: num(c?.k, 1, CAL_LIMITS.kMin, CAL_LIMITS.kMax), dx: num(c?.dx, 0, -CAL_LIMITS.shift, CAL_LIMITS.shift), dy: num(c?.dy, 0, -CAL_LIMITS.shift, CAL_LIMITS.shift) };
}

export const CAL_LIMITS = { kMin: 0.4, kMax: 4, shift: 0.6 };

export class Settings {
  data: SettingsData;
  constructor(private readonly storage: Storage) {
    this.data = { ...DEFAULT_SETTINGS, ...storage.get<Partial<SettingsData>>('settings.v1', {}) };
    this.data.glassesCal = sanitizeCal(this.data.glassesCal);
    this.data.xrCal = sanitizeCal(this.data.xrCal);
    if (this.data.xrView !== 'overlay') this.data.xrView = 'screen';
  }
  onChange: (() => void) | null = null;

  patch(p: Partial<SettingsData>): void {
    Object.assign(this.data, p);
    this.storage.set('settings.v1', this.data);
    this.onChange?.();
  }
}
