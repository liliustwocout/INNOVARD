export type TeamRole = 'admin' | 'member';

export interface TeamJoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  fromTeamId: string;
  toTeamId: string;
  toTeamName: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export type ActivityLogType =
  | 'standup'
  | 'report'
  | 'task'
  | 'announcement'
  | 'event'
  | 'join_request';

export interface ActivityLogItem {
  id: string;
  type: ActivityLogType;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorAvatar: string;
  teamId: string | null;
  teamName: string;
  title: string;
  detail: string;
  createdAt: string;
  targetHref: string;
  recordId: string;
}

export interface SystemConfig {
  standupDeadlineTime: string;
  standupDeadlineLabel: string;
  allowLateStandup: boolean;
  allowBackdateStandup: boolean;
  weeklyReportDeadlineLabel: string;
  maxTeamMembers: number;
  allowTeamJoinRequests: boolean;
  programName: string;
  cohortLabel: string;
  updatedAt?: string;
}

export interface ConnectedProfiles {
  github: string;
  discord: string;
  linkedin: string;
  portfolio: string;
  systemRole?: TeamRole;
  pendingJoinRequest?: TeamJoinRequest | null;
  systemConfig?: SystemConfig;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: TeamRole;
  title: string;
  bio: string;
  skills: string[];
  teamId: string;
  connectedProfiles: ConnectedProfiles;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  projectName: string;
  description: string;
  slogan: string;
  mentorName: string;
  githubRepoUrl: string;
  discordInviteUrl: string;
  progress: number;
}

export interface Announcement {
  id: string;
  teamId: string | null;
  title: string;
  content: string;
  category: 'general' | 'deadline' | 'meeting' | 'tech';
  priority: 'normal' | 'important' | 'urgent';
  authorName: string;
  authorAvatar: string;
  createdAt: string;
  isPinned: boolean;
}

export interface ScheduleMilestone {
  id: string;
  teamId: string | null;
  phase: string;
  title: string;
  dateRange: string;
  status: 'completed' | 'active' | 'upcoming';
  description: string;
}

export interface QuickLink {
  id: string;
  teamId: string | null;
  title: string;
  description: string;
  url: string;
  category: 'repo' | 'chat' | 'doc' | 'design' | 'other';
  iconName: string;
}

export interface DailyStandup {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  teamId: string;
  date: string;
  yesterday: string;
  today: string;
  blockers: string;
  createdAt: string;
}

export type ReportLinkType = 'github' | 'demo' | 'doc' | 'other';

export interface ReportLink {
  label: string;
  url: string;
  type: ReportLinkType;
}

export interface TeamMeetingReport {
  id: string;
  teamId: string;
  title: string;
  meetingDate: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  done: string;
  inProgress: string;
  blockers: string;
  links: ReportLink[];
  questions: string;
  createdAt: string;
}

export interface MemberTask {
  id: string;
  userId: string;
  teamId: string;
  title: string;
  category: string;
  status: 'todo' | 'in_progress' | 'done';
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  progressPercent: number;
  createdAt?: string;
}

export interface CalendarEvent {
  id: string;
  teamId: string | null;
  title: string;
  description: string;
  date: string;
  time: string;
  type: 'deadline' | 'meeting';
  priority: 'low' | 'medium' | 'high';
  meetingLink?: string;
  location?: string;
  createdAt?: string;
}
