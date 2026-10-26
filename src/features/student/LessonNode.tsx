import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import type { WorldNode } from '@/api/learning';
import { colors } from '@/theme';
import { feedback, useCalmMotion } from '@/utils/feedback';

const ICON: Record<WorldNode['type'], string> = { COURSE: '📘', SECTION: '📂', LESSON: '⭐', CHALLENGE: '🎮', BOSS: '👑' };

/** One stop on an island path. Available stops bob gently to invite a tap. */
export function LessonNode({ node, color, offset, onPress }: { node: WorldNode; color: string; offset: number; onPress: () => void }) {
  const calm = useCalmMotion();
  const y = useSharedValue(0);
  const available = node.status === 'AVAILABLE';
  useEffect(() => {
    if (!available || calm) return;
    y.value = withRepeat(withSequence(withTiming(-6, { duration: 700 }), withTiming(0, { duration: 700 })), -1);
  }, [available, calm, y]);
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const done = node.status === 'COMPLETED';
  const locked = node.status === 'LOCKED';
  const bg = done ? colors.sun400 : locked ? colors.line : color;
  const label = `${node.title}. ${done ? 'Completed' : locked ? 'Locked' : 'Ready to start'}`;

  return (
    <View style={{ alignItems: 'center', marginVertical: 8, transform: [{ translateX: offset }] }}>
      <Animated.View style={bob}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: locked }}
          onPress={() => {
            if (locked) feedback.wrong();
            else feedback.tap();
            onPress();
          }}
          style={({ pressed }) => ({
            width: 74,
            height: 70,
            borderRadius: 37,
            backgroundColor: bg,
            borderBottomWidth: pressed ? 2 : 7,
            borderBottomColor: 'rgba(0,0,0,0.18)',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: pressed ? 5 : 0,
          })}
        >
          <Text style={{ fontSize: 30, opacity: locked ? 0.45 : 1 }}>{locked ? '🔒' : done ? '✅' : ICON[node.type]}</Text>
        </Pressable>
      </Animated.View>
      <Text numberOfLines={2} style={{ maxWidth: 150, textAlign: 'center', marginTop: 4, fontWeight: '700', color: locked ? colors.muted : colors.ink }}>
        {node.title}
      </Text>
    </View>
  );
}
