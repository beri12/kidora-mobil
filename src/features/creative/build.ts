/**
 * Creative World rules. A 6×6 plot where blocks stack in columns (each
 * block rests on the one below, like real building blocks). Build
 * challenges are checked here, on the phone: Creative World is free
 * practice with no XP, because the Kidora API has no creative game to
 * score it (see docs/games/KIDORA_3D_GAMES.md).
 */
export const GRID = 6;
export const MAX_HEIGHT = 6;

/** Paint colours, in the Kidora palette. Index stored per block. */
export const PAINTS = [
  { color: '#F43F5E', name: 'Red' },
  { color: '#F59E0B', name: 'Orange' },
  { color: '#FACC15', name: 'Yellow' },
  { color: '#22C55E', name: 'Green' },
  { color: '#0EA5E9', name: 'Blue' },
  { color: '#6E52F5', name: 'Purple' },
  { color: '#F8FAFC', name: 'White' },
] as const;

export interface Block {
  x: number;
  y: number;
  z: number;
  paint: number;
}

export type Build = Block[];

export const heightAt = (b: Build, x: number, z: number) => b.filter((k) => k.x === x && k.z === z).length;

export const inPlot = (x: number, z: number) => Number.isInteger(x) && Number.isInteger(z) && x >= 0 && z >= 0 && x < GRID && z < GRID;

/** Adds a block on top of column (x, z). Unchanged if the column is full or outside the plot. */
export function stack(b: Build, x: number, z: number, paint: number): Build {
  if (!inPlot(x, z) || paint < 0 || paint >= PAINTS.length) return b;
  const h = heightAt(b, x, z);
  if (h >= MAX_HEIGHT) return b;
  return [...b, { x, y: h, z, paint }];
}

/** Removes the top block of column (x, z). */
export function unstack(b: Build, x: number, z: number): Build {
  const h = heightAt(b, x, z);
  if (!h) return b;
  return b.filter((k) => !(k.x === x && k.z === z && k.y === h - 1));
}

export function topPaint(b: Build, x: number, z: number): number | null {
  const h = heightAt(b, x, z);
  return h ? b.find((k) => k.x === x && k.z === z && k.y === h - 1)!.paint : null;
}

/** Drops anything malformed from saved data (old app versions, hand-edited storage). */
export function sanitize(input: unknown): Build {
  if (!Array.isArray(input)) return [];
  let out: Build = [];
  const cols = new Map<string, Block[]>();
  for (const raw of input) {
    const k = raw as Partial<Block>;
    if (typeof k?.x !== 'number' || typeof k.z !== 'number' || typeof k.y !== 'number' || typeof k.paint !== 'number') continue;
    const key = `${k.x},${k.z}`;
    cols.set(key, [...(cols.get(key) ?? []), k as Block]);
  }
  for (const col of cols.values()) {
    for (const k of col.sort((a, b) => a.y - b.y)) out = stack(out, k.x, k.z, k.paint);
  }
  return out;
}

/* ------------------------------------------------------------- challenges */

export interface BuildChallenge {
  id: string;
  emoji: string;
  title: string;
  goal: string;
  /** What the child is practising, shown after they finish. */
  learning: string;
  check: (b: Build) => boolean;
}

const maxHeight = (b: Build) => b.reduce((m, k) => Math.max(m, k.y + 1), 0);

/** Every straight line of `len` cells along X or Z, as cell lists. */
function lines(len: number): [number, number][][] {
  const out: [number, number][][] = [];
  for (let a = 0; a < GRID; a++) {
    for (let s = 0; s + len <= GRID; s++) {
      out.push(Array.from({ length: len }, (_, i) => [s + i, a] as [number, number]));
      out.push(Array.from({ length: len }, (_, i) => [a, s + i] as [number, number]));
    }
  }
  return out;
}

const groundPaint = (b: Build, x: number, z: number) => b.find((k) => k.x === x && k.z === z && k.y === 0)?.paint ?? null;

export const CHALLENGES: BuildChallenge[] = [
  {
    id: 'tower',
    emoji: '🗼',
    title: 'Tall tower',
    goal: 'Build a tower at least 4 blocks tall.',
    learning: 'Counting up and comparing heights.',
    check: (b) => maxHeight(b) >= 4,
  },
  {
    id: 'wall',
    emoji: '🧱',
    title: 'Long wall',
    goal: 'Put 5 blocks in a straight line on the ground.',
    learning: 'Straight lines and measuring length in blocks.',
    check: (b) => lines(5).some((line) => line.every(([x, z]) => groundPaint(b, x, z) !== null)),
  },
  {
    id: 'stairs',
    emoji: '🪜',
    title: 'Staircase',
    goal: 'Build 4 columns in a row that are 1, 2, 3 and 4 blocks tall.',
    learning: 'Number sequences: each step is one more than the last.',
    check: (b) =>
      lines(4).some((line) => {
        const hs = line.map(([x, z]) => heightAt(b, x, z));
        const up = hs.every((h, i) => h === i + 1);
        const down = hs.every((h, i) => h === 4 - i);
        return up || down;
      }),
  },
  {
    id: 'pattern',
    emoji: '🎨',
    title: 'Colour pattern',
    goal: 'Make a ground line of 6 blocks in an A-B-A-B pattern of two colours.',
    learning: 'Spotting and continuing a repeating pattern.',
    check: (b) =>
      lines(6).some((line) => {
        const ps = line.map(([x, z]) => groundPaint(b, x, z));
        if (ps.some((p) => p === null)) return false;
        return ps[0] !== ps[1] && ps.every((p, i) => p === ps[i % 2]);
      }),
  },
  {
    id: 'mirror',
    emoji: '🦋',
    title: 'Mirror build',
    goal: 'Use at least 6 blocks and make the left half a mirror of the right half.',
    learning: 'Symmetry: both sides match across the middle line.',
    check: (b) => {
      if (b.length < 6) return false;
      const at = new Map(b.map((k) => [`${k.x},${k.y},${k.z}`, k.paint]));
      return b.every((k) => at.get(`${GRID - 1 - k.x},${k.y},${k.z}`) === k.paint);
    },
  },
  {
    id: 'twelve',
    emoji: '🔢',
    title: 'Exactly twelve',
    goal: 'Use exactly 12 blocks, in exactly 3 colours.',
    learning: 'Counting carefully and sorting by colour.',
    check: (b) => b.length === 12 && new Set(b.map((k) => k.paint)).size === 3,
  },
];
