import { arcPeak, arcPoints, bumpTarget, choiceSlots, DIR_YAW, failingBlock, fitDistance, gridToWorld, pathSteps, shortestTurn } from '@/features/game3d/math';
import { Tweens } from '@/features/game3d/tween';

describe('grid ↔ world', () => {
  it('centres the board on the origin, with grid y as world Z', () => {
    expect(gridToWorld(0, 0, 5)).toEqual({ x: -2, z: -2 });
    expect(gridToWorld(4, 2, 5)).toEqual({ x: 2, z: 0 });
  });
  it('turns each heading into the yaw that faces it (model faces +Z)', () => {
    for (const [dir, [x, z]] of [['S', [0, 1]], ['E', [1, 0]], ['N', [0, -1]], ['W', [-1, 0]]] as const) {
      expect(Math.sin(DIR_YAW[dir])).toBeCloseTo(x);
      expect(Math.cos(DIR_YAW[dir])).toBeCloseTo(z);
    }
  });
  it('always turns the short way round', () => {
    expect(shortestTurn(DIR_YAW.W, DIR_YAW.N)).toBeCloseTo(-Math.PI / 2); // W → N is a right turn, not three lefts
    expect(Math.abs(shortestTurn(0, 2 * Math.PI))).toBeCloseTo(0);
  });
});

describe('replaying the server path', () => {
  // The server's run of F R F on a board starting at (0,0) facing E.
  const path = [
    { x: 0, y: 0, dir: 'E' as const },
    { x: 1, y: 0, dir: 'E' as const },
    { x: 1, y: 0, dir: 'S' as const },
    { x: 1, y: 1, dir: 'S' as const },
  ];
  it('makes one step per executed block, in order', () => {
    expect(pathSteps(path).map((s) => [s.block, s.kind])).toEqual([[0, 'move'], [1, 'turn'], [2, 'move']]);
  });
  it('blames the first block the server did not run', () => {
    expect(failingBlock(['F', 'R', 'F', 'F'], 4)).toBe(3);
    expect(failingBlock(['F', 'F'], 2)).toBe(1); // stopped by a crate on block 2
  });
  it('blames no single block when every block ran (wrong end square, missed item)', () => {
    expect(failingBlock(['F', 'R', 'F'], 4)).toBeNull();
  });
  it('knows which square the robot bumped into', () => {
    expect(bumpTarget({ x: 1, y: 0, dir: 'E' })).toEqual({ x: 2, y: 0 });
    expect(bumpTarget({ x: 0, y: 3, dir: 'N' })).toEqual({ x: 0, y: 2 });
  });
});

describe('launch arc', () => {
  it('starts on the ground and lands exactly at the server distance', () => {
    const pts = arcPoints(45, 23);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]!.x).toBeCloseTo(23);
    expect(pts[pts.length - 1]!.y).toBeCloseTo(0);
  });
  it('peaks at d·tanθ/4, matching the ideal projectile the server uses', () => {
    const pts = arcPoints(60, 20, 40);
    const top = Math.max(...pts.map((p) => p.y));
    expect(top).toBeCloseTo(arcPeak(60, 20), 5);
    expect(arcPeak(45, 20)).toBeCloseTo(5);
  });
  it('a shot of 0 m stays on the ground', () => {
    expect(arcPoints(45, 0).every((p) => p.y === 0)).toBe(true);
  });
});

describe('layout and camera', () => {
  it('spreads answers left to right, symmetric about the centre', () => {
    const s = choiceSlots(4);
    expect(s.map((p) => p.x)).toEqual([...s.map((p) => p.x)].sort((a, b) => a - b));
    expect(s[0]!.x).toBeCloseTo(-s[3]!.x);
    expect(choiceSlots(0)).toEqual([]);
  });
  it('backs the camera off further on a narrow (portrait) view', () => {
    expect(fitDistance(3, 42, 0.6)).toBeGreaterThan(fitDistance(3, 42, 1.6));
  });
});

describe('tweens', () => {
  it('reach their end value and resolve in order', async () => {
    const t = new Tweens();
    t.setLive(true);
    const seen: number[] = [];
    const done = t.sequence([{ duration: 0.2, update: (v) => seen.push(v) }, { duration: 0.1, update: (v) => seen.push(10 + v) }]);
    for (let i = 0; i < 20; i++) {
      t.step(0.05);
      await Promise.resolve();
    }
    await done;
    expect(seen).toContain(1);
    expect(seen[seen.length - 1]).toBe(11);
  });
  it('calm mode (reduce motion) jumps straight to the end', async () => {
    const t = new Tweens();
    t.setLive(true);
    t.setCalm(true);
    let v = 0;
    const p = t.play({ duration: 5, update: (x) => (v = x) });
    t.step(0.016);
    await p;
    expect(v).toBe(1);
  });
  it('never hang when no render loop is attached (3D view not started)', async () => {
    const t = new Tweens();
    let v = 0;
    await t.play({ duration: 10, update: (x) => (v = x) });
    expect(v).toBe(1);
  });
});
