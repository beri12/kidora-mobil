# Kidora 3D learning worlds (mobile)

*Kidora: Learn, Play, Think and Create.* The mobile games run as real 3D scenes (Three.js on
Expo GL), built on the games the Kidora API already serves and scores. Every answer still goes
to the server; the 3D layer shows what happened and never decides it.

## The five worlds

| World | Game (server slug) | 3D mechanic | What the child practises | Scored by |
|---|---|---|---|---|
| **Coding City** | Code City (`code-city`) | Program Kibo the robot with Forward / Turn left / Turn right blocks. Run it: Kibo replays the server's run of the program on a floating island with crates, energy cells and a charging pad | Sequencing, planning, predicting, **debugging** (the block that failed lights up red; the server says why) | Server `runGrid` |
| **Science Planet** | Science Lab (`science-lab`) | Launch Lab: aim the cannon (the barrel follows the angle), set power, launch. The ball lands exactly at the server's distance; the last three landings stay marked | Forces, gravity, angle vs. range; changing one variable at a time | Server `runLaunch` |
| **Math Island** | Math Treasure Rush (`math-treasure-rush`) | Each answer is a treasure chest. Right: Kibo hops over, the lid opens, coins burst out. Wrong: the chest shakes and sinks | Arithmetic, multiplication, fractions | Server |
| **Reading Forest** | Word Safari (`word-safari`) | Answers are stepping stones across the pond | Vocabulary, grammar, comprehension | Server |
| **History World** (bonus) | Africa History Quest (`africa-history-quest`) | Answers are carved stelae, after those of Aksum | Aksum, the Nile Valley, Great Zimbabwe | Server |
| **Creative World** | — (on the phone) | Build on a 6×6 plot: stack blocks, paint, turn the plot. Six build challenges: tall tower, long wall, staircase, A-B pattern, mirror build, exactly twelve | Spatial reasoning, counting, sequences, patterns, symmetry | **On the phone. Practice only, no XP** (the API has no creative game) |

The multiple-choice questions in Code City and Science Lab use the same choice scene, dressed
as code terminals and lab crystals.

### The learning loop (Coding City)

1. See the island: start, crates, energy cells, charging pad.
2. Understand the goal (the prompt).
3. Arrange blocks (up to the level's block limit).
4. Predict, then press **Run**.
5. Kibo replays the server's run block by block; the current block glows.
6. If it fails, Kibo bumps or shrugs, the failing block turns red, and the server's reason shows
   ("Bump! Something is blocking that square.").
7. Fix the program and run again. Hints come from the server.

## How it is built

```
src/features/game3d/
  GLStage.tsx        expo-gl GLView + three.js renderer, render loop, tap picking (raycast),
                     pauses when hidden/backgrounded, reports failure for the 2D fallback
  renderer.ts        three.js on expo-gl (native: canvas stand-in; web: the real canvas)
  BaseWorld.ts       camera framing for any screen shape, projection for RN labels
  kit.ts             low-poly models from simple shapes + flat colours (no textures/model files):
                     Kibo the robot, tiles, trees, crates, gems, chests, stones, crystals, stelae…
  math.ts, tween.ts  pure geometry and a frame-stepped tween runner (unit-tested)
  worlds/            RobotRouteWorld, LaunchWorld, ChoiceWorld (themed per world), CreativeWorld
  Challenges3D.tsx   RN controls + 3D stage for each challenge kind
src/features/creative/   Creative World rules (pure) + on-device store
src/app/(app)/create.tsx Creative World screen
```

- **Server authority:** the 3D components use the same `onSubmit` as the 2D ones. The robot moves
  only along `result.path` from the server; the ball lands at `result.distance`; a chest opens
  only after the server says the answer was right. Nothing in the app can award XP.
- **Accessibility:** every 3D action also has a native control: answer cards (numbered and
  coloured like the 3D objects), block buttons, angle/power steppers, the Creative World plot map,
  and turn buttons. Each stage has a spoken description. Reduce motion (OS or in-app "Calm
  motion") ends animations instantly.
- **Fallbacks:** Settings → "3D game worlds" switches to the classic 2D boards. If a device has
  no WebGL2 or three.js fails, the app switches to 2D for the rest of the run without losing the
  session. If the 3D view has not started yet, animations finish instantly, so the game never
  waits on a scene that is not drawing.
- **Performance:** one shared material per colour, no textures, no real-time shadows (blob
  shadows), `low-power` GPU preference, the frame loop stops when the screen is hidden or the app
  is in the background, at most a few hundred meshes per scene.
- **Cost:** `three@0.186.1` + `expo-gl@58` add ≈1.3 MB to each Hermes bundle (5.5 → 6.8 MB).
  `expo-gl` is a native module: it needs a development build, not Expo Go.

## What was verified, and what was not

| Check | Result |
|---|---|
| `tsc --noEmit`, `expo lint` | pass |
| Jest (115 tests): geometry, path replay, failing-block, arc vs. server formula, tweens, Creative rules and challenges, 3D components submit the right answers, 3D on/off | pass |
| `expo export` Android + iOS (Hermes) | pass |
| Every world in a browser (Expo web, Chromium WebGL2) at 390×844, with a test API built from the real game content and the server's own grid checker: route around a crate, crate bump with the failing block marked, launch in/out of the zone, right/wrong answers in Math, Reading and History, Creative building, 3D tap picking, turning the plot | pass, no console errors |
| **On a real Android or iPhone** | **Not yet done.** expo-gl's native WebGL2 differs from the browser's. Needs a development build (`npx eas-cli@latest build --profile development`) and a pass on a low-end Android (2–3 GB RAM) and an iPhone |
| Against the live API | Not done (unreachable from the build environment) |

## Next steps

1. **Device pass** (above): frame rate on a low-end Android, memory after 10 levels, context loss
   when the app goes to the background and back.
2. **Loops and conditions in Coding City** (backend): `runGrid` accepts only F/L/R. Add
   `{repeat: n, body: [...]}` and an `if blocked` block in `games/engine/checkers.ts` and count
   blocks before expansion; then the app can offer the Repeat block. Do not add it client-side
   only: the server must run the same program the child built.
3. **Creative World on the server** (backend): an `ART_VALLEY` game with build challenges checked
   by the API, if building should earn XP.
4. **More interactive kinds** (backend + app): drag-to-order (sequences, food chains), matching
   pairs, number-line placement, each with a pure server checker like the existing ones.
5. **Partner and Unity games**: the Game SDK, short-lived session tokens and the manifest columns
   from `docs/mobile/IMPLEMENTATION_PLAN.md` (Phase 3).
6. Lazy-load the 3D code so the first screen does not pay for three.js.
