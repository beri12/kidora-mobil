import { CHALLENGES, GRID, heightAt, MAX_HEIGHT, sanitize, stack, topPaint, unstack, type Build } from '@/features/creative/build';

const done = (b: Build) => CHALLENGES.filter((c) => c.check(b)).map((c) => c.id);
const build = (cols: [number, number, number, number?][]) =>
  cols.reduce<Build>((b, [x, z, h, paint = 0]) => {
    for (let i = 0; i < h; i++) b = stack(b, x, z, paint);
    return b;
  }, []);

describe('stacking rules', () => {
  it('stacks blocks in a column, one on another', () => {
    const b = stack(stack([], 1, 1, 0), 1, 1, 3);
    expect(heightAt(b, 1, 1)).toBe(2);
    expect(topPaint(b, 1, 1)).toBe(3);
    expect(b.map((k) => k.y)).toEqual([0, 1]);
  });
  it('refuses outside the plot, above the height limit, and unknown paints', () => {
    expect(stack([], GRID, 0, 0)).toEqual([]);
    expect(stack([], 0, 0, 99)).toEqual([]);
    const full = build([[0, 0, MAX_HEIGHT]]);
    expect(stack(full, 0, 0, 0)).toBe(full);
  });
  it('erases only the top block', () => {
    const b = unstack(stack(stack([], 0, 0, 1), 0, 0, 2), 0, 0);
    expect(b).toEqual([{ x: 0, y: 0, z: 0, paint: 1 }]);
    expect(unstack([], 0, 0)).toEqual([]);
  });
  it('rebuilds saved data safely: no floating blocks, no junk', () => {
    const saved = [{ x: 2, y: 5, z: 2, paint: 1 }, { x: 2, y: 0, z: 2, paint: 2 }, { nope: true }, { x: 9, y: 0, z: 9, paint: 0 }];
    expect(sanitize(saved)).toEqual([
      { x: 2, y: 0, z: 2, paint: 2 },
      { x: 2, y: 1, z: 2, paint: 1 },
    ]);
    expect(sanitize('garbage')).toEqual([]);
  });
});

describe('build challenges', () => {
  it('tall tower needs 4 blocks', () => {
    expect(done(build([[0, 0, 3]]))).not.toContain('tower');
    expect(done(build([[0, 0, 4]]))).toContain('tower');
  });
  it('long wall needs 5 ground blocks in a straight line', () => {
    expect(done(build([0, 1, 2, 3, 4].map((x) => [x, 2, 1] as [number, number, number])))).toContain('wall');
    expect(done(build([0, 1, 2, 4, 5].map((x) => [x, 2, 1] as [number, number, number])))).not.toContain('wall');
  });
  it('staircase works in either direction but not out of order', () => {
    expect(done(build([[1, 0, 1], [2, 0, 2], [3, 0, 3], [4, 0, 4]]))).toContain('stairs');
    expect(done(build([[0, 3, 4], [0, 4, 3], [0, 5, 2], [0, 2, 1]]))).not.toContain('stairs');
    expect(done(build([[5, 0, 4], [5, 1, 3], [5, 2, 2], [5, 3, 1]]))).toContain('stairs');
  });
  it('pattern needs A-B-A-B with two different colours', () => {
    const abab = build([0, 1, 2, 3, 4, 5].map((x) => [x, 0, 1, x % 2] as [number, number, number, number]));
    expect(done(abab)).toContain('pattern');
    const same = build([0, 1, 2, 3, 4, 5].map((x) => [x, 0, 1, 2] as [number, number, number, number]));
    expect(done(same)).not.toContain('pattern');
  });
  it('mirror build matches across the middle, colours included', () => {
    const left: [number, number, number, number][] = [[0, 0, 2, 1], [1, 2, 1, 3], [2, 4, 3, 4]];
    const mirrored = build([...left, ...left.map(([x, z, h, p]) => [GRID - 1 - x, z, h, p] as [number, number, number, number])]);
    expect(done(mirrored)).toContain('mirror');
    const wrongColour = build([...left, ...left.map(([x, z, h]) => [GRID - 1 - x, z, h, 6] as [number, number, number, number])]);
    expect(done(wrongColour)).not.toContain('mirror');
  });
  it('exactly twelve means 12 blocks in 3 colours', () => {
    const twelve = build([[0, 0, 4, 0], [1, 0, 4, 1], [2, 0, 4, 2]]);
    expect(done(twelve)).toContain('twelve');
    expect(done(stack(twelve, 5, 5, 0))).not.toContain('twelve');
  });
});
