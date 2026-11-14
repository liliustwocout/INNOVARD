'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { formatVietnameseDate } from '@/lib/date-utils';
import type { Announcement, QuickLink, ScheduleMilestone } from '@/types/innovard';

const CATEGORY_BADGE: Record<
  Announcement['category'],
  { label: string; className: string }
> = {
  deadline: { label: 'Deadline', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  meeting: { label: 'Lịch họp', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  tech: { label: 'Kỹ thuật', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  general: { label: 'Chung', className: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const PRIORITY_LABEL: Record<Announcement['priority'], string> = {
  urgent: 'Khẩn cấp',
  important: 'Quan trọng',
  normal: 'Bình thường',
};

const LINK_CATEGORY_LABEL: Record<string, string> = {
  repo: 'MÃ NGUỒN',
  chat: 'THẢO LUẬN',
  doc: 'TÀI LIỆU',
  design: 'THIẾT KẾ',
  other: 'LIÊN KẾT',
};

export default function HomePage() {
  const {
    isAdmin,
    currentUser,
    currentTeam,
    announcements,
    milestones,
    quickLinks,
    events,
    addAnnouncement,
    togglePinAnnouncement,
    deleteAnnouncement,
    addMilestone,
    deleteMilestone,
    addQuickLink,
    deleteQuickLink,
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<'all' | Announcement['category']>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showQuickLinkModal, setShowQuickLinkModal] = useState(false);

  // Announcement form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Announcement['category']>('general');
  const [priority, setPriority] = useState<Announcement['priority']>('normal');
  const [scope, setScope] = useState<'global' | 'team'>('team');
  const [isPinned, setIsPinned] = useState(false);

  // Milestone form state
  const [msPhase, setMsPhase] = useState('');
  const [msTitle, setMsTitle] = useState('');
  const [msDateRange, setMsDateRange] = useState('');
  const [msStatus, setMsStatus] = useState<ScheduleMilestone['status']>('upcoming');
  const [msScope, setMsScope] = useState<'global' | 'team'>('team');
  const [msDescription, setMsDescription] = useState('');

  // Quick link form state
  const [qlTitle, setQlTitle] = useState('');
  const [qlUrl, setQlUrl] = useState('');
  const [qlCategory, setQlCategory] = useState<QuickLink['category']>('doc');
  const [qlScope, setQlScope] = useState<'global' | 'team'>('team');
  const [qlDescription, setQlDescription] = useState('');

  const visibleAnnouncements = useMemo(() => {
    return announcements
      .filter((a) => a.teamId === null || (Boolean(currentTeam.id) && a.teamId === currentTeam.id))
      .filter((a) => categoryFilter === 'all' || a.category === categoryFilter)
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [announcements, currentTeam.id, categoryFilter]);

  const visibleMilestones = useMemo(() => {
    return milestones.filter(
      (m) => m.teamId === null || (Boolean(currentTeam.id) && m.teamId === currentTeam.id)
    );
  }, [milestones, currentTeam.id]);

  const visibleLinks = useMemo(() => {
    return quickLinks.filter(
      (l) => l.teamId === null || (Boolean(currentTeam.id) && l.teamId === currentTeam.id)
    );
  }, [quickLinks, currentTeam.id]);

  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => e.teamId === null || (Boolean(currentTeam.id) && e.teamId === currentTeam.id))
      .slice(0, 4);
  }, [events, currentTeam.id]);

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    addAnnouncement({
      teamId: isAdmin && scope === 'global' ? null : currentTeam.id,
      title: title.trim(),
      content: content.trim(),
      category,
      priority,
      isPinned,
    });
    setTitle('');
    setContent('');
    setCategory('general');
    setPriority('normal');
    setIsPinned(false);
    setShowNewModal(false);
  };

  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msPhase.trim() || !msTitle.trim() || !msDateRange.trim()) return;
    addMilestone({
      teamId: isAdmin && msScope === 'global' ? null : currentTeam.id,
      phase: msPhase.trim(),
      title: msTitle.trim(),
      dateRange: msDateRange.trim(),
      status: msStatus,
      description: msDescription.trim(),
    });
    setMsPhase('');
    setMsTitle('');
    setMsDateRange('');
    setMsStatus('upcoming');
    setMsScope('team');
    setMsDescription('');
    setShowMilestoneModal(false);
  };

  const handleCreateQuickLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qlTitle.trim() || !qlUrl.trim()) return;
    addQuickLink({
      teamId: isAdmin && qlScope === 'global' ? null : currentTeam.id,
      title: qlTitle.trim(),
      url: qlUrl.trim(),
      category: qlCategory,
      description: qlDescription.trim(),
    });
    setQlTitle('');
    setQlUrl('');
    setQlCategory('doc');
    setQlScope('team');
    setQlDescription('');
    setShowQuickLinkModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="rounded-3xl border border-indigo-200/80 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {currentUser && (
              <UserAvatar
                src={currentUser.avatarUrl}
                name={currentUser.name}
                size="lg"
              />
            )}
            <div>
              <span
                className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                  currentTeam.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'bg-amber-50 text-amber-800'
                }`}
              >
                {currentTeam.id ? `${currentTeam.name} · ${currentTeam.code}` : 'Chưa có đội'}
              </span>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Trang chủ INNOVARD
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Cập nhật thông báo mới nhất, theo dõi lịch trình giai đoạn và truy cập nhanh tài nguyên nhóm.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {currentTeam.id ? (
              <Link
                href="/project/submissions"
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 sm:text-sm"
              >
                Nộp Daily Standup
              </Link>
            ) : (
              <Link
                href="/team"
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 sm:text-sm"
              >
                Chọn đội để xin gia nhập
              </Link>
            )}
            <Link
              href="/overview"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:text-sm"
            >
              Xem Tổng quan
            </Link>
          </div>
        </div>
      </section>

      {!isAdmin && !currentTeam.id && (
        <section className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Bạn chưa thuộc đội nào
            </p>
            <p className="mt-0.5 text-xs text-slate-700">
              Tài khoản mới đăng nhập sẽ ở trạng thái Chưa có đội. Hãy chọn một đội ở trang Đội của tôi và gửi yêu cầu gia nhập để Admin phê duyệt.
            </p>
          </div>
          <Link
            href="/team"
            className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Chọn đội ngay
          </Link>
        </section>
      )}

      {/* Main 2-column grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Announcements Column */}
        <section className="space-y-4 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Thông báo</h2>
              <p className="text-xs text-slate-500">
                {currentTeam.id
                  ? `Tin tức chung toàn chương trình & riêng đội ${currentTeam.name}`
                  : 'Tin tức chung toàn chương trình'}
              </p>
            </div>

            {Boolean(isAdmin || currentTeam.id) && (
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
              >
                Đăng thông báo
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'all', label: 'Tất cả' },
                { id: 'deadline', label: 'Deadline' },
                { id: 'meeting', label: 'Lịch họp' },
                { id: 'tech', label: 'Kỹ thuật' },
                { id: 'general', label: 'Chung' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  categoryFilter === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Announcement Cards */}
          <div className="space-y-3">
            {visibleAnnouncements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Chưa có thông báo nào trong mục này.
              </div>
            ) : (
              visibleAnnouncements.map((ann) => {
                const badge = CATEGORY_BADGE[ann.category];
                return (
                  <article
                    key={ann.id}
                    className={`rounded-2xl border bg-white p-5 shadow-xs transition ${
                      ann.isPinned
                        ? 'border-indigo-200 ring-1 ring-indigo-100'
                        : 'border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
                        >
                          {badge.label} · {PRIORITY_LABEL[ann.priority]}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                          {ann.teamId ? currentTeam.name : 'Toàn chương trình'}
                        </span>
                        {ann.isPinned && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                            Đã ghim
                          </span>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {(isAdmin || ann.teamId !== null) && (
                          <button
                            type="button"
                            onClick={() => togglePinAnnouncement(ann.id)}
                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                              ann.isPinned
                                ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                          >
                            {ann.isPinned ? 'Bỏ ghim' : 'Ghim'}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => deleteAnnouncement(ann.id)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="mt-3 text-base font-bold text-slate-900">
                      {ann.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      {ann.content}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          src={ann.authorAvatar}
                          name={ann.authorName}
                          size="xs"
                        />
                        <span className="font-medium text-slate-700">
                          {ann.authorName}
                        </span>
                      </div>
                      <span>
                        {formatVietnameseDate(ann.createdAt.slice(0, 10))}
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Schedule & Quick Links */}
        <div className="space-y-6 lg:col-span-5">
          {/* Schedule / Roadmap */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Lịch trình dự án
                </h2>
                <p className="text-xs text-slate-500">
                  Lộ trình các giai đoạn & sự kiện
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(true)}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  Thêm giai đoạn
                </button>
                <Link
                  href="/calendar"
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Mở lịch chi tiết
                </Link>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {visibleMilestones.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center text-xs text-slate-500">
                  Chưa có mốc lịch trình nào. Bấm &ldquo;Thêm giai đoạn&rdquo; để khởi tạo lộ trình dự án.
                </div>
              ) : (
                visibleMilestones.map((ms) => {
                  const isDone = ms.status === 'completed';
                  const isActive = ms.status === 'active';
                  return (
                    <div
                      key={ms.id}
                      className={`rounded-xl border p-3.5 ${
                        isActive
                          ? 'border-indigo-200 bg-indigo-50/50'
                          : 'border-slate-100 bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                          {ms.phase} · {ms.dateRange}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isDone ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              Hoàn thành
                            </span>
                          ) : isActive ? (
                            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                              Đang diễn ra
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              Sắp tới
                            </span>
                          )}
                          {(isAdmin || ms.teamId !== null) && (
                            <button
                              type="button"
                              onClick={() => deleteMilestone(ms.id)}
                              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                      <h3 className="mt-1 text-sm font-semibold text-slate-900">
                        {ms.title}
                      </h3>
                      {ms.description && (
                        <p className="mt-1 text-xs text-slate-600">{ms.description}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Upcoming micro-schedule */}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Mốc gần nhất
              </p>
              <div className="mt-2 space-y-2">
                {upcomingEvents.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                    Chưa có sự kiện hoặc deadline sắp tới.
                  </p>
                ) : (
                  upcomingEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            ev.type === 'deadline'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-sky-100 text-sky-700'
                          }`}
                        >
                          {ev.type === 'deadline' ? 'Hạn' : 'Họp'}
                        </span>
                        <span className="truncate font-medium text-slate-800">
                          {ev.title}
                        </span>
                      </div>
                      <span className="shrink-0 font-semibold text-slate-500">
                        {formatVietnameseDate(ev.date)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Quick Links */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Liên kết nhanh
                </h2>
                <p className="text-xs text-slate-500">
                  Tài liệu, mã nguồn và kênh trao đổi quan trọng
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickLinkModal(true)}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                Thêm liên kết
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {visibleLinks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center text-xs text-slate-500">
                  Chưa có liên kết nhanh nào. Hãy thêm link GitHub, Figma, Google Drive hoặc Discord tại đây.
                </div>
              ) : (
                visibleLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 transition hover:border-indigo-300 hover:bg-indigo-50/40"
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {LINK_CATEGORY_LABEL[link.category] ?? 'LIÊN KẾT'}
                      </span>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900 hover:text-indigo-700">
                        {link.title}
                      </p>
                      {link.description && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {link.description}
                        </p>
                      )}
                    </a>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-700"
                      >
                        Mở
                      </a>
                      {(isAdmin || link.teamId !== null) && (
                        <button
                          type="button"
                          onClick={() => deleteQuickLink(link.id)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Modal create announcement */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Tạo thông báo mới
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tiêu đề thông báo *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Lịch review Sprint 3 vào tối thứ 6"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Nội dung chi tiết *
                </label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập nội dung thông báo cho các thành viên..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Phân loại
                  </label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as Announcement['category'])
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="general">Chung</option>
                    <option value="deadline">Deadline</option>
                    <option value="meeting">Lịch họp</option>
                    <option value="tech">Kỹ thuật</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Mức độ
                  </label>
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as Announcement['priority'])
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="normal">Bình thường</option>
                    <option value="important">Quan trọng</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Phạm vi
                  </label>
                  <select
                    value={isAdmin ? scope : 'team'}
                    onChange={(e) => setScope(e.target.value as 'global' | 'team')}
                    disabled={!isAdmin}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-600"
                  >
                    <option value="team">Đội {currentTeam.name}</option>
                    {isAdmin && <option value="global">Toàn chương trình</option>}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                Ghim thông báo này lên đầu bảng
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Đăng thông báo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal create milestone */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Thêm giai đoạn lịch trình
              </h3>
              <button
                type="button"
                onClick={() => setShowMilestoneModal(false)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreateMilestone} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Tên giai đoạn *
                  </label>
                  <input
                    type="text"
                    required
                    value={msPhase}
                    onChange={(e) => setMsPhase(e.target.value)}
                    placeholder="Ví dụ: Giai đoạn 1"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Khoảng thời gian *
                  </label>
                  <input
                    type="text"
                    required
                    value={msDateRange}
                    onChange={(e) => setMsDateRange(e.target.value)}
                    placeholder="Ví dụ: 15/11 - 30/11/2026"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tiêu đề mốc *
                </label>
                <input
                  type="text"
                  required
                  value={msTitle}
                  onChange={(e) => setMsTitle(e.target.value)}
                  placeholder="Ví dụ: Hoàn thiện MVP & Kiểm thử"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Trạng thái
                  </label>
                  <select
                    value={msStatus}
                    onChange={(e) =>
                      setMsStatus(e.target.value as ScheduleMilestone['status'])
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="upcoming">Sắp tới</option>
                    <option value="active">Đang diễn ra</option>
                    <option value="completed">Hoàn thành</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Phạm vi
                  </label>
                  <select
                    value={isAdmin ? msScope : 'team'}
                    onChange={(e) => setMsScope(e.target.value as 'global' | 'team')}
                    disabled={!isAdmin}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-600"
                  >
                    <option value="team">Đội {currentTeam.name}</option>
                    {isAdmin && <option value="global">Toàn chương trình</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Mô tả ngắn
                </label>
                <textarea
                  rows={3}
                  value={msDescription}
                  onChange={(e) => setMsDescription(e.target.value)}
                  placeholder="Các mục tiêu chính cần đạt trong giai đoạn này..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Lưu giai đoạn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal create quick link */}
      {showQuickLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Thêm liên kết nhanh
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickLinkModal(false)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreateQuickLink} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tên liên kết *
                </label>
                <input
                  type="text"
                  required
                  value={qlTitle}
                  onChange={(e) => setQlTitle(e.target.value)}
                  placeholder="Ví dụ: GitHub Repository hoặc Tài liệu Google Drive"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Đường dẫn (URL) *
                </label>
                <input
                  type="url"
                  required
                  value={qlUrl}
                  onChange={(e) => setQlUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Danh mục
                  </label>
                  <select
                    value={qlCategory}
                    onChange={(e) =>
                      setQlCategory(e.target.value as QuickLink['category'])
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="repo">Mã nguồn (Repo)</option>
                    <option value="chat">Thảo luận (Discord/Chat)</option>
                    <option value="doc">Tài liệu</option>
                    <option value="design">Thiết kế (Figma)</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Phạm vi
                  </label>
                  <select
                    value={isAdmin ? qlScope : 'team'}
                    onChange={(e) => setQlScope(e.target.value as 'global' | 'team')}
                    disabled={!isAdmin}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-600"
                  >
                    <option value="team">Đội {currentTeam.name}</option>
                    {isAdmin && <option value="global">Toàn chương trình</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Mô tả ngắn
                </label>
                <input
                  type="text"
                  value={qlDescription}
                  onChange={(e) => setQlDescription(e.target.value)}
                  placeholder="Ghi chú công dụng của đường dẫn..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickLinkModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Lưu liên kết
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
