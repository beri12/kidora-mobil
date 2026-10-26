import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { AttemptResult, Challenge, Dir, Move } from '@/api/games';
import { Button } from '@/components/ui';
import { colors, font, radius, space } from '@/theme';
import { feedback, useCalmMotion } from '@/utils/feedback';

type Submit = (answer: unknown) => Promise<AttemptResult | null>;

/* ------------------------------------------------------- multiple choice */

export function ChoiceChallenge({ challenge, onSubmit, locked }: { challenge: Extract<Challenge, { kind: 'MULTIPLE_CHOICE' }>; onSubmit: Submit; locked: boolean }) {
  const calm = useCalmMotion();
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  async function choose(i: number) {
    if (locked || picked !== null) return;
    setPicked(i);
    const r = await onSubmit(i);
    if (r && !r.correct) {
      setWrong((w) => [...w, i]);
      if (!calm) shake.set(withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }), withTiming(-6, { duration: 50 }), withTiming(0, { duration: 50 })));
    }
    setPicked(null);
  }

  return (
    <Animated.View style={[{ gap: space.sm }, shakeStyle]}>
      {challenge.setup.options.map((o, i) => {
        const isWrong = wrong.includes(i);
        return (
          <Pressable
            key={`${challenge.id}-${i}`}
            accessibilityRole="button"
            accessibilityLabel={`${o}${isWrong ? ', not this one' : ''}`}
            disabled={locked || isWrong}
            onPress={() => choose(i)}
            style={({ pressed }) => ({
              padding: space.lg,
              borderRadius: radius.md,
              borderWidth: 2,
              borderBottomWidth: pressed ? 2 : 6,
              marginTop: pressed ? 4 : 0,
              borderColor: isWrong ? colors.coral400 : picked === i ? colors.iris500 : colors.line,
              backgroundColor: isWrong ? '#FFE4E6' : picked === i ? colors.iris100 : colors.white,
              opacity: isWrong ? 0.6 : 1,
            })}
          >
            <Text style={[font.h2, { textAlign: 'center' }]}>{o}</Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

/* ------------------------------------------------------------ code path */

const ARROW: Record<Dir, string> = { N: '⬆️', E: '➡️', S: '⬇️', W: '⬅️' };
const BLOCK_LABEL: Record<Move, string> = { F: '⬆️ Forward', L: '↺ Left', R: '↻ Right' };

export function CodePathChallenge({ challenge, onSubmit, locked }: { challenge: Extract<Challenge, { kind: 'CODE_PATH' }>; onSubmit: Submit; locked: boolean }) {
  const calm = useCalmMotion();
  const s = challenge.setup;
  const [program, setProgram] = useState<Move[]>([]);
  const [robot, setRobot] = useState({ x: s.start[0], y: s.start[1], dir: s.dir });
  const [running, setRunning] = useState(false);
  const cell = Math.min(56, Math.floor(300 / s.size));
  const walls = useMemo(() => new Set(s.walls.map(([x, y]) => `${x},${y}`)), [s.walls]);
  const items = useMemo(() => new Set(s.items.map(([x, y]) => `${x},${y}`)), [s.items]);

  async function run() {
    setRunning(true);
    setRobot({ x: s.start[0], y: s.start[1], dir: s.dir });
    const r = await onSubmit(program);
    const path = r?.result.path ?? [];
    // Replay the server's own run of the program, step by step.
    if (calm || !path.length) {
      const end = path[path.length - 1];
      if (end) setRobot(end);
    } else {
      for (const p of path) {
        setRobot(p);
        await new Promise((res) => setTimeout(res, 320));
      }
    }
    setRunning(false);
  }

  return (
    <View>
      <View style={{ alignSelf: 'center', borderRadius: radius.md, overflow: 'hidden', borderWidth: 3, borderColor: colors.iris300 }} accessibilityLabel={`Grid ${s.size} by ${s.size}. Robot at column ${robot.x + 1}, row ${robot.y + 1}, facing ${robot.dir}.`}>
        {Array.from({ length: s.size }, (_, y) => (
          <View key={y} style={{ flexDirection: 'row' }}>
            {Array.from({ length: s.size }, (_, x) => {
              const k = `${x},${y}`;
              const isRobot = robot.x === x && robot.y === y;
              const isGoal = s.goal[0] === x && s.goal[1] === y;
              return (
                <View key={k} style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center', backgroundColor: (x + y) % 2 ? '#EEF2FF' : colors.white }}>
                  <Text style={{ fontSize: cell * 0.5 }}>{isRobot ? '🤖' : walls.has(k) ? '🧱' : items.has(k) ? '💎' : isGoal ? '🏁' : ''}</Text>
                  {isRobot ? <Text style={{ position: 'absolute', bottom: 0, right: 2, fontSize: 12 }}>{ARROW[robot.dir]}</Text> : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <Text style={[font.small, { marginTop: space.md }]}>
        Your program ({program.length}/{s.maxBlocks} blocks)
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 44, padding: 6, borderRadius: radius.sm, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line }}>
        {program.map((b, i) => (
          <Pressable key={i} accessibilityLabel={`Remove block ${i + 1}, ${BLOCK_LABEL[b]}`} onPress={() => !running && setProgram((p) => p.filter((_, j) => j !== i))} style={{ backgroundColor: colors.iris500, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }}>
            <Text style={{ color: colors.white, fontWeight: '800' }}>{BLOCK_LABEL[b].split(' ')[0]}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
        {(['F', 'L', 'R'] as Move[]).map((b) => (
          <Button
            key={b}
            title={BLOCK_LABEL[b]}
            variant="secondary"
            disabled={locked || running || program.length >= s.maxBlocks}
            onPress={() => {
              feedback.tap();
              setProgram((p) => [...p, b]);
            }}
            style={{ flex: 1, paddingHorizontal: 4 }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
        <Button title="Clear" variant="ghost" disabled={running || !program.length} onPress={() => setProgram([])} style={{ flex: 1 }} />
        <Button title="▶ Run" variant="success" busy={running} disabled={locked || !program.length} onPress={run} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

/* --------------------------------------------------------- physics launch */

function Stepper({ label, value, min, max, step, onChange, unit }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm }} accessibilityLabel={`${label} ${value}${unit}`}>
      <Text style={[font.body, { width: 70 }]}>{label}</Text>
      <Button title="−" variant="secondary" accessibilityLabel={`Less ${label}`} onPress={() => onChange(Math.max(min, value - step))} style={{ minHeight: 44, paddingHorizontal: 14 }} />
      <Text style={[font.h2, { width: 70, textAlign: 'center' }]}>
        {value}
        {unit}
      </Text>
      <Button title="+" variant="secondary" accessibilityLabel={`More ${label}`} onPress={() => onChange(Math.min(max, value + step))} style={{ minHeight: 44, paddingHorizontal: 14 }} />
    </View>
  );
}

export function LaunchChallenge({ challenge, onSubmit, locked }: { challenge: Extract<Challenge, { kind: 'PHYSICS_LAUNCH' }>; onSubmit: Submit; locked: boolean }) {
  const calm = useCalmMotion();
  const s = challenge.setup;
  const [angle, setAngle] = useState(Math.round((s.angle[0] + s.angle[1]) / 2));
  const [power, setPower] = useState(Math.round((s.power[0] + s.power[1]) / 2));
  const [distance, setDistance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useSharedValue(0);
  const W = 300;
  const maxRange = Math.max((s.power[1] ** 2) / s.gravity, s.target[1] * 1.2);
  const scale = W / maxRange;

  const ball = useAnimatedStyle(() => {
    const d = (distance ?? 0) * scale;
    const peak = Math.min(120, d * Math.tan((angle * Math.PI) / 180) * 0.25);
    return { transform: [{ translateX: d * t.value }, { translateY: -4 * peak * t.value * (1 - t.value) }] };
  });

  async function launch() {
    setBusy(true);
    const r = await onSubmit({ angle, power });
    const dist = r?.result.distance ?? null;
    setDistance(dist);
    t.set(0);
    t.set(calm ? 1 : withTiming(1, { duration: 1100 }));
    setBusy(false);
  }

  return (
    <View>
      <View style={{ height: 150, width: W, alignSelf: 'center', justifyContent: 'flex-end' }} accessibilityLabel={`Target between ${s.target[0]} and ${s.target[1]} metres`}>
        <View style={{ position: 'absolute', bottom: 0, left: s.target[0] * scale, width: (s.target[1] - s.target[0]) * scale, height: 14, backgroundColor: colors.grass500, borderRadius: 4 }} />
        <View style={{ height: 3, backgroundColor: colors.ink }} />
        <Animated.Text style={[{ position: 'absolute', bottom: 2, left: -8, fontSize: 22 }, ball]}>🚀</Animated.Text>
      </View>
      <Text style={[font.small, { textAlign: 'center', marginTop: 4 }]}>
        Land in the green zone: {s.target[0]}–{s.target[1]} m{distance !== null ? ` · last shot ${distance} m` : ''}
      </Text>
      <Stepper label="Angle" value={angle} min={s.angle[0]} max={s.angle[1]} step={5} unit="°" onChange={setAngle} />
      <Stepper label="Power" value={power} min={s.power[0]} max={s.power[1]} step={1} unit="" onChange={setPower} />
      <Button title="🚀 Launch" variant="success" busy={busy} disabled={locked} onPress={launch} style={{ marginTop: space.md }} />
    </View>
  );
}
