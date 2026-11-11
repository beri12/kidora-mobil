import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Challenge } from '@/api/games';
import { Choice3D, RobotRoute3D, use3D, use3DSupport } from '@/features/game3d/Challenges3D';
import { useSettings } from '@/stores/settings';
import { renderHook } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

const mc: Extract<Challenge, { kind: 'MULTIPLE_CHOICE' }> = {
  id: 'c1', order: 0, kind: 'MULTIPLE_CHOICE', skill: 'math', prompt: '8 + 7?', speaker: null, hintCount: 2, setup: { options: ['15', '14', '16'] },
};
const grid: Extract<Challenge, { kind: 'CODE_PATH' }> = {
  id: 'g1', order: 0, kind: 'CODE_PATH', skill: 'code', prompt: 'Go', speaker: null, hintCount: 2,
  setup: { size: 5, start: [0, 0], dir: 'E', goal: [4, 0], walls: [[2, 0]], items: [], maxBlocks: 4 },
};

describe('3D on/off', () => {
  afterEach(() => {
    useSettings.setState({ games3d: true });
    use3DSupport.setState({ failed: null });
  });
  it('is on by default', async () => {
    expect((await renderHook(() => use3D())).result.current).toBe(true);
  });
  it('turns off from Settings', async () => {
    useSettings.setState({ games3d: false });
    expect((await renderHook(() => use3D())).result.current).toBe(false);
  });
  it('turns off for the rest of the run when the device has no WebGL2', async () => {
    use3DSupport.getState().fail('WebGL2 is not available on this device.');
    expect((await renderHook(() => use3D())).result.current).toBe(false);
  });
});

describe('3D multiple choice', () => {
  it('sends the chosen index to the server and greys out a wrong answer', async () => {
    const onSubmit = jest.fn().mockResolvedValue({ correct: false, revealed: false, result: {}, streak: 0, solved: 0, total: 1 });
    await render(<Choice3D world="MATH_ISLAND" challenge={mc} onSubmit={onSubmit} locked={false} />);
    await fireEvent.press(screen.getByLabelText('Answer 2: 14'));
    expect(onSubmit).toHaveBeenCalledWith(1);
    expect(await screen.findByLabelText('Answer 2: 14, not this one')).toBeTruthy();
  });
});

describe('3D robot route', () => {
  it('submits the block program, never a position, and blames the block that hit the crate', async () => {
    const onSubmit = jest.fn().mockResolvedValue({
      correct: false, revealed: false, streak: 0, solved: 0, total: 1,
      result: { path: [{ x: 0, y: 0, dir: 'E' }, { x: 1, y: 0, dir: 'E' }], reason: 'Bump!' },
    });
    await render(<RobotRoute3D challenge={grid} onSubmit={onSubmit} locked={false} />);
    await fireEvent.press(screen.getByText('⬆ Forward'));
    await fireEvent.press(screen.getByText('⬆ Forward'));
    await fireEvent.press(screen.getByText('▶ Run'));
    expect(onSubmit).toHaveBeenCalledWith(['F', 'F']);
    expect(await screen.findByText('Block 2 is where it went wrong. Change it and run again.')).toBeTruthy();
  });
  it('stops adding blocks at the server limit', async () => {
    await render(<RobotRoute3D challenge={grid} onSubmit={jest.fn()} locked={false} />);
    for (let i = 0; i < 6; i++) await fireEvent.press(screen.getByText('↻ Turn right'));
    expect(screen.getByText(/4\/4 blocks/)).toBeTruthy();
  });
});
