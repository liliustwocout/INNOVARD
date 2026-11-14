import type {
  Announcement,
  CalendarEvent,
  ConnectedProfiles,
  DailyStandup,
  MemberTask,
  QuickLink,
  ReportLink,
  ScheduleMilestone,
  SystemConfig,
  Team,
  TeamMeetingReport,
  TeamRole,
  UserProfile,
} from '@/types/innovard';

export const ADMIN_EMAIL = 'datpltn205@gmail.com';
export const PRE_ASSIGNED_TEAM_ALPHA_EMAILS = [
  ADMIN_EMAIL,
  '23010163@st.phenikaa-uni.edu.vn',
  '23010196@st.phenikaa-uni.edu.vn',
  '23013303@st.phenikaa-uni.edu.vn',
];

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  standupDeadlineTime: '23:59',
  standupDeadlineLabel: 'Hạn nộp Daily Standup hôm nay',
  allowLateStandup: true,
  allowBackdateStandup: true,
  weeklyReportDeadlineLabel: '23:59 Chủ nhật hàng tuần',
  maxTeamMembers: 4,
  allowTeamJoinRequests: true,
  programName: 'INNOVARD',
  cohortLabel: 'Build Phase · Cohort 2026',
};

export function normalizeSystemConfig(
  raw?: Partial<SystemConfig> | null
): SystemConfig {
  const timeValid =
    typeof raw?.standupDeadlineTime === 'string' &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.standupDeadlineTime.trim());
  const parsedMax = Number(raw?.maxTeamMembers);
  const maxMembers =
    Number.isFinite(parsedMax) && parsedMax >= 1
      ? Math.floor(parsedMax)
      : DEFAULT_SYSTEM_CONFIG.maxTeamMembers;

  return {
    standupDeadlineTime: timeValid
      ? raw!.standupDeadlineTime!.trim()
      : DEFAULT_SYSTEM_CONFIG.standupDeadlineTime,
    standupDeadlineLabel:
      typeof raw?.standupDeadlineLabel === 'string' &&
      raw.standupDeadlineLabel.trim()
        ? raw.standupDeadlineLabel.trim()
        : DEFAULT_SYSTEM_CONFIG.standupDeadlineLabel,
    allowLateStandup:
      typeof raw?.allowLateStandup === 'boolean'
        ? raw.allowLateStandup
        : DEFAULT_SYSTEM_CONFIG.allowLateStandup,
    allowBackdateStandup:
      typeof raw?.allowBackdateStandup === 'boolean'
        ? raw.allowBackdateStandup
        : DEFAULT_SYSTEM_CONFIG.allowBackdateStandup,
    weeklyReportDeadlineLabel:
      typeof raw?.weeklyReportDeadlineLabel === 'string' &&
      raw.weeklyReportDeadlineLabel.trim()
        ? raw.weeklyReportDeadlineLabel.trim()
        : DEFAULT_SYSTEM_CONFIG.weeklyReportDeadlineLabel,
    maxTeamMembers: maxMembers,
    allowTeamJoinRequests:
      typeof raw?.allowTeamJoinRequests === 'boolean'
        ? raw.allowTeamJoinRequests
        : DEFAULT_SYSTEM_CONFIG.allowTeamJoinRequests,
    programName:
      typeof raw?.programName === 'string' && raw.programName.trim()
        ? raw.programName.trim()
        : DEFAULT_SYSTEM_CONFIG.programName,
    cohortLabel:
      typeof raw?.cohortLabel === 'string' && raw.cohortLabel.trim()
        ? raw.cohortLabel.trim()
        : DEFAULT_SYSTEM_CONFIG.cohortLabel,
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

export function isAdminEmail(email?: string | null): boolean {
  return Boolean(email && email.trim().toLowerCase() === ADMIN_EMAIL);
}

export function isPreAssignedTeamAlphaEmail(email?: string | null): boolean {
  return Boolean(
    email && PRE_ASSIGNED_TEAM_ALPHA_EMAILS.includes(email.trim().toLowerCase())
  );
}

export function makeAvatarSvg(
  initials: string,
  fromHex: string,
  toHex: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${fromHex}"/><stop offset="100%" stop-color="${toHex}"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#g)"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'IN';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function mapTeamFromRow(row: Record<string, unknown>): Team {
  return {
    id: String(row.id),
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    projectName: String(row.project_name ?? ''),
    slogan: String(row.slogan ?? ''),
    description: String(row.description ?? ''),
    mentorName: String(row.mentor_name ?? ''),
    githubRepoUrl: String(row.github_repo_url ?? ''),
    discordInviteUrl: String(row.discord_invite_url ?? ''),
    progress: Number(row.progress ?? 0),
  };
}

export function mapUserFromRow(row: Record<string, unknown>): UserProfile {
  const name = String(row.name ?? 'Thành viên');
  const email = String(row.email ?? '');
  const rawAvatar = typeof row.avatar_url === 'string' ? row.avatar_url : '';
  const connected = (row.connected_profiles ?? {}) as Partial<ConnectedProfiles>;
  const rawRole = String(row.role ?? 'member');
  const resolvedRole: TeamRole =
    isAdminEmail(email) ||
    rawRole === 'admin' ||
    rawRole === 'mentor' ||
    connected.systemRole === 'admin'
      ? 'admin'
      : 'member';

  const rawTeamId = typeof row.team_id === 'string' ? row.team_id.trim() : '';
  const hasExplicitAssignment =
    connected.teamAssigned === true ||
    (connected.teamAssigned !== false &&
      (isPreAssignedTeamAlphaEmail(email) || isAdminEmail(email)));
  const resolvedTeamId =
    !rawTeamId || (rawTeamId === 'team-alpha' && !hasExplicitAssignment)
      ? ''
      : rawTeamId;
  const resolvedTeamAssigned = Boolean(resolvedTeamId);

  return {
    id: String(row.id),
    name,
    email,
    avatarUrl:
      rawAvatar || makeAvatarSvg(getInitialsFromName(name), '#4f46e5', '#06b6d4'),
    role: resolvedRole,
    title: String(row.title ?? 'Thành viên dự án'),
    bio: String(row.bio ?? ''),
    skills: Array.isArray(row.skills) ? row.skills.map(String) : [],
    teamId: resolvedTeamId,
    connectedProfiles: {
      github: String(connected.github ?? ''),
      discord: String(connected.discord ?? ''),
      linkedin: String(connected.linkedin ?? ''),
      portfolio: String(connected.portfolio ?? ''),
      systemRole: resolvedRole,
      teamAssigned: resolvedTeamAssigned,
      pendingJoinRequest: connected.pendingJoinRequest ?? null,
      systemConfig: connected.systemConfig
        ? normalizeSystemConfig(connected.systemConfig)
        : undefined,
    },
  };
}

export function mapAnnouncementFromRow(row: Record<string, unknown>): Announcement {
  const authorName = String(row.author_name ?? 'Ban Điều Hành');
  const rawAvatar = typeof row.author_avatar === 'string' ? row.author_avatar : '';
  return {
    id: String(row.id),
    teamId: row.team_id ? String(row.team_id) : null,
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    category: (row.category as Announcement['category']) ?? 'general',
    priority: (row.priority as Announcement['priority']) ?? 'normal',
    authorName,
    authorAvatar:
      rawAvatar || makeAvatarSvg(getInitialsFromName(authorName), '#1e293b', '#475569'),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    isPinned: Boolean(row.is_pinned),
  };
}

export function mapMilestoneFromRow(row: Record<string, unknown>): ScheduleMilestone {
  return {
    id: String(row.id),
    teamId: row.team_id ? String(row.team_id) : null,
    phase: String(row.phase ?? ''),
    title: String(row.title ?? ''),
    dateRange: String(row.date_range ?? ''),
    status: (row.status as ScheduleMilestone['status']) ?? 'upcoming',
    description: String(row.description ?? ''),
  };
}

export function mapQuickLinkFromRow(row: Record<string, unknown>): QuickLink {
  return {
    id: String(row.id),
    teamId: row.team_id ? String(row.team_id) : null,
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    url: String(row.url ?? ''),
    category: (row.category as QuickLink['category']) ?? 'other',
    iconName: String(row.icon_name ?? 'Link2'),
  };
}

export function mapStandupFromRow(row: Record<string, unknown>): DailyStandup {
  const userName = String(row.user_name ?? 'Thành viên');
  const rawAvatar = typeof row.user_avatar === 'string' ? row.user_avatar : '';
  return {
    id: String(row.id),
    userId: String(row.user_id ?? ''),
    userName,
    userAvatar:
      rawAvatar || makeAvatarSvg(getInitialsFromName(userName), '#4f46e5', '#06b6d4'),
    teamId: String(row.team_id ?? 'team-alpha'),
    date: String(row.standup_date ?? ''),
    yesterday: String(row.yesterday ?? ''),
    today: String(row.today ?? ''),
    blockers: String(row.blockers ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function mapTeamReportFromRow(row: Record<string, unknown>): TeamMeetingReport {
  const authorName = String(row.author_name ?? 'Thành viên');
  const rawAvatar = typeof row.author_avatar === 'string' ? row.author_avatar : '';
  const rawLinks = Array.isArray(row.links) ? (row.links as ReportLink[]) : [];
  return {
    id: String(row.id),
    teamId: String(row.team_id ?? 'team-alpha'),
    title: String(row.title ?? ''),
    meetingDate: String(row.meeting_date ?? ''),
    authorId: String(row.author_id ?? ''),
    authorName,
    authorAvatar:
      rawAvatar || makeAvatarSvg(getInitialsFromName(authorName), '#4f46e5', '#06b6d4'),
    done: String(row.done ?? ''),
    inProgress: String(row.in_progress ?? ''),
    blockers: String(row.blockers ?? ''),
    links: rawLinks,
    questions: String(row.questions ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function mapTaskFromRow(row: Record<string, unknown>): MemberTask {
  return {
    id: String(row.id),
    userId: String(row.user_id ?? ''),
    teamId: String(row.team_id ?? 'team-alpha'),
    title: String(row.title ?? ''),
    category: String(row.category ?? 'Development'),
    status: (row.status as MemberTask['status']) ?? 'todo',
    dueDate: String(row.due_date ?? ''),
    priority: (row.priority as MemberTask['priority']) ?? 'medium',
    progressPercent: Number(row.progress_percent ?? 0),
    createdAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  };
}

export function mapEventFromRow(row: Record<string, unknown>): CalendarEvent {
  return {
    id: String(row.id),
    teamId: row.team_id ? String(row.team_id) : null,
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    date: String(row.event_date ?? ''),
    time: String(row.event_time ?? '23:59'),
    type: (row.type as CalendarEvent['type']) ?? 'meeting',
    priority: (row.priority as CalendarEvent['priority']) ?? 'medium',
    meetingLink: row.meeting_link ? String(row.meeting_link) : undefined,
    location: row.location ? String(row.location) : undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}
