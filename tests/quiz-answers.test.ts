import { toAnswer, type QuizQuestion } from '@/api/quizzes';

const q = (type: string, extra: Partial<QuizQuestion> = {}): QuizQuestion => ({
  id: 'q1', prompt: 'p', type, options: ['a', 'b', 'c'], points: 1, imageUrl: null, hint: null, ...extra,
});

describe('quiz answer format (matches the server grader)', () => {
  it('sends the chosen index for single-choice questions', () => {
    expect(toAnswer(q('MULTIPLE_CHOICE'), 2)).toEqual({ questionId: 'q1', selected: [2] });
    expect(toAnswer(q('TRUE_FALSE'), 0)).toEqual({ questionId: 'q1', selected: [0] });
    expect(toAnswer(q('MULTIPLE_CHOICE'), undefined)).toEqual({ questionId: 'q1', selected: [] });
  });

  it('sends every chosen index for multiple select', () => {
    expect(toAnswer(q('MULTIPLE_SELECT'), [0, 2])).toEqual({ questionId: 'q1', selected: [0, 2] });
  });

  it('sends the displayed order when an ordering question was not touched', () => {
    expect(toAnswer(q('ORDERING'), undefined)).toEqual({ questionId: 'q1', selected: [0, 1, 2] });
    expect(toAnswer(q('ORDERING'), [2, 0, 1])).toEqual({ questionId: 'q1', selected: [2, 0, 1] });
  });

  it('sends matching answers as JSON of the right-hand texts, in left order', () => {
    const m = q('MATCHING', { matchLefts: ['2+2', '3+3'], matchRights: ['6', '4'] });
    expect(toAnswer(m, ['4', '6'])).toEqual({ questionId: 'q1', answerText: '["4","6"]' });
  });

  it('sends free text for short answers and unknown types', () => {
    expect(toAnswer(q('SHORT_ANSWER'), 'photosynthesis')).toEqual({ questionId: 'q1', answerText: 'photosynthesis' });
    expect(toAnswer(q('SOMETHING_NEW'), undefined)).toEqual({ questionId: 'q1', answerText: '' });
  });
});
