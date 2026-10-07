import type { Storage } from './Storage';

export interface SettingsData {
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
}

export const DEFAULT_SETTINGS: SettingsData = {
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
};

export class Settings {
  data: SettingsData;
  constructor(private readonly storage: Storage) {
    this.data = { ...DEFAULT_SETTINGS, ...storage.get<Partial<SettingsData>>('settings.v1', {}) };
  }
  onChange: (() => void) | null = null;

  patch(p: Partial<SettingsData>): void {
    Object.assign(this.data, p);
    this.storage.set('settings.v1', this.data);
    this.onChange?.();
  }
}
