import { kindOf, validateFile } from '@/api/uploads';

const MB = 1024 * 1024;

describe('upload validation (mirrors the server limits)', () => {
  it('recognises each supported kind', () => {
    expect(kindOf('application/pdf')).toBe('document');
    expect(kindOf('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('document');
    expect(kindOf('image/png')).toBe('image');
    expect(kindOf('audio/mpeg')).toBe('audio');
    expect(kindOf('video/mp4')).toBe('video');
    expect(kindOf('VIDEO/QUICKTIME')).toBe('video');
  });

  it('refuses types the server does not accept', () => {
    expect(validateFile({ mimeType: 'application/x-msdownload', size: 10 })).toEqual({ ok: false, reason: expect.stringContaining('not supported') });
    expect(validateFile({ mimeType: 'image/svg+xml', size: 10 }).ok).toBe(false); // scriptable; not offered from the phone
    expect(validateFile({ mimeType: undefined, size: 10 }).ok).toBe(false);
  });

  it('applies a limit per type instead of one large limit for everything', () => {
    expect(validateFile({ mimeType: 'image/jpeg', size: 9 * MB }).ok).toBe(true);
    expect(validateFile({ mimeType: 'image/jpeg', size: 11 * MB })).toEqual({ ok: false, reason: 'Image files can be up to 10 MB.' });
    expect(validateFile({ mimeType: 'application/pdf', size: 51 * MB }).ok).toBe(false);
    expect(validateFile({ mimeType: 'audio/mpeg', size: 99 * MB }).ok).toBe(true);
    expect(validateFile({ mimeType: 'video/mp4', size: 900 * MB }).ok).toBe(true);
    expect(validateFile({ mimeType: 'video/mp4', size: 1100 * MB }).ok).toBe(false);
  });

  it('needs a readable size', () => {
    expect(validateFile({ mimeType: 'application/pdf', size: 0 }).ok).toBe(false);
  });
});

describe('enforceDraft (lesson videos never go live unreviewed without the teacher knowing)', () => {
  const { enforceDraft } = jest.requireActual('@/api/uploads') as typeof import('@/api/uploads');
  const base = {
    contentItem: { id: 'ci1', title: 'Fractions intro', lessonId: 'l1' },
    video: { id: 'v1', url: null, processingStatus: 'PENDING' as const, error: null },
  };

  it('trusts a server that honoured DRAFT and makes no extra call', async () => {
    const setStatus = jest.fn();
    const out = await enforceDraft({ ...base, contentItem: { ...base.contentItem, status: 'DRAFT' } }, setStatus);
    expect(setStatus).not.toHaveBeenCalled();
    expect(out.visibleToStudents).toBe(false);
  });

  it('moves an item the server published back to draft', async () => {
    const setStatus = jest.fn().mockResolvedValue({ id: 'ci1', status: 'DRAFT' });
    const out = await enforceDraft({ ...base, contentItem: { ...base.contentItem, status: 'PUBLISHED' } }, setStatus);
    expect(setStatus).toHaveBeenCalledWith('ci1', 'DRAFT');
    expect(out.visibleToStudents).toBe(false);
    expect(out.contentItem.status).toBe('DRAFT');
  });

  it('treats a missing status as published', async () => {
    const setStatus = jest.fn().mockResolvedValue({});
    await enforceDraft(base, setStatus);
    expect(setStatus).toHaveBeenCalledWith('ci1', 'DRAFT');
  });

  it('reports the video as live when it cannot be moved back', async () => {
    const setStatus = jest.fn().mockRejectedValue(new Error('403'));
    const out = await enforceDraft({ ...base, contentItem: { ...base.contentItem, status: 'PUBLISHED' } }, setStatus);
    expect(out.visibleToStudents).toBe(true);
  });
});
