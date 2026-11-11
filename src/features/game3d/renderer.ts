import { SRGBColorSpace, WebGLRenderer } from 'three';
import type { ExpoWebGLRenderingContext } from 'expo-gl';

/**
 * three.js expects a DOM canvas. On Android and iOS, expo-gl gives a native
 * WebGL2 context with no canvas, so three gets a minimal stand-in that only
 * answers the questions WebGLRenderer asks. In a browser, expo-gl's context
 * has a real canvas and that is used as-is.
 *
 * Throws if the device has no WebGL2 (three.js needs it); callers catch that
 * and show the classic 2D game instead.
 */
export function createThreeRenderer(gl: ExpoWebGLRenderingContext): WebGLRenderer {
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  const isWebGL2 = typeof WebGL2RenderingContext === 'undefined' || gl instanceof WebGL2RenderingContext || typeof (gl as { texImage3D?: unknown }).texImage3D === 'function';
  if (!isWebGL2) throw new Error('WebGL2 is not available on this device.');

  const real = (gl as unknown as { canvas?: unknown }).canvas;
  const hasDomCanvas = typeof HTMLCanvasElement !== 'undefined' && real instanceof HTMLCanvasElement;
  const canvas = hasDomCanvas
    ? (real as HTMLCanvasElement)
    : ({
        width,
        height,
        clientWidth: width,
        clientHeight: height,
        style: {},
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        getContext: () => gl,
      } as unknown as HTMLCanvasElement);

  // Some native contexts return null here; three reads the attributes at startup.
  const attrs = gl.getContextAttributes?.();
  if (!attrs) {
    (gl as unknown as { getContextAttributes: () => WebGLContextAttributes }).getContextAttributes = () => ({
      alpha: true,
      antialias: false,
      depth: true,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
      desynchronized: false,
    });
  }

  const renderer = new WebGLRenderer({
    canvas,
    context: gl as unknown as WebGL2RenderingContext,
    antialias: false,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(1); // expo-gl's buffer is already in device pixels
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = false; // blob shadows instead: cheap on low-end GPUs
  return renderer;
}
