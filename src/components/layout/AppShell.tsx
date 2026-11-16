'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ClipboardList,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  TrendingUp,
  CalendarDays,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getTodayISO } from '@/lib/date-utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  OnboardingTour,
  triggerOnboardingTour,
} from '@/components/onboarding/OnboardingTour';
import { AppSkeleton } from '@/components/layout/AppSkeleton';
import { CommandPalette } from '@/components/layout/CommandPalette';
import {
  NAV_GROUPS,
  isNavItemActive,
  readVisitCounts,
  recordVisit,
  type NavItem,
  type VisitCounts,
} from '@/lib/navigation';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Thành viên',
};

/**
 * Fitts's law + frequency of use: the daily jobs (standup, progress, calendar, overview)
 * sit in the thumb zone on phones; everything else is one tap away in the menu.
 */
const MOBILE_TABS = [
  { href: '/overview', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/project/submissions', label: 'Bài nộp', icon: ClipboardList },
  { href: '/project/progress', label: 'Tiến độ', icon: TrendingUp },
  { href: '/calendar', label: 'Lịch', icon: CalendarDays },
];

/** Secondary action: the badge bumps whenever its number changes. */
function CountBadge({ count, active }: { count: number; active: boolean }) {
  const prev = useRef(count);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    if (prev.current !== count) {
      prev.current = count;
      setBump((b) => b + 1);
    }
  }, [count]);

  return (
    <span
      key={bump}
      className={`tabular ml-2 inline-flex min-w-6 justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
        bump ? 'ui-bump' : ''
      } ${active ? 'bg-white/15 text-white' : 'bg-white/8 text-[var(--rail-muted)]'}`}
    >
      {count}
    </span>
  );
}

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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [visitCounts, setVisitCounts] = useState<VisitCounts>({});

  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<{ y: number; visible: boolean }>({
    y: 0,
    visible: false,
  });

  const isLoginRoute = pathname === '/login';

  useEffect(() => {
    if (!isHydrated) return;
    if (!currentUser && !isLoginRoute) {
      router.replace('/login');
    }
  }, [isHydrated, currentUser, isLoginRoute, router]);

  // Route settled: close the drawer, stop the progress bar, count the visit
  useEffect(() => {
    setMobileOpen(false);
    setPendingHref(null);
    if (!isLoginRoute) {
      setVisitCounts(recordVisit(pathname));
    }
  }, [pathname, isLoginRoute]);

  useEffect(() => {
    setVisitCounts(readVisitCounts());
  }, []);

  // Jakob's law: Ctrl/⌘ K opens the palette, "/" too, Esc closes overlays
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Exaggerated feedback: a field the browser rejects on submit shakes once
  useEffect(() => {
    const handleInvalid = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (!el?.classList) return;
      el.classList.remove('ui-shake');
      void el.offsetWidth;
      el.classList.add('ui-shake');
      window.setTimeout(() => el.classList.remove('ui-shake'), 400);
    };
    document.addEventListener('invalid', handleInvalid, true);
    return () => document.removeEventListener('invalid', handleInvalid, true);
  }, []);

  const todayISO = getTodayISO();

  const upcomingEventsCount = useMemo(() => {
    return events.filter(
      (ev) => ev.teamId === null || (Boolean(currentTeam.id) && ev.teamId === currentTeam.id)
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

  const badgeFor = useCallback(
    (href: string): number | undefined => {
      if (href === '/calendar') return upcomingEventsCount;
      if (href === '/admin') return adminBadgeCount;
      return undefined;
    },
    [upcomingEventsCount, adminBadgeCount]
  );

  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((item) => !item.adminOnly || isAdmin),
      })).filter((g) => g.items.length > 0),
    [isAdmin]
  );

  const visibleItems: NavItem[] = useMemo(
    () => visibleGroups.flatMap((g) => g.items),
    [visibleGroups]
  );

  // Follow through: the active marker slides to the current item and settles
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) {
      setIndicator((s) => ({ ...s, visible: false }));
      return;
    }
    setIndicator({ y: active.offsetTop, visible: true });
  }, [pathname, visibleGroups, isHydrated, currentUser]);

  const navigate = useCallback(
    (href: string) => {
      if (href !== pathname) setPendingHref(href);
      router.push(href);
    },
    [pathname, router]
  );

  const startTour = useCallback(() => {
    setMobileOpen(false);
    triggerOnboardingTour();
  }, []);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!isHydrated || !currentUser) {
    return <AppSkeleton />;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleLinkClick = (href: string) => {
    if (href !== pathname) setPendingHref(href);
  };

  const teamScope = isAdmin ? (
    <div>
      <label
        htmlFor="team-switcher"
        className="mb-1.5 block text-xs font-medium text-[var(--rail-muted)]"
      >
        Đội đang xem
      </label>
      <select
        id="team-switcher"
        value={currentTeamId}
        onChange={(e) => setCurrentTeamId(e.target.value)}
        className="h-10 w-full cursor-pointer rounded-xl border border-[var(--rail-line)] bg-[var(--rail-raised)] px-3 text-sm font-medium text-[var(--rail-fg)] outline-none transition-colors hover:border-[var(--rail-muted)]"
      >
        {teams.map((team) => (
          <option key={team.id} value={team.id} className="bg-white text-slate-900">
            {team.name} ({team.code})
            {team.id === currentUser.teamId ? ' — đội của tôi' : ''}
          </option>
        ))}
      </select>

      {currentTeam.id !== currentUser.teamId && (
        <button
          type="button"
          onClick={() => setCurrentTeamId(currentUser.teamId)}
          className="mt-2 text-xs font-semibold text-[var(--rail-active)] transition-opacity hover:opacity-80"
        >
          Quay về đội của tôi
        </button>
      )}
    </div>
  ) : currentTeam.id ? (
    <Link
      href="/team"
      onClick={() => handleLinkClick('/team')}
      className="group block rounded-xl border border-[var(--rail-line)] bg-[var(--rail-raised)] px-3 py-2.5 transition-colors hover:border-[var(--rail-muted)]"
    >
      <span className="block text-xs text-[var(--rail-muted)]">Đội của tôi</span>
      <span className="mt-0.5 block truncate text-sm font-semibold text-[var(--rail-fg)]">
        {currentTeam.name}
        <span className="ml-1.5 font-normal text-[var(--rail-muted)]">{currentTeam.code}</span>
      </span>
    </Link>
  ) : (
    <Link
      href="/team"
      onClick={() => handleLinkClick('/team')}
      className="block rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2.5 transition-colors hover:bg-amber-400/15"
    >
      <span className="block text-sm font-semibold text-amber-200">Bạn chưa có đội</span>
      <span className="mt-0.5 block text-xs text-amber-100/80">Chọn đội để xin gia nhập</span>
    </Link>
  );

  const renderSidebarInner = (isMobile = false) => (
    <div className="flex h-full flex-col text-[var(--rail-fg)]">
      {/* Brand */}
      <div className="flex items-center justify-between gap-2 px-4 pt-5 pb-4">
        <Link
          href="/overview"
          onClick={() => handleLinkClick('/overview')}
          className="flex min-w-0 items-center gap-3 rounded-lg"
        >
          <img
            src="/logo.png"
            alt=""
            className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
          />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold tracking-tight">INNOVARD</span>
            <span className="block truncate text-xs text-[var(--rail-muted)]">Team hub</span>
          </span>
        </Link>

        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
            className="ui-hit flex h-9 w-9 items-center justify-center rounded-lg text-[var(--rail-muted)] transition-colors hover:bg-white/8 hover:text-[var(--rail-fg)]"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-3 px-4">
        {teamScope}

        {/* Quick search → command palette */}
        <button
          type="button"
          data-tour={isMobile ? undefined : 'sidebar-search'}
          onClick={() => setPaletteOpen(true)}
          className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-[var(--rail-line)] px-3 text-left text-sm text-[var(--rail-muted)] transition-colors hover:border-[var(--rail-muted)] hover:text-[var(--rail-fg)]"
        >
          <Search aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Tìm trang, thao tác…</span>
          <kbd className="rounded-md border border-[var(--rail-line)] px-1.5 py-0.5 text-[10px] font-semibold">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav
        ref={isMobile ? undefined : navRef}
        aria-label="Điều hướng chính"
        className="relative mt-5 flex-1 overflow-y-auto px-3 pb-4"
      >
        {!isMobile && (
          <span
            aria-hidden="true"
            className="ui-nav-indicator pointer-events-none absolute top-0 right-3 left-3 h-10 rounded-xl bg-white/10"
            style={{
              transform: `translateY(${indicator.y}px)`,
              opacity: indicator.visible ? 1 : 0,
            }}
          >
            <span className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-full bg-[var(--rail-active)]" />
          </span>
        )}

        {visibleGroups.map((group) => (
          <div key={group.id} className="mb-5 last:mb-0">
            <p className="mb-1 px-3 text-xs font-medium text-[var(--rail-muted)]/80">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = isNavItemActive(item.href, pathname);
                const isPending = pendingHref === item.href;
                const Icon = item.icon;
                const badge = badgeFor(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => handleLinkClick(item.href)}
                      data-active={isActive ? 'true' : undefined}
                      data-tour={isMobile ? undefined : `nav-${item.href}`}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
                        isActive
                          ? `font-semibold text-white ${isMobile ? 'bg-white/10' : ''}`
                          : 'text-[var(--rail-muted)] hover:bg-white/5 hover:text-[var(--rail-fg)]'
                      }`}
                    >
                      <Icon
                        aria-hidden="true"
                        className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 ease-out group-active:scale-90 ${
                          isActive ? 'text-[var(--rail-active)]' : ''
                        } ${isPending ? 'animate-pulse' : ''}`}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {typeof badge === 'number' && badge > 0 && (
                        <CountBadge count={badge} active={isActive} />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: tour, status, user */}
      <div className="space-y-2 border-t border-[var(--rail-line)] p-3">
        <button
          type="button"
          onClick={startTour}
          className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-[var(--rail-muted)] transition-colors hover:bg-white/5 hover:text-[var(--rail-fg)]"
        >
          <Compass aria-hidden="true" className="h-4 w-4" />
          Hướng dẫn sử dụng
        </button>

        <div
          data-tour={isMobile ? undefined : 'sidebar-user'}
          className="flex items-center gap-2 rounded-xl bg-[var(--rail-raised)] p-2"
        >
          <Link
            href="/profile"
            onClick={() => handleLinkClick('/profile')}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg"
          >
            <UserAvatar src={currentUser.avatarUrl} name={currentUser.name} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{currentUser.name}</span>
              <span className="flex items-center gap-1.5 truncate text-xs text-[var(--rail-muted)]">
                {ROLE_LABELS[currentUser.role] ?? 'Thành viên'}
                <span
                  title={isSupabaseEnabled ? 'Đã kết nối Supabase' : 'Chưa kết nối cơ sở dữ liệu'}
                  className={`rounded px-1 text-[10px] font-semibold ${
                    isSupabaseEnabled
                      ? 'bg-emerald-400/15 text-emerald-300'
                      : 'bg-amber-400/15 text-amber-200'
                  }`}
                >
                  {isSupabaseEnabled ? 'Live' : 'Offline'}
                </span>
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Đăng xuất"
            title="Đăng xuất"
            className="ui-hit flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--rail-muted)] transition-colors hover:bg-rose-500/15 hover:text-rose-300"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Doherty threshold: feedback the instant a route is requested */}
      {pendingHref && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-[95] h-0.5 overflow-hidden"
        >
          <div className="ui-route-progress h-full w-full bg-indigo-500" />
        </div>
      )}

      {/* Desktop rail */}
      <aside
        className="sticky top-0 hidden h-screen w-68 shrink-0 flex-col lg:flex"
        style={{ backgroundColor: 'var(--rail-bg)' }}
      >
        {renderSidebarInner(false)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="ui-overlay fixed inset-0 z-50 flex lg:hidden">
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng"
            className="ui-drawer relative z-10 flex h-full w-[min(20rem,86vw)] flex-col shadow-2xl"
            style={{ backgroundColor: 'var(--rail-bg)' }}
          >
            {renderSidebarInner(true)}
          </aside>
          <button
            type="button"
            aria-label="Đóng menu"
            tabIndex={-1}
            className="fixed inset-0 bg-slate-950/50 active:scale-100"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/90 px-2 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
          <Link
            href="/overview"
            onClick={() => handleLinkClick('/overview')}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <img src="/logo.png" alt="" className="h-7 w-7 rounded-lg object-cover" />
            <span className="truncate text-sm font-bold tracking-tight text-slate-900">
              {currentTeam.id ? currentTeam.name : 'INNOVARD'}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Tìm kiếm"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100"
          >
            <Search aria-hidden="true" className="h-5 w-5" />
          </button>
          <Link
            href="/profile"
            onClick={() => handleLinkClick('/profile')}
            aria-label="Hồ sơ của tôi"
            className="flex h-11 w-11 items-center justify-center"
          >
            <UserAvatar src={currentUser.avatarUrl} name={currentUser.name} size="sm" />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-5 pb-28 sm:p-8 sm:pb-28 lg:p-10">
          <div key={pathname} className="ui-page">
            {children}
          </div>
        </main>

        {/* Mobile tab bar: Fitts's law, thumb reach */}
        <nav
          aria-label="Điều hướng nhanh"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        >
          <ul className="mx-auto grid max-w-md grid-cols-4">
            {MOBILE_TABS.map((tab) => {
              const isActive = isNavItemActive(tab.href, pathname);
              const Icon = tab.icon;
              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    onClick={() => handleLinkClick(tab.href)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                      isActive ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-12 items-center justify-center rounded-full transition-[background-color,transform] duration-200 ease-out group-active:scale-90 ${
                        isActive ? 'bg-indigo-100' : ''
                      }`}
                    >
                      <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                    </span>
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={visibleItems}
        visitCounts={visitCounts}
        onNavigate={navigate}
        onStartTour={startTour}
      />

      <OnboardingTour />
    </div>
  );
}
