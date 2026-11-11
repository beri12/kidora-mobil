import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Button, Card, SectionTitle } from '@/components/ui';
import { Confetti } from '@/components/Confetti';
import { CHALLENGES, GRID, heightAt, MAX_HEIGHT, PAINTS, stack, topPaint, unstack, type BuildChallenge } from '@/features/creative/build';
import { useCreative } from '@/features/creative/store';
import { use3D, use3DSupport } from '@/features/game3d/Challenges3D';
import { GLStage } from '@/features/game3d/GLStage';
import { CreativeWorld } from '@/features/game3d/worlds/CreativeWorld';
import { colors, font, fonts, radius, space } from '@/theme';
import { feedback } from '@/utils/feedback';

type Tool = 'build' | 'erase';

/**
 * Creative World: free building on a 6×6 plot with build challenges
 * (height, length, sequences, patterns, symmetry, counting). Practice only:
 * checked on the phone, saved on the phone, no XP.
 */
export default function Create() {
  const threeD = use3D();
  const fail = use3DSupport((s) => s.fail);
  const blocks = useCreative((s) => s.blocks);
  const done = useCreative((s) => s.done);
  const setBlocks = useCreative((s) => s.setBlocks);
  const markDone = useCreative((s) => s.markDone);
  const [world] = useState(() => new CreativeWorld());
  const [tool, setTool] = useState<Tool>('build');
  const [paint, setPaint] = useState(5);
  const [fresh, setFresh] = useState<BuildChallenge | null>(null);

  useEffect(() => {
    world.sync(blocks);
  }, [world, blocks]);

  function tapColumn(x: number, z: number) {
    const next = tool === 'build' ? stack(blocks, x, z, paint) : unstack(blocks, x, z);
    if (next === blocks) {
      feedback.wrong();
      return;
    }
    feedback.tap();
    setBlocks(next);
    // One block can finish several challenges at once (the last stair is also a tall tower).
    const newlyDone = CHALLENGES.filter((c) => !done.includes(c.id) && c.check(next));
    if (newlyDone.length) {
      for (const c of newlyDone) markDone(c.id);
      setFresh(newlyDone[0]!);
      feedback.complete();
      void world.celebrate();
    }
  }

  function clearAll() {
    Alert.alert('Clear the plot?', 'Every block is removed. Finished challenges stay finished.', [
      { text: 'Keep building', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setBlocks([]) },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgVia }}>
      <Stack.Screen options={{ headerShown: true, title: 'Creative World' }} />
      {fresh && <Confetti key={fresh.id} />}
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm }}>
          <Text style={[font.body, { flex: 1 }]}>Build anything. Try the challenges below.</Text>
          <View style={{ backgroundColor: colors.iris100, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontFamily: fonts.extrabold, color: colors.iris700, fontSize: 12 }}>Practice · no XP</Text>
          </View>
        </View>

        {threeD ? (
          <View style={{ height: 300, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 3, borderColor: colors.iris200 }}>
            <GLStage
              controller={world}
              style={{ flex: 1 }}
              onUnsupported={fail}
              onPick={(p) => tapColumn(Number(p.x), Number(p.z))}
              accessibilityLabel={`Your 3D build: ${blocks.length} blocks. Use the plot map below to add or remove blocks.`}
            />
            <View style={{ position: 'absolute', right: 8, bottom: 8, flexDirection: 'row', gap: 6 }}>
              <Button title="⟲" variant="secondary" accessibilityLabel="Turn the plot left" onPress={() => void world.rotate(-1)} style={{ minHeight: 44, paddingHorizontal: 14 }} />
              <Button title="⟳" variant="secondary" accessibilityLabel="Turn the plot right" onPress={() => void world.rotate(1)} style={{ minHeight: 44, paddingHorizontal: 14 }} />
            </View>
          </View>
        ) : null}

        {fresh ? (
          <Card style={{ marginTop: space.md, backgroundColor: colors.grass100, borderColor: colors.grass100 }}>
            <Text style={[font.h2, { color: colors.grass600 }]}>
              {fresh.emoji} {fresh.title} done!
            </Text>
            <Text style={font.body}>You practised: {fresh.learning}</Text>
          </Card>
        ) : null}

        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }} accessibilityRole="radiogroup">
          {(['build', 'erase'] as Tool[]).map((t) => (
            <Button
              key={t}
              title={t === 'build' ? '🧱 Build' : '🧽 Erase'}
              variant={tool === t ? 'primary' : 'secondary'}
              accessibilityRole="radio"
              accessibilityState={{ selected: tool === t }}
              onPress={() => setTool(t)}
              style={{ flex: 1 }}
            />
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space.sm, justifyContent: 'center' }} accessibilityRole="radiogroup">
          {PAINTS.map((p, i) => (
            <Pressable
              key={p.name}
              accessibilityRole="radio"
              accessibilityLabel={`${p.name} paint`}
              accessibilityState={{ selected: paint === i }}
              onPress={() => {
                setPaint(i);
                setTool('build');
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: p.color,
                borderWidth: paint === i && tool === 'build' ? 4 : 2,
                borderColor: paint === i && tool === 'build' ? colors.ink : colors.line,
              }}
            />
          ))}
        </View>

        <SectionTitle>Plot map</SectionTitle>
        <Text style={[font.small, { marginBottom: space.sm }]}>
          Tap a square {threeD ? 'here or in the 3D view ' : ''}to {tool === 'build' ? 'add a block on top' : 'take the top block off'}. Numbers show how tall each column is (up to {MAX_HEIGHT}).
        </Text>
        <View style={{ alignSelf: 'center', borderRadius: radius.md, overflow: 'hidden', borderWidth: 2, borderColor: colors.iris200 }}>
          {Array.from({ length: GRID }, (_, z) => (
            <View key={z} style={{ flexDirection: 'row' }}>
              {Array.from({ length: GRID }, (_, x) => {
                const h = heightAt(blocks, x, z);
                const top = topPaint(blocks, x, z);
                return (
                  <Pressable
                    key={x}
                    accessibilityRole="button"
                    accessibilityLabel={`Column ${x + 1}, row ${z + 1}: ${h ? `${h} block${h > 1 ? 's' : ''}, ${PAINTS[top!]!.name} on top` : 'empty'}`}
                    onPress={() => tapColumn(x, z)}
                    style={{
                      width: 46,
                      height: 46,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: top !== null ? PAINTS[top]!.color : (x + z) % 2 ? '#DCFCE7' : '#BBF7D0',
                      borderWidth: 0.5,
                      borderColor: colors.white,
                    }}
                  >
                    {h ? <Text style={{ fontFamily: fonts.black, color: top === 6 || top === 2 ? colors.ink : colors.white, fontSize: 16 }}>{h}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <Text style={[font.small, { textAlign: 'center', marginTop: 4 }]}>
          {blocks.length} blocks · {new Set(blocks.map((b) => b.paint)).size} colours
        </Text>

        <SectionTitle>Build challenges · {done.length}/{CHALLENGES.length}</SectionTitle>
        {CHALLENGES.map((c) => {
          const ok = done.includes(c.id);
          return (
            <Card key={c.id} style={ok ? { backgroundColor: colors.grass100, borderColor: colors.grass100 } : undefined}>
              <Text style={[font.body, { fontFamily: fonts.extrabold }]}>
                {ok ? '✅' : c.emoji} {c.title}
              </Text>
              <Text style={font.small}>{c.goal}</Text>
            </Card>
          );
        })}
        <Button title="Clear the plot" variant="ghost" disabled={!blocks.length} onPress={clearAll} style={{ marginTop: space.sm }} />
      </ScrollView>
    </View>
  );
}
