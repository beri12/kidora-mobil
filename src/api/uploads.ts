import { api } from './index';
import { secureTokenStore } from './tokens';
import { ApiError, messageFromBody } from './client';

export type UploadKind = 'video' | 'audio' | 'image' | 'document';

/** The server's own limits (uploads.service.ts), mirrored so a file is refused before it is sent. */
export const UPLOAD_RULES: Record<UploadKind, { maxMb: number; mime: RegExp }> = {
  // Lesson videos go through the streaming upload session (presign), whose
  // server default allows mp4 / mov / webm.
  video: { maxMb: 1024, mime: /^video\/(mp4|quicktime|webm)$/ },
  audio: { maxMb: 100, mime: /^audio\/(mpeg|mp3|wav|ogg|webm|aac|mp4)$/ },
  image: { maxMb: 10, mime: /^image\/(png|jpeg|jpg|gif|webp)$/ },
  document: {
    maxMb: 50,
    mime: /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|presentationml\.presentation|spreadsheetml\.sheet)|application\/vnd\.ms-(excel|powerpoint)|text\/(plain|csv|markdown))$/,
  },
};

export function kindOf(mimeType: string): UploadKind | null {
  const mime = mimeType.toLowerCase();
  return (Object.keys(UPLOAD_RULES) as UploadKind[]).find((k) => UPLOAD_RULES[k].mime.test(mime)) ?? null;
}

export function validateFile(file: { mimeType?: string | null; size?: number | null }): { ok: true; kind: UploadKind } | { ok: false; reason: string } {
  const kind = kindOf(file.mimeType ?? '');
  if (!kind) return { ok: false, reason: 'This file type is not supported. Use a PDF, Office document, image, audio or video file.' };
  if (!file.size) return { ok: false, reason: "We couldn't read the file size. Try picking the file again." };
  const max = UPLOAD_RULES[kind].maxMb;
  if (file.size > max * 1024 * 1024) return { ok: false, reason: `${kind[0]!.toUpperCase() + kind.slice(1)} files can be up to ${max} MB.` };
  return { ok: true, kind };
}

export interface LibraryUploadResult {
  id: string;
  url: string;
  name: string;
  sizeBytes: number;
  kind: string;
  mimeType: string;
  contentType: string;
}

export interface UploadHandle<T> {
  promise: Promise<T>;
  cancel: () => void;
}

/**
 * Streams the file from disk with XMLHttpRequest, which (unlike fetch in
 * React Native) reports upload progress. The file is never read into a JS
 * string or buffer, so a large video does not fill the app's memory.
 * Uploads are not retried automatically; the teacher presses "Retry".
 */
export function uploadToLibrary(
  file: { uri: string; name: string; mimeType: string },
  onProgress: (fraction: number) => void,
): UploadHandle<LibraryUploadResult> {
  const xhr = new XMLHttpRequest();
  const promise = (async () => {
    const tokens = await secureTokenStore.get();
    if (!tokens) throw new ApiError('Please sign in again.', { status: 401 });
    const form = new FormData();
    // React Native's FormData accepts { uri, name, type } and streams the file.
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);

    return new Promise<LibraryUploadResult>((resolve, reject) => {
      xhr.open('POST', api.url('/uploads/library'));
      xhr.setRequestHeader('Authorization', `Bearer ${tokens.accessToken}`);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.timeout = 15 * 60 * 1000;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        let body: unknown;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          body = xhr.responseText;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(1);
          resolve(body as LibraryUploadResult);
        } else {
          reject(new ApiError(messageFromBody(body, `Upload failed (${xhr.status}).`), { status: xhr.status, body }));
        }
      };
      xhr.onerror = () => reject(new ApiError('The upload was interrupted. Check your connection and retry.', { isNetwork: true }));
      xhr.ontimeout = () => reject(new ApiError('The upload took too long. Try a smaller file or a better connection.', { isTimeout: true }));
      xhr.onabort = () => reject(new ApiError('Upload cancelled.', { status: 0 }));
      xhr.send(form);
    });
  })();
  return { promise, cancel: () => xhr.abort() };
}

/** Link a library item to one of the teacher's lessons (the server checks ownership). */
export function attachToLesson(resourceId: string, lessonId: string | null) {
  return api.patch<{ id: string; lessonId: string | null; courseId: string | null }>(`/teacher/resources/${encodeURIComponent(resourceId)}/attach`, { lessonId });
}

/* ------------------------------------------------------------- lesson video */

export interface PresignResult {
  sessionId: string;
  uploadUrl: string;
  headers: Record<string, string>;
  /** true: PUT straight to object storage (no auth); false: PUT to the API (Bearer). */
  direct: boolean;
  resumed: boolean;
  expiresAt: string;
}

export interface CompletedVideo {
  contentItem: { id: string; title: string; lessonId: string };
  video: { id: string; url: string | null; processingStatus: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED'; error: string | null };
}

/**
 * Lesson videos use the upload-session flow: the API (or S3) receives the raw
 * file as a stream, so a large video never sits in the server's memory, which
 * the library route would do. Steps: presign → PUT → complete.
 * Only the presign and complete calls change data; a failed PUT can simply be
 * retried with the same session (the server answers resumed: true).
 */
export function uploadLessonVideo(
  file: { uri: string; name: string; mimeType: string; size: number },
  target: { courseId: string; lessonId: string; title: string },
  onProgress: (fraction: number) => void,
): UploadHandle<CompletedVideo> {
  let xhr: XMLHttpRequest | null = null;
  let cancelled = false;
  const promise = (async () => {
    const session = await api.post<PresignResult>('/uploads/presign', {
      courseId: target.courseId,
      lessonId: target.lessonId,
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.mimeType,
    });
    if (cancelled) throw new ApiError('Upload cancelled.');
    const tokens = await secureTokenStore.get();
    // React Native blobs are native-backed: this does not copy the video into JS memory.
    const blob = await (await fetch(file.uri)).blob();

    await new Promise<void>((resolve, reject) => {
      const req = new XMLHttpRequest();
      xhr = req;
      req.open('PUT', session.uploadUrl);
      for (const [k, v] of Object.entries(session.headers ?? {})) req.setRequestHeader(k, v);
      if (!session.direct && tokens) req.setRequestHeader('Authorization', `Bearer ${tokens.accessToken}`);
      req.timeout = 60 * 60 * 1000;
      req.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total) onProgress(Math.min(0.99, e.loaded / e.total));
      };
      req.onload = () =>
        req.status >= 200 && req.status < 300
          ? resolve()
          : reject(new ApiError(messageFromBody(safeJson(req.responseText), `Upload failed (${req.status}).`), { status: req.status }));
      req.onerror = () => reject(new ApiError('The upload was interrupted. Check your connection and retry.', { isNetwork: true }));
      req.ontimeout = () => reject(new ApiError('The upload took too long.', { isTimeout: true }));
      req.onabort = () => reject(new ApiError('Upload cancelled.'));
      req.send(blob);
    });

    // DRAFT: students never see it until the teacher reviews and publishes it.
    const done = await api.post<CompletedVideo>('/uploads/complete', { sessionId: session.sessionId, title: target.title, status: 'DRAFT' });
    onProgress(1);
    return done;
  })();
  return {
    promise,
    cancel: () => {
      cancelled = true;
      xhr?.abort();
    },
  };
}

/** A teacher's explicit "Publish to students" after reviewing a drafted item. */
export function setContentStatus(contentItemId: string, status: 'DRAFT' | 'PUBLISHED') {
  return api.patch<{ id: string; status: string }>(`/authoring/content/${encodeURIComponent(contentItemId)}/status/${status}`);
}

/** Processing state of an uploaded video (thumbnail, duration…). */
export function videoStatus(videoId: string) {
  return api.get<{ processingStatus: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED'; error: string | null; url: string | null }>(`/uploads/videos/${encodeURIComponent(videoId)}/status`);
}

/** Re-run processing for a failed video without uploading it again (no duplicate record). */
export function retryVideo(videoId: string) {
  return api.post<unknown>(`/uploads/videos/${encodeURIComponent(videoId)}/retry`);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
