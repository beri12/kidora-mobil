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
