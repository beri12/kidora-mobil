import { Group, type Object3D } from 'three';
import type { Dir, Move } from '@/api/games';
import { BaseWorld, hashString, seeded } from '../BaseWorld';
import { cloud, crate, flower, gem, PAL, pad, robot, sea, tile, tree, building } from '../kit';
import { bumpTarget, DIR_YAW, failingBlock, gridToWorld, pathSteps, shortestTurn } from '../math';

export interface GridSetup {
  size: number;
  start: [number, number];
  dir: Dir;
  goal: [number, number];
  walls: [number, number][];
  items: [number, number][];
}

/**
 * Coding City: Kibo on a floating island. Crates block squares, energy cells
 * must be collected, the charging pad is the goal. The robot only ever moves
 * along the path the server returned for the child's program.
 */
export class RobotRouteWorld extends BaseWorld {
  private bot: Group;
  private items = new Map<string, Group>();
  private spinners: Object3D[] = [];
  private pulse: Object3D | null = null;
  private star: Object3D | null = null;
  private idle = true;
  private time = 0;

  constructor(private setup: GridSetup, seedKey: string) {
    super('#CDE8FF');
    const rnd = seeded(hashString(seedKey));
    const { size } = setup;
    const key = (x: number, y: number) => `${x},${y}`;
    const walls = new Set(setup.walls.map(([x, y]) => key(x, y)));
    const items = new Set(setup.items.map(([x, y]) => key(x, y)));

    const island = new Group();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const p = gridToWorld(x, y, size);
        const t = tile((x + y) % 2 ? PAL.grass : PAL.grassDark);
        t.position.set(p.x, 0, p.z);
        island.add(t);
        const k = key(x, y);
        if (walls.has(k)) {
          const c = crate();
          c.position.set(p.x, 0, p.z);
          c.rotation.y = (rnd() - 0.5) * 0.4;
          island.add(c);
        } else if (items.has(k)) {
          const g = gem(PAL.cyan);
          g.position.set(p.x, 0, p.z);
          this.items.set(k, g);
          this.spinners.push(g.getObjectByName('spin')!);
          island.add(g);
        } else if (!(x === setup.goal[0] && y === setup.goal[1]) && !(x === setup.start[0] && y === setup.start[1]) && rnd() < 0.18) {
          const f = flower([PAL.coral, PAL.gold, PAL.violet][Math.floor(rnd() * 3)]);
          f.position.set(p.x + (rnd() - 0.5) * 0.5, 0, p.z + (rnd() - 0.5) * 0.5);
          island.add(f);
        }
      }
    }
    const goal = gridToWorld(setup.goal[0], setup.goal[1], size);
    const g = pad();
    g.position.set(goal.x, 0, goal.z);
    this.pulse = g.getObjectByName('pulse') ?? null;
    island.add(g);

    // City scenery off the island: never on a playable square.
    const edge = size / 2 + 1.2;
    const scenery: [Object3D, number, number][] = [
      [building(1.6, PAL.violet), -edge, -edge + 0.5],
      [building(2.2, '#60A5FA'), edge - 0.4, -edge],
      [tree(1.1), -edge + 0.2, edge - 0.6],
      [tree(0.9), edge, edge - 1.2],
    ];
    for (const [obj, x, z] of scenery) {
      // Each sits on its own little floating tile, clearly apart from the board.
      const base = tile(PAL.grassDark);
      base.position.set(x, -0.6, z);
      obj.position.set(x, -0.6, z);
      island.add(base, obj);
    }
    const c1 = cloud();
    c1.position.set(-size * 0.6, 3.2, -size);
    const c2 = cloud();
    c2.position.set(size * 0.7, 2.6, -size * 0.8);
    c2.scale.setScalar(0.8);
    this.scene.add(island, c1, c2, sea());

    this.bot = robot();
    this.bot.scale.setScalar(1.3);
    this.star = this.bot.getObjectByName('antennaStar') ?? null;
    this.scene.add(this.bot);
    this.reset();

    this.radius = size * 0.62 + 0.3;
    this.focus.set(0, -0.35, 0.2);
  }

  /** Back to the start, every cell restored: each run replays from scratch. */
  reset() {
    this.tweens.flush();
    const p = gridToWorld(this.setup.start[0], this.setup.start[1], this.setup.size);
    this.bot.position.set(p.x, 0, p.z);
    this.bot.rotation.set(0, DIR_YAW[this.setup.dir], 0);
    for (const g of this.items.values()) {
      g.visible = true;
      g.scale.setScalar(1);
    }
    this.idle = true;
  }

  update(dt: number) {
    this.time += dt;
    for (const s of this.spinners) s.rotation.y += dt * 1.6;
    if (this.pulse) this.pulse.scale.setScalar(1 + Math.sin(this.time * 3) * (this.tweens.calm ? 0 : 0.06));
    if (this.star) this.star.rotation.y += dt * 2;
    if (this.idle && !this.tweens.calm) this.bot.position.y = Math.abs(Math.sin(this.time * 2.2)) * 0.03;
  }

  /**
   * Replays the server's run. `onStep(i)` fires as block i starts, so the
   * program row can light it up. Resolves when the robot has finished.
   */
  async play(program: Move[], path: { x: number; y: number; dir: Dir }[], ok: boolean, onStep: (block: number | null) => void) {
    this.reset();
    this.idle = false;
    const size = this.setup.size;
    for (const step of pathSteps(path)) {
      onStep(step.block);
      if (step.kind === 'turn') {
        const from = this.bot.rotation.y;
        const delta = shortestTurn(from, DIR_YAW[step.to.dir]);
        await this.tweens.play({ duration: 0.28, update: (t) => (this.bot.rotation.y = from + delta * t) });
      } else {
        const a = gridToWorld(step.from.x, step.from.y, size);
        const b = gridToWorld(step.to.x, step.to.y, size);
        await this.tweens.play({
          duration: 0.4,
          update: (t) => {
            this.bot.position.set(a.x + (b.x - a.x) * t, Math.sin(Math.PI * t) * 0.14, a.z + (b.z - a.z) * t);
          },
        });
        const cell = this.items.get(`${step.to.x},${step.to.y}`);
        if (cell?.visible) void this.collect(cell);
      }
    }

    const bad = failingBlock(program, path.length);
    if (!ok && bad !== null && program[bad] === 'F') {
      onStep(bad);
      await this.bump(path[path.length - 1]!);
    } else if (ok) {
      onStep(null);
      await this.celebrate();
    } else {
      onStep(null);
      await this.shrug();
    }
    this.idle = true;
  }

  private async collect(cell: Group) {
    await this.tweens.play({
      duration: 0.35,
      update: (t) => {
        cell.scale.setScalar(1 + t * 0.4 - t * t * 1.4);
        cell.position.y = t * 0.5;
      },
    });
    cell.visible = false;
    cell.position.y = 0;
  }

  /** Lean into the blocked square and spring back: "something is in the way". */
  private async bump(at: { x: number; y: number; dir: Dir }) {
    const size = this.setup.size;
    const a = gridToWorld(at.x, at.y, size);
    const t2 = bumpTarget(at);
    const b = gridToWorld(t2.x, t2.y, size);
    const go = (k: number) => this.bot.position.set(a.x + (b.x - a.x) * k, 0, a.z + (b.z - a.z) * k);
    await this.tweens.play({ duration: 0.15, update: (t) => go(t * 0.3) });
    await this.tweens.play({ duration: 0.25, update: (t) => go(0.3 * (1 - t)) });
    await this.shrug();
  }

  private async shrug() {
    const y = this.bot.rotation.y;
    await this.tweens.play({ duration: 0.5, update: (t) => (this.bot.rotation.y = y + Math.sin(t * Math.PI * 4) * 0.25 * (1 - t)) });
  }

  private async celebrate() {
    const base = this.bot.rotation.y;
    await this.tweens.play({
      duration: 0.9,
      update: (t) => {
        this.bot.position.y = Math.abs(Math.sin(t * Math.PI * 2)) * 0.35;
        this.bot.rotation.y = base + t * Math.PI * 2;
      },
    });
  }
}
