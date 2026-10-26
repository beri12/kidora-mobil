import { api } from './index';
import type { Paginated } from './learning';

type Kpi = { value: number; unit?: string; caption?: string; trend?: { delta: number; label: string } };

/* ------------------------------------------------------------------ parent */

export interface ChildSummary {
  id: string;
  name: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarColor: string;
  grade: string | null;
  className: string | null;
  schoolName: string | null;
}

export interface ParentDashboard {
  children: ChildSummary[];
  selectedChildId: string;
  kpis: { overallProgress: Kpi; lessonsCompleted: Kpi; quizAverage: Kpi; streak: Kpi; coins: Kpi } | null;
  subjectProgress: { subject: string; accent: string | null; percent: number }[];
  weeklyActivity: { labels: string[]; minutes: number[]; totalMinutes: number; lessons: number; quizzes: number; assignments: number };
  insights: { strengths: string[]; needsPractice: string[]; tip: string | null };
  upcomingAssignments: { id: string; title: string; subject: string; dueAt: string | null; status: string; score: number | null }[];
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  xpDelta: number;
  createdAt: string;
}

/** Only children the server has linked to this parent are ever returned (403 otherwise). */
export const parentApi = {
  children: () => api.get<ChildSummary[]>('/parent/children'),
  dashboard: (childId?: string, range: 'today' | 'week' | 'month' = 'week') => api.get<ParentDashboard>('/parent/dashboard', { query: { childId, range } }),
  activity: (childId: string, page = 1) => api.get<Paginated<ActivityItem>>(`/parent/children/${encodeURIComponent(childId)}/activity`, { query: { page, pageSize: 20 } }),
};

/* ----------------------------------------------------------------- teacher */

export interface TeacherClass {
  id: string;
  name: string;
  grade: string | null;
  subject: string | null;
  studentCount: number;
  averageScore: number;
  completionPercent: number;
  atRiskCount: number;
  lastActivityAt: string | null;
}

export interface TeacherStudent {
  id: string;
  name: string;
  avatarUrl: string | null;
  className: string | null;
  grade: string | null;
  progressPercent: number;
  averageScore: number;
  health: 'ON_TRACK' | 'NEEDS_SUPPORT' | 'AT_RISK';
}

export interface TeacherDashboard {
  profile: { id: string; name: string; subject: string | null; verified: boolean };
  kpis: { students: Kpi; coursesTeaching: Kpi; pendingAssignments: Kpi; averageClassProgress: Kpi; badgesAwarded: Kpi };
  classes: TeacherClass[];
  tasks: { id: string; type: 'ASSIGNMENT' | 'EXAM'; title: string; className: string; dueAt: string | null; bucket: 'OVERDUE' | 'TODAY' | 'TOMORROW' | 'UPCOMING' }[];
  topics: { topic: string; mastered: number; total: number; averageScore: number; masteryPercent: number }[];
}

export interface Resource {
  id: string;
  name: string;
  description: string | null;
  url: string;
  kind: string;
  sizeBytes: number | null;
  mimeType: string | null;
  createdAt: string;
  course: { id: string; title: string } | null;
  lesson: { id: string; title: string } | null;
}

export const teacherApi = {
  dashboard: () => api.get<TeacherDashboard>('/teacher/dashboard'),
  classes: () => api.get<TeacherClass[]>('/teacher/classes'),
  classDetail: (id: string) => api.get<TeacherClass & { students: TeacherStudent[] }>(`/teacher/classes/${encodeURIComponent(id)}`),
  students: (query: { page?: number; search?: string; classId?: string } = {}) => api.get<Paginated<TeacherStudent>>('/teacher/students', { query: { pageSize: 30, ...query } }),
  courses: () => api.get<{ id: string; title: string; status: string; subject: string; totalLessons: number; studentCount: number }[]>('/teacher/courses'),
  lessons: (courseId: string) =>
    api.get<Paginated<{ id: string; title: string; status: string; order: number; section: { id: string; title: string } | null }>>('/teacher/lessons', { query: { courseId, pageSize: 100 } }),
  resources: (query: { page?: number; search?: string } = {}) => api.get<Paginated<Resource>>('/teacher/resources', { query: { pageSize: 30, ...query } }),
  addResource: (body: { name: string; url: string; description?: string; courseId?: string; lessonId?: string; mimeType?: string; sizeBytes?: number }) =>
    api.post<Resource>('/teacher/resources', body),
};

/* ------------------------------------------------------------------ school */

export interface SchoolDashboard {
  school: { id: string; name: string; logoUrl: string | null; plan: string | null };
  kpis: { students: Kpi; teachers: Kpi; courses: Kpi; classes: Kpi; averageCompletion: Kpi };
  studentHealth: { onTrack: number; needsSupport: number; atRisk: number; total: number };
  academicOverview: { courseCompletion: number; assignmentCompletion: number; quizAverage: number; examPassRate: number };
  topSubjects: { subject: string; accent: string | null; averageScore: number; completion: number; mastery: number }[];
}

/** Aggregates only: the school view never downloads the student list to count it. */
export const schoolApi = {
  dashboard: () => api.get<SchoolDashboard>('/school/dashboard'),
};
