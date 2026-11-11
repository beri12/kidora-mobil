import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { PerspectiveCamera, Raycaster, Vector2, type Object3D, type Scene, type Vector3, type WebGLRenderer } from 'three';
import { useCalmMotion } from '@/utils/feedback';
import { createThreeRenderer } from './renderer';
import { Tweens } from './tween';

/**
 * What a 3D world gives the stage. The stage owns the GL context, the render
 * loop and taps; the controller owns its scene and reacts to game events.
 */
export interface StageController {
  scene: Scene;
  camera: PerspectiveCamera;
  tweens: Tweens;
  /** Called every frame with seconds since the last frame (clamped). */
  update?(dt: number, time: number): void;
  /** Re-frame the camera for a new drawing size. */
  resize(width: number, height: number): void;
  /** Objects that react to taps; `userData.pick` says what was tapped. */
  pickables?(): Object3D[];
  dispose(): void;
}

interface Props {
  controller: StageController;
  /** WebGL2 or three.js failed: the screen shows the classic 2D game instead. */
  onUnsupported: (reason: string) => void;
  /** First frame drawn; projected labels can be measured now. */
  onReady?: (size: { width: number; height: number }) => void;
  /** A tapped object's `userData.pick`, plus where it was hit. */
  onPick?: (pick: { point: Vector3; normal: Vector3 | null } & Record<string, unknown>) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
}

const MAX_DT = 1 / 20; // after a stall, never jump an animation more than one 20 fps frame

export function GLStage({ controller, onUnsupported, onReady, onPick, style, accessibilityLabel }: Props) {
  const calm = useCalmMotion();
  const visible = useRef(true);
  const layout = useRef({ width: 1, height: 1 });
  const cleanup = useRef<(() => void) | null>(null);
  const glReady = useRef(false);
  const laidOut = useRef(false);
  const announced = useRef(false);
  // onReady needs both the first frame and the view's size, which arrive in either order.
  const maybeReady = () => {
    if (glReady.current && laidOut.current && !announced.current) {
      announced.current = true;
      onReady?.({ ...layout.current });
    }
  };
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    controller.tweens.setCalm(calm);
  }, [controller, calm]);

  // Stop drawing when the screen is hidden or the app is in the background: battery and heat.
  useFocusEffect(
    useCallback(() => {
      visible.current = true;
      return () => {
        visible.current = false;
      };
    }, []),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      visible.current = s === 'active';
    });
    return () => sub.remove();
  }, []);
  useEffect(() => () => cleanup.current?.(), []);

  function onContextCreate(gl: ExpoWebGLRenderingContext) {
    let renderer: WebGLRenderer;
    try {
      renderer = createThreeRenderer(gl);
      controller.resize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.render(controller.scene, controller.camera);
      gl.endFrameEXP();
    } catch (e) {
      setFailed(true);
      onUnsupported(e instanceof Error ? e.message : '3D is not available on this device.');
      return;
    }
    glReady.current = true;
    controller.tweens.setLive(true);
    maybeReady();

    let frame = 0;
    let last = 0;
    let alive = true;
    const loop = (now: number) => {
      if (!alive) return;
      frame = requestAnimationFrame(loop);
      const dt = last ? Math.min((now - last) / 1000, MAX_DT) : 0;
      last = now;
      if (!visible.current) return;
      try {
        controller.tweens.step(dt);
        controller.update?.(dt, now / 1000);
        renderer.render(controller.scene, controller.camera);
        gl.endFrameEXP();
      } catch (e) {
        alive = false;
        setFailed(true);
        onUnsupported(e instanceof Error ? e.message : '3D stopped working.');
      }
    };
    frame = requestAnimationFrame(loop);

    cleanup.current = () => {
      alive = false;
      cancelAnimationFrame(frame);
      controller.tweens.setLive(false);
      controller.dispose();
      renderer.dispose();
    };
  }

  function onTap(e: GestureResponderEvent) {
    const pick = controller.pickables?.();
    if (!pick?.length || !onPick) return;
    const { locationX, locationY } = e.nativeEvent;
    const { width, height } = layout.current;
    const ndc = new Vector2((locationX / width) * 2 - 1, -(locationY / height) * 2 + 1);
    const ray = new Raycaster();
    ray.setFromCamera(ndc, controller.camera);
    const hit = ray.intersectObjects(pick, true)[0];
    if (!hit) return;
    // Walk up to the object that carries the pick payload.
    let o: Object3D | null = hit.object;
    while (o && o.userData.pick === undefined) o = o.parent;
    if (o) onPick({ ...(o.userData.pick as Record<string, unknown>), point: hit.point, normal: hit.face?.normal ?? null });
  }

  if (failed) return null;

  return (
    <View
      style={[{ overflow: 'hidden' }, style]}
      onLayout={(e) => {
        layout.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
        laidOut.current = true;
        maybeReady();
      }}
    >
      <Pressable onPress={onTap} style={{ flex: 1 }} accessibilityLabel={accessibilityLabel} accessibilityRole="image">
        <View style={{ flex: 1 }} pointerEvents="none">
          <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
        </View>
      </Pressable>
    </View>
  );
}
