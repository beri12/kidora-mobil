import { api } from './index';

export type World = 'READING_FOREST' | 'MATH_ISLAND' | 'SCIENCE_PLANET' | 'CODING_CITY' | 'ART_VALLEY' | 'HISTORY_WORLD';
export type NodeStatus = 'COMPLETED' | 'AVAILABLE' | 'LOCKED';
export type CourseStatus = 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';

export interface RewardOutcome {
  xp: number;
  coins: number;
  leveledUp: boolean;
  newLevel: number;
  unlockedAchievements: string[];
  completedQuests: string[];
}

export interface Quest {
  id: string;
  kind: 'DAILY' | 'WEEKLY' | 'MISSION' | 'STREAK';
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardXP: number;
  rewardCoins: number;
  completed: boolean;
  claimed: boolean;
  endsAt: string | null;
}

export interface DashCourse {
  id: string;
  slug: string;
  title: string;
  subject: string;
  subjectAccent: string | null;
  thumbnailUrl: string | null;
  progressPercent: number;
  lessonsCompleted: number;
  totalLessons: number;
  currentLesson: { id: string; title: string; order: number } | null;
  status: CourseStatus;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  avatarColor: string;
  xp: number;
  isMe: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  unlockedAt: string | null;
  progress: number;
  requirement: number;
  badgeUrl: string | null;
}

export interface StudentDashboard {
  profile: { id: string; name: string; displayName: string | null; avatarUrl: string | null; avatarColor: string; level: number; xp: number; xpForNextLevel: number; coins: number; streak: number };
  stats: { coursesEnrolled: number; lessonsCompleted: number; quizzesCompleted: number; averageScore: number };
  adventure: {
    world: World;
    level: number;
    xp: number;
    xpForNextLevel: number;
    course: { id: string; slug: string; title: string; subject: string };
    lesson: { id: string; title: string; order: number; total: number; xpReward: number } | null;
    progressPercent: number;
  } | null;
  courses: DashCourse[];
  dailyQuest: Quest | null;
  streakWeek: { day: string; date: string; done: boolean; isToday: boolean }[];
  achievements: Achievement[];
  leaderboard: { period: 'week'; entries: LeaderboardEntry[] };
  unreadNotifications: number;
}

export interface WorldNode {
  id: string;
  type: 'COURSE' | 'SECTION' | 'LESSON' | 'CHALLENGE' | 'BOSS';
  title: string;
  status: NodeStatus;
  /** A web path (/learn/{slug}/{lessonId}); the app uses the COURSE node's id instead. */
  href?: string;
  children?: WorldNode[];
}

export interface WorldIsland {
  key: World;
  name: string;
  accent: string;
  progress: number;
  nodes: WorldNode[];
}

export type ContentType =
  | 'VIDEO' | 'TEXT' | 'AUDIO' | 'IMAGE' | 'INTERACTIVE' | 'RESOURCE' | 'HEADING' | 'PARAGRAPH' | 'DOCUMENT'
  | 'CODE' | 'CALLOUT' | 'EXAMPLE' | 'QUESTION' | 'QUIZ' | 'ASSIGNMENT' | 'PEER_REVIEW' | 'EXTERNAL_RESOURCE';

export interface LessonContentItem {
  id: string;
  type: ContentType | string; // unknown future types render as a notice, never crash
  order: number;
  title: string;
  body: string | null;
  url: string | null;
  isRequired: boolean;
  durationSeconds: number | null;
  downloadUrls: { name: string; url: string; sizeBytes?: number; mimeType?: string }[] | null;
  quizId: string | null;
  assignmentId: string | null;
  externalUrl: string | null;
  video: { id: string; url: string | null; thumbnailUrl: string | null; durationSeconds: number | null; captionsUrl: string | null; processingStatus: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' } | null;
  progress: { lastPositionSec: number; watchedSeconds: number; completed: boolean }[];
}

export interface CurriculumEntry {
  id: string;
  title: string;
  type: string;
  estimatedMin: number;
  isRequired: boolean;
  sectionTitle: string | null;
  completed: boolean;
  percent: number;
}

export interface CompletionState {
  percent: number;
  lessonsCompleted: number;
  totalLessons: number;
  complete: boolean;
  score: number | null;
  unmet: string[];
}

export interface LessonPlayer {
  lesson: {
    id: string;
    courseId: string;
    title: string;
    description: string | null;
    type: string;
    estimatedMin: number;
    objectives: string[];
    videoUrl: string | null;
    contents: LessonContentItem[];
    resources: { id: string; name: string; url: string; kind: string; sizeBytes: number | null }[];
    quiz: { id: string; title: string; passingScore: number; maxAttempts: number; timeLimitSec: number | null; _count: { questions: number } } | null;
    progress: { completed: boolean; percent: number; timeSpentSec: number } | null;
  };
  curriculum: CurriculumEntry[];
  nav: { index: number; total: number; previous: CurriculumEntry | null; next: CurriculumEntry | null };
  completion: CompletionState;
}

export interface CourseDetail {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  subject: { id: string; name: string; accent: string | null } | null;
  sections: {
    id: string;
    title: string;
    order: number;
    lessons: { id: string; title: string; type: string; order: number; estimatedMin: number; completed: boolean; percent: number; locked: boolean; quiz: { id: string; title: string } | null }[];
  }[];
  totals: { modules: number; lessons: number; estimatedMinutes: number };
  accessDecision: { allowed: boolean; reason?: string; message?: string };
  enrolled: boolean;
  enrollment: { status: string; progressPercent: number; lessonsCompleted: number; lastLessonId: string | null } | null;
}

export interface BrowseCourse {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  subject: string;
  access: 'FREE' | 'PREMIUM' | 'SCHOOL_ONLY' | 'INVITE_ONLY';
  totalLessons: number;
  enrolled: boolean;
  progressPercent: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const studentApi = {
  dashboard: () => api.get<StudentDashboard>('/student/dashboard'),
  world: () => api.get<{ worlds: WorldIsland[] }>('/student/world'),
  quests: () => api.get<Quest[]>('/student/quests'),
  claimQuest: (id: string) => api.post<Quest>(`/student/quests/${encodeURIComponent(id)}/claim`),
  achievements: () => api.get<Achievement[]>('/student/achievements'),
  badges: () => api.get<{ id: string; slug: string; name: string; desc: string; glyph: string; earnedAt: string | null }[]>('/student/badges'),
  leaderboard: (scope: 'class' | 'school' = 'class', period: 'week' | 'month' = 'week') =>
    api.get<LeaderboardEntry[]>('/student/leaderboard', { query: { scope, period } }),
};

export const learningApi = {
  myCourses: () => api.get<(DashCourse & { shortDescription: string | null })[]>('/learning/my-courses'),
  browse: (query: { search?: string; page?: number; pageSize?: number } = {}) => api.get<Paginated<BrowseCourse>>('/learning/browse', { query }),
  course: (courseId: string) => api.get<CourseDetail>(`/learning/courses/${encodeURIComponent(courseId)}`),
  enroll: (courseId: string) => api.post<unknown>(`/learning/courses/${encodeURIComponent(courseId)}/enroll`),
  lesson: (courseId: string, lessonId: string, signal?: AbortSignal) =>
    api.get<LessonPlayer>(`/learning/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`, { signal }),
  completeContent: (contentItemId: string) =>
    api.post<{ ok: true; lessonCompleted: boolean }>(`/learning/content/${encodeURIComponent(contentItemId)}/complete`),
  videoProgress: (contentItemId: string, body: { positionSec: number; watchedDeltaSec?: number; durationSeconds?: number }) =>
    api.post<{ completed: boolean; lessonCompleted: boolean }>(`/learning/content/${encodeURIComponent(contentItemId)}/progress`, body),
  completeLesson: (lessonId: string, timeSpentSec: number) =>
    api.post<{ rewards: RewardOutcome; completion: CompletionState; certificate: { id: string; code: string } | null }>(
      `/learning/lessons/${encodeURIComponent(lessonId)}/complete`,
      undefined,
      { query: { timeSpentSec: Math.max(0, Math.round(timeSpentSec)) } },
    ),
};
