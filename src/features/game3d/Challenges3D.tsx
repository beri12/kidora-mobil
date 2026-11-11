import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { create } from 'zustand';
import type { AttemptResult, Challenge, Move } from '@/api/games';
import type { World } from '@/api/learning';
import { Button } from '@/components/ui';
import { Stepper } from '@/features/games/challenges';
import { useSettings } from '@/stores/settings';
import { colors, font, fonts, radius, space } from '@/theme';
import { feedback } from '@/utils/feedback';
import { GLStage } from './GLStage';
import { failingBlock } from './math';
import { ChoiceWorld, OPTION_COLORS } from './worlds/ChoiceWorld';
import { LaunchWorld } from './worlds/LaunchWorld';
import { RobotRouteWorld } from './worlds/RobotRouteWorld';

type Submit = (answer: unknown) => Promise<AttemptResult | null>;

/**
 * Whether to show the 3D worlds: on unless the child or parent switched them
 * off in Settings, or this device could not start WebGL2 during this run of
 * the app (then every game falls back to the classic 2D board).
 */
export const use3DSupport = create<{ failed: string | null; fail: (reason: string) => void }>((set) => ({
  failed: null,
  fail: (reason) => set({ failed: reason }),
}));

export function use3D(): boolean {
  const enabled = useSettings((s) => s.games3d);
  const failed = use3DSupport((s) => s.failed);
  return enabled && !failed;
}

const STAGE_HEIGHT = 280;

/* ------------------------------------------------------- multiple choice */

export function Choice3D({ world, challenge, onSubmit, locked }: { world: World; challenge: Extract<Challenge, { kind: 'MULTIPLE_CHOICE' }>; onSubmit: Submit; locked: boolean }) {
  const fail = use3DSupport((s) => s.fail);
  const options = challenge.setup.options;
  const [ctrl] = useState(() => new ChoiceWorld(world, options.length, challenge.id));
  const [wrong, setWrong] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [badges, setBadges] = useState<{ x: number; y: number }[]>([]);

  async function choose(i: number) {
    if (locked || busy || wrong.includes(i)) return;
    setBusy(true);
    const r = await onSubmit(i);
    if (r?.correct) await ctrl.correct(i);
    else if (r && !r.revealed) {
      setWrong((w) => [...w, i]);
      await ctrl.wrong(i);
    }
    setBusy(false);
  }

  return (
    <View>
      <View style={{ height: STAGE_HEIGHT, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 3, borderColor: colors.iris200 }}>
        <GLStage
          controller={ctrl}
          style={{ flex: 1 }}
          accessibilityLabel={`${options.length} answers to choose from. They are also listed below.`}
          onUnsupported={fail}
          // Taps on the 3D objects answer exactly like taps on the cards.
          onPick={(p) => void choose(Number(p.index))}
          onReady={(layout) => setBadges(ctrl.options.map((o) => ctrl.project(o, layout, 1.6)))}
        />
        {/* Numbers floating over each 3D answer; the full text is on the matching card below. */}
        {badges.map((b, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: b.x - 15,
              top: Math.max(4, b.y - 15),
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: OPTION_COLORS[i % OPTION_COLORS.length],
              borderWidth: 2,
              borderColor: colors.white,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: wrong.includes(i) ? 0.4 : 1,
            }}
          >
            <Text style={{ color: colors.white, fontFamily: fonts.black, fontSize: 15 }}>{i + 1}</Text>
          </View>
        ))}
      </View>
      <Text style={[font.small, { textAlign: 'center', marginVertical: space.sm }]}>Tap an answer in the world or on a card.</Text>
      <View style={{ gap: space.sm }}>
        {options.map((o, i) => {
          const isWrong = wrong.includes(i);
          const color = OPTION_COLORS[i % OPTION_COLORS.length]!;
          return (
            <Pressable
              key={`${challenge.id}-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`Answer ${i + 1}: ${o}${isWrong ? ', not this one' : ''}`}
              disabled={locked || busy || isWrong}
              onPress={() => void choose(i)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                padding: space.md,
                borderRadius: radius.md,
                borderWidth: 2,
                borderBottomWidth: pressed ? 2 : 5,
                marginTop: pressed ? 3 : 0,
                borderColor: isWrong ? colors.coral400 : color,
                backgroundColor: isWrong ? '#FFE4E6' : colors.white,
                opacity: isWrong ? 0.55 : 1,
              })}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.white, fontFamily: fonts.black }}>{i + 1}</Text>
              </View>
              <Text style={[font.body, { flex: 1, fontFamily: fonts.extrabold, textDecorationLine: isWrong ? 'line-through' : 'none' }]}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* -------------------------------------------------------- code path (robot) */

const BLOCKS: { move: Move; glyph: string; label: string }[] = [
  { move: 'F', glyph: '⬆', label: 'Forward' },
  { move: 'L', glyph: '↺', label: 'Turn left' },
  { move: 'R', glyph: '↻', label: 'Turn right' },
];
const glyph = (m: Move) => BLOCKS.find((b) => b.move === m)!.glyph;

export function RobotRoute3D({ challenge, onSubmit, locked }: { challenge: Extract<Challenge, { kind: 'CODE_PATH' }>; onSubmit: Submit; locked: boolean }) {
  const fail = use3DSupport((s) => s.fail);
  const s = challenge.setup;
  const [ctrl] = useState(() => new RobotRouteWorld(s, challenge.id));
  const [program, setProgram] = useState<Move[]>([]);
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [bad, setBad] = useState<number | null>(null);

  function edit(next: Move[]) {
    setProgram(next);
    setBad(null);
    ctrl.reset();
  }

  async function run() {
    setRunning(true);
    setBad(null);
    const r = await onSubmit(program);
    const path = r?.result.path;
    if (r && path?.length) {
      await ctrl.play(program, path, r.correct, setActive);
      if (!r.correct) setBad(failingBlock(program, path.length));
    }
    setActive(null);
    setRunning(false);
  }

  return (
    <View>
      <View style={{ height: STAGE_HEIGHT + 20, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 3, borderColor: colors.iris200 }}>
        <GLStage
          controller={ctrl}
          style={{ flex: 1 }}
          onUnsupported={fail}
          accessibilityLabel={`Robot on a ${s.size} by ${s.size} island. Start column ${s.start[0] + 1}, row ${s.start[1] + 1}, facing ${s.dir}. Charging pad at column ${s.goal[0] + 1}, row ${s.goal[1] + 1}. ${s.walls.length} crates, ${s.items.length} energy cells.`}
        />
      </View>

      <Text style={[font.small, { marginTop: space.md }]}>
        Your program · {program.length}/{s.maxBlocks} blocks · tap a block to remove it
      </Text>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 56, padding: 8, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line }}
        accessibilityLabel={program.length ? `Program: ${program.map((m) => BLOCKS.find((b) => b.move === m)!.label).join(', ')}` : 'Program is empty'}
      >
        <View style={{ backgroundColor: colors.grass500, borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.white, fontSize: 18 }}>▶</Text>
        </View>
        {program.map((m, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Remove block ${i + 1}, ${BLOCKS.find((b) => b.move === m)!.label}${bad === i ? ', this block went wrong' : ''}`}
            disabled={running}
            onPress={() => edit(program.filter((_, j) => j !== i))}
            style={{
              backgroundColor: bad === i ? colors.coral500 : active === i ? colors.sun400 : '#3B82F6',
              borderRadius: 10,
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderBottomWidth: 4,
              borderColor: bad === i ? '#9F1239' : active === i ? colors.sun500 : '#1D4ED8',
              transform: [{ scale: active === i ? 1.12 : 1 }],
            }}
          >
            <Text style={{ color: colors.white, fontSize: 20, fontFamily: fonts.black }}>{glyph(m)}</Text>
          </Pressable>
        ))}
      </View>
      {bad !== null ? (
        <Text style={[font.small, { color: colors.coral500, marginTop: 4 }]}>Block {bad + 1} is where it went wrong. Change it and run again.</Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
        {BLOCKS.map((b) => (
          <Button
            key={b.move}
            title={`${b.glyph} ${b.label}`}
            variant="secondary"
            disabled={locked || running || program.length >= s.maxBlocks}
            onPress={() => {
              feedback.tap();
              edit([...program, b.move]);
            }}
            style={{ flex: 1, paddingHorizontal: 2 }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
        <Button title="Clear" variant="ghost" disabled={running || !program.length} onPress={() => edit([])} style={{ flex: 1 }} />
        <Button title="▶ Run" variant="success" busy={running} disabled={locked || !program.length} onPress={run} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

/* -------------------------------------------------------- physics launch */

export function Launch3D({ challenge, onSubmit, locked }: { challenge: Extract<Challenge, { kind: 'PHYSICS_LAUNCH' }>; onSubmit: Submit; locked: boolean }) {
  const fail = use3DSupport((s) => s.fail);
  const s = challenge.setup;
  const [ctrl] = useState(() => new LaunchWorld(s));
  const [angle, setAngle] = useState(Math.round((s.angle[0] + s.angle[1]) / 2));
  const [power, setPower] = useState(Math.round((s.power[0] + s.power[1]) / 2));
  const [shots, setShots] = useState<{ angle: number; power: number; distance: number }[]>([]);
  const [busy, setBusy] = useState(false);

  async function launch() {
    setBusy(true);
    const r = await onSubmit({ angle, power });
    const d = r?.result.distance;
    if (r && typeof d === 'number') {
      setShots((x) => [{ angle, power, distance: d }, ...x].slice(0, 3));
      await ctrl.launch(angle, d, r.correct);
    }
    setBusy(false);
  }

  return (
    <View>
      <View style={{ height: STAGE_HEIGHT, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 3, borderColor: colors.iris200 }}>
        <GLStage
          controller={ctrl}
          style={{ flex: 1 }}
          onUnsupported={fail}
          accessibilityLabel={`Launch lab. The green zone is between ${s.target[0]} and ${s.target[1]} metres.`}
        />
      </View>
      <Text style={[font.small, { textAlign: 'center', marginTop: space.sm }]}>
        Land in the green zone: {s.target[0]}–{s.target[1]} m. Change one thing at a time and compare.
      </Text>
      {shots.length ? (
        <View style={{ marginTop: space.sm, gap: 2 }} accessibilityLabel="Your last shots">
          {shots.map((x, i) => (
            <Text key={i} style={font.small}>
              {i === 0 ? 'Last shot' : `Shot −${i}`}: {x.angle}°, power {x.power} → {x.distance} m
            </Text>
          ))}
        </View>
      ) : null}
      <Stepper
        label="Angle"
        value={angle}
        min={s.angle[0]}
        max={s.angle[1]}
        step={5}
        unit="°"
        onChange={(v) => {
          setAngle(v);
          ctrl.setAngle(v);
        }}
      />
      <Stepper label="Power" value={power} min={s.power[0]} max={s.power[1]} step={1} unit="" onChange={setPower} />
      <Button title="🚀 Launch" variant="success" busy={busy} disabled={locked} onPress={launch} style={{ marginTop: space.md }} />
    </View>
  );
}
