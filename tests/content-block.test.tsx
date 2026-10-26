import { render, screen, fireEvent } from '@testing-library/react-native';
import type { LessonContentItem } from '@/api/learning';
import type { QuizQuestion } from '@/api/quizzes';
import { ContentBlock } from '@/features/lessons/ContentBlock';
import { isAnswered, QuestionView } from '@/features/quiz/QuestionView';

const item = (p: Partial<LessonContentItem>): LessonContentItem => ({
  id: 'i1', type: 'PARAGRAPH', order: 0, title: '', body: null, url: null, isRequired: true, durationSeconds: null,
  downloadUrls: null, quizId: null, assignmentId: null, externalUrl: null, video: null, progress: [], ...p,
});

describe('lesson content renderer', () => {
  it('renders text blocks', async () => {
    await render(<ContentBlock courseId="c1" onWatched={() => undefined} item={item({ body: 'Plants need sunlight.' })} />);
    expect(await screen.findByText('Plants need sunlight.')).toBeTruthy();
  });

  it('shows an unknown content type instead of crashing the lesson', async () => {
    await render(<ContentBlock courseId="c1" onWatched={() => undefined} item={item({ type: 'HOLOGRAM_V9', title: 'Future thing' })} />);
    expect(await screen.findByText('Future thing')).toBeTruthy();
    expect(screen.getByText('This activity opens on justkidora.com.')).toBeTruthy();
  });

  it('explains a video that is still processing', async () => {
    await render(
      <ContentBlock
        courseId="c1"
        onWatched={() => undefined}
        item={item({ type: 'VIDEO', video: { id: 'v', url: null, thumbnailUrl: null, durationSeconds: null, captionsUrl: null, processingStatus: 'PROCESSING' } })}
      />,
    );
    expect(await screen.findByText(/still being prepared/)).toBeTruthy();
  });
});

describe('quiz question view', () => {
  const mc: QuizQuestion = { id: 'q', prompt: '2 + 2 = ?', type: 'MULTIPLE_CHOICE', options: ['3', '4'], points: 1, imageUrl: null, hint: null };

  it('reports the chosen option index', async () => {
    const onChange = jest.fn();
    await render(<QuestionView q={mc} value={undefined} onChange={onChange} />);
    await fireEvent.press(await screen.findByText('4'));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('knows when a question is answered', () => {
    expect(isAnswered(mc, undefined)).toBe(false);
    expect(isAnswered(mc, 0)).toBe(true);
    expect(isAnswered({ ...mc, type: 'MATCHING', matchLefts: ['a', 'b'] }, ['x', ''])).toBe(false);
    expect(isAnswered({ ...mc, type: 'ORDERING' }, undefined)).toBe(true);
  });
});
