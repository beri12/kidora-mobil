import { act, render, screen } from '@testing-library/react-native';
import { AnimatedSplash } from '@/components/AnimatedSplash';

describe('AnimatedSplash', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('waits for the app before going away', async () => {
    const onDone = jest.fn();
    const { rerender } = await render(<AnimatedSplash ready={false} onShown={jest.fn()} onDone={onDone} />);
    expect(screen.getByLabelText('Kidora is loading')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(onDone).not.toHaveBeenCalled();

    await rerender(<AnimatedSplash ready onShown={jest.fn()} onDone={onDone} />);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('plays its intro before leaving even when the app is ready at once', async () => {
    const onDone = jest.fn();
    await render(<AnimatedSplash ready onShown={jest.fn()} onDone={onDone} />);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(onDone).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(800); // intro over
    });
    await act(async () => {
      jest.advanceTimersByTime(500); // fade-out
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
