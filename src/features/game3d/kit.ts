/**
 * Kidora's low-poly 3D kit: every model is built from a handful of simple
 * shapes and flat colours. No textures or model files to download, so the
 * worlds load instantly, work offline and stay light on affordable phones.
 * Colours come from the Kidora palette (src/theme).
 */
import {
  AmbientLight,
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OctahedronGeometry,
  Scene,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';

export const PAL = {
  sky: '#CFE7FF',
  grass: '#7ED957',
  grassDark: '#5DBB3F',
  dirt: '#9A6B47',
  dirtDark: '#7A5236',
  sand: '#F6DFA4',
  water: '#4FC3F7',
  wood: '#B7793F',
  woodDark: '#8A5A2B',
  leaf: '#2F9E5B',
  leafLight: '#46B96E',
  stone: '#B8B2A7',
  stoneDark: '#8F887C',
  iris: '#6E52F5',
  irisDark: '#4B2ED6',
  white: '#F8FAFC',
  ink: '#1E1B4B',
  gold: '#FBBF24',
  goldDark: '#F59E0B',
  coral: '#F43F5E',
  cyan: '#22D3EE',
  mint: '#34D399',
  violet: '#A78BFA',
  ruby: '#E11D48',
} as const;

/* ------------------------------------------------------------- materials */

const cache = new Map<string, Material>();
/** Shared flat-shaded material per colour: fewer GPU state changes, less memory. */
export function mat(color: string, opts: { emissive?: string; transparent?: number } = {}): Material {
  const key = `${color}|${opts.emissive ?? ''}|${opts.transparent ?? ''}`;
  let m = cache.get(key);
  if (!m) {
    m = new MeshLambertMaterial({
      color: new Color(color),
      flatShading: true,
      emissive: new Color(opts.emissive ?? '#000000'),
      transparent: opts.transparent !== undefined,
      opacity: opts.transparent ?? 1,
    });
    cache.set(key, m);
  }
  return m;
}

function mesh(geo: BufferGeometry, color: string, opts?: { emissive?: string; transparent?: number }) {
  return new Mesh(geo, mat(color, opts));
}

/** Frees geometries of a scene. Materials are shared and live for the app session. */
export function disposeTree(root: Object3D) {
  root.traverse((o) => {
    const g = (o as Mesh).geometry as BufferGeometry | undefined;
    g?.dispose();
  });
}

/* ------------------------------------------------------------ world base */

/** Sky, fog and soft daylight shared by every world. */
export function makeScene(sky: string = PAL.sky): Scene {
  const scene = new Scene();
  scene.background = new Color(sky);
  scene.fog = new Fog(new Color(sky), 18, 42);
  scene.add(new HemisphereLight(new Color('#FFFFFF'), new Color('#7FA77A'), 1.6));
  scene.add(new AmbientLight(new Color('#FFFFFF'), 0.35));
  const sun = new DirectionalLight(new Color('#FFF6E0'), 1.6);
  sun.position.set(4, 9, 6);
  scene.add(sun);
  return scene;
}

/** One grass tile: grass on top, earth below (the "floating island" block). */
export function tile(color: string = PAL.grass, side: string = PAL.dirt): Group {
  const g = new Group();
  const top = mesh(new BoxGeometry(0.96, 0.18, 0.96), color);
  top.position.y = -0.09;
  const base = mesh(new BoxGeometry(0.96, 0.5, 0.96), side);
  base.position.y = -0.43;
  g.add(top, base);
  return g;
}

/** A soft dark disc under a character: cheap stand-in for real shadows. */
export function blobShadow(radius = 0.32): Mesh {
  const m = mesh(new CircleGeometry(radius, 16), '#000000', { transparent: 0.18 });
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.01;
  return m;
}

export function tree(scale = 1): Group {
  const g = new Group();
  const trunk = mesh(new CylinderGeometry(0.06, 0.08, 0.35, 6), PAL.woodDark);
  trunk.position.y = 0.17;
  g.add(trunk);
  [
    [0.42, 0.55, 0.5, PAL.leaf],
    [0.34, 0.5, 0.82, PAL.leafLight],
    [0.24, 0.42, 1.08, PAL.leaf],
  ].forEach(([r, h, y, c]) => {
    const cone = mesh(new ConeGeometry(r as number, h as number, 7), c as string);
    cone.position.y = y as number;
    g.add(cone);
  });
  g.scale.setScalar(scale);
  return g;
}

export function bush(): Mesh {
  const m = mesh(new DodecahedronGeometry(0.2, 0), PAL.leafLight);
  m.position.y = 0.14;
  m.scale.set(1.2, 0.8, 1);
  return m;
}

export function flower(color: string = PAL.coral): Group {
  const g = new Group();
  const stem = mesh(new CylinderGeometry(0.012, 0.012, 0.14, 4), PAL.leaf);
  stem.position.y = 0.07;
  const head = mesh(new SphereGeometry(0.05, 6, 4), color);
  head.position.y = 0.15;
  const eye = mesh(new SphereGeometry(0.022, 6, 4), PAL.gold);
  eye.position.set(0, 0.16, 0.03);
  g.add(stem, head, eye);
  return g;
}

export function cloud(): Group {
  const g = new Group();
  [[0, 0, 0.5], [0.45, -0.05, 0.38], [-0.45, -0.08, 0.36], [0.15, 0.22, 0.34]].forEach(([x, y, r]) => {
    const p = mesh(new SphereGeometry(r!, 8, 6), '#FFFFFF');
    p.position.set(x!, y!, 0);
    g.add(p);
  });
  return g;
}

/* -------------------------------------------------------------- characters */

/**
 * Kibo, Kidora's robot guide: an original design in Kidora colours — a round
 * white head with a dark visor and cyan eyes, an iris-purple body, and a gold
 * star on its antenna (the star of the Kidora logo). Faces +Z.
 */
export function robot(): Group {
  const g = new Group();
  const body = mesh(new CapsuleGeometry(0.17, 0.16, 4, 10), PAL.iris);
  body.position.y = 0.3;
  const belly = mesh(new CircleGeometry(0.09, 12), PAL.white);
  belly.position.set(0, 0.3, 0.171);
  const head = mesh(new SphereGeometry(0.2, 14, 10), PAL.white);
  head.position.y = 0.66;
  const visor = mesh(new BoxGeometry(0.28, 0.13, 0.06), PAL.ink);
  visor.position.set(0, 0.67, 0.17);
  const eyeL = mesh(new SphereGeometry(0.032, 8, 6), PAL.cyan, { emissive: '#0E7490' });
  eyeL.position.set(-0.06, 0.675, 0.2);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.06;
  const stalk = mesh(new CylinderGeometry(0.012, 0.012, 0.14, 5), PAL.stoneDark);
  stalk.position.y = 0.9;
  const star = mesh(new OctahedronGeometry(0.06, 0), PAL.gold, { emissive: '#B45309' });
  star.position.y = 0.99;
  star.name = 'antennaStar';
  const armGeo = new CapsuleGeometry(0.045, 0.14, 3, 6);
  const armL = mesh(armGeo, PAL.white);
  armL.position.set(-0.22, 0.32, 0);
  armL.rotation.z = 0.3;
  const armR = armL.clone();
  armR.position.x = 0.22;
  armR.rotation.z = -0.3;
  const legGeo = new CylinderGeometry(0.05, 0.06, 0.14, 6);
  const legL = mesh(legGeo, PAL.irisDark);
  legL.position.set(-0.08, 0.07, 0);
  const legR = legL.clone();
  legR.position.x = 0.08;
  g.add(blobShadow(0.26), body, belly, head, visor, eyeL, eyeR, stalk, star, armL, armR, legL, legR);
  return g;
}

/* ------------------------------------------------------------------ props */

export function crate(): Group {
  const g = new Group();
  const box = mesh(new BoxGeometry(0.7, 0.7, 0.7), PAL.wood);
  box.position.y = 0.35;
  const band = mesh(new BoxGeometry(0.72, 0.1, 0.72), PAL.woodDark);
  band.position.y = 0.35;
  g.add(box, band);
  return g;
}

/** Coding City block: a little building with lit windows. */
export function building(height = 0.9, color: string = PAL.violet): Group {
  const g = new Group();
  const b = mesh(new BoxGeometry(0.72, height, 0.72), color);
  b.position.y = height / 2;
  g.add(b);
  for (let y = 0.25; y < height - 0.1; y += 0.28) {
    for (const x of [-0.17, 0.17]) {
      const w = mesh(new BoxGeometry(0.14, 0.12, 0.02), PAL.gold, { emissive: '#92400E' });
      w.position.set(x, y, 0.37);
      g.add(w);
    }
  }
  const roof = mesh(new BoxGeometry(0.8, 0.06, 0.8), PAL.irisDark);
  roof.position.y = height + 0.03;
  g.add(roof);
  return g;
}

/** A floating, spinning energy gem. Spin it in update(). */
export function gem(color: string = PAL.ruby): Group {
  const g = new Group();
  const stone = mesh(new OctahedronGeometry(0.17, 0), color, { emissive: '#4C0519' });
  stone.scale.y = 1.3;
  stone.position.y = 0.45;
  stone.name = 'spin';
  g.add(blobShadow(0.15), stone);
  return g;
}

/** The goal: a glowing charging pad. */
export function pad(): Group {
  const g = new Group();
  const base = mesh(new CylinderGeometry(0.4, 0.42, 0.06, 20), PAL.white);
  base.position.y = 0.03;
  const glow = mesh(new CylinderGeometry(0.3, 0.3, 0.07, 20), PAL.mint, { emissive: '#047857' });
  glow.position.y = 0.04;
  const ring = mesh(new TorusGeometry(0.34, 0.025, 6, 24), PAL.gold);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.09;
  ring.name = 'pulse';
  g.add(base, glow, ring);
  return g;
}

/** Treasure chest (Math Island). The lid is a child named "lid" pivoting at the back. */
export function chest(accent: string): Group {
  const g = new Group();
  const box = mesh(new BoxGeometry(0.8, 0.45, 0.55), PAL.wood);
  box.position.y = 0.225;
  const trim = mesh(new BoxGeometry(0.84, 0.08, 0.59), accent);
  trim.position.y = 0.42;
  const lidPivot = new Group();
  lidPivot.name = 'lid';
  lidPivot.position.set(0, 0.45, -0.275);
  const lid = mesh(new CylinderGeometry(0.275, 0.275, 0.8, 10, 1, false, 0, Math.PI), PAL.woodDark);
  lid.rotation.z = Math.PI / 2;
  lid.rotation.y = Math.PI / 2;
  lid.position.z = 0.275;
  lidPivot.add(lid);
  const lock = mesh(new BoxGeometry(0.12, 0.14, 0.04), PAL.gold);
  lock.position.set(0, 0.38, 0.29);
  g.add(blobShadow(0.5), box, trim, lidPivot, lock);
  return g;
}

/** Stepping stone on the pond (Reading Forest). */
export function steppingStone(accent: string): Group {
  const g = new Group();
  const stone = mesh(new CylinderGeometry(0.55, 0.62, 0.22, 9), PAL.stone);
  stone.position.y = 0.05;
  const moss = mesh(new CylinderGeometry(0.5, 0.5, 0.04, 9), accent);
  moss.position.y = 0.17;
  g.add(stone, moss);
  return g;
}

/** Glowing crystal on a lab plinth (Science Planet). */
export function crystal(accent: string): Group {
  const g = new Group();
  const plinth = mesh(new CylinderGeometry(0.38, 0.45, 0.25, 8), PAL.white);
  plinth.position.y = 0.125;
  const c = mesh(new OctahedronGeometry(0.3, 0), accent, { emissive: '#1E1B4B' });
  c.scale.y = 1.6;
  c.position.y = 0.75;
  c.name = 'spin';
  g.add(blobShadow(0.45), plinth, c);
  return g;
}

/** Carved stone stela (History World, after the stelae of Aksum). */
export function stela(accent: string): Group {
  const g = new Group();
  const shaft = mesh(new BoxGeometry(0.42, 1.3, 0.24), PAL.stone);
  shaft.position.y = 0.75;
  const top = mesh(new CylinderGeometry(0.21, 0.21, 0.24, 10, 1, false, 0, Math.PI), PAL.stone);
  top.rotation.z = Math.PI / 2;
  top.rotation.y = Math.PI / 2;
  top.position.y = 1.4;
  for (let i = 0; i < 3; i++) {
    const band = mesh(new BoxGeometry(0.3, 0.05, 0.02), PAL.stoneDark);
    band.position.set(0, 0.45 + i * 0.3, 0.125);
    g.add(band);
  }
  const base = mesh(new BoxGeometry(0.7, 0.12, 0.5), accent);
  base.position.y = 0.06;
  g.add(blobShadow(0.45), shaft, top, base);
  return g;
}

/** A code terminal (Coding City questions). */
export function terminal(accent: string): Group {
  const g = new Group();
  const stand = mesh(new BoxGeometry(0.6, 0.55, 0.45), PAL.irisDark);
  stand.position.y = 0.275;
  const screen = mesh(new BoxGeometry(0.62, 0.42, 0.06), PAL.ink);
  screen.position.set(0, 0.82, 0);
  screen.rotation.x = -0.25;
  const glow = mesh(new BoxGeometry(0.52, 0.32, 0.02), accent, { emissive: '#0F172A' });
  glow.position.set(0, 0.825, 0.035);
  glow.rotation.x = -0.25;
  g.add(blobShadow(0.42), stand, screen, glow);
  return g;
}

/** Gold coin for celebrations. */
export function coin(): Mesh {
  const m = mesh(new CylinderGeometry(0.08, 0.08, 0.025, 12), PAL.gold, { emissive: '#92400E' });
  m.rotation.x = Math.PI / 2;
  return m;
}

/** The Launch Lab cannon. The barrel pivot is the child named "barrel". */
export function launcher(): Group {
  const g = new Group();
  const base = mesh(new CylinderGeometry(0.45, 0.5, 0.25, 12), PAL.irisDark);
  base.position.y = 0.125;
  const pivot = new Group();
  pivot.name = 'barrel';
  pivot.position.y = 0.4;
  const tube = mesh(new CylinderGeometry(0.13, 0.16, 0.9, 12), PAL.white);
  tube.rotation.z = -Math.PI / 2; // lies along +X before the angle is applied
  tube.position.x = 0.35;
  const band = mesh(new TorusGeometry(0.15, 0.03, 6, 14), PAL.coral);
  band.rotation.y = Math.PI / 2;
  band.position.x = 0.62;
  pivot.add(tube, band);
  const hub = mesh(new SphereGeometry(0.2, 10, 8), PAL.iris);
  hub.position.y = 0.4;
  g.add(blobShadow(0.55), base, pivot, hub);
  return g;
}

export function ball(color: string = PAL.coral): Mesh {
  return mesh(new SphereGeometry(0.16, 12, 10), color, { emissive: '#4C0519' });
}

export function flag(color: string = PAL.coral): Group {
  const g = new Group();
  const pole = mesh(new CylinderGeometry(0.02, 0.02, 0.8, 5), PAL.white);
  pole.position.y = 0.4;
  const cloth = mesh(new BoxGeometry(0.3, 0.18, 0.01), color);
  cloth.position.set(0.15, 0.7, 0);
  g.add(pole, cloth);
  return g;
}

/** A building block for Creative World. */
export function voxel(color: string): Mesh {
  return mesh(new BoxGeometry(0.98, 0.98, 0.98), color);
}

/** Thin outline cube to show where a block will go. */
export function ghost(): Mesh {
  return new Mesh(new BoxGeometry(1.02, 1.02, 1.02), new MeshBasicMaterial({ color: new Color('#FFFFFF'), wireframe: true }));
}

/** Flat sea plane under the islands. */
export function sea(size = 60): Mesh {
  const m = mesh(new CircleGeometry(size, 24), '#9FD5F7');
  m.rotation.x = -Math.PI / 2;
  m.position.y = -1.2;
  return m;
}
