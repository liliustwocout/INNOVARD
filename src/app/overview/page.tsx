'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { triggerOnboardingTour } from '@/components/onboarding/OnboardingTour';
import {
  formatLiveCountdown,
  formatVietnameseWeekdayDayMonth,
  getTodayISO,
} from '@/lib/date-utils';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Thành viên',
};

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

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayISO = getTodayISO();

  const teamMembers = useMemo(
    () => users.filter((u) => u.teamId === currentTeam.id),
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
    if (!currentUser) return 0;
    const myTasks = tasks.filter(
      (t) => t.userId === currentUser.id && t.teamId === currentTeam.id
    );
    if (myTasks.length === 0) return 0;
    return Math.round(
      myTasks.reduce((sum, t) => sum + t.progressPercent, 0) / myTasks.length
    );
  }, [tasks, currentUser, currentTeam.id]);

  const hasSubmittedStandupToday = useMemo(() => {
    if (!currentUser) return false;
    return standups.some(
      (s) =>
        s.userId === currentUser.id &&
        s.teamId === currentTeam.id &&
        s.date === todayISO
    );
  }, [standups, currentUser, currentTeam.id, todayISO]);

  // Danh sách Deadline sắp đến (gồm hạn Daily Standup hôm nay + các deadline sự kiện)
  const deadlineRows = useMemo(() => {
    const calendarDeadlines = events
      .filter(
        (ev) =>
          ev.type === 'deadline' &&
          (ev.teamId === null || ev.teamId === currentTeam.id)
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    const standupRow = {
      id: 'daily-standup-today',
      title: systemConfig.standupDeadlineLabel,
      subtitle: `Hạn daily standup · ${systemConfig.standupDeadlineTime} ${formatVietnameseWeekdayDayMonth(todayISO)}`,
      date: todayISO,
      time: systemConfig.standupDeadlineTime,
      completed: hasSubmittedStandupToday,
      completedText: 'Đã nộp',
      href: '/project/submissions',
    };

    const eventRows = calendarDeadlines.map((ev) => ({
      id: ev.id,
      title: ev.title,
      subtitle: `${ev.teamId ? currentTeam.name : 'Toàn chương trình'} · ${ev.time} ${formatVietnameseWeekdayDayMonth(ev.date)}`,
      date: ev.date,
      time: ev.time || '23:59',
      completed: false,
      completedText: 'Đã hoàn thành',
      href: '/calendar',
    }));

    return [standupRow, ...eventRows];
  }, [
    events,
    currentTeam.id,
    currentTeam.name,
    todayISO,
    hasSubmittedStandupToday,
    systemConfig.standupDeadlineLabel,
    systemConfig.standupDeadlineTime,
  ]);

  const teamCodeBadge = useMemo(() => {
    const match = currentTeam.code.match(/\d+/);
    return match ? match[0].padStart(2, '0') : currentTeam.code;
  }, [currentTeam.code]);

  const repoShortName = extractRepoShortName(currentTeam.githubRepoUrl);

  return (
    <div className="space-y-6">
      {/* Tầng 1: Header Chào mừng */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Chào{' '}
            <span className="italic uppercase text-indigo-600">
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
          className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-indigo-300"
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
          className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-indigo-300"
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
          className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-indigo-300"
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

      {/* Tầng 3: Deadline sắp đến (Full-width với đồng hồ đếm ngược thời gian thực) */}
      <section
        data-tour="overview-deadlines"
        className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            Deadline sắp đến
          </h2>
          <div className="flex items-center gap-3">
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
              Xem lịch sự kiện
            </Link>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {deadlineRows.map((row) => {
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
              <Link
                key={row.id}
                href={row.href}
                className="flex flex-col gap-2 py-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-2 sm:rounded-xl"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {row.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{row.subtitle}</p>
                </div>

                <div className="shrink-0 text-left sm:text-right">
                  {row.completed ? (
                    <span className="text-xs font-bold text-emerald-600">
                      {row.completedText}
                    </span>
                  ) : (
                    <span
                      className={`font-mono text-xs font-bold tabular-nums ${countdownColor}`}
                    >
                      {countdown.text}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Tầng 4: 2 Thẻ Liên kết nhanh (GITHUB REPO & DISCORD) */}
      <section className="grid gap-4 md:grid-cols-2">
        <a
          href={currentTeam.githubRepoUrl}
          target="_blank"
          rel="noreferrer"
          data-tour="overview-github"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-indigo-300"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              GITHUB REPO
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
          className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-indigo-300"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              DISCORD
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

      {/* Tầng 5: Khối ĐỘI CỦA TÔI (2 cột trong 1 khung lớn) */}
      <section data-tour="overview-my-team" className="relative pt-3">
        <span className="absolute top-0 left-5 z-10 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
          ĐỘI CỦA TÔI
        </span>

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
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-indigo-600"
                  style={{ width: `${currentTeam.progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Cột phải: Danh sách thành viên */}
          <div className="space-y-3 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
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
                          <p className="truncate text-sm font-bold uppercase text-slate-900">
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
      </section>
    </div>
  );
}
