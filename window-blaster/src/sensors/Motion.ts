import { Emitter } from '../core/events';

export interface RotationSample {
  /** Angular rates in rad/s in CAMERA IMAGE axes: pan = yaw (image x), tilt = pitch (image y), roll = about the optical axis. */
  pan: number;
  tilt: number;
  roll: number;
  /** ms, performance.now() domain */
  t: number;
}

type MotionEvents = { sample: RotationSample; status: string };

interface DeviceMotionEventStatic {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

/**
 * Gyroscope access via DeviceMotionEvent.rotationRate, mapped from device axes
 * to camera-image axes according to the current screen orientation.
 *
 * Device frame (W3C): x → right (portrait), y → up, z → out of the screen.
 * rotationRate.alpha = about z, beta = about x, gamma = about y (deg/s).
 * Rear camera looks along -z. In portrait, image-x = device-x and image-y = -device-y.
 * Rotation about device y (gamma) pans the image horizontally; about device x (beta) tilts it.
 */
export class Motion {
  readonly events = new Emitter<MotionEvents>();
  status: 'idle' | 'granted' | 'denied' | 'unsupported' | 'silent' = 'idle';
  private handler: ((e: DeviceMotionEvent) => void) | null = null;
  private lastEventAt = 0;
  samples = 0;
  invertPan = false;
  invertTilt = false;

  static get needsPermission(): boolean {
    return typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as unknown as DeviceMotionEventStatic).requestPermission === 'function';
  }

  /** Must be called synchronously from a user gesture on iOS. */
  requestPermission(): Promise<boolean> {
    if (typeof DeviceMotionEvent === 'undefined') {
      this.status = 'unsupported';
      return Promise.resolve(false);
    }
    const rp = (DeviceMotionEvent as unknown as DeviceMotionEventStatic).requestPermission;
    if (typeof rp !== 'function') {
      this.status = 'granted';
      return Promise.resolve(true);
    }
    return rp
      .call(DeviceMotionEvent)
      .then((r) => {
        this.status = r === 'granted' ? 'granted' : 'denied';
        return this.status === 'granted';
      })
      .catch(() => {
        this.status = 'denied';
        return false;
      });
  }

  start(): void {
    if (this.handler || typeof window === 'undefined') return;
    this.handler = (e: DeviceMotionEvent) => {
      const rr = e.rotationRate;
      if (!rr || rr.alpha === null || rr.beta === null || rr.gamma === null) return;
      const t = performance.now();
      this.lastEventAt = t;
      this.samples++;
      const D = Math.PI / 180;
      const a = rr.alpha * D; // about device z
      const b = rr.beta * D; // about device x
      const g = rr.gamma * D; // about device y
      const angle = screenAngle();
      // Map device axes into image axes for the current orientation.
      let pan: number;
      let tilt: number;
      switch (angle) {
        case 90: // landscape, home button right (device x points down)
          pan = b;
          tilt = -g;
          break;
        case -90:
        case 270: // landscape, home button left
          pan = -b;
          tilt = g;
          break;
        case 180:
          pan = -g;
          tilt = -b;
          break;
        default: // portrait
          pan = g;
          tilt = b;
      }
      if (this.invertPan) pan = -pan;
      if (this.invertTilt) tilt = -tilt;
      this.events.emit('sample', { pan, tilt, roll: a, t });
    };
    window.addEventListener('devicemotion', this.handler);
    setTimeout(() => {
      if (this.samples === 0 && this.status !== 'denied') {
        this.status = 'silent';
        this.events.emit('status', 'silent');
      }
    }, 2500);
  }

  stop(): void {
    if (this.handler) window.removeEventListener('devicemotion', this.handler);
    this.handler = null;
  }

  get alive(): boolean {
    return performance.now() - this.lastEventAt < 1000;
  }
}

export function screenAngle(): number {
  const so = (screen as unknown as { orientation?: { angle?: number } }).orientation;
  if (so && typeof so.angle === 'number') return so.angle;
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === 'number' ? legacy : 0;
}
