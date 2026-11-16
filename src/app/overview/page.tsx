'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { triggerOnboardingTour } from '@/components/onboarding/OnboardingTour';
import {
  addDaysISO,
  formatLiveCountdown,
  formatVietnameseDate,
  formatVietnameseWeekdayDayMonth,
  getTodayISO,
  isStandupScheduledForDate,
} from '@/lib/date-utils';
import type { CalendarEvent } from '@/types/innovard';
import { ProgressBar } from '@/components/ui/ProgressBar';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Thành viên',
};

const EVENT_CATEGORY_LABELS: Record<string, { label: string; badgeClass: string }> = {
  standup: {
    label: 'Daily Standup',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  coaching: {
    label: 'Coaching 1-1',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  mentoring: {
    label: 'Mentoring 1-1',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  general: {
    label: 'Sự kiện chung',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  report: {
    label: 'Báo cáo tuần',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  gate: {
    label: 'Hạn gate',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  demoday: {
    label: 'Demo Day',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  topic: {
    label: 'Chốt đề tài',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  team_meeting: {
    label: 'Họp nhóm',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
  },
};

function getMondayOfWeekISO(dateISO: string): string {
  const target = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(target.getTime())) return dateISO;
  const offsetToMonday = (target.getDay() + 6) % 7;
  return addDaysISO(dateISO, -offsetToMonday);
}

function parseOverviewEventMeta(ev: CalendarEvent): {
  badgeLabel: string;
  badgeClass: string;
  endTime: string;
  cleanDescription: string;
} {
  let desc = ev.description ?? '';
  let explicitCategory: string | null = null;
  let explicitEndTime: string | null = null;

  const catMatch = /^\[(?:Loại|CAT):\s*([a-z_]+)\]\s*/i.exec(desc);
  if (catMatch) {
    explicitCategory = catMatch[1].toLowerCase();
    desc = desc.slice(catMatch[0].length);
  }

  const endMatch = /^\[(?:Kết thúc|END):\s*(\d{2}:\d{2})\]\s*/i.exec(desc);
  if (endMatch) {
    explicitEndTime = endMatch[1];
    desc = desc.slice(endMatch[0].length);
  }

  let categoryKey = explicitCategory ?? '';
  if (!categoryKey || !EVENT_CATEGORY_LABELS[categoryKey]) {
    const hay = `${ev.title} ${desc}`.toLowerCase();
    if (hay.includes('standup')) categoryKey = 'standup';
    else if (hay.includes('coaching')) categoryKey = 'coaching';
    else if (hay.includes('mentor')) categoryKey = 'mentoring';
    else if (hay.includes('demo day') || hay.includes('demoday')) categoryKey = 'demoday';
    else if (hay.includes('chốt đề tài') || hay.includes('đề tài')) categoryKey = 'topic';
    else if (hay.includes('gate')) categoryKey = 'gate';
    else if (hay.includes('báo cáo') || hay.includes('report')) categoryKey = 'report';
    else if (hay.includes('workshop') || hay.includes('office hour') || ev.teamId === null) {
      categoryKey = ev.type === 'deadline' ? 'gate' : 'general';
    } else {
      categoryKey = ev.type === 'deadline' ? 'gate' : 'team_meeting';
    }
  }

  const meta = EVENT_CATEGORY_LABELS[categoryKey] ?? {
    label: ev.type === 'deadline' ? 'Deadline' : 'Lịch sự kiện',
    badgeClass:
      ev.type === 'deadline'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-sky-50 text-sky-700 border-sky-200',
  };

  return {
    badgeLabel: meta.label,
    badgeClass: meta.badgeClass,
    endTime: explicitEndTime ?? '',
    cleanDescription: desc.trim(),
  };
}

function extractRepoShortName(url: string): string {
  try {
    const parsed = new URL(url);
    const cleaned = parsed.pathname.replace(/^\/+|\/+$/g, '');
    return cleaned || url;
  } catch {
    return url;
  }
}

export default function OverviewPage() {
  const {
    isAdmin,
    currentUser,
    currentTeam,
    users,
    events,
    standups,
    tasks,
    systemConfig,
  } = useApp();
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'deadline' | 'event'>('all');

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayISO = getTodayISO();

  const teamMembers = useMemo(
    () => (currentTeam.id ? users.filter((u) => u.teamId === currentTeam.id) : []),
    [users, currentTeam.id]
  );

  // 1. Hồ sơ đã hoàn thiện (%)
  const profileCompletion = useMemo(() => {
    if (!currentUser) return 0;
    const checks = [
      Boolean(currentUser.name.trim()),
      Boolean(currentUser.bio.trim()),
      currentUser.skills.length > 0,
      Boolean(currentUser.connectedProfiles.github.trim()),
      Boolean(currentUser.connectedProfiles.discord.trim()),
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [currentUser]);

  // 3. Tiến độ của tôi (%)
  const myProgressPercent = useMemo(() => {
    if (!currentUser || !currentTeam.id) return 0;
    const myTasks = tasks.filter(
      (t) => t.userId === currentUser.id && t.teamId === currentTeam.id
    );
    if (myTasks.length === 0) return 0;
    return Math.round(
      myTasks.reduce((sum, t) => sum + t.progressPercent, 0) / myTasks.length
    );
  }, [tasks, currentUser, currentTeam.id]);

  const weekStartISO = useMemo(() => getMondayOfWeekISO(todayISO), [todayISO]);
  const weekEndISO = useMemo(() => addDaysISO(weekStartISO, 6), [weekStartISO]);
  const horizonEndISO = useMemo(() => {
    const sevenDaysAhead = addDaysISO(todayISO, 6);
    return sevenDaysAhead > weekEndISO ? sevenDaysAhead : weekEndISO;
  }, [todayISO, weekEndISO]);

  // Danh sách Deadline sắp đến & Lịch sự kiện cả tuần (Daily Standup cả tuần + mọi Deadline & Sự kiện trên lịch)
  const scheduleRows = useMemo(() => {
    const teamStandupRows: Array<{
      id: string;
      kind: 'standup' | 'deadline' | 'event';
      badgeLabel: string;
      badgeClass: string;
      title: string;
      subtitle: string;
      description?: string;
      scopeLabel: string;
      date: string;
      time: string;
      completed: boolean;
      completedText: string;
      isPastInWeek: boolean;
      href: string;
      externalLink?: string;
    }> = [];

    if (currentTeam.id) {
      let cursor = todayISO;
      while (cursor <= horizonEndISO) {
        if (isStandupScheduledForDate(cursor, systemConfig)) {
          const submittedByMe = currentUser
            ? standups.some(
                (s) =>
                  s.userId === currentUser.id &&
                  s.teamId === currentTeam.id &&
                  s.date === cursor
              )
            : false;
          const submittedCount = standups.filter(
            (s) => s.teamId === currentTeam.id && s.date === cursor
          ).length;

          teamStandupRows.push({
            id: `daily-standup-${cursor}`,
            kind: 'standup',
            badgeLabel: 'Daily Standup',
            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            title:
              cursor === todayISO
                ? `${systemConfig.standupDeadlineLabel} hôm nay`
                : `${systemConfig.standupDeadlineLabel} (${formatVietnameseWeekdayDayMonth(cursor)})`,
            subtitle: `Khung giờ ${systemConfig.standupStartTime} – ${systemConfig.standupDeadlineTime} · ${formatVietnameseWeekdayDayMonth(cursor)}${
              teamMembers.length > 0
                ? ` · ${submittedCount}/${teamMembers.length} thành viên đã nộp`
                : ''
            }`,
            scopeLabel: currentTeam.name,
            date: cursor,
            time: systemConfig.standupDeadlineTime,
            completed: submittedByMe,
            completedText: 'Bạn đã nộp',
            isPastInWeek: false,
            href: '/project/submissions',
          });
        }
        cursor = addDaysISO(cursor, 1);
      }
    }

    const calendarRows = events
      .filter(
        (ev) =>
          ev.date >= weekStartISO &&
          (ev.teamId === null || (Boolean(currentTeam.id) && ev.teamId === currentTeam.id))
      )
      .map((ev) => {
        const meta = parseOverviewEventMeta(ev);
        const timeRange = meta.endTime ? `${ev.time} – ${meta.endTime}` : ev.time;
        const scopeLabel = ev.teamId ? currentTeam.name : 'Toàn chương trình';
        const locationSuffix = ev.location?.trim() ? ` · ${ev.location.trim()}` : '';
        return {
          id: ev.id,
          kind: (ev.type === 'deadline' ? 'deadline' : 'event') as 'deadline' | 'event',
          badgeLabel: meta.badgeLabel,
          badgeClass: meta.badgeClass,
          title: ev.title,
          subtitle: `${scopeLabel} · ${timeRange || 'Cả ngày'} · ${formatVietnameseWeekdayDayMonth(ev.date)}${locationSuffix}`,
          description: meta.cleanDescription || undefined,
          scopeLabel,
          date: ev.date,
          time: ev.time || '23:59',
          completed: false,
          completedText: 'Đã hoàn thành',
          isPastInWeek: ev.date < todayISO,
          href: '/calendar',
          externalLink: ev.meetingLink || undefined,
        };
      });

    const combined = [...teamStandupRows, ...calendarRows];

    return combined.sort((a, b) => {
      if (a.isPastInWeek !== b.isPastInWeek) {
        return a.isPastInWeek ? 1 : -1;
      }
      const keyA = `${a.date} ${a.time}`;
      const keyB = `${b.date} ${b.time}`;
      return keyA.localeCompare(keyB);
    });
  }, [
    events,
    standups,
    currentUser,
    currentTeam.id,
    currentTeam.name,
    teamMembers.length,
    todayISO,
    weekStartISO,
    horizonEndISO,
    systemConfig,
  ]);

  const filteredScheduleRows = useMemo(() => {
    if (scheduleFilter === 'all') return scheduleRows;
    if (scheduleFilter === 'deadline') {
      return scheduleRows.filter((r) => r.kind === 'standup' || r.kind === 'deadline');
    }
    return scheduleRows.filter((r) => r.kind === 'event');
  }, [scheduleRows, scheduleFilter]);

  const deadlineCount = useMemo(
    () => scheduleRows.filter((r) => r.kind === 'standup' || r.kind === 'deadline').length,
    [scheduleRows]
  );

  const eventCount = useMemo(
    () => scheduleRows.filter((r) => r.kind === 'event').length,
    [scheduleRows]
  );

  const teamCodeBadge = useMemo(() => {
    if (!currentTeam.id) return '--';
    const match = currentTeam.code.match(/\d+/);
    return match ? match[0].padStart(2, '0') : currentTeam.code;
  }, [currentTeam.id, currentTeam.code]);

  const repoShortName = extractRepoShortName(currentTeam.githubRepoUrl);

  return (
    <div className="space-y-6">
      {/* Tầng 1: Header Chào mừng */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Chào{' '}
            <span className="text-indigo-600">
              {currentUser?.name ?? 'Thành viên'}
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Trang tổng quan</p>
        </div>

        <button
          type="button"
          onClick={() => triggerOnboardingTour()}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-semibold text-indigo-700 shadow-xs transition hover:border-indigo-300 hover:bg-indigo-50"
        >
          <span>Hướng dẫn người mới</span>
          <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
            Tour
          </span>
        </button>
      </header>

      {/* Tầng 2: 3 Thẻ Chỉ số nhanh (KPI Cards) */}
      <section className="grid gap-4 md:grid-cols-3">
        <Link
          href="/profile"
          data-tour="kpi-profile"
          className="group ui-lift rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-indigo-300"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Hồ sơ đã hoàn thiện</span>
            <span className="text-[11px] font-semibold text-slate-400 group-hover:text-indigo-600">
              Cập nhật
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            {profileCompletion}%
          </p>
        </Link>

        <Link
          href="/team"
          data-tour="kpi-team"
          className="group ui-lift rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-indigo-300"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Thành viên đội</span>
            <span className="text-[11px] font-semibold text-slate-400 group-hover:text-indigo-600">
              Chi tiết
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            {teamMembers.length}/{systemConfig.maxTeamMembers}
          </p>
        </Link>

        <Link
          href="/project/progress"
          data-tour="kpi-progress"
          className="group ui-lift rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-indigo-300"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Tiến độ của tôi</span>
            <span className="text-[11px] font-semibold text-slate-400 group-hover:text-indigo-600">
              Xem tiến độ
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-indigo-600">
            {myProgressPercent}%
          </p>
        </Link>
      </section>

      {/* Tầng 3: Deadline sắp đến & Lịch sự kiện cả tuần (Full-width với đồng hồ đếm ngược thời gian thực) */}
      <section
        data-tour="overview-deadlines"
        className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs"
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Deadline sắp đến &amp; Lịch sự kiện cả tuần
              </h2>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                Tuần {formatVietnameseDate(weekStartISO)} – {formatVietnameseDate(weekEndISO)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Hiển thị toàn bộ lịch Daily Standup, hạn nộp (Deadline) và lịch sự kiện/buổi họp trong tuần.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setScheduleFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  scheduleFilter === 'all'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({scheduleRows.length})
              </button>
              <button
                type="button"
                onClick={() => setScheduleFilter('deadline')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  scheduleFilter === 'deadline'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Deadline &amp; Standup ({deadlineCount})
              </button>
              <button
                type="button"
                onClick={() => setScheduleFilter('event')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  scheduleFilter === 'event'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lịch sự kiện ({eventCount})
              </button>
            </div>

            {isAdmin && (
              <Link
                href="/admin"
                className="text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:underline"
              >
                Cấu hình hạn nộp
              </Link>
            )}
            <Link
              href="/calendar"
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Mở trang Lịch
            </Link>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredScheduleRows.length === 0 ? (
            <p className="py-6 text-xs text-slate-500">
              Chưa có deadline hay lịch sự kiện nào trong tuần cho bộ lọc hiện tại.
            </p>
          ) : (
            filteredScheduleRows.map((row) => {
              const countdown = formatLiveCountdown(row.date, row.time, nowMs);
              const countdownColor =
                countdown.tone === 'urgent'
                  ? 'text-rose-600'
                  : countdown.tone === 'soon'
                  ? 'text-amber-600'
                  : countdown.tone === 'past'
                  ? 'text-slate-400'
                  : 'text-slate-600';

              return (
                <div
                  key={row.id}
                  className={`flex flex-col gap-2 py-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:rounded-xl sm:px-2 ${
                    row.isPastInWeek ? 'opacity-70' : ''
                  }`}
                >
                  <Link href={row.href} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${row.badgeClass}`}
                      >
                        {row.badgeLabel}
                      </span>
                      <p className="text-sm font-semibold text-slate-900">
                        {row.title}
                      </p>
                      {row.date === todayISO && (
                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                          Hôm nay
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{row.subtitle}</p>
                    {row.description && (
                      <p className="mt-1 line-clamp-1 text-xs text-slate-600">
                        {row.description}
                      </p>
                    )}
                  </Link>

                  <div className="flex shrink-0 items-center gap-3 text-left sm:text-right">
                    {row.externalLink && (
                      <a
                        href={row.externalLink}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        Mở liên kết
                      </a>
                    )}
                    {row.completed ? (
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        {row.completedText}
                      </span>
                    ) : (
                      <span
                        className={`font-mono text-xs font-bold tabular-nums ${countdownColor}`}
                      >
                        {row.isPastInWeek
                          ? 'Đã diễn ra trong tuần'
                          : row.kind === 'event' && countdown.tone === 'past'
                            ? 'Đã diễn ra'
                            : countdown.text}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Tầng 4: 2 Thẻ Liên kết nhanh */}
      {currentTeam.id ? (
        <section className="grid gap-4 md:grid-cols-2">
          <a
            href={currentTeam.githubRepoUrl}
            target="_blank"
            rel="noreferrer"
            data-tour="overview-github"
            className="group ui-lift flex items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-indigo-300"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400">
                GitHub repo
              </p>
              <p className="mt-1 truncate text-base font-bold text-slate-900 group-hover:text-indigo-700">
                {repoShortName}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Kho mã nguồn chính thức của đội {currentTeam.name}.
              </p>
            </div>
            <span className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-700">
              Mở liên kết
            </span>
          </a>

          <a
            href={currentTeam.discordInviteUrl}
            target="_blank"
            rel="noreferrer"
            data-tour="overview-discord"
            className="group ui-lift flex items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-indigo-300"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400">
                Discord
              </p>
              <p className="mt-1 truncate text-base font-bold text-slate-900 group-hover:text-indigo-700">
                Tham gia server
              </p>
              <p className="mt-1 truncate text-xs text-slate-500">
                Kênh họp & trao đổi nhanh của đội {currentTeam.name}.
              </p>
            </div>
            <span className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-700">
              Tham gia
            </span>
          </a>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href="/team"
            data-tour="overview-github"
            className="group ui-lift flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-xs hover:border-amber-300"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-amber-700">
                Chưa có đội
              </p>
              <p className="mt-1 truncate text-base font-bold text-slate-900 group-hover:text-indigo-700">
                Chọn đội để xin gia nhập
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Gửi yêu cầu vào một đội đang mở để Admin phê duyệt.
              </p>
            </div>
            <span className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white group-hover:bg-indigo-700">
              Vào trang Đội
            </span>
          </Link>

          <Link
            href="/calendar"
            data-tour="overview-discord"
            className="group ui-lift flex items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-indigo-300"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400">
                Lịch chương trình
              </p>
              <p className="mt-1 truncate text-base font-bold text-slate-900 group-hover:text-indigo-700">
                Xem lịch sự kiện chung
              </p>
              <p className="mt-1 truncate text-xs text-slate-500">
                Theo dõi các buổi workshop, coaching & mốc chung.
              </p>
            </div>
            <span className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-700">
              Xem lịch
            </span>
          </Link>
        </section>
      )}

      {/* Tầng 5: Khối ĐỘI CỦA TÔI (2 cột trong 1 khung lớn) */}
      <section data-tour="overview-my-team" className="relative pt-3">
        <span className="absolute top-0 left-5 z-10 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-semibold text-white shadow-xs">
          Đội của tôi
        </span>

        {!currentTeam.id ? (
          <div className="grid gap-6 rounded-2xl border border-amber-200 bg-white p-6 pt-8 shadow-xs lg:grid-cols-12">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 lg:col-span-5 lg:border-r lg:border-b-0 lg:pr-6 lg:pb-0">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-xl font-extrabold text-amber-700 ring-1 ring-amber-200">
                  {teamCodeBadge}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {currentTeam.name}
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold text-amber-700">
                    {currentTeam.projectName}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                    {currentTeam.description}
                  </p>
                </div>
              </div>
              <Link
                href="/team"
                className="inline-flex w-fit items-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Chọn đội để xin gia nhập
              </Link>
            </div>

            <div className="space-y-3 lg:col-span-7">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-400">
                  Thành viên trong nhóm (0)
                </h3>
                <Link
                  href="/team"
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Danh sách đội
                </Link>
              </div>
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-xs leading-relaxed text-slate-500">
                Tài khoản mới đăng nhập sẽ không bị tự động gán vào đội có sẵn. Sau khi Admin phê duyệt yêu cầu gia nhập hoặc xếp đội cho bạn, thành viên cùng nhóm sẽ xuất hiện tại đây.
              </div>
            </div>
          </div>
        ) : (
        <div className="grid gap-6 rounded-2xl border border-slate-200/90 bg-white p-6 pt-8 shadow-xs lg:grid-cols-12">
          {/* Cột trái: Thông tin đội */}
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 lg:col-span-5 lg:border-r lg:border-b-0 lg:pr-6 lg:pb-0">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-extrabold text-indigo-700 ring-1 ring-indigo-200">
                {teamCodeBadge}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold text-slate-900">
                  {currentTeam.name}
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-indigo-600">
                  {currentTeam.projectName}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  {currentTeam.description}
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-xl bg-slate-50 p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">
                  Mentor: {currentTeam.mentorName}
                </span>
                <span className="font-bold text-indigo-700">
                  {currentTeam.progress}% tiến độ
                </span>
              </div>
              <ProgressBar value={currentTeam.progress} />
            </div>
          </div>

          {/* Cột phải: Danh sách thành viên */}
          <div className="space-y-3 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400">
                Thành viên trong nhóm ({teamMembers.length})
              </h3>
              <Link
                href="/team"
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Quản lý đội
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {teamMembers.map((member) => {
                const submittedToday = standups.some(
                  (s) =>
                    s.userId === member.id &&
                    s.teamId === currentTeam.id &&
                    s.date === todayISO
                );

                return (
                  <div
                    key={member.id}
                    className="flex flex-col gap-2 py-3 first:pt-1 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        src={member.avatarUrl}
                        name={member.name}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {member.name}
                          </p>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              member.role === 'admin'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {ROLE_LABELS[member.role] ?? 'Thành viên'}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {member.skills.length > 0
                            ? member.skills.join(' · ')
                            : member.title}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 self-start rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:self-auto ${
                        submittedToday
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {submittedToday ? 'Đã nộp Standup' : 'Chưa nộp Standup'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}
      </section>
    </div>
  );
}
