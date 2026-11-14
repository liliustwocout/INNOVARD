'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type {
  ActivityLogItem,
  Announcement,
  CalendarEvent,
  DailyStandup,
  MemberTask,
  QuickLink,
  ScheduleMilestone,
  SystemConfig,
  Team,
  TeamJoinRequest,
  TeamMeetingReport,
  TeamRole,
  UserProfile,
} from '@/types/innovard';
import { getTodayISO } from '@/lib/date-utils';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import {
  DEFAULT_SYSTEM_CONFIG,
  getInitialsFromName,
  isAdminEmail,
  isPreAssignedTeamAlphaEmail,
  makeAvatarSvg,
  mapAnnouncementFromRow,
  mapEventFromRow,
  mapMilestoneFromRow,
  mapQuickLinkFromRow,
  mapStandupFromRow,
  mapTaskFromRow,
  mapTeamFromRow,
  mapTeamReportFromRow,
  mapUserFromRow,
  normalizeSystemConfig,
} from '@/lib/supabase-mappers';

const LEGACY_STORAGE_KEY = 'innovard_app_state_v1';
const TEAM_STORAGE_KEY = 'innovard_selected_team_id';

const DEFAULT_TEAM: Team = {
  id: 'team-alpha',
  code: 'INV-01',
  name: 'INNOVARD Team',
  projectName: 'Dự án của đội',
  slogan: '',
  description: 'Cập nhật mô tả đề tài và liên kết của đội tại trang Đội của tôi.',
  mentorName: 'Chưa cập nhật',
  githubRepoUrl: 'https://github.com',
  discordInviteUrl: 'https://discord.com',
  progress: 0,
};

const UNASSIGNED_TEAM: Team = {
  id: '',
  code: 'CHƯA CÓ ĐỘI',
  name: 'Chưa có đội',
  projectName: 'Chưa tham gia dự án',
  slogan: '',
  description:
    'Bạn chưa thuộc đội nào. Hãy chọn một đội tại trang Đội của tôi để gửi yêu cầu xin gia nhập.',
  mentorName: 'Chưa phân công',
  githubRepoUrl: 'https://github.com',
  discordInviteUrl: 'https://discord.com',
  progress: 0,
};

function toDbRole(role: TeamRole): 'mentor' | 'member' {
  return role === 'admin' ? 'mentor' : 'member';
}

interface AppState {
  currentUserId: string | null;
  currentTeamId: string;
  teams: Team[];
  users: UserProfile[];
  announcements: Announcement[];
  milestones: ScheduleMilestone[];
  quickLinks: QuickLink[];
  standups: DailyStandup[];
  teamReports: TeamMeetingReport[];
  tasks: MemberTask[];
  events: CalendarEvent[];
  systemConfig: SystemConfig;
}

const INITIAL_STATE: AppState = {
  currentUserId: null,
  currentTeamId: DEFAULT_TEAM.id,
  teams: [DEFAULT_TEAM],
  users: [],
  announcements: [],
  milestones: [],
  quickLinks: [],
  standups: [],
  teamReports: [],
  tasks: [],
  events: [],
  systemConfig: DEFAULT_SYSTEM_CONFIG,
};

interface AppContextValue {
  isHydrated: boolean;
  isSupabaseEnabled: boolean;
  isAdmin: boolean;
  currentUser: UserProfile | null;
  teams: Team[];
  currentTeamId: string;
  currentTeam: Team;
  setCurrentTeamId: (teamId: string) => void;
  users: UserProfile[];
  announcements: Announcement[];
  milestones: ScheduleMilestone[];
  quickLinks: QuickLink[];
  standups: DailyStandup[];
  teamReports: TeamMeetingReport[];
  tasks: MemberTask[];
  events: CalendarEvent[];
  systemConfig: SystemConfig;
  joinRequests: TeamJoinRequest[];
  activityLogs: ActivityLogItem[];
  loginWithGoogleOAuth: () => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateCurrentUserProfile: (updates: Partial<UserProfile>) => void;
  updateSystemConfig: (updates: Partial<SystemConfig>) => void;
  createTeam: (payload: Omit<Team, 'id'>) => void;
  deleteTeam: (teamId: string) => void;
  updateTeamInfo: (teamId: string, updates: Partial<Team>) => void;
  addTeamMember: (member: Omit<UserProfile, 'id'>) => void;
  updateUserByAdmin: (userId: string, updates: Partial<UserProfile>) => void;
  deleteUserByAdmin: (userId: string) => void;
  submitJoinRequest: (toTeamId: string, message: string) => void;
  cancelJoinRequest: (userId?: string) => void;
  resolveJoinRequest: (userId: string, decision: 'approved' | 'rejected') => void;
  addAnnouncement: (
    ann: Omit<Announcement, 'id' | 'createdAt' | 'authorName' | 'authorAvatar'>
  ) => void;
  togglePinAnnouncement: (id: string) => void;
  deleteAnnouncement: (id: string) => void;
  addMilestone: (payload: Omit<ScheduleMilestone, 'id'>) => void;
  deleteMilestone: (id: string) => void;
  addQuickLink: (payload: Omit<QuickLink, 'id' | 'iconName'>) => void;
  deleteQuickLink: (id: string) => void;
  addStandup: (payload: {
    yesterday: string;
    today: string;
    blockers: string;
    date?: string;
  }) => void;
  updateStandup: (
    id: string,
    updates: Pick<DailyStandup, 'yesterday' | 'today' | 'blockers'>
  ) => void;
  deleteStandup: (id: string) => void;
  addTeamReport: (
    payload: Omit<
      TeamMeetingReport,
      'id' | 'createdAt' | 'authorId' | 'authorName' | 'authorAvatar'
    >
  ) => void;
  updateTeamReport: (id: string, updates: Partial<TeamMeetingReport>) => void;
  deleteTeamReport: (id: string) => void;
  addTask: (payload: Omit<MemberTask, 'id' | 'userId'>) => void;
  addTaskForUser: (payload: Omit<MemberTask, 'id'>) => void;
  updateTask: (taskId: string, updates: Partial<MemberTask>) => void;
  deleteTask: (taskId: string) => void;
  addCalendarEvent: (payload: Omit<CalendarEvent, 'id'>) => void;
  deleteCalendarEvent: (eventId: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

async function runDbWrite(
  action: PromiseLike<{ error: { message: string } | null }>,
  label: string
) {
  try {
    const { error } = await action;
    if (error) {
      console.error(`[INNOVARD DB] ${label}:`, error.message);
    }
  } catch (err) {
    console.error(`[INNOVARD DB] ${label} exception:`, err);
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let savedTeamId: string | null = null;
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      savedTeamId = window.localStorage.getItem(TEAM_STORAGE_KEY);
    } catch {
      // Ignore storage access errors
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      if (savedTeamId) {
        setState((prev) => ({ ...prev, currentTeamId: savedTeamId }));
      }
      setIsHydrated(true);
      return;
    }

    let isMounted = true;

    const loadDatabaseState = async (): Promise<Team[]> => {
      try {
        const [
          teamsRes,
          usersRes,
          annRes,
          msRes,
          linksRes,
          standupsRes,
          reportsRes,
          tasksRes,
          eventsRes,
        ] = await Promise.all([
          supabase.from('teams').select('*').order('code', { ascending: true }),
          supabase.from('users').select('*').order('created_at', { ascending: true }),
          supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('schedule_milestones')
            .select('*')
            .order('sort_order', { ascending: true }),
          supabase
            .from('quick_links')
            .select('*')
            .order('created_at', { ascending: true }),
          supabase
            .from('standups')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('team_reports')
            .select('*')
            .order('meeting_date', { ascending: false }),
          supabase.from('tasks').select('*').order('created_at', { ascending: false }),
          supabase
            .from('calendar_events')
            .select('*')
            .order('event_date', { ascending: true }),
        ]);

        if (!isMounted) return [DEFAULT_TEAM];

        const nextTeams =
          !teamsRes.error && teamsRes.data && teamsRes.data.length > 0
            ? teamsRes.data.map((r) => mapTeamFromRow(r as Record<string, unknown>))
            : [DEFAULT_TEAM];

        setState((prev) => {
          const nextUsers =
            !usersRes.error && usersRes.data
              ? usersRes.data.map((r) => mapUserFromRow(r as Record<string, unknown>))
              : prev.users;

          const nextAnnouncements =
            !annRes.error && annRes.data
              ? annRes.data.map((r) =>
                  mapAnnouncementFromRow(r as Record<string, unknown>)
                )
              : prev.announcements;

          const nextMilestones =
            !msRes.error && msRes.data
              ? msRes.data.map((r) =>
                  mapMilestoneFromRow(r as Record<string, unknown>)
                )
              : prev.milestones;

          const nextQuickLinks =
            !linksRes.error && linksRes.data
              ? linksRes.data.map((r) =>
                  mapQuickLinkFromRow(r as Record<string, unknown>)
                )
              : prev.quickLinks;

          const nextStandups =
            !standupsRes.error && standupsRes.data
              ? standupsRes.data.map((r) =>
                  mapStandupFromRow(r as Record<string, unknown>)
                )
              : prev.standups;

          const nextReports =
            !reportsRes.error && reportsRes.data
              ? reportsRes.data.map((r) =>
                  mapTeamReportFromRow(r as Record<string, unknown>)
                )
              : prev.teamReports;

          const nextTasks =
            !tasksRes.error && tasksRes.data
              ? tasksRes.data.map((r) => mapTaskFromRow(r as Record<string, unknown>))
              : prev.tasks;

          const nextEvents =
            !eventsRes.error && eventsRes.data
              ? eventsRes.data.map((r) =>
                  mapEventFromRow(r as Record<string, unknown>)
                )
              : prev.events;

          const preferredTeamId = savedTeamId || prev.currentTeamId;
          const validTeamId = nextTeams.some((t) => t.id === preferredTeamId)
            ? preferredTeamId
            : nextTeams[0].id;

          const primaryAdminWithConfig = nextUsers.find(
            (u) => isAdminEmail(u.email) && u.connectedProfiles.systemConfig
          );
          const anyAdminWithConfig = nextUsers.find(
            (u) => u.role === 'admin' && u.connectedProfiles.systemConfig
          );
          const foundConfig =
            primaryAdminWithConfig?.connectedProfiles.systemConfig ??
            anyAdminWithConfig?.connectedProfiles.systemConfig;

          return {
            ...prev,
            currentTeamId: validTeamId,
            teams: nextTeams,
            users: nextUsers,
            announcements: nextAnnouncements,
            milestones: nextMilestones,
            quickLinks: nextQuickLinks,
            standups: nextStandups,
            teamReports: nextReports,
            tasks: nextTasks,
            events: nextEvents,
            systemConfig: foundConfig
              ? normalizeSystemConfig(foundConfig)
              : prev.systemConfig,
          };
        });

        return nextTeams;
      } catch (err) {
        console.error('[INNOVARD DB] Failed loading initial tables:', err);
        return [DEFAULT_TEAM];
      }
    };

    const syncAuthUser = async (
      authUser: {
        id: string;
        email?: string;
        user_metadata?: Record<string, unknown>;
      } | null,
      fallbackTeamId = ''
    ) => {
      if (!authUser) return;
      const email = (authUser.email ?? 'member@innovard.vn').trim().toLowerCase();
      const meta = authUser.user_metadata ?? {};
      const fullName =
        (typeof meta.full_name === 'string' && meta.full_name) ||
        (typeof meta.name === 'string' && meta.name) ||
        email.split('@')[0];
      const avatarUrl =
        (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
        (typeof meta.picture === 'string' && meta.picture) ||
        makeAvatarSvg(getInitialsFromName(fullName), '#4f46e5', '#06b6d4');

      const adminAccount = isAdminEmail(email);
      const preAssigned = adminAccount || isPreAssignedTeamAlphaEmail(email);

      const { data: dbRow } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

      if (!isMounted) return;

      if (dbRow) {
        const mapped = mapUserFromRow(dbRow as Record<string, unknown>);
        const nextRole: TeamRole = adminAccount ? 'admin' : mapped.role;
        const nextTeamId = preAssigned
          ? mapped.teamId || fallbackTeamId || DEFAULT_TEAM.id
          : mapped.teamId;
        const nextTeamAssigned = Boolean(nextTeamId);
        const nextTitle =
          adminAccount && mapped.title === 'Thành viên dự án'
            ? 'Quản trị viên hệ thống (Admin)'
            : mapped.title;
        const nextConnected = {
          ...mapped.connectedProfiles,
          systemRole: nextRole,
          teamAssigned: nextTeamAssigned,
        };

        const syncedUser: UserProfile = {
          ...mapped,
          name: fullName,
          avatarUrl,
          role: nextRole,
          title: nextTitle,
          teamId: nextTeamId,
          connectedProfiles: nextConnected,
        };

        await runDbWrite(
          supabase
            .from('users')
            .update({
              name: fullName,
              avatar_url: avatarUrl,
              role: toDbRole(nextRole),
              title: nextTitle,
              team_id: nextTeamId || null,
              connected_profiles: nextConnected,
              updated_at: new Date().toISOString(),
            })
            .eq('id', mapped.id),
          'syncAuthUser update'
        );

        if (!isMounted) return;
        setState((prev) => {
          const exists = prev.users.some((u) => u.id === syncedUser.id);
          const preferredTeam =
            nextRole === 'admin' ? prev.currentTeamId : syncedUser.teamId;
          return {
            ...prev,
            users: exists
              ? prev.users.map((u) => (u.id === syncedUser.id ? syncedUser : u))
              : [...prev.users, syncedUser],
            currentUserId: syncedUser.id,
            currentTeamId: preferredTeam,
            systemConfig: syncedUser.connectedProfiles.systemConfig
              ? normalizeSystemConfig(syncedUser.connectedProfiles.systemConfig)
              : prev.systemConfig,
          };
        });
        return;
      }

      const resolvedRole: TeamRole = adminAccount ? 'admin' : 'member';
      const resolvedTeamId = preAssigned
        ? fallbackTeamId || DEFAULT_TEAM.id
        : '';
      const newUser: UserProfile = {
        id: authUser.id,
        name: fullName,
        email,
        avatarUrl,
        role: resolvedRole,
        title: adminAccount ? 'Quản trị viên hệ thống (Admin)' : 'Thành viên dự án',
        bio: 'Đăng nhập qua Google OAuth trên hệ thống INNOVARD.',
        skills: ['Teamwork'],
        teamId: resolvedTeamId,
        connectedProfiles: {
          github: '',
          discord: '',
          linkedin: '',
          portfolio: '',
          systemRole: resolvedRole,
          teamAssigned: Boolean(resolvedTeamId),
          pendingJoinRequest: null,
        },
      };

      await runDbWrite(
        supabase.from('users').upsert(
          {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            avatar_url: newUser.avatarUrl,
            role: toDbRole(resolvedRole),
            title: newUser.title,
            bio: newUser.bio,
            skills: newUser.skills,
            team_id: newUser.teamId || null,
            connected_profiles: newUser.connectedProfiles,
          },
          { onConflict: 'email' }
        ),
        'syncAuthUser upsert'
      );

      if (!isMounted) return;
      setState((prev) => {
        const exists = prev.users.some(
          (u) => u.id === newUser.id || u.email.toLowerCase() === email.toLowerCase()
        );
        return {
          ...prev,
          users: exists
            ? prev.users.map((u) =>
                u.email.toLowerCase() === email.toLowerCase()
                  ? {
                      ...u,
                      name: fullName,
                      avatarUrl,
                      role: resolvedRole,
                      teamId: newUser.teamId,
                      connectedProfiles: {
                        ...u.connectedProfiles,
                        teamAssigned: Boolean(newUser.teamId),
                      },
                    }
                  : u
              )
            : [...prev.users, newUser],
          currentUserId: newUser.id,
          currentTeamId:
            resolvedRole === 'admin' ? prev.currentTeamId : newUser.teamId,
        };
      });
    };

    const initialize = async () => {
      try {
        const loadedTeams = await loadDatabaseState();
        const fallbackTeamId = loadedTeams[0]?.id ?? DEFAULT_TEAM.id;
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          await syncAuthUser(data.session.user, fallbackTeamId);
        }
      } catch (err) {
        console.error('[INNOVARD DB] Initialization failed:', err);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    void initialize();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setState((prev) => ({ ...prev, currentUserId: null }));
        }
        return;
      }
      if (session?.user) {
        void syncAuthUser(session.user);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const currentUser = useMemo(() => {
    if (!state.currentUserId) return null;
    return state.users.find((u) => u.id === state.currentUserId) ?? null;
  }, [state.currentUserId, state.users]);

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || isAdminEmail(currentUser.email);
  }, [currentUser]);

  const effectiveTeamId = useMemo(() => {
    if (isAdmin) return state.currentTeamId;
    if (currentUser) return currentUser.teamId;
    return state.currentTeamId;
  }, [isAdmin, currentUser, state.currentTeamId]);

  const currentTeam = useMemo(() => {
    if (!effectiveTeamId) return UNASSIGNED_TEAM;
    return (
      state.teams.find((t) => t.id === effectiveTeamId) ??
      state.teams[0] ??
      DEFAULT_TEAM
    );
  }, [state.teams, effectiveTeamId]);

  const joinRequests = useMemo<TeamJoinRequest[]>(() => {
    return state.users
      .map((u) => u.connectedProfiles.pendingJoinRequest)
      .filter(
        (req): req is TeamJoinRequest =>
          Boolean(req && req.status === 'pending')
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.users]);

  const activityLogs = useMemo<ActivityLogItem[]>(() => {
    const teamNameOf = (teamId: string | null) => {
      if (!teamId) return 'Toàn chương trình';
      return state.teams.find((t) => t.id === teamId)?.name ?? teamId;
    };
    const userById = (userId: string) =>
      state.users.find((u) => u.id === userId);

    const items: ActivityLogItem[] = [];

    for (const su of state.standups) {
      const actor = userById(su.userId);
      const blockerText = su.blockers ? ` | Vướng: ${su.blockers}` : '';
      items.push({
        id: `log-su-${su.id}`,
        type: 'standup',
        actorId: su.userId,
        actorName: su.userName,
        actorEmail: actor?.email ?? '',
        actorAvatar: su.userAvatar,
        teamId: su.teamId,
        teamName: teamNameOf(su.teamId),
        title: `Nộp Daily Standup (${su.date})`,
        detail: `Hôm qua: ${su.yesterday} | Hôm nay: ${su.today}${blockerText}`,
        createdAt: su.createdAt,
        targetHref: '/project/submissions',
        recordId: su.id,
      });
    }

    for (const rep of state.teamReports) {
      const actor = userById(rep.authorId);
      items.push({
        id: `log-rep-${rep.id}`,
        type: 'report',
        actorId: rep.authorId,
        actorName: rep.authorName,
        actorEmail: actor?.email ?? '',
        actorAvatar: rep.authorAvatar,
        teamId: rep.teamId,
        teamName: teamNameOf(rep.teamId),
        title: `Báo cáo họp nhóm: ${rep.title}`,
        detail: `Đã làm: ${rep.done} | Đang làm: ${rep.inProgress}${
          rep.blockers ? ` | Vướng: ${rep.blockers}` : ''
        }`,
        createdAt: rep.createdAt,
        targetHref: '/project/submissions',
        recordId: rep.id,
      });
    }

    for (const task of state.tasks) {
      const actor = userById(task.userId);
      const statusLabel =
        task.status === 'done'
          ? 'Hoàn thành'
          : task.status === 'in_progress'
          ? 'Đang làm'
          : 'Cần làm';
      items.push({
        id: `log-task-${task.id}`,
        type: 'task',
        actorId: task.userId,
        actorName: actor?.name ?? 'Thành viên',
        actorEmail: actor?.email ?? '',
        actorAvatar: actor?.avatarUrl ?? '',
        teamId: task.teamId,
        teamName: teamNameOf(task.teamId),
        title: `Công việc: ${task.title}`,
        detail: `Trạng thái: ${statusLabel} (${task.progressPercent}%) · Hạn ${task.dueDate}`,
        createdAt: task.createdAt || `${task.dueDate}T00:00:00.000Z`,
        targetHref: '/project/progress',
        recordId: task.id,
      });
    }

    for (const ann of state.announcements) {
      items.push({
        id: `log-ann-${ann.id}`,
        type: 'announcement',
        actorId: '',
        actorName: ann.authorName,
        actorEmail: '',
        actorAvatar: ann.authorAvatar,
        teamId: ann.teamId,
        teamName: teamNameOf(ann.teamId),
        title: `Thông báo: ${ann.title}`,
        detail: ann.content,
        createdAt: ann.createdAt,
        targetHref: '/',
        recordId: ann.id,
      });
    }

    for (const ev of state.events) {
      items.push({
        id: `log-ev-${ev.id}`,
        type: 'event',
        actorId: '',
        actorName: ev.teamId ? teamNameOf(ev.teamId) : 'Hệ thống',
        actorEmail: '',
        actorAvatar: '',
        teamId: ev.teamId,
        teamName: teamNameOf(ev.teamId),
        title: `${ev.type === 'deadline' ? 'Deadline' : 'Lịch họp'}: ${ev.title}`,
        detail: `${ev.date} ${ev.time}${ev.description ? ` — ${ev.description}` : ''}`,
        createdAt: ev.createdAt || `${ev.date}T00:00:00.000Z`,
        targetHref: '/calendar',
        recordId: ev.id,
      });
    }

    for (const req of joinRequests) {
      items.push({
        id: `log-req-${req.id}`,
        type: 'join_request',
        actorId: req.userId,
        actorName: req.userName,
        actorEmail: req.userEmail,
        actorAvatar: req.userAvatar,
        teamId: req.toTeamId,
        teamName: req.toTeamName,
        title: `Yêu cầu xin gia nhập đội ${req.toTeamName}`,
        detail: req.message || 'Thành viên gửi yêu cầu chuyển sang đội mới.',
        createdAt: req.createdAt,
        targetHref: '/admin',
        recordId: req.id,
      });
    }

    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [
    state.teams,
    state.users,
    state.standups,
    state.teamReports,
    state.tasks,
    state.announcements,
    state.events,
    joinRequests,
  ]);

  const setCurrentTeamId = (teamId: string) => {
    if (!isAdmin) return;
    setState((prev) => ({ ...prev, currentTeamId: teamId }));
    try {
      window.localStorage.setItem(TEAM_STORAGE_KEY, teamId);
    } catch {
      // Ignore storage access errors
    }
  };

  const loginWithGoogleOAuth = async (): Promise<{ error?: string }> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        error:
          'Chưa cấu hình biến môi trường Supabase (.env / .env.local). Vui lòng thiết lập NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      };
    }

    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/overview` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) {
      return { error: error.message };
    }
    return {};
  };

  const logout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setState((prev) => ({ ...prev, currentUserId: null }));
  };

  const updateCurrentUserProfile = (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const nextTeamId =
      isAdmin && updates.teamId !== undefined ? updates.teamId : currentUser.teamId;
    const nextRole: TeamRole = isAdminEmail(currentUser.email)
      ? 'admin'
      : currentUser.role;

    const mergedProfile: UserProfile = {
      ...currentUser,
      ...updates,
      role: nextRole,
      teamId: nextTeamId,
      connectedProfiles: {
        ...currentUser.connectedProfiles,
        ...(updates.connectedProfiles ?? {}),
        systemRole: nextRole,
        teamAssigned: Boolean(nextTeamId),
        pendingJoinRequest: currentUser.connectedProfiles.pendingJoinRequest ?? null,
      },
    };

    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === currentUser.id ? mergedProfile : u
      ),
      currentTeamId: isAdmin ? nextTeamId || prev.currentTeamId : prev.currentTeamId,
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase
          .from('users')
          .update({
            name: mergedProfile.name,
            avatar_url: mergedProfile.avatarUrl,
            title: mergedProfile.title,
            bio: mergedProfile.bio,
            skills: mergedProfile.skills,
            team_id: mergedProfile.teamId || null,
            connected_profiles: mergedProfile.connectedProfiles,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentUser.id),
        'updateCurrentUserProfile'
      );
    }
  };

  const updateSystemConfig = (updates: Partial<SystemConfig>) => {
    if (!isAdmin) return;
    const nextConfig = normalizeSystemConfig({
      ...state.systemConfig,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    const adminUser =
      state.users.find((u) => isAdminEmail(u.email)) ?? currentUser;
    if (!adminUser) {
      setState((prev) => ({ ...prev, systemConfig: nextConfig }));
      return;
    }

    const nextConnected = {
      ...adminUser.connectedProfiles,
      systemConfig: nextConfig,
    };

    setState((prev) => ({
      ...prev,
      systemConfig: nextConfig,
      users: prev.users.map((u) =>
        u.id === adminUser.id ? { ...u, connectedProfiles: nextConnected } : u
      ),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase
          .from('users')
          .update({
            connected_profiles: nextConnected,
            updated_at: new Date().toISOString(),
          })
          .eq('id', adminUser.id),
        'updateSystemConfig'
      );
    }
  };

  const createTeam = (payload: Omit<Team, 'id'>) => {
    if (!isAdmin) return;
    const newTeam: Team = {
      ...payload,
      id: `team-${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      teams: [...prev.teams, newTeam],
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('teams').insert({
          id: newTeam.id,
          code: newTeam.code,
          name: newTeam.name,
          project_name: newTeam.projectName,
          slogan: newTeam.slogan,
          description: newTeam.description,
          mentor_name: newTeam.mentorName,
          github_repo_url: newTeam.githubRepoUrl,
          discord_invite_url: newTeam.discordInviteUrl,
          progress: newTeam.progress,
        }),
        'createTeam'
      );
    }
  };

  const deleteTeam = (teamId: string) => {
    if (!isAdmin) return;
    if (state.teams.length <= 1) return;

    const fallbackTeam = state.teams.find((t) => t.id !== teamId) ?? DEFAULT_TEAM;
    const affectedUsers = state.users.filter((u) => u.teamId === teamId);

    setState((prev) => ({
      ...prev,
      teams: prev.teams.filter((t) => t.id !== teamId),
      currentTeamId:
        prev.currentTeamId === teamId ? fallbackTeam.id : prev.currentTeamId,
      users: prev.users.map((u) =>
        u.teamId === teamId ? { ...u, teamId: fallbackTeam.id } : u
      ),
      announcements: prev.announcements.filter((a) => a.teamId !== teamId),
      milestones: prev.milestones.filter((m) => m.teamId !== teamId),
      quickLinks: prev.quickLinks.filter((l) => l.teamId !== teamId),
      standups: prev.standups.filter((s) => s.teamId !== teamId),
      teamReports: prev.teamReports.filter((r) => r.teamId !== teamId),
      tasks: prev.tasks.filter((t) => t.teamId !== teamId),
      events: prev.events.filter((e) => e.teamId !== teamId),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      for (const u of affectedUsers) {
        void runDbWrite(
          supabase
            .from('users')
            .update({ team_id: fallbackTeam.id, updated_at: new Date().toISOString() })
            .eq('id', u.id),
          'deleteTeam reassign user'
        );
      }
      void runDbWrite(
        supabase.from('teams').delete().eq('id', teamId),
        'deleteTeam'
      );
    }
  };

  const updateTeamInfo = (teamId: string, updates: Partial<Team>) => {
    if (!isAdmin) return;
    setState((prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (t.id === teamId ? { ...t, ...updates } : t)),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.code !== undefined) dbUpdates.code = updates.code;
      if (updates.projectName !== undefined)
        dbUpdates.project_name = updates.projectName;
      if (updates.slogan !== undefined) dbUpdates.slogan = updates.slogan;
      if (updates.description !== undefined)
        dbUpdates.description = updates.description;
      if (updates.mentorName !== undefined)
        dbUpdates.mentor_name = updates.mentorName;
      if (updates.githubRepoUrl !== undefined)
        dbUpdates.github_repo_url = updates.githubRepoUrl;
      if (updates.discordInviteUrl !== undefined)
        dbUpdates.discord_invite_url = updates.discordInviteUrl;
      if (updates.progress !== undefined) dbUpdates.progress = updates.progress;

      void runDbWrite(
        supabase.from('teams').update(dbUpdates).eq('id', teamId),
        'updateTeamInfo'
      );
    }
  };

  const addTeamMember = (member: Omit<UserProfile, 'id'>) => {
    if (!isAdmin) return;
    const assignedRole: TeamRole = isAdminEmail(member.email)
      ? 'admin'
      : member.role;
    const assignedTeamId = member.teamId || '';
    const newMember: UserProfile = {
      ...member,
      teamId: assignedTeamId,
      id: `user-${Date.now()}`,
      role: assignedRole,
      avatarUrl:
        member.avatarUrl ||
        makeAvatarSvg(getInitialsFromName(member.name), '#0ea5e9', '#6366f1'),
      connectedProfiles: {
        ...member.connectedProfiles,
        systemRole: assignedRole,
        teamAssigned: Boolean(assignedTeamId),
        pendingJoinRequest: null,
      },
    };
    setState((prev) => ({
      ...prev,
      users: [...prev.users, newMember],
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('users').insert({
          id: newMember.id,
          name: newMember.name,
          email: newMember.email,
          avatar_url: newMember.avatarUrl,
          role: toDbRole(assignedRole),
          title: newMember.title,
          bio: newMember.bio,
          skills: newMember.skills,
          team_id: newMember.teamId || null,
          connected_profiles: newMember.connectedProfiles,
        }),
        'addTeamMember'
      );
    }
  };

  const updateUserByAdmin = (userId: string, updates: Partial<UserProfile>) => {
    if (!isAdmin) return;
    const target = state.users.find((u) => u.id === userId);
    if (!target) return;

    const enforcedRole: TeamRole = isAdminEmail(target.email)
      ? 'admin'
      : updates.role ?? target.role;
    const nextTeamId = updates.teamId !== undefined ? updates.teamId : target.teamId;

    const merged: UserProfile = {
      ...target,
      ...updates,
      role: enforcedRole,
      teamId: nextTeamId,
      connectedProfiles: {
        ...target.connectedProfiles,
        ...(updates.connectedProfiles ?? {}),
        systemRole: enforcedRole,
        teamAssigned: Boolean(nextTeamId),
      },
    };

    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === userId ? merged : u)),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase
          .from('users')
          .update({
            name: merged.name,
            role: toDbRole(enforcedRole),
            title: merged.title,
            bio: merged.bio,
            skills: merged.skills,
            team_id: merged.teamId || null,
            connected_profiles: merged.connectedProfiles,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId),
        'updateUserByAdmin'
      );
    }
  };

  const deleteUserByAdmin = (userId: string) => {
    if (!isAdmin) return;
    const target = state.users.find((u) => u.id === userId);
    if (!target) return;
    if (target.id === currentUser?.id || isAdminEmail(target.email)) return;

    setState((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== userId),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('users').delete().eq('id', userId),
        'deleteUserByAdmin'
      );
    }
  };

  const submitJoinRequest = (toTeamId: string, message: string) => {
    if (!currentUser || !state.systemConfig.allowTeamJoinRequests) return;
    const targetTeam = state.teams.find((t) => t.id === toTeamId);
    if (!targetTeam || targetTeam.id === currentUser.teamId) return;
    const targetCount = state.users.filter((u) => u.teamId === targetTeam.id).length;
    if (targetCount >= state.systemConfig.maxTeamMembers) return;

    const req: TeamJoinRequest = {
      id: `req-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userAvatar: currentUser.avatarUrl,
      fromTeamId: currentUser.teamId,
      toTeamId: targetTeam.id,
      toTeamName: targetTeam.name,
      message: message.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const nextConnected = {
      ...currentUser.connectedProfiles,
      pendingJoinRequest: req,
    };

    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === currentUser.id
          ? { ...u, connectedProfiles: nextConnected }
          : u
      ),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase
          .from('users')
          .update({
            connected_profiles: nextConnected,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentUser.id),
        'submitJoinRequest'
      );
    }
  };

  const cancelJoinRequest = (userId?: string) => {
    const targetId = userId && isAdmin ? userId : currentUser?.id;
    if (!targetId) return;
    const target = state.users.find((u) => u.id === targetId);
    if (!target) return;

    const nextConnected = {
      ...target.connectedProfiles,
      pendingJoinRequest: null,
    };

    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === targetId ? { ...u, connectedProfiles: nextConnected } : u
      ),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase
          .from('users')
          .update({
            connected_profiles: nextConnected,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetId),
        'cancelJoinRequest'
      );
    }
  };

  const resolveJoinRequest = (
    userId: string,
    decision: 'approved' | 'rejected'
  ) => {
    if (!isAdmin) return;
    const target = state.users.find((u) => u.id === userId);
    const req = target?.connectedProfiles.pendingJoinRequest;
    if (!target || !req) return;

    const nextTeamId = decision === 'approved' ? req.toTeamId : target.teamId;
    const nextConnected = {
      ...target.connectedProfiles,
      teamAssigned: Boolean(nextTeamId),
      pendingJoinRequest: null,
    };

    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId
          ? { ...u, teamId: nextTeamId, connectedProfiles: nextConnected }
          : u
      ),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase
          .from('users')
          .update({
            team_id: nextTeamId || null,
            connected_profiles: nextConnected,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId),
        'resolveJoinRequest'
      );
    }
  };

  const addAnnouncement = (
    ann: Omit<Announcement, 'id' | 'createdAt' | 'authorName' | 'authorAvatar'>
  ) => {
    if (!currentUser) return;
    if (!isAdmin && !currentTeam.id) return;
    const resolvedTeamId = isAdmin ? ann.teamId : currentTeam.id;
    const newAnn: Announcement = {
      ...ann,
      teamId: resolvedTeamId,
      id: `ann-${Date.now()}`,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatarUrl,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      announcements: [newAnn, ...prev.announcements],
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('announcements').insert({
          id: newAnn.id,
          team_id: newAnn.teamId,
          title: newAnn.title,
          content: newAnn.content,
          category: newAnn.category,
          priority: newAnn.priority,
          is_pinned: newAnn.isPinned,
          author_name: newAnn.authorName,
          author_avatar: newAnn.authorAvatar,
          created_at: newAnn.createdAt,
        }),
        'addAnnouncement'
      );
    }
  };

  const togglePinAnnouncement = (id: string) => {
    const target = state.announcements.find((a) => a.id === id);
    if (!target) return;
    if (!isAdmin && target.teamId === null) return;
    const nextPinned = !target.isPinned;

    setState((prev) => ({
      ...prev,
      announcements: prev.announcements.map((a) =>
        a.id === id ? { ...a, isPinned: nextPinned } : a
      ),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase
          .from('announcements')
          .update({ is_pinned: nextPinned })
          .eq('id', id),
        'togglePinAnnouncement'
      );
    }
  };

  const deleteAnnouncement = (id: string) => {
    if (!isAdmin) return;
    setState((prev) => ({
      ...prev,
      announcements: prev.announcements.filter((a) => a.id !== id),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('announcements').delete().eq('id', id),
        'deleteAnnouncement'
      );
    }
  };

  const addMilestone = (payload: Omit<ScheduleMilestone, 'id'>) => {
    if (!isAdmin && !currentTeam.id) return;
    const newMilestone: ScheduleMilestone = {
      ...payload,
      teamId: isAdmin ? payload.teamId : currentTeam.id,
      id: `ms-${Date.now()}`,
    };
    const sortOrder = state.milestones.length + 1;

    setState((prev) => ({
      ...prev,
      milestones: [...prev.milestones, newMilestone],
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('schedule_milestones').insert({
          id: newMilestone.id,
          team_id: newMilestone.teamId,
          phase: newMilestone.phase,
          title: newMilestone.title,
          date_range: newMilestone.dateRange,
          status: newMilestone.status,
          description: newMilestone.description,
          sort_order: sortOrder,
        }),
        'addMilestone'
      );
    }
  };

  const deleteMilestone = (id: string) => {
    const target = state.milestones.find((m) => m.id === id);
    if (!target) return;
    if (!isAdmin && target.teamId === null) return;

    setState((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((m) => m.id !== id),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('schedule_milestones').delete().eq('id', id),
        'deleteMilestone'
      );
    }
  };

  const addQuickLink = (payload: Omit<QuickLink, 'id' | 'iconName'>) => {
    if (!isAdmin && !currentTeam.id) return;
    const newLink: QuickLink = {
      ...payload,
      teamId: isAdmin ? payload.teamId : currentTeam.id,
      id: `ql-${Date.now()}`,
      iconName: 'Link2',
    };

    setState((prev) => ({
      ...prev,
      quickLinks: [...prev.quickLinks, newLink],
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('quick_links').insert({
          id: newLink.id,
          team_id: newLink.teamId,
          title: newLink.title,
          description: newLink.description,
          url: newLink.url,
          category: newLink.category,
          icon_name: newLink.iconName,
        }),
        'addQuickLink'
      );
    }
  };

  const deleteQuickLink = (id: string) => {
    const target = state.quickLinks.find((l) => l.id === id);
    if (!target) return;
    if (!isAdmin && target.teamId === null) return;

    setState((prev) => ({
      ...prev,
      quickLinks: prev.quickLinks.filter((l) => l.id !== id),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('quick_links').delete().eq('id', id),
        'deleteQuickLink'
      );
    }
  };

  const addStandup = (payload: {
    yesterday: string;
    today: string;
    blockers: string;
    date?: string;
  }) => {
    if (!currentUser || !currentTeam.id) return;
    const todayISO = getTodayISO();
    const resolvedDate =
      !isAdmin && !state.systemConfig.allowBackdateStandup
        ? todayISO
        : payload.date || todayISO;
    const now = new Date();
    const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    if (
      !isAdmin &&
      !state.systemConfig.allowLateStandup &&
      resolvedDate === todayISO &&
      nowHHMM > state.systemConfig.standupDeadlineTime
    ) {
      return;
    }

    const newStandup: DailyStandup = {
      id: `su-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatarUrl,
      teamId: currentTeam.id,
      date: resolvedDate,
      yesterday: payload.yesterday.trim(),
      today: payload.today.trim(),
      blockers: payload.blockers.trim(),
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      standups: [newStandup, ...prev.standups],
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('standups').insert({
          id: newStandup.id,
          user_id: newStandup.userId,
          user_name: newStandup.userName,
          user_avatar: newStandup.userAvatar,
          team_id: newStandup.teamId,
          standup_date: newStandup.date,
          yesterday: newStandup.yesterday,
          today: newStandup.today,
          blockers: newStandup.blockers,
          created_at: newStandup.createdAt,
        }),
        'addStandup'
      );
    }
  };

  const updateStandup = (
    id: string,
    updates: Pick<DailyStandup, 'yesterday' | 'today' | 'blockers'>
  ) => {
    const existing = state.standups.find((s) => s.id === id);
    if (!currentUser || !existing) return;
    if (!isAdmin && existing.userId !== currentUser.id) return;

    const clean = {
      yesterday: updates.yesterday.trim(),
      today: updates.today.trim(),
      blockers: updates.blockers.trim(),
    };

    setState((prev) => ({
      ...prev,
      standups: prev.standups.map((s) => (s.id === id ? { ...s, ...clean } : s)),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('standups').update(clean).eq('id', id),
        'updateStandup'
      );
    }
  };

  const deleteStandup = (id: string) => {
    const existing = state.standups.find((s) => s.id === id);
    if (!currentUser || !existing) return;
    if (!isAdmin && existing.userId !== currentUser.id) return;

    setState((prev) => ({
      ...prev,
      standups: prev.standups.filter((s) => s.id !== id),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('standups').delete().eq('id', id),
        'deleteStandup'
      );
    }
  };

  const addTeamReport = (
    payload: Omit<
      TeamMeetingReport,
      'id' | 'createdAt' | 'authorId' | 'authorName' | 'authorAvatar'
    >
  ) => {
    if (!currentUser) return;
    const resolvedTeamId = isAdmin ? payload.teamId : currentTeam.id;
    if (!resolvedTeamId) return;
    const newReport: TeamMeetingReport = {
      ...payload,
      teamId: resolvedTeamId,
      id: `rep-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatarUrl,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      teamReports: [newReport, ...prev.teamReports],
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('team_reports').insert({
          id: newReport.id,
          team_id: newReport.teamId,
          title: newReport.title,
          meeting_date: newReport.meetingDate,
          author_id: newReport.authorId,
          author_name: newReport.authorName,
          author_avatar: newReport.authorAvatar,
          done: newReport.done,
          in_progress: newReport.inProgress,
          blockers: newReport.blockers,
          links: newReport.links,
          questions: newReport.questions,
          created_at: newReport.createdAt,
        }),
        'addTeamReport'
      );
    }
  };

  const updateTeamReport = (
    id: string,
    updates: Partial<TeamMeetingReport>
  ) => {
    const existing = state.teamReports.find((r) => r.id === id);
    if (!currentUser || !existing) return;
    if (!isAdmin && existing.authorId !== currentUser.id) return;

    setState((prev) => ({
      ...prev,
      teamReports: prev.teamReports.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.meetingDate !== undefined)
        dbUpdates.meeting_date = updates.meetingDate;
      if (updates.done !== undefined) dbUpdates.done = updates.done;
      if (updates.inProgress !== undefined)
        dbUpdates.in_progress = updates.inProgress;
      if (updates.blockers !== undefined) dbUpdates.blockers = updates.blockers;
      if (updates.links !== undefined) dbUpdates.links = updates.links;
      if (updates.questions !== undefined)
        dbUpdates.questions = updates.questions;

      void runDbWrite(
        supabase.from('team_reports').update(dbUpdates).eq('id', id),
        'updateTeamReport'
      );
    }
  };

  const deleteTeamReport = (id: string) => {
    const existing = state.teamReports.find((r) => r.id === id);
    if (!currentUser || !existing) return;
    if (!isAdmin && existing.authorId !== currentUser.id) return;

    setState((prev) => ({
      ...prev,
      teamReports: prev.teamReports.filter((r) => r.id !== id),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('team_reports').delete().eq('id', id),
        'deleteTeamReport'
      );
    }
  };

  const addTaskForUser = (payload: Omit<MemberTask, 'id'>) => {
    if (!currentUser) return;
    const assignedUserId = isAdmin ? payload.userId : currentUser.id;
    const assignedTeamId = isAdmin ? payload.teamId : currentTeam.id;
    if (!assignedTeamId) return;
    const newTask: MemberTask = {
      ...payload,
      id: `task-${Date.now()}`,
      userId: assignedUserId,
      teamId: assignedTeamId,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('tasks').insert({
          id: newTask.id,
          user_id: newTask.userId,
          team_id: newTask.teamId,
          title: newTask.title,
          category: newTask.category,
          status: newTask.status,
          priority: newTask.priority,
          progress_percent: newTask.progressPercent,
          due_date: newTask.dueDate,
        }),
        'addTask'
      );
    }
  };

  const addTask = (payload: Omit<MemberTask, 'id' | 'userId'>) => {
    if (!currentUser) return;
    addTaskForUser({
      ...payload,
      userId: currentUser.id,
    });
  };

  const updateTask = (taskId: string, updates: Partial<MemberTask>) => {
    const existing = state.tasks.find((t) => t.id === taskId);
    if (!currentUser || !existing) return;
    if (!isAdmin && existing.userId !== currentUser.id) return;

    const mergedPercent =
      updates.status === 'done' && updates.progressPercent === undefined
        ? 100
        : updates.status === 'todo' && updates.progressPercent === undefined
        ? 0
        : updates.progressPercent;
    const nowIso = new Date().toISOString();

    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          ...updates,
          progressPercent:
            mergedPercent !== undefined ? mergedPercent : task.progressPercent,
          createdAt: nowIso,
        };
      }),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      const dbUpdates: Record<string, unknown> = {
        updated_at: nowIso,
      };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (mergedPercent !== undefined) dbUpdates.progress_percent = mergedPercent;

      void runDbWrite(
        supabase.from('tasks').update(dbUpdates).eq('id', taskId),
        'updateTask'
      );
    }
  };

  const deleteTask = (taskId: string) => {
    const existing = state.tasks.find((t) => t.id === taskId);
    if (!currentUser || !existing) return;
    if (!isAdmin && existing.userId !== currentUser.id) return;

    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('tasks').delete().eq('id', taskId),
        'deleteTask'
      );
    }
  };

  const addCalendarEvent = (payload: Omit<CalendarEvent, 'id'>) => {
    if (!isAdmin && !currentTeam.id) return;
    const newEvent: CalendarEvent = {
      ...payload,
      teamId: isAdmin ? payload.teamId : currentTeam.id,
      id: `ev-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      events: [...prev.events, newEvent].sort((a, b) => a.date.localeCompare(b.date)),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('calendar_events').insert({
          id: newEvent.id,
          team_id: newEvent.teamId,
          title: newEvent.title,
          description: newEvent.description,
          event_date: newEvent.date,
          event_time: newEvent.time,
          type: newEvent.type,
          priority: newEvent.priority,
          meeting_link: newEvent.meetingLink ?? null,
          location: newEvent.location ?? null,
        }),
        'addCalendarEvent'
      );
    }
  };

  const deleteCalendarEvent = (eventId: string) => {
    const target = state.events.find((e) => e.id === eventId);
    if (!target) return;
    if (!isAdmin && target.teamId === null) return;

    setState((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== eventId),
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      void runDbWrite(
        supabase.from('calendar_events').delete().eq('id', eventId),
        'deleteCalendarEvent'
      );
    }
  };

  return (
    <AppContext.Provider
      value={{
        isHydrated,
        isSupabaseEnabled: isSupabaseConfigured,
        isAdmin,
        currentUser,
        teams: state.teams,
        currentTeamId: effectiveTeamId,
        currentTeam,
        setCurrentTeamId,
        users: state.users,
        announcements: state.announcements,
        milestones: state.milestones,
        quickLinks: state.quickLinks,
        standups: state.standups,
        teamReports: state.teamReports,
        tasks: state.tasks,
        events: state.events,
        systemConfig: state.systemConfig,
        joinRequests,
        activityLogs,
        loginWithGoogleOAuth,
        logout,
        updateCurrentUserProfile,
        updateSystemConfig,
        createTeam,
        deleteTeam,
        updateTeamInfo,
        addTeamMember,
        updateUserByAdmin,
        deleteUserByAdmin,
        submitJoinRequest,
        cancelJoinRequest,
        resolveJoinRequest,
        addAnnouncement,
        togglePinAnnouncement,
        deleteAnnouncement,
        addMilestone,
        deleteMilestone,
        addQuickLink,
        deleteQuickLink,
        addStandup,
        updateStandup,
        deleteStandup,
        addTeamReport,
        updateTeamReport,
        deleteTeamReport,
        addTask,
        addTaskForUser,
        updateTask,
        deleteTask,
        addCalendarEvent,
        deleteCalendarEvent,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
