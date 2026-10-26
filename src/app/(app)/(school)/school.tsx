import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { schoolApi } from '@/api/roles';
import { ApiError } from '@/api/client';
import { Button, Card, Empty, ErrorState, Loading, ProgressBar, SectionTitle, Title } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { colors, font, islandTheme, space } from '@/theme';

/** Aggregates only: the dashboard is computed on the server, never from a downloaded student list. */
export default function SchoolHome() {
  const user = useAuth((s) => s.user);
  const q = useQuery({ queryKey: ['school', 'dashboard'], queryFn: schoolApi.dashboard });

  const header = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Title>{q.data?.school.name ?? 'School'}</Title>
      <Button title="⚙️" variant="ghost" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={{ minHeight: 40 }} />
    </View>
  );

  if (q.isPending) return <Loading />;
  if (q.error) {
    const noSchool = q.error instanceof ApiError && q.error.status === 403;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.iris50, padding: space.lg }}>
        {header}
        {noSchool ? (
          <Empty emoji="🏛️" title={user?.role === 'DISTRICT_ADMIN' ? 'District dashboards are coming' : 'No school linked yet'}>
            {user?.role === 'DISTRICT_ADMIN'
              ? 'District-wide views need new reporting on the Kidora API. Your school-level dashboards appear here once a school is linked to your account.'
              : user?.orgRequest?.status === 'PENDING'
                ? 'Your school account request is being reviewed by the Kidora team.'
                : 'Ask the Kidora team to link your account to your school.'}
          </Empty>
        ) : (
          <ErrorState message={q.error.message} onRetry={() => q.refetch()} />
        )}
      </SafeAreaView>
    );
  }
  const d = q.data;
  const h = d.studentHealth;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.iris50 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }} refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />}>
        {header}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
          {[
            ['🧑‍🎓', 'Students', d.kpis.students.value],
            ['🧑‍🏫', 'Teachers', d.kpis.teachers.value],
            ['🏫', 'Classes', d.kpis.classes.value],
            ['📈', 'Avg completion', `${d.kpis.averageCompletion.value}%`],
          ].map(([e, l, v]) => (
            <Card key={String(l)} style={{ width: '48%', marginBottom: 0 }}>
              <Text style={{ fontSize: 22 }}>{e}</Text>
              <Text style={font.h2}>{v}</Text>
              <Text style={font.small}>{l}</Text>
            </Card>
          ))}
        </View>

        <SectionTitle>Student health</SectionTitle>
        <Card>
          {[
            ['On track', h.onTrack, colors.grass500],
            ['Needs support', h.needsSupport, colors.sun500],
            ['At risk', h.atRisk, colors.coral500],
          ].map(([label, n, c]) => (
            <View key={String(label)} style={{ marginBottom: space.sm }}>
              <Text style={font.body}>
                {label}: {n}
              </Text>
              <ProgressBar value={h.total ? Number(n) / h.total : 0} color={String(c)} height={10} />
            </View>
          ))}
        </Card>

        <SectionTitle>Academics</SectionTitle>
        <Card>
          {[
            ['Course completion', d.academicOverview.courseCompletion],
            ['Assignment completion', d.academicOverview.assignmentCompletion],
            ['Quiz average', d.academicOverview.quizAverage],
            ['Exam pass rate', d.academicOverview.examPassRate],
          ].map(([label, v]) => (
            <View key={String(label)} style={{ marginBottom: space.sm }}>
              <Text style={font.body}>
                {label}: {Math.round(Number(v))}%
              </Text>
              <ProgressBar value={Number(v) / 100} height={10} />
            </View>
          ))}
        </Card>

        {d.topSubjects.length > 0 && (
          <>
            <SectionTitle>Subjects</SectionTitle>
            {d.topSubjects.map((s) => (
              <Card key={s.subject}>
                <Text style={[font.body, { fontWeight: '800' }]}>
                  {islandTheme(s.subject).emoji} {s.subject}
                </Text>
                <Text style={font.small}>
                  Average {Math.round(s.averageScore)}% · completion {Math.round(s.completion)}% · mastery {Math.round(s.mastery)}%
                </Text>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
