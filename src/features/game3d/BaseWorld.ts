import { PerspectiveCamera, Vector3, type Object3D, type Scene } from 'three';
import type { StageController } from './GLStage';
import { disposeTree, makeScene } from './kit';
import { fitDistance } from './math';
import { Tweens } from './tween';

const FOV = 42;

/** Camera, framing and teardown shared by every Kidora world. */
export abstract class BaseWorld implements StageController {
  readonly scene: Scene;
  readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 120);
  readonly tweens = new Tweens();
  /** What the camera looks at, and the radius that must stay in view. */
  protected focus = new Vector3();
  protected radius = 4;
  /** Direction from the focus towards the camera (normalised in resize). */
  protected viewDir = new Vector3(0.45, 0.85, 1);
  private size = { width: 1, height: 1 };

  constructor(sky?: string) {
    this.scene = makeScene(sky);
  }

  resize(width: number, height: number) {
    this.size = { width, height };
    const aspect = width / Math.max(height, 1);
    this.camera.aspect = aspect;
    const d = fitDistance(this.radius, FOV, aspect);
    const dir = this.viewDir.clone().normalize();
    this.camera.position.copy(this.focus).addScaledVector(dir, d);
    this.camera.lookAt(this.focus);
    this.camera.updateProjectionMatrix();
  }

  /** Screen position (in the stage's own points) of a world point, for RN labels over the 3D view. */
  project(obj: Object3D, layout: { width: number; height: number }, lift = 0): { x: number; y: number } {
    this.camera.updateMatrixWorld();
    const v = new Vector3();
    obj.getWorldPosition(v);
    v.y += lift;
    v.project(this.camera);
    return { x: ((v.x + 1) / 2) * layout.width, y: ((1 - v.y) / 2) * layout.height };
  }

  dispose() {
    this.tweens.flush();
    disposeTree(this.scene);
  }

  protected get aspect() {
    return this.size.width / Math.max(this.size.height, 1);
  }
}

/** Deterministic random (mulberry32) so a level's decorations look the same every time. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable number from any string (challenge id), for seeding decorations. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
