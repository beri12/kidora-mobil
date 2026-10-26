/**
 * Wall-clock time for event handlers and effects. Kept in one helper so the
 * React Compiler lint (which forbids impure calls during render) can tell
 * these apart from render code; never call it while rendering.
 */
export const nowMs = () => Date.now();
