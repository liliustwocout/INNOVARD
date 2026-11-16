'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  addDaysISO,
  formatVietnameseDate,
  getTodayISO,
  isStandupScheduledForDate,
  STANDUP_WEEKDAY_OPTIONS,
} from '@/lib/date-utils';
import type { ReportLink, ReportLinkType } from '@/types/innovard';
import { Toast } from '@/components/ui/Toast';

const LINK_TYPE_META: Record<
  ReportLinkType,
  { label: string; badge: string }
> = {
  github: { label: 'GitHub', badge: 'bg-slate-900 text-white' },
  demo: { label: 'Demo', badge: 'bg-indigo-600 text-white' },
  doc: { label: 'Tài liệu', badge: 'bg-emerald-600 text-white' },
  other: { label: 'Khác', badge: 'bg-slate-600 text-white' },
};

export function SubmissionsView() {
  const {
    isAdmin,
    currentUser,
    currentTeam,
    teams,
    users,
    standups,
    teamReports,
    systemConfig,
    updateSystemConfig,
    addStandup,
    updateStandup,
    deleteStandup,
    addTeamReport,
    updateTeamReport,
    deleteTeamReport,
  } = useApp();

  const [section, setSection] = useState<'standup' | 'meeting'>('standup');
  const todayISO = getTodayISO();

  // Daily Standup state
  const [standupDate, setStandupDate] = useState(todayISO);
  const [yesterday, setYesterday] = useState('');
  const [todayPlan, setTodayPlan] = useState('');
  const [standupBlockers, setStandupBlockers] = useState('');
  const [historyScope, setHistoryScope] = useState<'mine' | 'team' | 'all_teams'>(
    isAdmin ? 'all_teams' : currentTeam.id ? 'team' : 'mine'
  );
  const [reportScope, setReportScope] = useState<'team' | 'all_teams'>(
    isAdmin ? 'all_teams' : 'team'
  );
  const [selectedHistoryUserId, setSelectedHistoryUserId] = useState<string>('all');
  const [standupSuccess, setStandupSuccess] = useState(false);

  // Team Meeting Report state
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(todayISO);
  const [doneText, setDoneText] = useState('');
  const [inProgressText, setInProgressText] = useState('');
  const [meetingBlockers, setMeetingBlockers] = useState('');
  const [questions, setQuestions] = useState('');
  const [links, setLinks] = useState<ReportLink[]>([
    { label: '', url: '', type: 'github' },
  ]);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Inline edit & delete states
  const [editingStandupId, setEditingStandupId] = useState<string | null>(null);
  const [editYesterday, setEditYesterday] = useState('');
  const [editTodayPlan, setEditTodayPlan] = useState('');
  const [editStandupBlockers, setEditStandupBlockers] = useState('');
  const [confirmDeleteStandupId, setConfirmDeleteStandupId] = useState<string | null>(null);

  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editReportTitle, setEditReportTitle] = useState('');
  const [editReportDate, setEditReportDate] = useState('');
  const [editReportDone, setEditReportDone] = useState('');
  const [editReportInProgress, setEditReportInProgress] = useState('');
  const [editReportBlockers, setEditReportBlockers] = useState('');
  const [editReportQuestions, setEditReportQuestions] = useState('');
  const [confirmDeleteReportId, setConfirmDeleteReportId] = useState<string | null>(null);

  // Quick Standup Config state (Admin)
  const [showQuickConfig, setShowQuickConfig] = useState(false);
  const [draftStartTime, setDraftStartTime] = useState(systemConfig.standupStartTime);
  const [draftDeadlineTime, setDraftDeadlineTime] = useState(systemConfig.standupDeadlineTime);
  const [draftStartDate, setDraftStartDate] = useState(systemConfig.standupStartDate);
  const [draftEndDate, setDraftEndDate] = useState(systemConfig.standupEndDate);
  const [draftDaysOfWeek, setDraftDaysOfWeek] = useState<number[]>(
    systemConfig.standupDaysOfWeek
  );
  const [draftAllowLate, setDraftAllowLate] = useState(systemConfig.allowLateStandup);
  const [draftAllowBackdate, setDraftAllowBackdate] = useState(systemConfig.allowBackdateStandup);
  const [quickConfigSaved, setQuickConfigSaved] = useState(false);

  const [nowHHMM, setNowHHMM] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setNowHHMM(`${hh}:${mm}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      setHistoryScope('all_teams');
      setReportScope('all_teams');
    } else {
      setHistoryScope(currentTeam.id ? 'team' : 'mine');
      setReportScope('team');
      setSelectedHistoryUserId('all');
    }
  }, [isAdmin, currentTeam.id]);

  useEffect(() => {
    setDraftStartTime(systemConfig.standupStartTime);
    setDraftDeadlineTime(systemConfig.standupDeadlineTime);
    setDraftStartDate(systemConfig.standupStartDate);
    setDraftEndDate(systemConfig.standupEndDate);
    setDraftDaysOfWeek(systemConfig.standupDaysOfWeek);
    setDraftAllowLate(systemConfig.allowLateStandup);
    setDraftAllowBackdate(systemConfig.allowBackdateStandup);
  }, [
    systemConfig.standupStartTime,
    systemConfig.standupDeadlineTime,
    systemConfig.standupStartDate,
    systemConfig.standupEndDate,
    systemConfig.standupDaysOfWeek,
    systemConfig.allowLateStandup,
    systemConfig.allowBackdateStandup,
  ]);

  const effectiveStandupDate =
    !isAdmin && !systemConfig.allowBackdateStandup ? todayISO : standupDate;
  const isScheduledOnSelectedDate = isStandupScheduledForDate(
    effectiveStandupDate,
    systemConfig
  );
  const isFutureStandupDate = effectiveStandupDate > todayISO;
  const isBeforeStartTimeToday = Boolean(
    nowHHMM && nowHHMM < systemConfig.standupStartTime
  );
  const isPastDeadlineToday = Boolean(
    nowHHMM && nowHHMM > systemConfig.standupDeadlineTime
  );
  const isStandupLockedForMember =
    !isAdmin &&
    (!isScheduledOnSelectedDate ||
      isFutureStandupDate ||
      (effectiveStandupDate === todayISO &&
        (isBeforeStartTimeToday ||
          (!systemConfig.allowLateStandup && isPastDeadlineToday))));

  const isUnassignedMember = !isAdmin && !currentTeam.id;
  const hasSubmittedToday = useMemo(() => {
    if (!currentUser || !currentTeam.id) return false;
    return standups.some(
      (s) =>
        s.userId === currentUser.id &&
        s.teamId === currentTeam.id &&
        s.date === todayISO
    );
  }, [standups, currentUser, currentTeam.id, todayISO]);

  const teamById = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams]
  );

  const historyFilterUsers = useMemo(
    () =>
      isAdmin
        ? users
        : currentTeam.id
          ? users.filter((u) => u.teamId === currentTeam.id)
          : currentUser
            ? [currentUser]
            : [],
    [isAdmin, users, currentTeam.id, currentUser]
  );

  const filteredStandups = useMemo(() => {
    if (!currentUser) return [];
    return standups
      .filter((s) => {
        if (historyScope === 'mine') {
          return s.userId === currentUser.id;
        }
        if (historyScope === 'team') {
          return Boolean(currentTeam.id) && s.teamId === currentTeam.id;
        }
        return isAdmin
          ? true
          : Boolean(currentTeam.id)
            ? s.teamId === currentTeam.id
            : s.userId === currentUser.id;
      })
      .filter((s) =>
        selectedHistoryUserId === 'all' ? true : s.userId === selectedHistoryUserId
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [
    standups,
    currentTeam.id,
    historyScope,
    selectedHistoryUserId,
    currentUser,
    isAdmin,
  ]);

  const filteredReports = useMemo(() => {
    return teamReports
      .filter((r) =>
        reportScope === 'all_teams' && isAdmin
          ? true
          : Boolean(currentTeam.id) && r.teamId === currentTeam.id
      )
      .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
  }, [teamReports, currentTeam.id, reportScope, isAdmin]);

  const handleSaveStandupEdit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!editYesterday.trim() || !editTodayPlan.trim()) return;
    updateStandup(id, {
      yesterday: editYesterday.trim(),
      today: editTodayPlan.trim(),
      blockers: editStandupBlockers.trim(),
    });
    setEditingStandupId(null);
  };

  const handleSaveReportEdit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (
      !editReportTitle.trim() ||
      !editReportDone.trim() ||
      !editReportInProgress.trim()
    ) {
      return;
    }
    updateTeamReport(id, {
      title: editReportTitle.trim(),
      meetingDate: editReportDate || todayISO,
      done: editReportDone.trim(),
      inProgress: editReportInProgress.trim(),
      blockers: editReportBlockers.trim(),
      questions: editReportQuestions.trim(),
    });
    setEditingReportId(null);
  };

  const handleStandupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStandupLockedForMember) return;
    if (!yesterday.trim() || !todayPlan.trim()) return;
    addStandup({
      date: effectiveStandupDate || todayISO,
      yesterday,
      today: todayPlan,
      blockers: standupBlockers,
    });
    setYesterday('');
    setTodayPlan('');
    setStandupBlockers('');
    setStandupSuccess(true);
    setTimeout(() => setStandupSuccess(false), 3500);
  };

  const handleAddLinkRow = () => {
    setLinks((prev) => [...prev, { label: '', url: '', type: 'doc' }]);
  };

  const handleRemoveLinkRow = (idx: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLinkChange = (
    idx: number,
    field: keyof ReportLink,
    value: string
  ) => {
    setLinks((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleMeetingReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim() || !doneText.trim() || !inProgressText.trim()) {
      return;
    }
    const cleanLinks = links
      .filter((l) => l.url.trim())
      .map((l) => ({
        label: l.label.trim() || LINK_TYPE_META[l.type].label,
        url: l.url.trim(),
        type: l.type,
      }));

    addTeamReport({
      teamId: currentTeam.id,
      title: meetingTitle.trim(),
      meetingDate: meetingDate || todayISO,
      done: doneText.trim(),
      inProgress: inProgressText.trim(),
      blockers: meetingBlockers.trim(),
      links: cleanLinks,
      questions: questions.trim(),
    });

    setMeetingTitle('');
    setDoneText('');
    setInProgressText('');
    setMeetingBlockers('');
    setQuestions('');
    setLinks([{ label: '', url: '', type: 'github' }]);
    setReportSuccess(true);
    setTimeout(() => setReportSuccess(false), 3500);
  };

  return (
    <div className="space-y-6">
      {isUnassignedMember && (
        <section className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold text-amber-800">
              Bạn chưa tham gia đội nào
            </p>
            <p className="mt-0.5 text-xs text-slate-700">
              Hãy chọn đội và gửi yêu cầu gia nhập tại trang Đội của tôi để mở khóa nộp Daily Standup và Báo cáo họp nhóm.
            </p>
          </div>
          <Link
            href="/team"
            className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Chọn đội để xin gia nhập
          </Link>
        </section>
      )}
      {/* Mode Switcher: Daily Standup vs Họp nhóm */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setSection('standup')}
          className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
            section === 'standup'
              ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div>
            <p className="text-sm font-bold text-slate-900">Daily Standup</p>
            <p className="text-xs text-slate-500">
              Hôm qua · Hôm nay · Đang vướng & Lịch sử nộp
            </p>
          </div>
          {hasSubmittedToday ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              Đã nộp hôm nay
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
              Chưa nộp
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSection('meeting')}
          className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
            section === 'meeting'
              ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div>
            <p className="text-sm font-bold text-slate-900">
              Họp nhóm (Report nhóm)
            </p>
            <p className="text-xs text-slate-500">
              Đã làm · Đang làm · Đang vướng · Links · Câu hỏi
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
            {filteredReports.length} báo cáo
          </span>
        </button>
      </div>

      {/* SECTION 1: DAILY STANDUP */}
      {section === 'standup' && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Nộp Daily Standup hàng ngày
                </h2>
                <p className="text-xs text-slate-500">
                  {currentTeam.id
                    ? `Cập nhật nhanh công việc mỗi ngày để cả đội ${currentTeam.name} nắm bắt tiến độ.`
                    : 'Cập nhật nhanh công việc mỗi ngày sau khi bạn gia nhập đội.'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                    Khung giờ nộp: {systemConfig.standupStartTime} – {systemConfig.standupDeadlineTime}
                  </span>
                  {systemConfig.standupStartDate && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                      Lịch bắt đầu từ: {formatVietnameseDate(systemConfig.standupStartDate)}
                    </span>
                  )}
                  {!isScheduledOnSelectedDate ? (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                      {effectiveStandupDate === todayISO
                        ? 'Hôm nay chưa có lịch Standup'
                        : 'Ngày này không có lịch Standup'}
                    </span>
                  ) : isFutureStandupDate ? (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                      Chưa tới ngày nộp
                    </span>
                  ) : nowHHMM ? (
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        isBeforeStartTimeToday || isPastDeadlineToday
                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {isBeforeStartTimeToday
                        ? `Chưa tới giờ mở nộp (${systemConfig.standupStartTime})`
                        : isPastDeadlineToday
                        ? 'Đã quá giờ hạn hôm nay'
                        : 'Đang trong khung giờ nộp'}
                    </span>
                  ) : null}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuickConfig((prev) => !prev);
                        setQuickConfigSaved(false);
                      }}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      {showQuickConfig
                        ? 'Đóng cấu hình nhanh'
                        : 'Chỉnh lịch & giờ Standup'}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <input
                  type="date"
                  value={effectiveStandupDate}
                  disabled={!isAdmin && !systemConfig.allowBackdateStandup}
                  onChange={(e) => setStandupDate(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
                {!isAdmin && !systemConfig.allowBackdateStandup && (
                  <span className="text-[10px] text-slate-400">
                    Admin đang khóa chọn ngày khác hôm nay
                  </span>
                )}
              </div>
            </div>

            {isAdmin && showQuickConfig && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateSystemConfig({
                    standupStartTime: draftStartTime,
                    standupDeadlineTime: draftDeadlineTime,
                    standupStartDate: draftStartDate,
                    standupEndDate: draftEndDate,
                    standupDaysOfWeek: draftDaysOfWeek,
                    allowLateStandup: draftAllowLate,
                    allowBackdateStandup: draftAllowBackdate,
                  });
                  setQuickConfigSaved(true);
                  setTimeout(() => setQuickConfigSaved(false), 3000);
                }}
                className="mt-4 space-y-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Nộp từ giờ
                    </label>
                    <input
                      type="time"
                      required
                      value={draftStartTime}
                      onChange={(e) => setDraftStartTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Đến giờ (Hạn chót)
                    </label>
                    <input
                      type="time"
                      required
                      value={draftDeadlineTime}
                      onChange={(e) => setDraftDeadlineTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Bắt đầu từ ngày
                    </label>
                    <input
                      type="date"
                      value={draftStartDate}
                      onChange={(e) => setDraftStartDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                    />
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setDraftStartDate(todayISO)}
                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Hôm nay
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftStartDate(addDaysISO(todayISO, 1))}
                        className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        Ngày mai
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftStartDate('')}
                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-100"
                      >
                        Bỏ giới hạn
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Kết thúc ngày (tùy chọn)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={draftEndDate}
                        onChange={(e) => setDraftEndDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                      />
                      {draftEndDate && (
                        <button
                          type="button"
                          onClick={() => setDraftEndDate('')}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Các ngày trong tuần có Standup
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {STANDUP_WEEKDAY_OPTIONS.map((opt) => {
                      const active = draftDaysOfWeek.includes(opt.day);
                      return (
                        <button
                          key={opt.day}
                          type="button"
                          onClick={() =>
                            setDraftDaysOfWeek((prev) =>
                              prev.includes(opt.day)
                                ? prev.length > 1
                                  ? prev.filter((d) => d !== opt.day)
                                  : prev
                                : [...prev, opt.day]
                            )
                          }
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                            active
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {opt.short}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-indigo-200/70 pt-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={draftAllowLate}
                        onChange={(e) => setDraftAllowLate(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      Cho phép nộp sau giờ hạn
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={draftAllowBackdate}
                        onChange={(e) => setDraftAllowBackdate(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      Cho phép chọn lại ngày nộp
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    {quickConfigSaved && (
                      <span className="text-xs font-semibold text-emerald-700">
                        Đã lưu cấu hình
                      </span>
                    )}
                    <button
                      type="submit"
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      Lưu cấu hình
                    </button>
                  </div>
                </div>
              </form>
            )}

            {isStandupLockedForMember && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                {!isScheduledOnSelectedDate
                  ? systemConfig.standupStartDate &&
                    effectiveStandupDate < systemConfig.standupStartDate
                    ? `Lịch Daily Standup chỉ bắt đầu áp dụng từ ngày ${formatVietnameseDate(systemConfig.standupStartDate)}.`
                    : `Ngày ${formatVietnameseDate(effectiveStandupDate)} hiện không nằm trong lịch nộp Daily Standup.`
                  : isFutureStandupDate
                  ? `Chưa tới ngày nộp Daily Standup (${formatVietnameseDate(effectiveStandupDate)}).`
                  : isBeforeStartTimeToday
                  ? `Chưa tới giờ mở nộp Daily Standup hôm nay. Khung giờ cho phép: ${systemConfig.standupStartTime} – ${systemConfig.standupDeadlineTime}.`
                  : `Đã quá khung giờ nộp Daily Standup hôm nay (${systemConfig.standupStartTime} – ${systemConfig.standupDeadlineTime}). Hệ thống hiện đang khóa nộp trễ hạn.`}
              </div>
            )}

            {standupSuccess && (
              <Toast message={'Đã gửi Daily Standup thành công và lưu vào lịch sử nộp!'} />
            )}

            <form onSubmit={handleStandupSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    1. Hôm qua làm gì? *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={yesterday}
                    onChange={(e) => setYesterday(e.target.value)}
                    placeholder="Liệt kê những đầu việc bạn đã hoàn thành hôm qua..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-indigo-600">
                    2. Hôm nay làm gì? *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={todayPlan}
                    onChange={(e) => setTodayPlan(e.target.value)}
                    placeholder="Mục tiêu công việc bạn sẽ tập trung thực hiện hôm nay..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-amber-700">
                  3. Đang vướng (nếu có)
                </label>
                <textarea
                  rows={2}
                  value={standupBlockers}
                  onChange={(e) => setStandupBlockers(e.target.value)}
                  placeholder="Khó khăn kỹ thuật, cần hỗ trợ API/thiết kế hoặc để trống nếu thuận lợi..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isStandupLockedForMember || isUnassignedMember}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                >
                  Gửi Daily Standup
                </button>
              </div>
            </form>
          </section>

          {/* Lịch sử nộp Daily Standup */}
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Lịch sử nộp Daily Standup
                </h3>
                <p className="text-xs text-slate-500">
                  {isAdmin
                    ? 'Theo dõi lại các báo cáo hàng ngày đã gửi của toàn bộ các đội'
                    : currentTeam.id
                      ? `Xem lịch sử báo cáo Daily Standup của bạn và cả đội ${currentTeam.name}`
                      : 'Theo dõi lịch sử báo cáo Daily Standup của bạn'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryScope('mine');
                      setSelectedHistoryUserId('all');
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      historyScope === 'mine'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bài nộp của tôi
                  </button>
                  {(isAdmin || Boolean(currentTeam.id)) && (
                    <button
                      type="button"
                      onClick={() => setHistoryScope('team')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        historyScope === 'team'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {currentTeam.id ? `Cả đội (${currentTeam.name})` : 'Cả đội'}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setHistoryScope('all_teams')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        historyScope === 'all_teams'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tất cả các đội
                    </button>
                  )}
                </div>

                {(isAdmin || historyFilterUsers.length > 1) && (
                  <select
                    value={selectedHistoryUserId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedHistoryUserId(val);
                      if (val !== 'all' && historyScope === 'mine') {
                        setHistoryScope(isAdmin ? 'all_teams' : 'team');
                      }
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
                  >
                    <option value="all">
                      {isAdmin
                        ? `Tất cả thành viên (${historyFilterUsers.length})`
                        : `Cả đội (${historyFilterUsers.length} thành viên)`}
                    </option>
                    {historyFilterUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {filteredStandups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  Chưa có bài nộp Daily Standup nào trong bộ lọc hiện tại.
                </div>
              ) : (
                filteredStandups.map((item) => {
                  const canManage = isAdmin || item.userId === currentUser?.id;
                  const itemTeam = teamById.get(item.teamId);
                  const isEditing = editingStandupId === item.id;

                  return (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            src={item.userAvatar}
                            name={item.userName}
                            size="sm"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-slate-900">
                                {item.userName}
                              </p>
                              {item.userId === currentUser?.id && (
                                <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                                  Của tôi
                                </span>
                              )}
                              {(isAdmin || historyScope === 'team') && itemTeam && (
                                <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                  {itemTeam.name}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Ngày Standup: {formatVietnameseDate(item.date)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                            {formatVietnameseDate(item.date)}
                          </span>
                          {canManage && !isEditing && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStandupId(item.id);
                                  setEditYesterday(item.yesterday);
                                  setEditTodayPlan(item.today);
                                  setEditStandupBlockers(item.blockers ?? '');
                                  setConfirmDeleteStandupId(null);
                                }}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                Sửa
                              </button>
                              {confirmDeleteStandupId === item.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteStandup(item.id);
                                      setConfirmDeleteStandupId(null);
                                    }}
                                    className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-rose-700"
                                  >
                                    Xác nhận xóa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteStandupId(null)}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteStandupId(item.id)}
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
                                >
                                  Xóa
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <form
                          onSubmit={(e) => handleSaveStandupEdit(e, item.id)}
                          className="mt-3 space-y-3 rounded-xl border border-indigo-200 bg-white p-3.5"
                        >
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                Hôm qua làm gì
                              </label>
                              <textarea
                                required
                                rows={3}
                                value={editYesterday}
                                onChange={(e) => setEditYesterday(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-indigo-600">
                                Hôm nay làm gì
                              </label>
                              <textarea
                                required
                                rows={3}
                                value={editTodayPlan}
                                onChange={(e) => setEditTodayPlan(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-amber-700">
                              Đang vướng (tùy chọn)
                            </label>
                            <textarea
                              rows={2}
                              value={editStandupBlockers}
                              onChange={(e) => setEditStandupBlockers(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingStandupId(null)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Hủy
                            </button>
                            <button
                              type="submit"
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                            >
                              Lưu thay đổi
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl bg-white p-3 text-xs leading-relaxed text-slate-700">
                              <p className="mb-1 font-semibold text-slate-400">
                                Hôm qua làm gì
                              </p>
                              <p className="whitespace-pre-line">{item.yesterday}</p>
                            </div>
                            <div className="rounded-xl bg-white p-3 text-xs leading-relaxed text-slate-700">
                              <p className="mb-1 font-semibold text-indigo-500">
                                Hôm nay làm gì
                              </p>
                              <p className="whitespace-pre-line">{item.today}</p>
                            </div>
                          </div>

                          {item.blockers && (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                              <span className="font-bold">Đang vướng: </span>
                              <span className="whitespace-pre-line">{item.blockers}</span>
                            </div>
                          )}
                        </>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}

      {/* SECTION 2: HỌP NHÓM (TEAM MEETING REPORT) */}
      {section === 'meeting' && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Nộp Báo cáo Họp nhóm (Team Meeting Report)
                </h2>
                <p className="text-xs text-slate-500">
                  {currentTeam.id
                    ? `Tổng hợp tiến độ nhóm ${currentTeam.name}, đính kèm link GitHub, Demo, Tài liệu và câu hỏi gửi Mentor.`
                    : 'Tổng hợp tiến độ nhóm, đính kèm link GitHub, Demo, Tài liệu và câu hỏi gửi Mentor sau khi bạn tham gia đội.'}
                </p>
              </div>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Hạn định kỳ: {systemConfig.weeklyReportDeadlineLabel}
              </span>
            </div>

            {reportSuccess && (
              <Toast message={'Đã lưu báo cáo họp nhóm thành công!'} />
            )}

            <form onSubmit={handleMeetingReportSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Tiêu đề buổi họp / Tuần báo cáo *
                  </label>
                  <input
                    type="text"
                    required
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="Ví dụ: Báo cáo Họp nhóm Tuần 7 — Kiểm thử & Hoàn thiện"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Ngày họp nhóm
                  </label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-emerald-700">
                    Đã làm *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={doneText}
                    onChange={(e) => setDoneText(e.target.value)}
                    placeholder="Những hạng mục nhóm đã hoàn thành..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-indigo-600">
                    Đang làm *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={inProgressText}
                    onChange={(e) => setInProgressText(e.target.value)}
                    placeholder="Các đầu việc đang triển khai tiếp theo..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-amber-700">
                  Đang vướng (nếu có)
                </label>
                <textarea
                  rows={2}
                  value={meetingBlockers}
                  onChange={(e) => setMeetingBlockers(e.target.value)}
                  placeholder="Những trở ngại chung của nhóm cần tháo gỡ..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              {/* Dynamic Links Builder */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      Link đính kèm (GitHub, Demo, Tài liệu liên quan)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Thêm một hoặc nhiều liên kết minh chứng cho buổi họp nhóm
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLinkRow}
                    className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                  >
                    Thêm link
                  </button>
                </div>

                <div className="mt-3 space-y-2.5">
                  {links.map((link, idx) => (
                    <div
                      key={idx}
                      className="grid gap-2 sm:grid-cols-12 sm:items-center"
                    >
                      <select
                        value={link.type}
                        onChange={(e) =>
                          handleLinkChange(idx, 'type', e.target.value)
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none sm:col-span-3"
                      >
                        <option value="github">GitHub</option>
                        <option value="demo">Demo</option>
                        <option value="doc">Tài liệu</option>
                        <option value="other">Khác</option>
                      </select>
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) =>
                          handleLinkChange(idx, 'label', e.target.value)
                        }
                        placeholder="Tên hiển thị (VD: PR #20)"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 sm:col-span-4"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) =>
                          handleLinkChange(idx, 'url', e.target.value)
                        }
                        placeholder="https://..."
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 sm:col-span-4"
                      />
                      <div className="flex justify-end sm:col-span-1">
                        {links.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLinkRow(idx)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-violet-700">
                  Câu hỏi thắc mắc
                </label>
                <textarea
                  rows={2}
                  value={questions}
                  onChange={(e) => setQuestions(e.target.value)}
                  placeholder="Câu hỏi nhóm muốn trao đổi thêm với Mentor hoặc Ban điều hành..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUnassignedMember}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                >
                  Lưu Báo cáo Họp nhóm
                </button>
              </div>
            </form>
          </section>

          {/* Team Meeting Reports History */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900">
                Lịch sử Báo cáo Họp nhóm ({filteredReports.length})
              </h3>
              {isAdmin && (
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setReportScope('team')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      reportScope === 'team'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Đội {currentTeam.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportScope('all_teams')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      reportScope === 'all_teams'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả các đội
                  </button>
                </div>
              )}
            </div>

            {filteredReports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                {reportScope === 'all_teams' && isAdmin
                  ? 'Chưa có báo cáo họp nhóm nào trong hệ thống.'
                  : currentTeam.id
                  ? `Đội ${currentTeam.name} chưa có báo cáo họp nhóm nào.`
                  : 'Chưa có báo cáo họp nhóm nào.'}
              </div>
            ) : (
              filteredReports.map((rep) => {
                const canManage = isAdmin || rep.authorId === currentUser?.id;
                const repTeam = teamById.get(rep.teamId);
                const isEditing = editingReportId === rep.id;

                return (
                  <article
                    key={rep.id}
                    className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-block rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-semibold text-indigo-700">
                            Ngày họp: {formatVietnameseDate(rep.meetingDate)}
                          </span>
                          {isAdmin && reportScope === 'all_teams' && repTeam && (
                            <span className="inline-block rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                              {repTeam.name} ({repTeam.code})
                            </span>
                          )}
                        </div>
                        <h4 className="mt-2 text-lg font-bold text-slate-900">
                          {rep.title}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <UserAvatar
                            src={rep.authorAvatar}
                            name={rep.authorName}
                            size="sm"
                          />
                          <div>
                            <p className="font-semibold text-slate-800">
                              {rep.authorName}
                            </p>
                            <p className="text-[11px]">Người tổng hợp</p>
                          </div>
                        </div>

                        {canManage && !isEditing && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingReportId(rep.id);
                                setEditReportTitle(rep.title);
                                setEditReportDate(rep.meetingDate);
                                setEditReportDone(rep.done);
                                setEditReportInProgress(rep.inProgress);
                                setEditReportBlockers(rep.blockers ?? '');
                                setEditReportQuestions(rep.questions ?? '');
                                setConfirmDeleteReportId(null);
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Sửa
                            </button>
                            {confirmDeleteReportId === rep.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteTeamReport(rep.id);
                                    setConfirmDeleteReportId(null);
                                  }}
                                  className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-rose-700"
                                >
                                  Xác nhận xóa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteReportId(null)}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteReportId(rep.id)}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                              >
                                Xóa
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <form
                        onSubmit={(e) => handleSaveReportEdit(e, rep.id)}
                        className="mt-4 space-y-3 rounded-2xl border border-indigo-200 bg-slate-50/70 p-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              Tiêu đề buổi họp
                            </label>
                            <input
                              type="text"
                              required
                              value={editReportTitle}
                              onChange={(e) => setEditReportTitle(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              Ngày họp
                            </label>
                            <input
                              type="date"
                              required
                              value={editReportDate}
                              onChange={(e) => setEditReportDate(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-emerald-700">
                              Đã làm
                            </label>
                            <textarea
                              required
                              rows={3}
                              value={editReportDone}
                              onChange={(e) => setEditReportDone(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-indigo-700">
                              Đang làm
                            </label>
                            <textarea
                              required
                              rows={3}
                              value={editReportInProgress}
                              onChange={(e) => setEditReportInProgress(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-amber-800">
                              Đang vướng (tùy chọn)
                            </label>
                            <textarea
                              rows={2}
                              value={editReportBlockers}
                              onChange={(e) => setEditReportBlockers(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-violet-800">
                              Câu hỏi thắc mắc (tùy chọn)
                            </label>
                            <textarea
                              rows={2}
                              value={editReportQuestions}
                              onChange={(e) => setEditReportQuestions(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingReportId(null)}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            Lưu báo cáo
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl bg-emerald-50/60 p-4">
                            <p className="text-xs font-semibold text-emerald-700">
                              Đã làm
                            </p>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                              {rep.done}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-indigo-50/60 p-4">
                            <p className="text-xs font-semibold text-indigo-700">
                              Đang làm
                            </p>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                              {rep.inProgress}
                            </p>
                          </div>
                        </div>

                        {rep.blockers && (
                          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
                            <span className="font-bold">Đang vướng: </span>
                            {rep.blockers}
                          </div>
                        )}

                        {rep.links.length > 0 && (
                          <div className="mt-4">
                            <p className="mb-2 text-xs font-semibold text-slate-500">
                              Liên kết đính kèm
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {rep.links.map((lk, i) => (
                                <a
                                  key={i}
                                  href={lk.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50"
                                >
                                  <span
                                    className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                                      LINK_TYPE_META[lk.type].badge
                                    }`}
                                  >
                                    {LINK_TYPE_META[lk.type].label}
                                  </span>
                                  <span>{lk.label}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {rep.questions && (
                          <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-3.5 text-sm text-violet-950">
                            <span className="font-bold">Câu hỏi thắc mắc: </span>
                            {rep.questions}
                          </div>
                        )}
                      </>
                    )}
                  </article>
                );
              })
            )}
          </section>
        </div>
      )}
    </div>
  );
}
