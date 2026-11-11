/**
 * Pure geometry for the 3D worlds. No three.js here, so it is cheap to test
 * and shared by every scene.
 *
 * World axes: X to the right, Y up, Z towards the camera. A server grid cell
 * (x, y) — y grows "down the screen", N is up — maps to (X = x, Z = y), so
 * North is -Z.
 */
import type { Dir, Move } from '@/api/games';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Centre of grid cell (x, y) on a board of `size`, with the board centred on the origin. */
export function gridToWorld(x: number, y: number, size: number): { x: number; z: number } {
  const half = (size - 1) / 2;
  return { x: x - half, z: y - half };
}

/**
 * Rotation about Y for a model whose face points +Z.
 * Rotating (0,0,1) by θ gives (sin θ, 0, cos θ): S = 0, E = π/2, N = π, W = −π/2.
 */
export const DIR_YAW: Record<Dir, number> = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 };

/** The signed shortest turn from angle a to angle b, in (−π, π]. */
export function shortestTurn(a: number, b: number): number {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

export interface PathStep {
  /** Index of the program block this step animates (0-based). */
  block: number;
  kind: 'move' | 'turn';
  from: { x: number; y: number; dir: Dir };
  to: { x: number; y: number; dir: Dir };
}

/**
 * Turns the server's replay path into animation steps. The server pushes one
 * path entry per block it executed (after the start position), so step i is
 * block i. The robot is only ever animated along the server's own run: the
 * app never decides where the robot ends up.
 */
export function pathSteps(path: { x: number; y: number; dir: Dir }[]): PathStep[] {
  const steps: PathStep[] = [];
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1]!;
    const to = path[i]!;
    steps.push({ block: i - 1, kind: from.x === to.x && from.y === to.y ? 'turn' : 'move', from, to });
  }
  return steps;
}

/**
 * Which block made the run stop, or null if every block ran. When the server
 * stops early (edge, wall) the path holds one entry per block that worked, so
 * the culprit is the next one. A run that used every block but missed the goal
 * or an item has no single bad block: null, and the reason text explains.
 */
export function failingBlock(program: readonly Move[], pathLength: number): number | null {
  const executed = Math.max(0, pathLength - 1);
  return executed < program.length ? executed : null;
}

/** The cell the robot was trying to enter when it bumped (for the bump animation). */
export function bumpTarget(at: { x: number; y: number; dir: Dir }): { x: number; y: number } {
  const d = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }[at.dir];
  return { x: at.x + d[0]!, y: at.y + d[1]! };
}

/**
 * Points along an ideal projectile that lands at `distance` metres, matching
 * the server's model (range = v²·sin 2θ / g). For a launch from the ground
 * that lands at d, height(x) = x·tan θ·(1 − x/d) exactly.
 */
export function arcPoints(angleDeg: number, distance: number, samples = 24): { x: number; y: number }[] {
  const tan = Math.tan((angleDeg * Math.PI) / 180);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = (distance * i) / samples;
    pts.push({ x, y: distance > 0 ? x * tan * (1 - x / distance) : 0 });
  }
  return pts;
}

/** Highest point of that arc: d·tan θ / 4. */
export const arcPeak = (angleDeg: number, distance: number) => (distance * Math.tan((angleDeg * Math.PI) / 180)) / 4;

/** Where n answer objects stand: a gentle arc facing the camera, left to right. */
export function choiceSlots(n: number, spacing = 1.7): { x: number; z: number }[] {
  if (n <= 0) return [];
  const width = (n - 1) * spacing;
  return Array.from({ length: n }, (_, i) => {
    const x = -width / 2 + i * spacing;
    // The ends step back a little so every object is visible from the front.
    const z = -0.12 * x * x;
    return { x, z };
  });
}

/**
 * Camera distance that fits a sphere of `radius` in view, for a vertical
 * field of view `fovDeg` and the screen's aspect ratio (width / height).
 * On a portrait phone the horizontal field is the tight one.
 */
export function fitDistance(radius: number, fovDeg: number, aspect: number): number {
  const vHalf = (fovDeg * Math.PI) / 360;
  const hHalf = Math.atan(Math.tan(vHalf) * Math.max(aspect, 0.1));
  const half = Math.min(vHalf, hHalf);
  return radius / Math.sin(half);
}

/** Smooth ease for tweens. */
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
