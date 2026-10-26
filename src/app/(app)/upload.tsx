import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { teacherApi } from '@/api/roles';
import {
  attachToLesson,
  retryVideo,
  setContentStatus,
  uploadLessonVideo,
  uploadToLibrary,
  validateFile,
  videoStatus,
  type CompletedVideo,
  type LibraryUploadResult,
  type UploadHandle,
  type UploadKind,
} from '@/api/uploads';
import { Button, Card, Field, FormError, ProgressBar, SectionTitle } from '@/components/ui';
import { colors, font, radius, space } from '@/theme';
import { feedback } from '@/utils/feedback';

type Picked = { uri: string; name: string; mimeType: string; size: number; kind: UploadKind };
type Done = { kind: 'video'; video: CompletedVideo } | { kind: 'file'; file: LibraryUploadResult; attachedTo: string | null };

const PICK_TYPES = ['application/pdf', 'image/*', 'audio/*', 'video/mp4', 'video/quicktime', 'video/webm', 'text/plain', 'text/csv', 'application/msword', 'application/vnd.openxmlformats-officedocument.*'];

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress} style={{ paddingHorizontal: space.md, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 2, borderColor: on ? colors.iris600 : colors.line, backgroundColor: on ? colors.iris100 : colors.white, marginRight: space.sm, marginBottom: space.sm }}>
      <Text style={{ fontWeight: '700', color: colors.ink }}>{label}</Text>
    </Pressable>
  );
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(n > 10 * 1024 * 1024 ? 0 : 1)} MB`;

export default function Upload() {
  const qc = useQueryClient();
  const [file, setFile] = useState<Picked | null>(null);
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState<Done | null>(null);
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState(false);
  const handle = useRef<UploadHandle<unknown> | null>(null);

  const courses = useQuery({ queryKey: ['teacher', 'courses'], queryFn: teacherApi.courses });
  const lessons = useQuery({ queryKey: ['teacher', 'lessons', courseId], queryFn: () => teacherApi.lessons(courseId!), enabled: !!courseId });
  const status = useQuery({
    queryKey: ['upload', 'video', done?.kind === 'video' ? done.video.video.id : null],
    queryFn: () => videoStatus((done as Extract<Done, { kind: 'video' }>).video.video.id),
    enabled: done?.kind === 'video',
    refetchInterval: (q) => (q.state.data && ['READY', 'FAILED'].includes(q.state.data.processingStatus) ? false : 4000),
  });

  async function pick() {
    setError('');
    const res = await DocumentPicker.getDocumentAsync({ type: PICK_TYPES, copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    const check = validateFile({ mimeType: a.mimeType, size: a.size });
    if (!check.ok) {
      setFile(null);
      return setError(check.reason);
    }
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType!, size: a.size!, kind: check.kind });
    setTitle(a.name.replace(/\.[^.]+$/, ''));
    setDone(null);
    setPublished(false);
  }

  async function start() {
    if (!file) return;
    if (!title.trim()) return setError('Give it a title students will understand.');
    if (file.kind === 'video' && (!courseId || !lessonId)) return setError('Choose the course and lesson this video belongs to.');
    setError('');
    setBusy(true);
    setProgress(0);
    try {
      if (file.kind === 'video') {
        const h = uploadLessonVideo(file, { courseId: courseId!, lessonId: lessonId!, title: title.trim() }, setProgress);
        handle.current = h;
        setDone({ kind: 'video', video: await h.promise });
      } else {
        const ext = /\.[^.]+$/.exec(file.name)?.[0] ?? '';
        const h = uploadToLibrary({ uri: file.uri, name: `${title.trim()}${ext}`, mimeType: file.mimeType }, setProgress);
        handle.current = h;
        setDone({ kind: 'file', file: await h.promise, attachedTo: null });
      }
      feedback.correct();
      qc.invalidateQueries({ queryKey: ['teacher', 'resources'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
      setProgress(null);
    } finally {
      handle.current = null;
      setBusy(false);
    }
  }

  /** The review step: only now do students see it. */
  async function publish() {
    if (!done) return;
    setBusy(true);
    setError('');
    try {
      if (done.kind === 'video') {
        await setContentStatus(done.video.contentItem.id, 'PUBLISHED');
      } else {
        if (!lessonId) throw new Error('Choose the lesson to add this file to.');
        await attachToLesson(done.file.id, lessonId);
      }
      setPublished(true);
      feedback.complete();
      qc.invalidateQueries({ queryKey: ['teacher', 'resources'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not publish.');
    } finally {
      setBusy(false);
    }
  }

  const videoState = status.data?.processingStatus ?? (done?.kind === 'video' ? done.video.video.processingStatus : null);

  return (
    <ScrollView style={{ backgroundColor: colors.iris50 }} contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}>
      <Stack.Screen options={{ headerShown: true, title: 'Upload content' }} />
      <FormError>{error}</FormError>

      <SectionTitle>1. Choose a file</SectionTitle>
      <Button title={file ? 'Choose a different file' : 'Choose a file'} variant="secondary" disabled={busy} onPress={pick} />
      {file && (
        <Card style={{ marginTop: space.md }}>
          <Text style={[font.body, { fontWeight: '800' }]}>{file.name}</Text>
          <Text style={font.small}>
            {file.kind} · {file.mimeType} · {mb(file.size)}
          </Text>
        </Card>
      )}
      <Text style={font.small}>PDF, Office documents, images (10 MB), audio (100 MB), lesson videos (MP4/MOV/WebM).</Text>

      {file && !done && (
        <>
          <SectionTitle>2. Describe it</SectionTitle>
          <Field label="Title" value={title} onChangeText={setTitle} maxLength={150} />

          <SectionTitle>3. Where does it go?</SectionTitle>
          <Text style={[font.small, { marginBottom: space.sm }]}>{file.kind === 'video' ? 'Videos belong to a lesson in one of your own courses.' : 'Optional now; you can add it to a lesson after the upload.'}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {(courses.data ?? []).map((c) => (
              <Chip key={c.id} label={c.title} on={courseId === c.id} onPress={() => { setCourseId(c.id); setLessonId(null); }} />
            ))}
          </View>
          {courseId && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm }}>
              {(lessons.data?.items ?? []).sort((a, b) => a.order - b.order).map((l) => (
                <Chip key={l.id} label={l.title} on={lessonId === l.id} onPress={() => setLessonId(l.id)} />
              ))}
            </View>
          )}

          <SectionTitle>4. Upload</SectionTitle>
          {progress !== null && (
            <View style={{ marginBottom: space.md }}>
              <ProgressBar value={progress} label="Upload progress" />
              <Text style={font.small}>{Math.round(progress * 100)}%</Text>
            </View>
          )}
          <Button title="Upload" busy={busy} onPress={start} />
          {busy && <Button title="Cancel upload" variant="ghost" onPress={() => handle.current?.cancel()} style={{ marginTop: space.sm }} />}
        </>
      )}

      {done && (
        <>
          <SectionTitle>5. Review and publish</SectionTitle>
          {done.kind === 'video' ? (
            <Card>
              <Text style={[font.body, { fontWeight: '800' }]}>🎬 {done.video.contentItem.title}</Text>
              <Text style={font.small}>
                Saved as a draft: students can’t see it yet. Processing: {videoState?.toLowerCase()}
                {status.data?.error ? ` (${status.data.error})` : ''}
              </Text>
              {videoState === 'FAILED' && (
                <Button title="Retry processing" variant="secondary" onPress={() => retryVideo(done.video.video.id).then(() => status.refetch())} style={{ marginTop: space.sm }} />
              )}
            </Card>
          ) : (
            <Card>
              <Text style={[font.body, { fontWeight: '800' }]}>📄 {done.file.name}</Text>
              <Text style={font.small}>In your library. It reaches students only when you add it to a lesson.</Text>
            </Card>
          )}
          {published ? (
            <Card style={{ backgroundColor: colors.grass100, borderColor: colors.grass100 }}>
              <Text style={[font.body, { fontWeight: '800', color: colors.grass600 }]}>✅ Published to the lesson.</Text>
            </Card>
          ) : (
            <Button
              title={done.kind === 'video' ? 'Publish to students' : lessonId ? 'Add to the lesson' : 'Choose a lesson above first'}
              variant="success"
              busy={busy}
              disabled={done.kind === 'file' ? !lessonId : videoState !== 'READY'}
              onPress={publish}
            />
          )}
          {done.kind === 'file' && !published && !lessonId && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space.md }}>
              {(courses.data ?? []).map((c) => (
                <Chip key={c.id} label={c.title} on={courseId === c.id} onPress={() => { setCourseId(c.id); setLessonId(null); }} />
              ))}
              {courseId && (lessons.data?.items ?? []).map((l) => <Chip key={l.id} label={`📘 ${l.title}`} on={lessonId === l.id} onPress={() => setLessonId(l.id)} />)}
            </View>
          )}
          <Button title="Done" variant="ghost" onPress={() => router.back()} style={{ marginTop: space.md }} />
        </>
      )}
    </ScrollView>
  );
}
