import { clamp01, easeInOut } from './math';

/**
 * A tiny tween runner stepped by the render loop (no timers). Scenes use it
 * to move the robot, open a chest, fly a projectile. `calm` (reduce motion)
 * finishes every tween on the next frame, so the end state is shown without
 * the movement.
 */
export interface TweenSpec {
  duration: number;
  update: (t: number) => void;
  ease?: (t: number) => number;
}

interface Running extends TweenSpec {
  elapsed: number;
  resolve: () => void;
}

export class Tweens {
  private running: Running[] = [];
  calm = false;
  /**
   * True while a render loop is stepping these tweens. Without one (the 3D
   * view not started yet, or already torn down) a tween applies its end
   * value at once, so game logic waiting on an animation never hangs.
   */
  private live = false;

  setCalm(on: boolean) {
    this.calm = on;
  }

  setLive(on: boolean) {
    this.live = on;
    if (!on) this.flush();
  }

  /** Resolves when the tween has applied its final value. */
  play(spec: TweenSpec): Promise<void> {
    if (!this.live) {
      spec.update((spec.ease ?? easeInOut)(1));
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.running.push({ ...spec, elapsed: 0, resolve });
    });
  }

  /** Runs tweens one after another. */
  async sequence(specs: TweenSpec[]): Promise<void> {
    for (const s of specs) await this.play(s);
  }

  wait(seconds: number): Promise<void> {
    return this.play({ duration: seconds, update: () => undefined });
  }

  get busy() {
    return this.running.length > 0;
  }

  step(dt: number) {
    if (!this.running.length) return;
    const finished: Running[] = [];
    for (const r of this.running) {
      r.elapsed += this.calm ? Number.POSITIVE_INFINITY : dt;
      const raw = r.duration <= 0 ? 1 : clamp01(r.elapsed / r.duration);
      r.update((r.ease ?? easeInOut)(raw));
      if (raw >= 1) finished.push(r);
    }
    if (finished.length) {
      this.running = this.running.filter((r) => !finished.includes(r));
      for (const f of finished) f.resolve();
    }
  }

  /** Ends everything at its final value (used when a scene is torn down mid-animation). */
  flush() {
    while (this.running.length) this.step(Number.POSITIVE_INFINITY);
  }
}
