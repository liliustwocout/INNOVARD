'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  addDaysISO,
  formatVietnameseDate,
  getTodayISO,
  STANDUP_WEEKDAY_OPTIONS,
} from '@/lib/date-utils';
import { DEFAULT_SYSTEM_CONFIG, isAdminEmail } from '@/lib/supabase-mappers';
import type {
  ActivityLogItem,
  ActivityLogType,
  Team,
  TeamRole,
} from '@/types/innovard';

const LOG_TYPE_META: Record<
  ActivityLogType,
  { label: string; badgeClass: string }
> = {
  standup: {
    label: 'Daily Standup',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  report: {
    label: 'Báo cáo họp nhóm',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  task: {
    label: 'Công việc / Tiến độ',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  announcement: {
    label: 'Thông báo',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  event: {
    label: 'Lịch sự kiện',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  join_request: {
    label: 'Xin gia nhập đội',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
  },
};

const TASK_STATUS_META = {
  todo: { label: 'Cần làm', badgeClass: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'Đang làm', badgeClass: 'bg-indigo-50 text-indigo-700' },
  done: { label: 'Hoàn thành', badgeClass: 'bg-emerald-50 text-emerald-700' },
} as const;

const TASK_PRIORITY_META = {
  high: { label: 'Cao', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  medium: {
    label: 'Trung bình',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  low: { label: 'Thấp', badgeClass: 'bg-slate-50 text-slate-600 border-slate-200' },
} as const;

function formatTimeHHMM(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function AdminPage() {
  const router = useRouter();
  const {
    isAdmin,
    currentUser,
    teams,
    users,
    standups,
    teamReports,
    tasks,
    announcements,
    events,
    systemConfig,
    joinRequests,
    activityLogs,
    setCurrentTeamId,
    updateSystemConfig,
    createTeam,
    updateTeamInfo,
    deleteTeam,
    addTeamMember,
    updateUserByAdmin,
    deleteUserByAdmin,
    resolveJoinRequest,
    deleteStandup,
    deleteTeamReport,
    deleteTask,
    deleteAnnouncement,
    deleteCalendarEvent,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'logs' | 'requests' | 'manage' | 'settings'>('logs');
  const [logUserFilter, setLogUserFilter] = useState<string>('all');
  const [logTypeFilter, setLogTypeFilter] = useState<'all' | ActivityLogType>('all');
  const [logTeamFilter, setLogTeamFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [inspectingUserId, setInspectingUserId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'all' | 'standups' | 'tasks' | 'reports'>('all');

  // System Config form state
  const [cfgStandupStartTime, setCfgStandupStartTime] = useState(
    systemConfig.standupStartTime
  );
  const [cfgStandupTime, setCfgStandupTime] = useState(systemConfig.standupDeadlineTime);
  const [cfgStandupStartDate, setCfgStandupStartDate] = useState(
    systemConfig.standupStartDate
  );
  const [cfgStandupEndDate, setCfgStandupEndDate] = useState(
    systemConfig.standupEndDate
  );
  const [cfgStandupDaysOfWeek, setCfgStandupDaysOfWeek] = useState<number[]>(
    systemConfig.standupDaysOfWeek
  );
  const [cfgStandupLabel, setCfgStandupLabel] = useState(systemConfig.standupDeadlineLabel);
  const [cfgAllowLate, setCfgAllowLate] = useState(systemConfig.allowLateStandup);
  const [cfgAllowBackdate, setCfgAllowBackdate] = useState(systemConfig.allowBackdateStandup);
  const [cfgWeeklyLabel, setCfgWeeklyLabel] = useState(systemConfig.weeklyReportDeadlineLabel);
  const [cfgMaxMembers, setCfgMaxMembers] = useState(systemConfig.maxTeamMembers);
  const [cfgAllowJoinRequests, setCfgAllowJoinRequests] = useState(
    systemConfig.allowTeamJoinRequests
  );
  const [cfgProgramName, setCfgProgramName] = useState(systemConfig.programName);
  const [cfgCohortLabel, setCfgCohortLabel] = useState(systemConfig.cohortLabel);
  const [cfgSavedNotice, setCfgSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    setCfgStandupStartTime(systemConfig.standupStartTime);
    setCfgStandupTime(systemConfig.standupDeadlineTime);
    setCfgStandupStartDate(systemConfig.standupStartDate);
    setCfgStandupEndDate(systemConfig.standupEndDate);
    setCfgStandupDaysOfWeek(systemConfig.standupDaysOfWeek);
    setCfgStandupLabel(systemConfig.standupDeadlineLabel);
    setCfgAllowLate(systemConfig.allowLateStandup);
    setCfgAllowBackdate(systemConfig.allowBackdateStandup);
    setCfgWeeklyLabel(systemConfig.weeklyReportDeadlineLabel);
    setCfgMaxMembers(systemConfig.maxTeamMembers);
    setCfgAllowJoinRequests(systemConfig.allowTeamJoinRequests);
    setCfgProgramName(systemConfig.programName);
    setCfgCohortLabel(systemConfig.cohortLabel);
  }, [systemConfig]);

  // Create Team Modal state
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamCode, setNewTeamCode] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamProject, setNewTeamProject] = useState('');
  const [newTeamMentor, setNewTeamMentor] = useState('');
  const [newTeamGithub, setNewTeamGithub] = useState('https://github.com');
  const [newTeamDiscord, setNewTeamDiscord] = useState('https://discord.com');
  const [newTeamDesc, setNewTeamDesc] = useState('');

  // Edit Team Modal state
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamCode, setEditTeamCode] = useState('');
  const [editTeamProject, setEditTeamProject] = useState('');
  const [editTeamMentor, setEditTeamMentor] = useState('');
  const [editTeamGithub, setEditTeamGithub] = useState('');
  const [editTeamDiscord, setEditTeamDiscord] = useState('');
  const [editTeamDesc, setEditTeamDesc] = useState('');
  const [editTeamProgress, setEditTeamProgress] = useState(0);

  // Add User Modal state
  const [showAddUser, setShowAddUser] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<TeamRole>('member');
  const [memberTeamId, setMemberTeamId] = useState(teams[0]?.id ?? 'team-alpha');
  const [memberTitle, setMemberTitle] = useState('Thành viên dự án');

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return activityLogs.filter((log) => {
      if (logUserFilter !== 'all' && log.actorId !== logUserFilter) return false;
      if (logTypeFilter !== 'all' && log.type !== logTypeFilter) return false;
      if (logTeamFilter !== 'all' && log.teamId !== logTeamFilter) return false;
      if (!q) return true;
      return (
        log.title.toLowerCase().includes(q) ||
        log.detail.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.actorEmail.toLowerCase().includes(q) ||
        log.teamName.toLowerCase().includes(q)
      );
    });
  }, [activityLogs, logUserFilter, logTypeFilter, logTeamFilter, logSearch]);

  const standupById = useMemo(
    () => new Map(standups.map((s) => [s.id, s])),
    [standups]
  );
  const reportById = useMemo(
    () => new Map(teamReports.map((r) => [r.id, r])),
    [teamReports]
  );
  const taskById = useMemo(
    () => new Map(tasks.map((t) => [t.id, t])),
    [tasks]
  );
  const announcementById = useMemo(
    () => new Map(announcements.map((a) => [a.id, a])),
    [announcements]
  );
  const eventById = useMemo(
    () => new Map(events.map((ev) => [ev.id, ev])),
    [events]
  );
  const joinRequestById = useMemo(
    () => new Map(joinRequests.map((jr) => [jr.id, jr])),
    [joinRequests]
  );
  const userIdsSet = useMemo(
    () => new Set(users.map((u) => u.id)),
    [users]
  );
  const teamById = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams]
  );
  const userLogCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of activityLogs) {
      if (!item.actorId) continue;
      map.set(item.actorId, (map.get(item.actorId) ?? 0) + 1);
    }
    return map;
  }, [activityLogs]);

  const selectedLog = useMemo(
    () => activityLogs.find((l) => l.id === selectedLogId) ?? null,
    [activityLogs, selectedLogId]
  );
  const inspectingUser = useMemo(
    () => users.find((u) => u.id === inspectingUserId) ?? null,
    [users, inspectingUserId]
  );
  const inspectingUserLogs = useMemo(
    () =>
      inspectingUser
        ? activityLogs.filter((l) => l.actorId === inspectingUser.id)
        : [],
    [activityLogs, inspectingUser]
  );
  const inspectingUserStandups = useMemo(
    () =>
      inspectingUser
        ? standups
            .filter((s) => s.userId === inspectingUser.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [standups, inspectingUser]
  );
  const inspectingUserTasks = useMemo(
    () =>
      inspectingUser
        ? tasks
            .filter((t) => t.userId === inspectingUser.id)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        : [],
    [tasks, inspectingUser]
  );
  const inspectingUserReports = useMemo(
    () =>
      inspectingUser
        ? teamReports
            .filter((r) => r.authorId === inspectingUser.id)
            .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
        : [],
    [teamReports, inspectingUser]
  );

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xs">
        <span className="inline-block rounded-full bg-rose-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-700">
          Giới hạn quyền truy cập
        </span>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
          Chỉ dành cho Quản trị viên (Admin)
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Tài khoản hiện tại thuộc nhóm quyền Thành viên nên chỉ được xem và làm việc
          trong đội của mình. Bạn có thể gửi yêu cầu gia nhập đội khác tại trang Đội của tôi.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/overview"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Quay về Tổng quan
          </Link>
          <Link
            href="/team"
            className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Xem danh sách Đội
          </Link>
        </div>
      </div>
    );
  }

  const openEditTeamModal = (team: Team) => {
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditTeamCode(team.code);
    setEditTeamProject(team.projectName);
    setEditTeamMentor(team.mentorName);
    setEditTeamGithub(team.githubRepoUrl);
    setEditTeamDiscord(team.discordInviteUrl);
    setEditTeamDesc(team.description);
    setEditTeamProgress(team.progress);
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamCode.trim()) return;
    createTeam({
      code: newTeamCode.trim().toUpperCase(),
      name: newTeamName.trim(),
      projectName: newTeamProject.trim() || 'Dự án mới',
      slogan: '',
      description: newTeamDesc.trim(),
      mentorName: newTeamMentor.trim() || 'Chưa cập nhật',
      githubRepoUrl: newTeamGithub.trim() || 'https://github.com',
      discordInviteUrl: newTeamDiscord.trim() || 'https://discord.com',
      progress: 0,
    });
    setNewTeamCode('');
    setNewTeamName('');
    setNewTeamProject('');
    setNewTeamMentor('');
    setNewTeamDesc('');
    setShowCreateTeam(false);
  };

  const handleSaveEditTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    updateTeamInfo(editingTeam.id, {
      code: editTeamCode.trim() || editingTeam.code,
      name: editTeamName.trim() || editingTeam.name,
      projectName: editTeamProject.trim() || editingTeam.projectName,
      mentorName: editTeamMentor.trim(),
      githubRepoUrl: editTeamGithub.trim(),
      discordInviteUrl: editTeamDiscord.trim(),
      description: editTeamDesc.trim(),
      progress: Number(editTeamProgress),
    });
    setEditingTeam(null);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim() || !memberEmail.trim()) return;
    addTeamMember({
      name: memberName.trim(),
      email: memberEmail.trim(),
      avatarUrl: '',
      role: memberRole,
      title:
        memberTitle.trim() ||
        (memberRole === 'admin' ? 'Quản trị viên (Admin)' : 'Thành viên dự án'),
      bio: '',
      skills: [],
      teamId: memberTeamId || teams[0]?.id || 'team-alpha',
      connectedProfiles: {
        github: '',
        discord: '',
        linkedin: '',
        portfolio: '',
        systemRole: memberRole,
      },
    });
    setMemberName('');
    setMemberEmail('');
    setMemberRole('member');
    setMemberTitle('Thành viên dự án');
    setShowAddUser(false);
  };

  const handleDeleteLogRecord = (type: ActivityLogType, recordId: string) => {
    if (type === 'standup') deleteStandup(recordId);
    else if (type === 'report') deleteTeamReport(recordId);
    else if (type === 'task') deleteTask(recordId);
    else if (type === 'announcement') deleteAnnouncement(recordId);
    else if (type === 'event') deleteCalendarEvent(recordId);
  };

  const renderStructuredLogBody = (log: ActivityLogItem, detailed = false) => {
    if (log.type === 'standup') {
      const su = standupById.get(log.recordId);
      if (su) {
        return (
          <div className="mt-3 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-lg bg-indigo-50 px-2.5 py-0.5 font-semibold text-indigo-700">
                Ngày Standup: {formatVietnameseDate(su.date)}
              </span>
              {formatTimeHHMM(su.createdAt) && (
                <span>Gửi lúc {formatTimeHHMM(su.createdAt)}</span>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs leading-relaxed text-slate-700">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Hôm qua làm gì
                </p>
                <p className="whitespace-pre-line">{su.yesterday}</p>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-xs leading-relaxed text-slate-700">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  Hôm nay làm gì
                </p>
                <p className="whitespace-pre-line">{su.today}</p>
              </div>
            </div>
            {su.blockers && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                <span className="font-bold">Đang vướng: </span>
                <span className="whitespace-pre-line">{su.blockers}</span>
              </div>
            )}
          </div>
        );
      }
    }

    if (log.type === 'report') {
      const rep = reportById.get(log.recordId);
      if (rep) {
        return (
          <div className="mt-3 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-lg bg-sky-50 px-2.5 py-0.5 font-semibold text-sky-700">
                Ngày họp: {formatVietnameseDate(rep.meetingDate)}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs leading-relaxed text-slate-700">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Đã hoàn thành
                </p>
                <p className="whitespace-pre-line">{rep.done}</p>
              </div>
              <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3 text-xs leading-relaxed text-slate-700">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-sky-700">
                  Đang thực hiện
                </p>
                <p className="whitespace-pre-line">{rep.inProgress}</p>
              </div>
            </div>
            {rep.blockers && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                <span className="font-bold">Vướng mắc: </span>
                <span className="whitespace-pre-line">{rep.blockers}</span>
              </div>
            )}
            {rep.questions && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs leading-relaxed text-indigo-900">
                <span className="font-bold">Câu hỏi gửi Mentor / Admin: </span>
                <span className="whitespace-pre-line">{rep.questions}</span>
              </div>
            )}
            {detailed && rep.links.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {rep.links.map((lk, idx) => (
                  <a
                    key={`${lk.url}-${idx}`}
                    href={lk.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                  >
                    {lk.label || lk.url}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      }
    }

    if (log.type === 'task') {
      const tsk = taskById.get(log.recordId);
      if (tsk) {
        const statusMeta = TASK_STATUS_META[tsk.status];
        const prioMeta = TASK_PRIORITY_META[tsk.priority];
        return (
          <div className="mt-3 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                Hạng mục: {tsk.category}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${prioMeta.badgeClass}`}
              >
                Ưu tiên: {prioMeta.label}
              </span>
              <span className="rounded-lg bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                Tiến độ: {tsk.progressPercent}%
              </span>
              <span className="text-xs font-medium text-slate-500">
                Hạn: {formatVietnameseDate(tsk.dueDate)}
              </span>
            </div>
            {detailed && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all"
                  style={{ width: `${tsk.progressPercent}%` }}
                />
              </div>
            )}
          </div>
        );
      }
    }

    if (detailed && log.type === 'announcement') {
      const ann = announcementById.get(log.recordId);
      if (ann) {
        return (
          <div className="mt-3 space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800">
                Phân loại: {ann.category}
              </span>
              <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 font-semibold text-slate-700">
                Mức độ: {ann.priority}
              </span>
            </div>
            <p className="whitespace-pre-line leading-relaxed">{ann.content}</p>
          </div>
        );
      }
    }

    if (detailed && log.type === 'event') {
      const ev = eventById.get(log.recordId);
      if (ev) {
        return (
          <div className="mt-3 space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-sm text-slate-700">
            <p className="text-xs font-semibold text-slate-500">
              Thời gian: {formatVietnameseDate(ev.date)} · {ev.time}
            </p>
            {ev.description && (
              <p className="whitespace-pre-line leading-relaxed">{ev.description}</p>
            )}
            {ev.location && (
              <p className="text-xs text-slate-600">Địa điểm: {ev.location}</p>
            )}
            {ev.meetingLink && (
              <a
                href={ev.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs font-semibold text-indigo-600 hover:underline"
              >
                Mở link họp trực tuyến
              </a>
            )}
          </div>
        );
      }
    }

    if (detailed && log.type === 'join_request') {
      const req = joinRequestById.get(log.recordId);
      if (req) {
        const fromTeam = req.fromTeamId
          ? teamById.get(req.fromTeamId)?.name ?? req.fromTeamId
          : 'Chưa có đội';
        return (
          <div className="mt-3 space-y-2 rounded-xl border border-violet-200 bg-violet-50/50 p-3.5 text-sm text-slate-700">
            <p className="text-xs font-semibold text-violet-800">
              Từ: {fromTeam} sang đội: {req.toTeamName}
            </p>
            {req.message && (
              <p className="whitespace-pre-line text-xs leading-relaxed">
                Lời nhắn: {req.message}
              </p>
            )}
          </div>
        );
      }
    }

    return (
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
        {log.detail}
      </p>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            Bảng điều khiển Admin · {currentUser?.email}
          </span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
            Quản trị hệ thống &amp; Nhật ký hoạt động
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi mọi bài nộp, nhật ký thay đổi, duyệt yêu cầu gia nhập và điều chỉnh toàn bộ đội nhóm.
          </p>
        </div>
      </header>

      {/* Summary KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Tổng số Đội</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{teams.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Tổng Thành viên</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">
            Nhật ký &amp; Bài nộp
          </p>
          <p className="mt-2 text-3xl font-extrabold text-indigo-600">
            {activityLogs.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">
            Chờ duyệt gia nhập đội
          </p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600">
            {joinRequests.length}
          </p>
        </div>
      </section>

      {/* Tab Switcher */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs">
        {[
          {
            id: 'logs' as const,
            label: `Nhật ký & Bài nộp thành viên (${activityLogs.length})`,
          },
          {
            id: 'requests' as const,
            label: `Duyệt xin gia nhập đội (${joinRequests.length})`,
          },
          {
            id: 'manage' as const,
            label: `Quản lý Đội & Thành viên (${teams.length} đội / ${users.length} người)`,
          },
          {
            id: 'settings' as const,
            label: `Cấu hình thông số (Standup: ${systemConfig.standupDeadlineTime})`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: NHẬT KÝ & BÀI NỘP THÀNH VIÊN */}
      {activeTab === 'logs' && (
        <section className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-3">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Tìm kiếm bài nộp / thành viên
                </label>
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Tên người nộp, email, nội dung..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Lọc theo Thành viên
                </label>
                <select
                  value={logUserFilter}
                  onChange={(e) => setLogUserFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="all">Tất cả thành viên ({users.length})</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Loại hoạt động
                </label>
                <select
                  value={logTypeFilter}
                  onChange={(e) =>
                    setLogTypeFilter(e.target.value as 'all' | ActivityLogType)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="all">Tất cả hoạt động</option>
                  <option value="standup">Daily Standup</option>
                  <option value="report">Báo cáo họp nhóm</option>
                  <option value="task">Công việc / Tiến độ</option>
                  <option value="announcement">Thông báo</option>
                  <option value="event">Lịch sự kiện</option>
                  <option value="join_request">Xin gia nhập đội</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Lọc theo Đội
                </label>
                <select
                  value={logTeamFilter}
                  onChange={(e) => setLogTeamFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="all">Tất cả đội</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLogUserFilter('all')}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    logUserFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tất cả ({activityLogs.length})
                </button>
                {users.map((u) => {
                  const cnt = userLogCounts.get(u.id) ?? 0;
                  const active = logUserFilter === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setLogUserFilter(u.id)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        active
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                      }`}
                    >
                      {u.name} ({cnt})
                    </button>
                  );
                })}
              </div>

              {logUserFilter !== 'all' && userIdsSet.has(logUserFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setInspectingUserId(logUserFilter);
                    setInspectorTab('all');
                  }}
                  className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                >
                  Xem toàn bộ hồ sơ của thành viên đang chọn
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                Chưa có nhật ký hoặc bài nộp nào khớp với bộ lọc hiện tại.
              </div>
            ) : (
              filteredLogs.map((log) => {
                const meta = LOG_TYPE_META[log.type];
                const datePart = log.createdAt.slice(0, 10);
                const timePart = formatTimeHHMM(log.createdAt);
                const hasInspectableActor =
                  Boolean(log.actorId) && userIdsSet.has(log.actorId);
                return (
                  <article
                    key={log.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-indigo-200"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                          {log.teamName}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {formatVietnameseDate(datePart)}
                          {timePart ? ` · ${timePart}` : ''}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedLogId(log.id)}
                          className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                        >
                          Xem chi tiết
                        </button>
                        {hasInspectableActor && (
                          <button
                            type="button"
                            onClick={() => {
                              setInspectingUserId(log.actorId);
                              setInspectorTab('all');
                            }}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Hồ sơ thành viên
                          </button>
                        )}
                        {log.type !== 'join_request' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteLogRecord(log.type, log.recordId)
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2.5">
                      <UserAvatar
                        src={log.actorAvatar}
                        name={log.actorName}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {log.actorName}
                          {log.actorEmail && (
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              {log.actorEmail}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <h3 className="mt-3 text-base font-bold text-slate-900">
                      {log.title}
                    </h3>
                    {renderStructuredLogBody(log)}
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* TAB 2: DUYỆT XIN GIA NHẬP ĐỘI */}
      {activeTab === 'requests' && (
        <section className="space-y-4">
          {joinRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Hiện không có yêu cầu xin gia nhập đội nào đang chờ duyệt.
            </div>
          ) : (
            joinRequests.map((req) => {
              const fromTeamName = req.fromTeamId
                ? teams.find((t) => t.id === req.fromTeamId)?.name ?? req.fromTeamId
                : 'Chưa có đội';
              return (
                <article
                  key={req.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3.5">
                    <UserAvatar
                      src={req.userAvatar}
                      name={req.userName}
                      size="md"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {req.userName}
                        </h3>
                        <span className="text-xs text-slate-500">
                          {req.userEmail}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-indigo-700">
                        Từ đội: {fromTeamName} sang đội: {req.toTeamName}
                      </p>
                      {req.message && (
                        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
                          Lời nhắn: {req.message}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400">
                        Gửi lúc {formatVietnameseDate(req.createdAt.slice(0, 10))}{' '}
                        {formatTimeHHMM(req.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => resolveJoinRequest(req.userId, 'approved')}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Chấp thuận
                    </button>
                    <button
                      type="button"
                      onClick={() => resolveJoinRequest(req.userId, 'rejected')}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Từ chối
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}

      {/* TAB 3: QUẢN LÝ ĐỘI & THÀNH VIÊN */}
      {activeTab === 'manage' && (
        <div className="space-y-8">
          {/* Teams Management */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Quản lý tất cả Đội ({teams.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Tạo đội mới, cập nhật thông tin dự án hoặc chuyển sang xem dữ liệu từng đội.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateTeam(true)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
              >
                Tạo đội mới
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {teams.map((team) => {
                const count = users.filter((u) => u.teamId === team.id).length;
                return (
                  <article
                    key={team.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                          {team.code} · {count} thành viên
                        </span>
                        <span className="text-xs font-bold text-slate-600">
                          {team.progress}% tiến độ
                        </span>
                      </div>
                      <h3 className="mt-2.5 text-base font-extrabold text-slate-900">
                        {team.name}
                      </h3>
                      <p className="text-xs font-semibold text-indigo-600">
                        {team.projectName}
                      </p>
                      <p className="mt-1.5 text-xs text-slate-600">
                        {team.description || 'Chưa có mô tả dự án.'}
                      </p>
                      <p className="mt-2 text-[11px] text-slate-500">
                        Mentor: {team.mentorName}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentTeamId(team.id);
                          router.push('/overview');
                        }}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-600"
                      >
                        Xem đội này
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditTeamModal(team)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Chỉnh sửa
                      </button>
                      {teams.length > 1 && (
                        <button
                          type="button"
                          onClick={() => deleteTeam(team.id)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        >
                          Xóa đội
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Users Management */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Quản lý Thành viên &amp; Phân quyền ({users.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Điều chỉnh vai trò Admin / Thành viên và chuyển đổi đội cho bất kỳ tài khoản nào.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMemberTeamId(teams[0]?.id ?? 'team-alpha');
                  setShowAddUser(true);
                }}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
              >
                Thêm thành viên
              </button>
            </div>

            <div className="space-y-2.5">
              {users.map((u) => {
                const protectedAdmin = isAdminEmail(u.email);
                const isSelf = u.id === currentUser?.id;
                const uStandupCount = standups.filter((s) => s.userId === u.id).length;
                const uTaskCount = tasks.filter((t) => t.userId === u.id).length;
                const uLogCount = activityLogs.filter((l) => l.actorId === u.id).length;
                return (
                  <div
                    key={u.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar src={u.avatarUrl} name={u.name} size="md" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {u.name}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              u.role === 'admin'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.role === 'admin' ? 'Admin' : 'Thành viên'}
                          </span>
                          {protectedAdmin && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              Admin mặc định
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-slate-500">
                          {u.email} · {u.title}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-indigo-600">
                          {uStandupCount} Standup · {uTaskCount} Công việc · {uLogCount} Nhật ký
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setInspectingUserId(u.id);
                          setInspectorTab('all');
                        }}
                        className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        Xem nhật ký &amp; bài nộp ({uLogCount})
                      </button>

                      <select
                        value={u.role}
                        disabled={protectedAdmin}
                        onChange={(e) =>
                          updateUserByAdmin(u.id, {
                            role: e.target.value as TeamRole,
                          })
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Thành viên</option>
                      </select>

                      <select
                        value={u.teamId}
                        onChange={(e) =>
                          updateUserByAdmin(u.id, { teamId: e.target.value })
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
                      >
                        <option value="">Chưa có đội</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.code})
                          </option>
                        ))}
                      </select>

                      {!protectedAdmin && !isSelf && (
                        <button
                          type="button"
                          onClick={() => deleteUserByAdmin(u.id)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: CẤU HÌNH THÔNG SỐ HỆ THỐNG */}
      {activeTab === 'settings' && (
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Cấu hình thông số vận hành hệ thống
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Thay đổi thời hạn nộp Daily Standup, quy định nộp bài, giới hạn sĩ số đội và thông tin chương trình. Cấu hình được đồng bộ trực tiếp lên cơ sở dữ liệu cho tất cả thành viên.
              </p>
            </div>
            {systemConfig.updatedAt && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                Cập nhật lần cuối: {formatVietnameseDate(systemConfig.updatedAt.slice(0, 10))}
                {formatTimeHHMM(systemConfig.updatedAt)
                  ? ` · ${formatTimeHHMM(systemConfig.updatedAt)}`
                  : ''}
              </span>
            )}
          </div>

          {cfgSavedNotice && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {cfgSavedNotice}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateSystemConfig({
                standupStartTime: cfgStandupStartTime,
                standupDeadlineTime: cfgStandupTime,
                standupStartDate: cfgStandupStartDate,
                standupEndDate: cfgStandupEndDate,
                standupDaysOfWeek: cfgStandupDaysOfWeek,
                standupDeadlineLabel: cfgStandupLabel,
                allowLateStandup: cfgAllowLate,
                allowBackdateStandup: cfgAllowBackdate,
                weeklyReportDeadlineLabel: cfgWeeklyLabel,
                maxTeamMembers: cfgMaxMembers,
                allowTeamJoinRequests: cfgAllowJoinRequests,
                programName: cfgProgramName,
                cohortLabel: cfgCohortLabel,
              });
              setCfgSavedNotice(
                'Đã lưu cấu hình thông số hệ thống và đồng bộ lên cơ sở dữ liệu!'
              );
              setTimeout(() => setCfgSavedNotice(null), 4000);
            }}
            className="mt-6 space-y-6"
          >
            {/* 1. Daily Standup & Báo cáo nhóm */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  1. Lịch &amp; Khung giờ Daily Standup / Báo cáo nhóm
                </h3>
                <p className="text-xs text-slate-500">
                  Chọn ngày bắt đầu áp dụng, các ngày trong tuần có Standup và khung giờ được phép nộp (hiển thị trên Lịch sự kiện, Trang tổng quan &amp; Bài nộp của tôi).
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Được phép nộp từ giờ (HH:mm)
                  </label>
                  <input
                    type="time"
                    required
                    value={cfgStandupStartTime}
                    onChange={(e) => setCfgStandupStartTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['00:00', '06:00', '07:00', '08:00', '09:00'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCfgStandupStartTime(preset)}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                          cfgStandupStartTime === preset
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Đến giờ / Hạn chót mỗi ngày (HH:mm)
                  </label>
                  <input
                    type="time"
                    required
                    value={cfgStandupTime}
                    onChange={(e) => setCfgStandupTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['09:00', '10:00', '12:00', '18:00', '21:00', '23:59'].map(
                      (preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCfgStandupTime(preset)}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                            cfgStandupTime === preset
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {preset}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Bắt đầu áp dụng lịch từ ngày (để trống = không giới hạn)
                  </label>
                  <input
                    type="date"
                    value={cfgStandupStartDate}
                    onChange={(e) => setCfgStandupStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCfgStandupStartDate(getTodayISO())}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Từ hôm nay
                    </button>
                    <button
                      type="button"
                      onClick={() => setCfgStandupStartDate(addDaysISO(getTodayISO(), 1))}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      Từ ngày mai
                    </button>
                    <button
                      type="button"
                      onClick={() => setCfgStandupStartDate('')}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
                    >
                      Không giới hạn
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Kết thúc lịch vào ngày (tùy chọn)
                  </label>
                  <input
                    type="date"
                    value={cfgStandupEndDate}
                    onChange={(e) => setCfgStandupEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
                  />
                  {cfgStandupEndDate && (
                    <button
                      type="button"
                      onClick={() => setCfgStandupEndDate('')}
                      className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
                    >
                      Xóa ngày kết thúc
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Các ngày trong tuần có lịch Daily Standup
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCfgStandupDaysOfWeek([1, 2, 3, 4, 5, 6, 0])}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cả tuần
                    </button>
                    <button
                      type="button"
                      onClick={() => setCfgStandupDaysOfWeek([1, 2, 3, 4, 5])}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      T2–T6
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STANDUP_WEEKDAY_OPTIONS.map((opt) => {
                    const active = cfgStandupDaysOfWeek.includes(opt.day);
                    return (
                      <button
                        key={opt.day}
                        type="button"
                        onClick={() =>
                          setCfgStandupDaysOfWeek((prev) =>
                            prev.includes(opt.day)
                              ? prev.length > 1
                                ? prev.filter((d) => d !== opt.day)
                                : prev
                              : [...prev, opt.day]
                          )
                        }
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                          active
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tiêu đề hạn nộp hiển thị trên Trang tổng quan
                </label>
                <input
                  type="text"
                  required
                  value={cfgStandupLabel}
                  onChange={(e) => setCfgStandupLabel(e.target.value)}
                  placeholder="Hạn nộp Daily Standup hôm nay"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Hạn định kỳ nộp Báo cáo họp nhóm
                </label>
                <input
                  type="text"
                  required
                  value={cfgWeeklyLabel}
                  onChange={(e) => setCfgWeeklyLabel(e.target.value)}
                  placeholder="23:59 Chủ nhật hàng tuần"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={cfgAllowLate}
                    onChange={(e) => setCfgAllowLate(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span>
                    <strong className="block text-slate-900">
                      Cho phép thành viên nộp Standup sau giờ hạn
                    </strong>
                    Nếu tắt, thành viên sẽ không thể gửi Standup hôm nay sau mốc giờ{' '}
                    {cfgStandupTime}.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={cfgAllowBackdate}
                    onChange={(e) => setCfgAllowBackdate(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span>
                    <strong className="block text-slate-900">
                      Cho phép thành viên chọn lại ngày nộp Standup
                    </strong>
                    Nếu tắt, thành viên chỉ nộp được cho ngày hiện tại.
                  </span>
                </label>
              </div>
            </div>

            {/* 2. Đội nhóm & Quyền gia nhập */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  2. Thông số Đội nhóm &amp; Quyền gia nhập
                </h3>
                <p className="text-xs text-slate-500">
                  Điều chỉnh giới hạn thành viên mỗi đội và trạng thái nhận yêu cầu chuyển đội.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 md:items-center">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Sĩ số tối đa mỗi đội
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={cfgMaxMembers}
                    onChange={(e) =>
                      setCfgMaxMembers(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>

                <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={cfgAllowJoinRequests}
                    onChange={(e) => setCfgAllowJoinRequests(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span>
                    <strong className="block text-slate-900">
                      Cho phép thành viên gửi yêu cầu xin gia nhập đội khác
                    </strong>
                    Nếu tắt, nút xin gia nhập ở trang Đội của tôi sẽ tạm khóa.
                  </span>
                </label>
              </div>
            </div>

            {/* 3. Thông tin Chương trình */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  3. Thông tin Chương trình
                </h3>
                <p className="text-xs text-slate-500">
                  Tên chương trình và đợt triển khai (cohort).
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Tên chương trình
                  </label>
                  <input
                    type="text"
                    required
                    value={cfgProgramName}
                    onChange={(e) => setCfgProgramName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Nhãn đợt / Cohort
                  </label>
                  <input
                    type="text"
                    required
                    value={cfgCohortLabel}
                    onChange={(e) => setCfgCohortLabel(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  updateSystemConfig(DEFAULT_SYSTEM_CONFIG);
                  setCfgSavedNotice(
                    'Đã khôi phục thông số mặc định và đồng bộ lên cơ sở dữ liệu!'
                  );
                  setTimeout(() => setCfgSavedNotice(null), 4000);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Khôi phục mặc định
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700"
              >
                Lưu cấu hình hệ thống
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Modal Create Team */}
      {showCreateTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Tạo đội mới</h3>
              <button
                type="button"
                onClick={() => setShowCreateTeam(false)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
            <form onSubmit={handleCreateTeam} className="mt-4 space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Mã đội *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTeamCode}
                    onChange={(e) => setNewTeamCode(e.target.value)}
                    placeholder="INV-02"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Tên đội *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="INNOVARD Beta"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tên đề tài dự án
                </label>
                <input
                  type="text"
                  value={newTeamProject}
                  onChange={(e) => setNewTeamProject(e.target.value)}
                  placeholder="Tên dự án của đội"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Mentor hướng dẫn
                </label>
                <input
                  type="text"
                  value={newTeamMentor}
                  onChange={(e) => setNewTeamMentor(e.target.value)}
                  placeholder="Tên Mentor"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    GitHub Repo URL
                  </label>
                  <input
                    type="url"
                    value={newTeamGithub}
                    onChange={(e) => setNewTeamGithub(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Discord Invite URL
                  </label>
                  <input
                    type="url"
                    value={newTeamDiscord}
                    onChange={(e) => setNewTeamDiscord(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Mô tả ngắn
                </label>
                <textarea
                  rows={2}
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTeam(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Tạo đội
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Team */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Chỉnh sửa đội {editingTeam.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingTeam(null)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
            <form onSubmit={handleSaveEditTeam} className="mt-4 space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Mã đội
                  </label>
                  <input
                    type="text"
                    required
                    value={editTeamCode}
                    onChange={(e) => setEditTeamCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Tên đội
                  </label>
                  <input
                    type="text"
                    required
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tên đề tài
                </label>
                <input
                  type="text"
                  required
                  value={editTeamProject}
                  onChange={(e) => setEditTeamProject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Mentor hướng dẫn
                </label>
                <input
                  type="text"
                  value={editTeamMentor}
                  onChange={(e) => setEditTeamMentor(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    GitHub Repo URL
                  </label>
                  <input
                    type="url"
                    value={editTeamGithub}
                    onChange={(e) => setEditTeamGithub(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Discord URL
                  </label>
                  <input
                    type="url"
                    value={editTeamDiscord}
                    onChange={(e) => setEditTeamDiscord(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Mô tả
                </label>
                <textarea
                  rows={2}
                  value={editTeamDesc}
                  onChange={(e) => setEditTeamDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tiến độ ({editTeamProgress}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={editTeamProgress}
                  onChange={(e) => setEditTeamProgress(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add User */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Thêm thành viên mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddUser(false)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Email Google *
                </label>
                <input
                  type="email"
                  required
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Quyền hệ thống
                  </label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value as TeamRole)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="member">Thành viên</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Đội trực thuộc
                  </label>
                  <select
                    value={memberTeamId}
                    onChange={(e) => setMemberTeamId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Chức danh / Vị trí
                </label>
                <input
                  type="text"
                  value={memberTitle}
                  onChange={(e) => setMemberTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Thêm thành viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1: Chi tiết Nhật ký & Bài nộp */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          onClick={() => setSelectedLogId(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                      LOG_TYPE_META[selectedLog.type].badgeClass
                    }`}
                  >
                    {LOG_TYPE_META[selectedLog.type].label}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    {selectedLog.teamName}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {formatVietnameseDate(selectedLog.createdAt.slice(0, 10))}
                    {formatTimeHHMM(selectedLog.createdAt)
                      ? ` · ${formatTimeHHMM(selectedLog.createdAt)}`
                      : ''}
                  </span>
                </div>
                <h3 className="mt-2 text-xl font-bold text-slate-900">
                  {selectedLog.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLogId(null)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  src={selectedLog.actorAvatar}
                  name={selectedLog.actorName}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {selectedLog.actorName}
                  </p>
                  {selectedLog.actorEmail && (
                    <p className="truncate text-xs text-slate-500">
                      {selectedLog.actorEmail}
                    </p>
                  )}
                </div>
              </div>

              {selectedLog.actorId && userIdsSet.has(selectedLog.actorId) && (
                <button
                  type="button"
                  onClick={() => {
                    const actorId = selectedLog.actorId;
                    setSelectedLogId(null);
                    setInspectingUserId(actorId);
                    setInspectorTab('all');
                  }}
                  className="rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  Xem tất cả bài nộp của thành viên này
                </button>
              )}
            </div>

            <div className="mt-4">{renderStructuredLogBody(selectedLog, true)}</div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedLog.type === 'join_request') {
                      setSelectedLogId(null);
                      setActiveTab('requests');
                      return;
                    }
                    if (selectedLog.teamId) setCurrentTeamId(selectedLog.teamId);
                    const href = selectedLog.targetHref;
                    setSelectedLogId(null);
                    router.push(href);
                  }}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Mở tại trang chức năng
                </button>

                {selectedLog.type !== 'join_request' && (
                  <button
                    type="button"
                    onClick={() => {
                      const { type, recordId } = selectedLog;
                      setSelectedLogId(null);
                      handleDeleteLogRecord(type, recordId);
                    }}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Xóa bản ghi
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedLogId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Hồ sơ Nhật ký & Bài nộp của Thành viên */}
      {inspectingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          onClick={() => setInspectingUserId(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  src={inspectingUser.avatarUrl}
                  name={inspectingUser.name}
                  size="lg"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-extrabold text-slate-900">
                      Hồ sơ Nhật ký &amp; Bài nộp: {inspectingUser.name}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        inspectingUser.role === 'admin'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {inspectingUser.role === 'admin' ? 'Admin' : 'Thành viên'}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {inspectingUser.email} ·{' '}
                    {inspectingUser.teamId
                      ? teamById.get(inspectingUser.teamId)?.name ??
                        inspectingUser.teamId
                      : 'Chưa có đội'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingUserId(null)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                <p className="text-[11px] font-medium text-slate-500">Daily Standup</p>
                <p className="mt-1 text-xl font-extrabold text-indigo-600">
                  {inspectingUserStandups.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                <p className="text-[11px] font-medium text-slate-500">
                  Công việc / Tiến độ
                </p>
                <p className="mt-1 text-xl font-extrabold text-emerald-600">
                  {inspectingUserTasks.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                <p className="text-[11px] font-medium text-slate-500">
                  Báo cáo họp nhóm
                </p>
                <p className="mt-1 text-xl font-extrabold text-sky-600">
                  {inspectingUserReports.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                <p className="text-[11px] font-medium text-slate-500">Tổng nhật ký</p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {inspectingUserLogs.length}
                </p>
              </div>
            </div>

            <div className="mt-4 inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {(
                [
                  { id: 'all', label: `Tất cả nhật ký (${inspectingUserLogs.length})` },
                  { id: 'standups', label: `Daily Standup (${inspectingUserStandups.length})` },
                  { id: 'tasks', label: `Công việc (${inspectingUserTasks.length})` },
                  { id: 'reports', label: `Báo cáo nhóm (${inspectingUserReports.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInspectorTab(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    inspectorTab === tab.id
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {inspectorTab === 'all' &&
                (inspectingUserLogs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    Thành viên này chưa có nhật ký hoặc bài nộp nào.
                  </div>
                ) : (
                  inspectingUserLogs.map((log) => (
                    <article
                      key={log.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                              LOG_TYPE_META[log.type].badgeClass
                            }`}
                          >
                            {LOG_TYPE_META[log.type].label}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                            {log.teamName}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatVietnameseDate(log.createdAt.slice(0, 10))}
                            {formatTimeHHMM(log.createdAt)
                              ? ` · ${formatTimeHHMM(log.createdAt)}`
                              : ''}
                          </span>
                        </div>

                        {log.type !== 'join_request' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteLogRecord(log.type, log.recordId)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                      <h4 className="mt-2.5 text-sm font-bold text-slate-900">
                        {log.title}
                      </h4>
                      {renderStructuredLogBody(log, true)}
                    </article>
                  ))
                ))}

              {inspectorTab === 'standups' &&
                (inspectingUserStandups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    Thành viên này chưa nộp Daily Standup nào.
                  </div>
                ) : (
                  inspectingUserStandups.map((su) => (
                    <article
                      key={su.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                            Ngày Standup: {formatVietnameseDate(su.date)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                            {teamById.get(su.teamId)?.name ?? su.teamId}
                          </span>
                          {formatTimeHHMM(su.createdAt) && (
                            <span className="text-xs text-slate-500">
                              Gửi lúc {formatTimeHHMM(su.createdAt)}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteStandup(su.id)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Xóa Standup
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs leading-relaxed text-slate-700">
                          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Hôm qua làm gì
                          </p>
                          <p className="whitespace-pre-line">{su.yesterday}</p>
                        </div>
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-xs leading-relaxed text-slate-700">
                          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                            Hôm nay làm gì
                          </p>
                          <p className="whitespace-pre-line">{su.today}</p>
                        </div>
                      </div>
                      {su.blockers && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                          <span className="font-bold">Đang vướng: </span>
                          <span className="whitespace-pre-line">{su.blockers}</span>
                        </div>
                      )}
                    </article>
                  ))
                ))}

              {inspectorTab === 'tasks' &&
                (inspectingUserTasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    Thành viên này chưa có công việc nào.
                  </div>
                ) : (
                  inspectingUserTasks.map((tsk) => {
                    const statusMeta = TASK_STATUS_META[tsk.status];
                    const prioMeta = TASK_PRIORITY_META[tsk.priority];
                    return (
                      <article
                        key={tsk.id}
                        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                {tsk.category}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusMeta.badgeClass}`}
                              >
                                {statusMeta.label}
                              </span>
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${prioMeta.badgeClass}`}
                              >
                                Ưu tiên: {prioMeta.label}
                              </span>
                              <span className="text-xs text-slate-500">
                                Hạn: {formatVietnameseDate(tsk.dueDate)}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {tsk.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                              {tsk.progressPercent}%
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteTask(tsk.id)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-600 transition-all"
                            style={{ width: `${tsk.progressPercent}%` }}
                          />
                        </div>
                      </article>
                    );
                  })
                ))}

              {inspectorTab === 'reports' &&
                (inspectingUserReports.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    Thành viên này chưa gửi báo cáo họp nhóm nào.
                  </div>
                ) : (
                  inspectingUserReports.map((rep) => (
                    <article
                      key={rep.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-700">
                            Ngày họp: {formatVietnameseDate(rep.meetingDate)}
                          </span>
                          <h4 className="mt-1.5 text-sm font-bold text-slate-900">
                            {rep.title}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteTeamReport(rep.id)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Xóa báo cáo
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs text-slate-700">
                          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Đã hoàn thành
                          </p>
                          <p className="whitespace-pre-line">{rep.done}</p>
                        </div>
                        <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3 text-xs text-slate-700">
                          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-sky-700">
                            Đang thực hiện
                          </p>
                          <p className="whitespace-pre-line">{rep.inProgress}</p>
                        </div>
                      </div>
                      {rep.blockers && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                          <span className="font-bold">Vướng mắc: </span>
                          <span className="whitespace-pre-line">{rep.blockers}</span>
                        </div>
                      )}
                      {rep.questions && (
                        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-900">
                          <span className="font-bold">Câu hỏi gửi Mentor / Admin: </span>
                          <span className="whitespace-pre-line">{rep.questions}</span>
                        </div>
                      )}
                      {rep.links.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {rep.links.map((lk, idx) => (
                            <a
                              key={`${lk.url}-${idx}`}
                              href={lk.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                            >
                              {lk.label || lk.url}
                            </a>
                          ))}
                        </div>
                      )}
                    </article>
                  ))
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
