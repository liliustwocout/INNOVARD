'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { getTodayISO } from '@/lib/date-utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  OnboardingTour,
  triggerOnboardingTour,
} from '@/components/onboarding/OnboardingTour';

interface NavEntry {
  href: string;
  label: string;
  badgeCount?: number;
}

interface NavGroup {
  groupLabel: string;
  items: NavEntry[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Thành viên',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isHydrated,
    isSupabaseEnabled,
    isAdmin,
    currentUser,
    teams,
    currentTeamId,
    currentTeam,
    setCurrentTeamId,
    events,
    joinRequests,
    activityLogs,
    logout,
  } = useApp();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isLoginRoute = pathname === '/login';

  useEffect(() => {
    if (!isHydrated) return;
    if (!currentUser && !isLoginRoute) {
      router.replace('/login');
    }
  }, [isHydrated, currentUser, isLoginRoute, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Press '/' to focus quick page search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT';
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const todayISO = getTodayISO();

  const upcomingEventsCount = useMemo(() => {
    return events.filter(
      (ev) => ev.teamId === null || ev.teamId === currentTeam.id
    ).length;
  }, [events, currentTeam.id]);

  const adminBadgeCount = useMemo(() => {
    const todaySubmissions = activityLogs.filter(
      (l) =>
        (l.type === 'standup' || l.type === 'report' || l.type === 'task') &&
        l.createdAt.slice(0, 10) === todayISO
    ).length;
    return joinRequests.length + todaySubmissions;
  }, [activityLogs, joinRequests.length, todayISO]);

  const navGroups: NavGroup[] = useMemo(() => {
    const base: NavGroup[] = [
      {
        groupLabel: 'TÔI',
        items: [
          { href: '/overview', label: 'Trang tổng quan' },
          { href: '/', label: 'Trang chủ' },
          { href: '/profile', label: 'Hồ sơ của tôi' },
        ],
      },
      {
        groupLabel: 'ĐỘI CỦA TÔI',
        items: [{ href: '/team', label: 'Đội của tôi' }],
      },
      {
        groupLabel: 'DỰ ÁN',
        items: [
          { href: '/project/submissions', label: 'Bài nộp của tôi' },
          { href: '/project/progress', label: 'Tiến độ của tôi' },
        ],
      },
      {
        groupLabel: 'SỰ KIỆN',
        items: [
          {
            href: '/calendar',
            label: 'Lịch sự kiện',
            badgeCount: upcomingEventsCount,
          },
        ],
      },
    ];

    if (isAdmin) {
      base.push({
        groupLabel: 'QUẢN TRỊ',
        items: [
          {
            href: '/admin',
            label: 'Quản trị & Nhật ký',
            badgeCount: adminBadgeCount,
          },
        ],
      });
    }

    return base;
  }, [upcomingEventsCount, isAdmin, adminBadgeCount]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return navGroups;
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            group.groupLabel.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [navGroups, searchQuery]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!isHydrated || !currentUser) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40"
        />
        <div
          aria-hidden="true"
          className="innovard-float pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="innovard-float pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl"
          style={{ animationDelay: '1.2s' }}
        />

        <div className="relative w-full max-w-md rounded-3xl border border-slate-200/90 bg-white/95 p-8 text-center shadow-xl shadow-slate-900/5 backdrop-blur-xs">
          {/* Dual-ring orbital loader */}
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-slate-100 border-t-indigo-600 border-r-sky-500" />
            <div className="innovard-spin-reverse absolute inset-2.5 rounded-full border-2 border-transparent border-b-indigo-400 border-l-sky-400" />
            <img
              src="/logo.png"
              alt="INNOVARD"
              className="h-11 w-11 rounded-full object-cover shadow-sm ring-1 ring-indigo-100"
            />
          </div>

          <span className="mt-5 inline-block rounded-full border border-indigo-200 bg-indigo-50 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-700">
            WORKSPACE HUB
          </span>

          <p className="innovard-shimmer mt-2 bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-600 bg-clip-text text-2xl font-black tracking-tight text-transparent">
            INNOVARD
          </p>

          <div className="mt-2 flex items-center justify-center gap-1.5">
            <p className="text-sm font-medium text-slate-600">
              Đang tải không gian làm việc...
            </p>
            <span className="inline-flex items-center gap-1">
              <span
                className="innovard-dot-bounce h-1.5 w-1.5 rounded-full bg-indigo-600"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="innovard-dot-bounce h-1.5 w-1.5 rounded-full bg-indigo-500"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="innovard-dot-bounce h-1.5 w-1.5 rounded-full bg-sky-500"
                style={{ animationDelay: '300ms' }}
              />
            </span>
          </div>

          {/* Indeterminate progress bar */}
          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="innovard-progress h-full w-2/5 rounded-full bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-600" />
          </div>

          {/* Mini workspace skeleton preview */}
          <div className="mt-6 grid grid-cols-3 gap-2.5 border-t border-slate-100 pt-5">
            <div className="animate-pulse space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <div className="h-2 w-10 rounded-full bg-slate-200" />
              <div className="h-3.5 w-12 rounded-md bg-indigo-100" />
            </div>
            <div
              className="animate-pulse space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3"
              style={{ animationDelay: '150ms' }}
            >
              <div className="h-2 w-12 rounded-full bg-slate-200" />
              <div className="h-3.5 w-10 rounded-md bg-sky-100" />
            </div>
            <div
              className="animate-pulse space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3"
              style={{ animationDelay: '300ms' }}
            >
              <div className="h-2 w-9 rounded-full bg-slate-200" />
              <div className="h-3.5 w-11 rounded-md bg-slate-200" />
            </div>
          </div>

          <p className="mt-3 text-[11px] font-medium text-slate-400">
            Đồng bộ xác thực · Nạp dữ liệu đội nhóm · Khởi tạo giao diện
          </p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const renderSidebarInner = (isMobile = false) => (
    <div className="flex h-full flex-col">
      {/* Brand & Team Switcher */}
      <div className="border-b border-slate-200/80 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/overview" className="flex min-w-0 items-center gap-2.5">
            <img
              src="/logo.png"
              alt="INNOVARD"
              className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-xs ring-1 ring-slate-200/80"
            />
            <div className="min-w-0">
              <span className="block truncate text-base font-extrabold tracking-tight text-slate-900">
                INNOVARD
              </span>
              <span className="block text-[11px] font-medium text-slate-500">
                Team Hub · {currentTeam.code}
              </span>
            </div>
          </Link>

          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Đóng
            </button>
          )}
        </div>

        {/* Team Scope Block (Admin switcher vs Member fixed team) */}
        {isAdmin ? (
          <div className="mt-3">
            <label
              htmlFor={isMobile ? 'team-switcher-mobile' : 'team-switcher-desktop'}
              className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400"
            >
              Đội đang xem (Admin)
            </label>
            <select
              id={isMobile ? 'team-switcher-mobile' : 'team-switcher-desktop'}
              value={currentTeamId}
              onChange={(e) => setCurrentTeamId(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.code})
                  {team.id === currentUser.teamId ? ' - Đội của tôi' : ''}
                </option>
              ))}
            </select>

            {currentTeam.id !== currentUser.teamId && (
              <button
                type="button"
                onClick={() => setCurrentTeamId(currentUser.teamId)}
                className="mt-2 w-full rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                Quay về đội của tôi
              </button>
            )}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Đội của tôi
            </p>
            <p className="mt-0.5 truncate text-xs font-bold text-slate-900">
              {currentTeam.name} · {currentTeam.code}
            </p>
            <Link
              href="/team"
              className="mt-1.5 inline-block text-[11px] font-semibold text-indigo-600 hover:underline"
            >
              Xin gia nhập đội khác
            </Link>
          </div>
        )}

        {/* Quick Search */}
        <div
          data-tour={isMobile ? undefined : 'sidebar-search'}
          className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-indigo-400 focus-within:bg-white"
        >
          <input
            ref={isMobile ? undefined : searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm trang..."
            className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
            /
          </kbd>
        </div>
      </div>

      {/* Grouped Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {filteredGroups.length === 0 ? (
          <p className="px-2 text-xs text-slate-400">
            Không tìm thấy trang phù hợp.
          </p>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.groupLabel}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.groupLabel}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    item.href === '/project/submissions'
                      ? pathname === '/project/submissions' || pathname === '/project'
                      : pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-tour={isMobile ? undefined : `nav-${item.href}`}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      {typeof item.badgeCount === 'number' && (
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          {item.badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </nav>

      {/* Bottom User Card (Google Name + Avatar + Logout) */}
      <div className="border-t border-slate-200/80 p-3.5">
        <button
          type="button"
          onClick={() => {
            if (isMobile) setMobileOpen(false);
            triggerOnboardingTour();
          }}
          className="mb-2.5 flex w-full items-center justify-between rounded-xl border border-indigo-200/80 bg-indigo-50/70 px-3 py-1.5 text-left text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100/80"
        >
          <span>Hướng dẫn sử dụng</span>
          <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
            Tour
          </span>
        </button>

        <div data-tour={isMobile ? undefined : 'sidebar-user'}>
          <div className="mb-2.5 flex items-center justify-between px-1 text-[11px]">
            <span className="font-medium text-slate-500">Trạng thái</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                isSupabaseEnabled
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isSupabaseEnabled ? 'Supabase Live' : 'Chưa kết nối DB'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
            <Link
              href="/profile"
              className="flex min-w-0 flex-1 items-center gap-2.5"
            >
              <UserAvatar
                src={currentUser.avatarUrl}
                name={currentUser.name}
                size="sm"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900">
                  {currentUser.name}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {ROLE_LABELS[currentUser.role] ?? 'Thành viên'} · {currentUser.email}
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              Thoát
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-68 shrink-0 flex-col border-r border-slate-200/80 bg-white lg:flex">
        {renderSidebarInner(false)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-72 flex-col bg-white shadow-xl">
            {renderSidebarInner(true)}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            Menu
          </button>
          <Link href="/overview" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="INNOVARD"
              className="h-7 w-7 rounded-lg object-cover shadow-2xs ring-1 ring-slate-200/80"
            />
            <span className="text-sm font-extrabold tracking-tight text-slate-900">
              INNOVARD · {currentTeam.name}
            </span>
          </Link>
          <Link href="/profile">
            <UserAvatar
              src={currentUser.avatarUrl}
              name={currentUser.name}
              size="sm"
            />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-5 sm:p-8 lg:p-10">
          {children}
        </main>
      </div>

      <OnboardingTour />
    </div>
  );
}
