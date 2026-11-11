import { Group, type Mesh, type Object3D } from 'three';
import { GRID, PAINTS, type Build } from '@/features/creative/build';
import { BaseWorld } from '../BaseWorld';
import { cloud, flower, PAL, sea, tile, tree, voxel } from '../kit';
import { gridToWorld } from '../math';

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

/**
 * Creative World: a 6×6 building plot on a floating meadow. Tapping a
 * column (its ground tile or any block in it) is handled by the screen,
 * which updates the build; `sync` then adds or removes blocks here.
 */
export class CreativeWorld extends BaseWorld {
  private turntable = new Group();
  private ground: Object3D[] = [];
  private blocks = new Map<string, { mesh: Mesh; paint: number }>();
  private turn = 0;

  constructor() {
    super('#FFE4F1');
    for (let z = 0; z < GRID; z++) {
      for (let x = 0; x < GRID; x++) {
        const p = gridToWorld(x, z, GRID);
        const t = tile((x + z) % 2 ? PAL.grass : PAL.grassDark);
        t.position.set(p.x, 0, p.z);
        t.userData.pick = { x, z };
        this.ground.push(t);
        this.turntable.add(t);
      }
    }
    // A rim of meadow so the plot reads as a place, not a board.
    const rim = GRID / 2 + 0.5;
    for (let i = -GRID / 2 - 0.5; i <= rim; i += 1) {
      for (const [x, z] of [[i, -rim], [i, rim], [-rim, i], [rim, i]] as [number, number][]) {
        const t = tile('#A7E37F', PAL.dirt);
        t.position.set(x, -0.08, z);
        this.turntable.add(t);
      }
    }
    for (const [x, z, s] of [[-rim, -rim, 1.1], [rim, -rim + 1, 0.9], [rim, rim, 1]] as const) {
      const t = tree(s);
      t.position.set(x, -0.08, z);
      this.turntable.add(t);
    }
    for (const [x, z, c] of [[-rim, 1, PAL.coral], [1.5, rim, PAL.gold], [rim, -0.5, PAL.violet]] as const) {
      const f = flower(c);
      f.position.set(x, -0.08, z);
      this.turntable.add(f);
    }
    const c = cloud();
    c.position.set(-3, 4, -5);
    this.scene.add(this.turntable, c, sea());

    this.focus.set(0, 0.8, 0);
    this.radius = GRID * 0.62 + 0.8;
    this.viewDir.set(0.5, 0.75, 1);
  }

  pickables() {
    return [...this.ground, ...[...this.blocks.values()].map((b) => b.mesh)];
  }

  /** Makes the scene match the build: new blocks drop in, removed ones pop out. */
  sync(build: Build) {
    const want = new Map(build.map((b) => [key(b.x, b.y, b.z), b]));
    for (const [k, b] of this.blocks) {
      const w = want.get(k);
      if (!w || w.paint !== b.paint) {
        this.turntable.remove(b.mesh);
        this.blocks.delete(k);
      }
    }
    for (const [k, b] of want) {
      if (this.blocks.has(k)) continue;
      const m = voxel(PAINTS[b.paint]!.color);
      const p = gridToWorld(b.x, b.z, GRID);
      const y = b.y + 0.49;
      m.position.set(p.x, y + 1.2, p.z);
      m.userData.pick = { x: b.x, z: b.z };
      this.turntable.add(m);
      this.blocks.set(k, { mesh: m, paint: b.paint });
      void this.tweens.play({ duration: 0.22, ease: (t) => t * t, update: (t) => (m.position.y = y + 1.2 * (1 - t)) });
    }
  }

  /** Turn the plot a quarter at a time (buttons, so it works for everyone). */
  async rotate(dir: 1 | -1) {
    const from = this.turn;
    this.turn += (dir * Math.PI) / 2;
    const to = this.turn;
    await this.tweens.play({ duration: 0.35, update: (t) => (this.turntable.rotation.y = from + (to - from) * t) });
  }

  async celebrate() {
    const y0 = this.turntable.position.y;
    await this.tweens.play({ duration: 0.6, update: (t) => (this.turntable.position.y = y0 + Math.sin(t * Math.PI * 2) * 0.12 * (1 - t)) });
  }
}
