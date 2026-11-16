import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  ClipboardList,
  House,
  LayoutDashboard,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  /** Short label for the mobile tab bar */
  short: string;
  icon: LucideIcon;
  /** Extra words people may type to find this page (Postel's law) */
  keywords: string;
  adminOnly?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/**
 * Hick's & Miller's law: three groups, eight destinations at most.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'workspace',
    label: 'Không gian',
    items: [
      {
        href: '/overview',
        label: 'Tổng quan',
        short: 'Tổng quan',
        icon: LayoutDashboard,
        keywords: 'dashboard overview deadline tong quan',
      },
      {
        href: '/',
        label: 'Trang chủ',
        short: 'Trang chủ',
        icon: House,
        keywords: 'trang chu home thong bao announcement lo trinh roadmap lien ket',
      },
      {
        href: '/calendar',
        label: 'Lịch sự kiện',
        short: 'Lịch',
        icon: CalendarDays,
        keywords: 'calendar deadline hop meeting su kien',
      },
    ],
  },
  {
    id: 'work',
    label: 'Công việc của tôi',
    items: [
      {
        href: '/project/submissions',
        label: 'Bài nộp & Standup',
        short: 'Bài nộp',
        icon: ClipboardList,
        keywords: 'daily standup bao cao hop nhom report submissions nop bai',
      },
      {
        href: '/project/progress',
        label: 'Tiến độ & Task',
        short: 'Tiến độ',
        icon: TrendingUp,
        keywords: 'progress task cong viec tien do',
      },
    ],
  },
  {
    id: 'people',
    label: 'Con người',
    items: [
      {
        href: '/team',
        label: 'Đội của tôi',
        short: 'Đội',
        icon: Users,
        keywords: 'team thanh vien member doi nhom',
      },
      {
        href: '/profile',
        label: 'Hồ sơ của tôi',
        short: 'Hồ sơ',
        icon: UserRound,
        keywords: 'profile ca nhan github discord linkedin ho so',
      },
      {
        href: '/admin',
        label: 'Quản trị & Nhật ký',
        short: 'Quản trị',
        icon: ShieldCheck,
        keywords: 'admin quan tri nhat ky log',
        adminOnly: true,
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === '/project/submissions') {
    return pathname === '/project/submissions' || pathname === '/project';
  }
  return pathname === href;
}

/**
 * Postel's law: accept "tien do", "TIẾN ĐỘ" and "tiến độ" alike.
 */
export function normalizeVi(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalizeVi(query);
  if (!q) return true;
  const h = normalizeVi(haystack);
  return q.split(' ').every((word) => h.includes(word));
}

/* Frequency of use: remember which pages each viewer opens most. */
const VISIT_KEY = 'innovard:nav-visits';

export type VisitCounts = Record<string, number>;

export function readVisitCounts(): VisitCounts {
  try {
    const raw = window.localStorage.getItem(VISIT_KEY);
    return raw ? (JSON.parse(raw) as VisitCounts) : {};
  } catch {
    return {};
  }
}

export function recordVisit(href: string): VisitCounts {
  const counts = readVisitCounts();
  counts[href] = (counts[href] ?? 0) + 1;
  try {
    window.localStorage.setItem(VISIT_KEY, JSON.stringify(counts));
  } catch {
    // Storage may be blocked; frequency ordering is a convenience only
  }
  return counts;
}

export function sortByFrequency<T extends { href: string }>(
  items: T[],
  counts: VisitCounts
): T[] {
  return [...items].sort((a, b) => (counts[b.href] ?? 0) - (counts[a.href] ?? 0));
}
