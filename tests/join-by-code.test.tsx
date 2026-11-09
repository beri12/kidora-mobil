import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isAccessCodeShape, normalizeAccessCode } from '@/features/courses/accessCode';

const mockJoinByCode = jest.fn();
jest.mock('@/api/learning', () => ({ learningApi: { joinByCode: (code: string) => mockJoinByCode(code) } }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
let mockRole = 'CHILD';
jest.mock('@/stores/auth', () => ({ useAuth: (sel: (s: unknown) => unknown) => sel({ user: { role: mockRole } }) }));

// Imported after the mocks.
import { JoinByCode } from '@/features/courses/JoinByCode';

describe('access code normalisation (mirrors the API)', () => {
  it.each([
    ['cpp-7k4m9x', 'CPP-7K4M9X'],
    [' CPP 7K4M9X ', 'CPP-7K4M9X'],
    ['cpp7k4m9x', 'CPP-7K4M9X'],
    ['ma_th-ab12cd', 'MATH-AB12CD'],
  ])('%s → %s', (raw, out) => {
    expect(normalizeAccessCode(raw)).toBe(out);
    expect(isAccessCodeShape(out)).toBe(true);
  });

  it.each(['', 'ABC', '7K4M9X', 'TOOLONG-7K4M9X', 'CPP-7K4M9'])('rejects %p', (raw) => {
    expect(isAccessCodeShape(normalizeAccessCode(raw))).toBe(false);
  });
});

function renderJoin() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity }, queries: { gcTime: Infinity } } });
  return render(
    <QueryClientProvider client={qc}>
      <JoinByCode />
    </QueryClientProvider>,
  );
}

describe('JoinByCode', () => {
  beforeEach(() => {
    mockJoinByCode.mockReset();
    mockRole = 'CHILD';
  });

  it('is not offered to non-student accounts', async () => {
    mockRole = 'PARENT';
    await renderJoin();
    expect(screen.queryByText('Have a code from your teacher?')).toBeNull();
  });

  it('never sends a malformed code to the server (typos would count toward the hourly limit)', async () => {
    await renderJoin();
    await fireEvent.press(await screen.findByText('Have a code from your teacher?'));
    await fireEvent.changeText(screen.getByLabelText('Course code'), 'abc');
    await fireEvent.press(screen.getByText('Join course'));
    expect(await screen.findByText('A course code looks like CPP-7K4M9X.')).toBeTruthy();
    expect(mockJoinByCode).not.toHaveBeenCalled();
  });

  it('sends the normalised code and shows the course it joined', async () => {
    mockJoinByCode.mockResolvedValue({ enrolled: true, alreadyEnrolled: false, course: { id: 'c1', title: 'Fractions Fun' } });
    await renderJoin();
    await fireEvent.press(await screen.findByText('Have a code from your teacher?'));
    await fireEvent.changeText(screen.getByLabelText('Course code'), 'cpp 7k4m9x');
    await fireEvent.press(screen.getByText('Join course'));
    expect(await screen.findByText("You're in: Fractions Fun")).toBeTruthy();
    expect(mockJoinByCode).toHaveBeenCalledWith('CPP-7K4M9X');
    expect(screen.getByText('Open course')).toBeTruthy();
  });

  it('shows the server message when the code is refused', async () => {
    mockJoinByCode.mockRejectedValue(new Error('That code didn’t work. Check it with your teacher and try again.'));
    await renderJoin();
    await fireEvent.press(await screen.findByText('Have a code from your teacher?'));
    await fireEvent.changeText(screen.getByLabelText('Course code'), 'CPP-7K4M9X');
    await fireEvent.press(screen.getByText('Join course'));
    expect(await screen.findByText(/That code didn’t work/)).toBeTruthy();
  });
});
