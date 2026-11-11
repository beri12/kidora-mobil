import { CircleGeometry, Group, Mesh, SphereGeometry, type Object3D } from 'three';
import { BaseWorld } from '../BaseWorld';
import { ball, cloud, flag, launcher, mat, PAL, tile } from '../kit';
import { arcPeak, arcPoints } from '../math';

export interface LaunchSetup {
  gravity: number;
  target: [number, number];
  power: [number, number];
  angle: [number, number];
}

const FIELD = 10; // world units for the longest possible shot
const MAX_HEIGHT = 4.2; // arcs taller than this are drawn squashed so they stay on screen

/**
 * Science Planet: the Launch Lab. A cannon on a strip of planet ground, a
 * target zone, and a ball that lands exactly where the server says. Earlier
 * shots leave markers, so children can compare and adjust (the experiment
 * loop: predict, launch, observe, change one thing).
 */
export class LaunchWorld extends BaseWorld {
  private barrel: Object3D;
  private shot: Mesh;
  private scale: number;
  private fieldMetres: number;
  private markers: Mesh[] = [];
  private planets: Object3D[] = [];

  constructor(private setup: LaunchSetup) {
    super('#DCD6FF');
    // The field is sized to the target, not to the cannon's longest possible shot:
    // the zone should sit in the middle of the screen. Longer shots fly off the end.
    this.fieldMetres = setup.target[1] * 1.6;
    this.scale = FIELD / this.fieldMetres;

    const ground = new Group();
    const tiles = Math.ceil(FIELD) + 3;
    for (let i = -1; i < tiles; i++) {
      for (const z of [-0.5, 0.5]) {
        const metre0 = i / this.scale;
        const inZone = metre0 + 0.5 / this.scale >= setup.target[0] && metre0 - 0.5 / this.scale <= setup.target[1];
        const t = tile(inZone ? PAL.mint : i % 2 ? '#A5B4FC' : '#C7D2FE', '#6366F1');
        t.position.set(i, 0, z);
        ground.add(t);
      }
    }
    // The exact target zone, drawn on top of the tiles.
    const zone = new Mesh(new CircleGeometry(1, 24), mat(PAL.grass, { transparent: 0.55 }));
    zone.rotation.x = -Math.PI / 2;
    const mid = ((setup.target[0] + setup.target[1]) / 2) * this.scale;
    zone.position.set(mid, 0.02, 0);
    zone.scale.set(((setup.target[1] - setup.target[0]) / 2) * this.scale, 0.9, 1);
    const goal = flag(PAL.coral);
    goal.position.set(mid, 0, -0.75);
    ground.add(zone, goal);

    const gun = launcher();
    this.barrel = gun.getObjectByName('barrel')!;
    this.shot = ball();
    this.shot.visible = false;

    // A few planets in the sky: this is Science Planet.
    for (const [x, y, z, r, c] of [
      [2, 4.5, -6, 0.7, '#F9A8D4'],
      [8.5, 3.6, -7, 0.45, '#FDE68A'],
      [-2.5, 3.2, -5, 0.35, '#67E8F9'],
    ] as const) {
      const p = new Mesh(new SphereGeometry(r, 14, 10), mat(c));
      p.position.set(x, y, z);
      this.planets.push(p);
      this.scene.add(p);
    }
    const c = cloud();
    c.position.set(5, 2.4, -4);
    this.scene.add(ground, gun, this.shot, c);

    this.setAngle((setup.angle[0] + setup.angle[1]) / 2);
    this.focus.set(FIELD / 2 - 0.4, 1.0, 0);
    this.radius = FIELD / 2 * 0.82;
    this.viewDir.set(0.08, 0.32, 1);
  }

  /** Live feedback while choosing: the barrel follows the angle stepper. */
  setAngle(deg: number) {
    this.barrel.rotation.z = (deg * Math.PI) / 180;
  }

  update(dt: number) {
    for (const p of this.planets) p.rotation.y += dt * 0.4;
  }

  /** Flies the ball to the server's distance (metres). */
  async launch(angleDeg: number, distance: number, inZone: boolean) {
    this.setAngle(angleDeg);
    const peak = arcPeak(angleDeg, distance) * this.scale;
    const squash = peak > MAX_HEIGHT ? MAX_HEIGHT / peak : 1;
    const pts = arcPoints(angleDeg, distance, 40).map((p) => ({ x: p.x * this.scale, y: p.y * this.scale * squash }));
    // Leaves the muzzle, not the ground.
    const muzzleY = 0.4;
    this.shot.visible = true;
    // Recoil.
    const r0 = this.barrel.position.x;
    await this.tweens.play({ duration: 0.12, update: (t) => (this.barrel.position.x = r0 - Math.sin(t * Math.PI) * 0.12) });
    const flight = 0.6 + Math.min(1.2, distance * this.scale * 0.12);
    await this.tweens.play({
      duration: flight,
      ease: (t) => t,
      update: (t) => {
        const f = t * (pts.length - 1);
        const i = Math.min(Math.floor(f), pts.length - 2);
        const k = f - i;
        const a = pts[i]!;
        const b = pts[i + 1]!;
        this.shot.position.set(a.x + (b.x - a.x) * k, muzzleY * (1 - t) + a.y + (b.y - a.y) * k + 0.16, 0);
      },
    });
    // A marker where it landed: green in the zone, coral outside. The last three stay.
    const m = new Mesh(new CircleGeometry(0.18, 14), mat(inZone ? PAL.grass : PAL.coral));
    m.rotation.x = -Math.PI / 2;
    // A shot past the end of the field is marked at the edge (the text gives the real distance).
    m.position.set(Math.min(distance, this.fieldMetres + 1 / this.scale) * this.scale, 0.03, 0.25);
    this.scene.add(m);
    this.markers.push(m);
    if (this.markers.length > 3) {
      const old = this.markers.shift()!;
      this.scene.remove(old);
      old.geometry.dispose();
    }
    await this.tweens.play({ duration: 0.25, update: (t) => (this.shot.position.y = 0.16 + Math.sin(t * Math.PI) * 0.2 * (1 - t)) });
    this.shot.visible = false;
  }
}
