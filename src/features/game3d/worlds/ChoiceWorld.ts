import { Group, Mesh, CircleGeometry, type Object3D } from 'three';
import type { World } from '@/api/learning';
import { BaseWorld, hashString, seeded } from '../BaseWorld';
import { bush, chest, cloud, coin, crystal, flower, mat, PAL, robot, sea, stela, steppingStone, terminal, tile, tree } from '../kit';
import { choiceSlots, gridToWorld } from '../math';

/** One colour per answer, shared by the 3D object and its card below the scene. */
export const OPTION_COLORS = ['#F43F5E', '#0EA5E9', '#F59E0B', '#22C55E', '#A78BFA', '#EC4899'] as const;

interface Theme {
  sky: string;
  ground: [string, string];
  side: string;
  make: (accent: string) => Group;
  /** Extra props around the stage. */
  decorate: (root: Group, rnd: () => number, half: number) => void;
  water?: boolean;
}

const forestDecor = (root: Group, rnd: () => number, half: number) => {
  for (let i = 0; i < 6; i++) {
    const t = tree(0.8 + rnd() * 0.5);
    const side = i % 2 ? 1 : -1;
    t.position.set(side * (half + 0.2 + rnd() * 0.8), 0, -1.8 + rnd() * 3);
    root.add(t);
  }
  for (let i = 0; i < 5; i++) {
    const b = bush();
    b.position.set((rnd() - 0.5) * half * 2, 0, 1.4 + rnd() * 0.6);
    root.add(b);
  }
};

/** Each learning world dresses the same "choose the right one" mechanic in its own place. */
export const THEMES: Record<World, Theme> = {
  MATH_ISLAND: {
    sky: '#CDE8FF',
    ground: ['#F6DFA4', '#EFD08A'],
    side: '#C9A46A',
    make: chest,
    decorate: (root, rnd, half) => {
      for (const s of [-1, 1]) {
        const t = tree(1.1);
        t.position.set(s * (half + 0.4), 0, -1.5 + rnd());
        root.add(t);
      }
      for (let i = 0; i < 4; i++) {
        const f = flower([PAL.coral, PAL.gold][i % 2]);
        f.position.set((rnd() - 0.5) * half * 2, 0, 1.6 + rnd() * 0.5);
        root.add(f);
      }
    },
  },
  READING_FOREST: { sky: '#D7F5E1', ground: [PAL.grass, PAL.grassDark], side: PAL.dirt, make: steppingStone, decorate: forestDecor, water: true },
  SCIENCE_PLANET: {
    sky: '#DCD6FF',
    ground: ['#E0E7FF', '#C7D2FE'],
    side: '#6366F1',
    make: crystal,
    decorate: (root, rnd, half) => {
      for (const [x, y, r, c] of [[-half, 3.2, 0.5, '#F9A8D4'], [half + 0.5, 3.8, 0.35, '#FDE68A']] as const) {
        const p = new Mesh(new CircleGeometry(r, 18), mat(c));
        p.position.set(x, y, -3);
        root.add(p);
      }
      void rnd;
    },
  },
  HISTORY_WORLD: {
    sky: '#FFE8C7',
    ground: ['#F2D29B', '#E8C285'],
    side: '#B08350',
    make: stela,
    decorate: (root, rnd, half) => {
      for (let i = 0; i < 3; i++) {
        const b = bush();
        b.position.set((i - 1) * half * 0.9, 0, 1.7 + rnd() * 0.3);
        root.add(b);
      }
    },
  },
  CODING_CITY: {
    sky: '#CFE0FF',
    ground: ['#C7D2FE', '#A5B4FC'],
    side: '#4F46E5',
    make: terminal,
    decorate: (root, rnd, half) => forestDecor(root, rnd, half),
  },
  ART_VALLEY: { sky: '#FFE4F1', ground: [PAL.grass, PAL.grassDark], side: PAL.dirt, make: chest, decorate: forestDecor },
};

/**
 * One scene for every multiple-choice challenge: the answers stand in a row
 * as world objects (treasure chests on Math Island, stepping stones in
 * Reading Forest, crystals on Science Planet, stelae in History World,
 * terminals in Coding City). Kibo stands in front and reacts to the
 * server's verdict: the app never knows the right answer in advance.
 */
export class ChoiceWorld extends BaseWorld {
  readonly options: Group[] = [];
  private bot: Group;
  private spinners: Object3D[] = [];
  private botHome = { x: 0, z: 2.1 };
  private time = 0;

  constructor(world: World, count: number, seedKey: string) {
    const theme = THEMES[world] ?? THEMES.MATH_ISLAND;
    super(theme.sky);
    const rnd = seeded(hashString(seedKey));
    const slots = choiceSlots(count);
    const half = Math.max(2.2, ((count - 1) * 1.7) / 2 + 1);

    const root = new Group();
    const cols = Math.ceil(half * 2) + 1;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < cols; c++) {
        const p = gridToWorld(c, r, cols);
        const water = theme.water && r === 1;
        const t = tile(water ? PAL.water : theme.ground[(r + c) % 2]!, theme.side);
        t.position.set(p.x, water ? -0.06 : 0, r - 1.2);
        root.add(t);
      }
    }
    theme.decorate(root, rnd, half);

    slots.forEach((s, i) => {
      const o = theme.make(OPTION_COLORS[i % OPTION_COLORS.length]!);
      o.position.set(s.x, theme.water ? -0.12 : 0, s.z - 0.2);
      o.userData.pick = { index: i };
      const spin = o.getObjectByName('spin');
      if (spin) this.spinners.push(spin);
      this.options.push(o);
      root.add(o);
    });

    this.bot = robot();
    this.bot.position.set(this.botHome.x, 0, this.botHome.z);
    this.bot.rotation.y = Math.PI; // facing the answers
    const c = cloud();
    c.position.set(-half, 3.4, -4);
    this.scene.add(root, this.bot, c, sea());

    this.focus.set(0, 0.45, 0.4);
    this.radius = half * 0.78 + 0.3;
    this.viewDir.set(0, 0.6, 1);
  }

  pickables() {
    return this.options;
  }

  update(dt: number) {
    this.time += dt;
    for (const s of this.spinners) s.rotation.y += dt * 1.2;
    if (!this.tweens.calm) this.bot.position.y = Math.abs(Math.sin(this.time * 2)) * 0.03;
  }

  /** The server said no: the object shakes and sinks a little, and stays that way. */
  async wrong(index: number) {
    const o = this.options[index];
    if (!o) return;
    const x = o.position.x;
    const y = o.position.y;
    await this.tweens.play({ duration: 0.45, update: (t) => (o.position.x = x + Math.sin(t * Math.PI * 6) * 0.08 * (1 - t)) });
    await this.tweens.play({ duration: 0.3, update: (t) => (o.position.y = y - 0.18 * t) });
  }

  /** The server said yes: Kibo hops over, the chest opens / crystal rises, coins burst out. */
  async correct(index: number) {
    const o = this.options[index];
    if (!o) return;
    const from = { x: this.bot.position.x, z: this.bot.position.z };
    const to = { x: o.position.x, z: o.position.z + 0.9 };
    await this.tweens.play({
      duration: 0.55,
      update: (t) => this.bot.position.set(from.x + (to.x - from.x) * t, Math.sin(Math.PI * t) * 0.4, from.z + (to.z - from.z) * t),
    });
    const lid = o.getObjectByName('lid');
    const coins = Array.from({ length: 8 }, (_, i) => {
      const c = coin();
      c.position.set(o.position.x, o.position.y + 0.5, o.position.z);
      c.userData.v = { x: Math.cos((i / 8) * Math.PI * 2) * 0.9, y: 2.2 + (i % 3) * 0.4, z: Math.sin((i / 8) * Math.PI * 2) * 0.5 };
      this.scene.add(c);
      return c;
    });
    const y0 = o.position.y;
    await this.tweens.play({
      duration: 0.9,
      ease: (t) => t,
      update: (t) => {
        if (lid) lid.rotation.x = -1.9 * Math.min(1, t * 2.5);
        else o.position.y = y0 + Math.sin(Math.min(1, t * 2) * Math.PI / 2) * 0.35;
        for (const c of coins) {
          const v = c.userData.v as { x: number; y: number; z: number };
          c.position.set(o.position.x + v.x * t, o.position.y + 0.5 + v.y * t - 3.2 * t * t, o.position.z + v.z * t);
          c.rotation.z += 0.3;
        }
      },
    });
    for (const c of coins) {
      this.scene.remove(c);
      c.geometry.dispose();
    }
    const base = this.bot.rotation.y;
    await this.tweens.play({ duration: 0.6, update: (t) => (this.bot.rotation.y = base + t * Math.PI * 2) });
  }
}
