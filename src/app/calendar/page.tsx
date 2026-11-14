'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  formatCountdownLabel,
  formatMonthYearVI,
  formatVietnameseDate,
  getMonthGrid,
  getTodayISO,
  isStandupScheduledForDate,
  STANDUP_WEEKDAY_OPTIONS,
} from '@/lib/date-utils';
import type { CalendarEvent, DailyStandup } from '@/types/innovard';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const HOUR_ROW_HEIGHT = 68;

type EventCategoryId =
  | 'standup'
  | 'coaching'
  | 'mentoring'
  | 'general'
  | 'report'
  | 'gate'
  | 'demoday'
  | 'topic'
  | 'team_meeting';

interface CategoryMeta {
  id: EventCategoryId;
  label: string;
  defaultType: 'deadline' | 'meeting';
  chipActiveClass: string;
  dotClass: string;
  cardClass: string;
  badgeClass: string;
}

const CATEGORY_LIST: CategoryMeta[] = [
  {
    id: 'standup',
    label: 'Hạn daily standup',
    defaultType: 'deadline',
    chipActiveClass: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    dotClass: 'bg-emerald-500',
    cardClass: 'border-emerald-200 bg-emerald-50/90 text-emerald-900',
    badgeClass: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'coaching',
    label: 'Coaching 1-1',
    defaultType: 'meeting',
    chipActiveClass: 'border-violet-300 bg-violet-50 text-violet-800',
    dotClass: 'bg-violet-500',
    cardClass: 'border-violet-200 bg-violet-50/90 text-violet-950',
    badgeClass: 'bg-violet-100 text-violet-700',
  },
  {
    id: 'mentoring',
    label: 'Mentoring 1-1',
    defaultType: 'meeting',
    chipActiveClass: 'border-indigo-300 bg-indigo-50 text-indigo-800',
    dotClass: 'bg-indigo-500',
    cardClass: 'border-indigo-200 bg-indigo-50/90 text-indigo-950',
    badgeClass: 'bg-indigo-100 text-indigo-700',
  },
  {
    id: 'general',
    label: 'Sự kiện chung',
    defaultType: 'meeting',
    chipActiveClass: 'border-sky-300 bg-sky-50 text-sky-800',
    dotClass: 'bg-sky-500',
    cardClass: 'border-sky-200 bg-sky-50/90 text-sky-950',
    badgeClass: 'bg-sky-100 text-sky-700',
  },
  {
    id: 'report',
    label: 'Báo cáo tuần',
    defaultType: 'deadline',
    chipActiveClass: 'border-blue-300 bg-blue-50 text-blue-800',
    dotClass: 'bg-blue-500',
    cardClass: 'border-blue-200 bg-blue-50/90 text-blue-950',
    badgeClass: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'gate',
    label: 'Hạn gate',
    defaultType: 'deadline',
    chipActiveClass: 'border-rose-300 bg-rose-50 text-rose-800',
    dotClass: 'bg-rose-500',
    cardClass: 'border-rose-200 bg-rose-50/90 text-rose-950',
    badgeClass: 'bg-rose-100 text-rose-700',
  },
  {
    id: 'demoday',
    label: 'Hạn nộp Demo Day',
    defaultType: 'deadline',
    chipActiveClass: 'border-teal-300 bg-teal-50 text-teal-800',
    dotClass: 'bg-teal-500',
    cardClass: 'border-teal-200 bg-teal-50/90 text-teal-950',
    badgeClass: 'bg-teal-100 text-teal-700',
  },
  {
    id: 'topic',
    label: 'Hạn chốt đề tài',
    defaultType: 'deadline',
    chipActiveClass: 'border-amber-300 bg-amber-50 text-amber-800',
    dotClass: 'bg-amber-500',
    cardClass: 'border-amber-200 bg-amber-50/90 text-amber-950',
    badgeClass: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'team_meeting',
    label: 'Họp nhóm',
    defaultType: 'meeting',
    chipActiveClass: 'border-orange-300 bg-orange-50 text-orange-800',
    dotClass: 'bg-orange-500',
    cardClass: 'border-orange-200 bg-orange-50/90 text-orange-950',
    badgeClass: 'bg-orange-100 text-orange-700',
  },
];

const CATEGORY_MAP: Record<EventCategoryId, CategoryMeta> = CATEGORY_LIST.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<EventCategoryId, CategoryMeta>
);

function parseISODateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
}

function formatDateLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysISO(dateStr: string, days: number): string {
  const d = parseISODateLocal(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateLocalISO(d);
}

function getWeekStartISO(anchorISO: string): string {
  const d = parseISODateLocal(anchorISO);
  const offsetToMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offsetToMonday);
  return formatDateLocalISO(d);
}

function formatShortDDMM(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

function parseTimeToMinutes(timeStr: string): number {
  const match = /^(\d{1,2}):(\d{2})/.exec(timeStr.trim());
  if (!match) return 20 * 60;
  const hh = Math.min(23, Math.max(0, Number(match[1])));
  const mm = Math.min(59, Math.max(0, Number(match[2])));
  return hh * 60 + mm;
}

function formatMinutesToHHMM(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, totalMinutes));
  const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
  const mm = String(clamped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function parseEventMeta(ev: CalendarEvent): {
  categoryId: EventCategoryId;
  endTime: string;
  cleanDescription: string;
} {
  let desc = ev.description ?? '';
  let explicitCategory: EventCategoryId | null = null;
  let explicitEndTime: string | null = null;

  const catMatch = /^\[Loại:\s*([a-z_]+)\]\s*/i.exec(desc);
  if (catMatch) {
    const candidate = catMatch[1].toLowerCase() as EventCategoryId;
    if (CATEGORY_MAP[candidate]) {
      explicitCategory = candidate;
    }
    desc = desc.slice(catMatch[0].length);
  }

  const endMatch = /^\[Kết thúc:\s*(\d{2}:\d{2})\]\s*/i.exec(desc);
  if (endMatch) {
    explicitEndTime = endMatch[1];
    desc = desc.slice(endMatch[0].length);
  }

  let categoryId: EventCategoryId = explicitCategory ?? 'general';
  if (!explicitCategory) {
    const hay = `${ev.title} ${desc}`.toLowerCase();
    if (hay.includes('standup')) categoryId = 'standup';
    else if (hay.includes('coaching')) categoryId = 'coaching';
    else if (hay.includes('mentor')) categoryId = 'mentoring';
    else if (hay.includes('demo day') || hay.includes('demoday')) categoryId = 'demoday';
    else if (hay.includes('chốt đề tài') || hay.includes('đề tài')) categoryId = 'topic';
    else if (hay.includes('gate')) categoryId = 'gate';
    else if (hay.includes('báo cáo') || hay.includes('report')) categoryId = 'report';
    else if (hay.includes('workshop') || hay.includes('office hour') || ev.teamId === null)
      categoryId = 'general';
    else if (ev.type === 'deadline') categoryId = 'gate';
    else categoryId = 'team_meeting';
  }

  const startMins = parseTimeToMinutes(ev.time);
  const fallbackEnd = formatMinutesToHHMM(Math.min(24 * 60, startMins + 90));

  return {
    categoryId,
    endTime: explicitEndTime ?? fallbackEnd,
    cleanDescription: desc.trim(),
  };
}

interface PositionedTimedEvent {
  event: CalendarEvent;
  category: CategoryMeta;
  endTime: string;
  cleanDescription: string;
  startMin: number;
  endMin: number;
  colIndex: number;
  colCount: number;
}

function layoutDayTimedEvents(
  items: Array<{
    event: CalendarEvent;
    category: CategoryMeta;
    endTime: string;
    cleanDescription: string;
  }>
): PositionedTimedEvent[] {
  const sorted = items
    .map((item) => {
      const startMin = parseTimeToMinutes(item.event.time);
      const rawEnd = parseTimeToMinutes(item.endTime);
      const endMin = Math.max(startMin + 45, rawEnd > startMin ? rawEnd : startMin + 60);
      return { ...item, startMin, endMin };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const result: PositionedTimedEvent[] = [];
  let cluster: typeof sorted = [];
  let clusterMaxEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const columnEnds: number[] = [];
    const placed: Array<PositionedTimedEvent> = [];

    for (const item of cluster) {
      let col = columnEnds.findIndex((endVal) => endVal <= item.startMin);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(item.endMin);
      } else {
        columnEnds[col] = item.endMin;
      }
      placed.push({
        ...item,
        colIndex: col,
        colCount: 1,
      });
    }

    const totalCols = Math.max(1, columnEnds.length);
    for (const p of placed) {
      result.push({ ...p, colCount: totalCols });
    }
    cluster = [];
    clusterMaxEnd = -1;
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.startMin >= clusterMaxEnd) {
      flushCluster();
    }
    cluster.push(item);
    clusterMaxEnd = Math.max(clusterMaxEnd, item.endMin);
  }
  flushCluster();

  return result;
}

export default function CalendarPage() {
  const {
    currentUser,
    currentTeam,
    users,
    standups,
    events,
    systemConfig,
    updateSystemConfig,
    addCalendarEvent,
    deleteCalendarEvent,
    isAdmin,
  } = useApp();

  const todayISO = getTodayISO();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [anchorDateISO, setAnchorDateISO] = useState<string>(todayISO);
  const [hiddenCategories, setHiddenCategories] = useState<EventCategoryId[]>([]);
  const [showFullDayHours, setShowFullDayHours] = useState(false);

  // Live current-time indicator ticker
  const [nowTick, setNowTick] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  // Modals
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedStandupDate, setSelectedStandupDate] = useState<string | null>(null);
  const [selectedMonthDay, setSelectedMonthDay] = useState<string | null>(null);

  // Add Event modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [evCategory, setEvCategory] = useState<EventCategoryId>('team_meeting');
  const [evTitle, setEvTitle] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [evDate, setEvDate] = useState(todayISO);
  const [evTime, setEvTime] = useState('20:00');
  const [evEndTime, setEvEndTime] = useState('21:30');
  const [evType, setEvType] = useState<'deadline' | 'meeting'>('meeting');
  const [evPriority, setEvPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [evScope, setEvScope] = useState<'team' | 'global'>('team');
  const [evLink, setEvLink] = useState('');
  const [evLocation, setEvLocation] = useState('');

  // Standup Schedule Config Modal state (Admin)
  const [showStandupConfigModal, setShowStandupConfigModal] = useState(false);
  const [cfgStandupStartTime, setCfgStandupStartTime] = useState(
    systemConfig.standupStartTime
  );
  const [cfgStandupDeadlineTime, setCfgStandupDeadlineTime] = useState(
    systemConfig.standupDeadlineTime
  );
  const [cfgStandupStartDate, setCfgStandupStartDate] = useState(
    systemConfig.standupStartDate
  );
  const [cfgStandupEndDate, setCfgStandupEndDate] = useState(
    systemConfig.standupEndDate
  );
  const [cfgStandupDays, setCfgStandupDays] = useState<number[]>(
    systemConfig.standupDaysOfWeek
  );
  const [cfgAllowLateStandup, setCfgAllowLateStandup] = useState(
    systemConfig.allowLateStandup
  );
  const [cfgAllowBackdateStandup, setCfgAllowBackdateStandup] = useState(
    systemConfig.allowBackdateStandup
  );

  const openStandupConfigModal = () => {
    setCfgStandupStartTime(systemConfig.standupStartTime);
    setCfgStandupDeadlineTime(systemConfig.standupDeadlineTime);
    setCfgStandupStartDate(systemConfig.standupStartDate);
    setCfgStandupEndDate(systemConfig.standupEndDate);
    setCfgStandupDays(systemConfig.standupDaysOfWeek);
    setCfgAllowLateStandup(systemConfig.allowLateStandup);
    setCfgAllowBackdateStandup(systemConfig.allowBackdateStandup);
    setShowStandupConfigModal(true);
  };

  const teamMembers = useMemo(
    () => (currentTeam.id ? users.filter((u) => u.teamId === currentTeam.id) : []),
    [users, currentTeam.id]
  );

  // Group standups by date within the active team
  const standupsByDate = useMemo(() => {
    const map = new Map<string, DailyStandup[]>();
    if (!currentTeam.id) return map;
    for (const s of standups) {
      if (s.teamId !== currentTeam.id) continue;
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [standups, currentTeam.id]);

  // Scoped and categorized events
  const enrichedEvents = useMemo(() => {
    return events
      .filter(
        (e) => e.teamId === null || (Boolean(currentTeam.id) && e.teamId === currentTeam.id)
      )
      .map((ev) => {
        const meta = parseEventMeta(ev);
        return {
          event: ev,
          category: CATEGORY_MAP[meta.categoryId] ?? CATEGORY_MAP.general,
          endTime: meta.endTime,
          cleanDescription: meta.cleanDescription,
        };
      })
      .filter((item) => !hiddenCategories.includes(item.category.id))
      .sort(
        (a, b) =>
          a.event.date.localeCompare(b.event.date) ||
          a.event.time.localeCompare(b.event.time)
      );
  }, [events, currentTeam.id, hiddenCategories]);

  const showDailyStandupRow = !hiddenCategories.includes('standup');

  // Week grid columns (Mon -> Sun)
  const weekStartISO = useMemo(() => getWeekStartISO(anchorDateISO), [anchorDateISO]);
  const weekDays = useMemo(() => {
    return WEEKDAYS.map((weekday, idx) => {
      const dateStr = addDaysISO(weekStartISO, idx);
      const dayNumber = dateStr.split('-')[2] ?? '';
      return {
        weekday,
        dateStr,
        dayNumber,
        isToday: dateStr === todayISO,
      };
    });
  }, [weekStartISO, todayISO]);

  const weekEndISO = weekDays[6]?.dateStr ?? weekStartISO;

  // Compute grid hours: 18:00-24:00 default unless user toggles or morning/afternoon meeting exists in visible week
  const startHour = useMemo(() => {
    if (showFullDayHours) return 8;
    const weekSet = new Set(weekDays.map((d) => d.dateStr));
    let earliest = 18;
    for (const item of enrichedEvents) {
      if (!weekSet.has(item.event.date) || item.event.type !== 'meeting') continue;
      const hour = Math.floor(parseTimeToMinutes(item.event.time) / 60);
      if (hour < earliest) earliest = Math.max(7, hour);
    }
    return earliest;
  }, [showFullDayHours, weekDays, enrichedEvents]);

  const hourSlots = useMemo(() => {
    const hours: number[] = [];
    for (let h = startHour; h <= 23; h += 1) {
      hours.push(h);
    }
    return hours;
  }, [startHour]);

  // Separate All-Day Deadlines vs Timed Meetings per day for the visible week
  const weekDayData = useMemo(() => {
    const map = new Map<
      string,
      {
        deadlines: typeof enrichedEvents;
        timed: PositionedTimedEvent[];
        totalItemsCount: number;
      }
    >();

    for (const col of weekDays) {
      const dayItems = enrichedEvents.filter((item) => item.event.date === col.dateStr);
      const deadlines = dayItems.filter((item) => item.event.type === 'deadline');
      const meetings = dayItems.filter((item) => item.event.type === 'meeting');
      const positioned = layoutDayTimedEvents(meetings);
      const hasStandup =
        showDailyStandupRow && isStandupScheduledForDate(col.dateStr, systemConfig);
      const totalItemsCount = dayItems.length + (hasStandup ? 1 : 0);

      map.set(col.dateStr, {
        deadlines,
        timed: positioned,
        totalItemsCount,
      });
    }
    return map;
  }, [weekDays, enrichedEvents, showDailyStandupRow, systemConfig]);

  // Monthly grid data
  const anchorDateObj = useMemo(() => parseISODateLocal(anchorDateISO), [anchorDateISO]);
  const viewYear = anchorDateObj.getFullYear();
  const viewMonth = anchorDateObj.getMonth();

  const monthCells = useMemo(
    () => getMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const eventsByDateMap = useMemo(() => {
    const map = new Map<string, typeof enrichedEvents>();
    for (const item of enrichedEvents) {
      const list = map.get(item.event.date) ?? [];
      list.push(item);
      map.set(item.event.date, list);
    }
    return map;
  }, [enrichedEvents]);

  const googleCalendarReminderUrl = useMemo(() => {
    const effectiveStartISO =
      systemConfig.standupStartDate && systemConfig.standupStartDate > todayISO
        ? systemConfig.standupStartDate
        : todayISO;
    const cleanDate = effectiveStartISO.replace(/-/g, '');
    const deadlineMin = parseTimeToMinutes(systemConfig.standupDeadlineTime);
    const remindStartMin = Math.max(0, deadlineMin - 15);
    const startHHMM = formatMinutesToHHMM(remindStartMin).replace(':', '');
    const endHHMM = formatMinutesToHHMM(deadlineMin).replace(':', '');
    const datesParam = `${cleanDate}T${startHHMM}00/${cleanDate}T${endHHMM}00`;
    const title = `INNOVARD - Nộp Daily Standup (${currentTeam.name})`;
    const details = `Khung giờ nộp Daily Standup: ${systemConfig.standupStartTime} – ${systemConfig.standupDeadlineTime}. Nộp trực tiếp tại trang Bài nộp của tôi trên INNOVARD.`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title
    )}&dates=${datesParam}&recur=${encodeURIComponent(
      'RRULE:FREQ=DAILY'
    )}&ctz=Asia/Ho_Chi_Minh&details=${encodeURIComponent(details)}`;
  }, [
    todayISO,
    systemConfig.standupStartDate,
    systemConfig.standupStartTime,
    systemConfig.standupDeadlineTime,
    currentTeam.name,
  ]);

  const nowMinutes = nowTick.getHours() * 60 + nowTick.getMinutes();
  const showCurrentTimeLine =
    nowMinutes >= startHour * 60 && nowMinutes <= 24 * 60;
  const currentTimeOffsetPx =
    ((nowMinutes - startHour * 60) / 60) * HOUR_ROW_HEIGHT;

  const toggleCategory = (id: EventCategoryId) => {
    setHiddenCategories((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const goPrev = () => {
    if (viewMode === 'week') {
      setAnchorDateISO((prev) => addDaysISO(prev, -7));
    } else {
      const d = new Date(viewYear, viewMonth - 1, 1);
      setAnchorDateISO(formatDateLocalISO(d));
    }
  };

  const goNext = () => {
    if (viewMode === 'week') {
      setAnchorDateISO((prev) => addDaysISO(prev, 7));
    } else {
      const d = new Date(viewYear, viewMonth + 1, 1);
      setAnchorDateISO(formatDateLocalISO(d));
    }
  };

  const goToday = () => {
    setAnchorDateISO(getTodayISO());
  };

  const openAddModalFor = (dateStr?: string, hour?: number) => {
    setEvDate(dateStr || todayISO);
    if (typeof hour === 'number') {
      const start = `${String(hour).padStart(2, '0')}:00`;
      const end = `${String(Math.min(23, hour + 1)).padStart(2, '0')}:00`;
      setEvTime(start);
      setEvEndTime(end);
      setEvCategory('team_meeting');
      setEvType('meeting');
    }
    setSelectedMonthDay(null);
    setShowAddModal(true);
  };

  const handleCategoryChangeInModal = (catId: EventCategoryId) => {
    setEvCategory(catId);
    const meta = CATEGORY_MAP[catId];
    if (meta) {
      setEvType(meta.defaultType);
    }
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) return;

    const metaTags = `[Loại: ${evCategory}]${
      evType === 'meeting' && evEndTime ? `[Kết thúc: ${evEndTime}]` : ''
    }`;
    const fullDescription = evDesc.trim()
      ? `${metaTags} ${evDesc.trim()}`
      : metaTags;

    addCalendarEvent({
      teamId: evScope === 'team' ? currentTeam.id : null,
      title: evTitle.trim(),
      description: fullDescription,
      date: evDate || todayISO,
      time: evTime || '23:59',
      type: evType,
      priority: evPriority,
      meetingLink: evLink.trim() || undefined,
      location: evType === 'meeting' ? evLocation.trim() || undefined : undefined,
    });

    setAnchorDateISO(evDate || todayISO);
    setEvTitle('');
    setEvDesc('');
    setEvLink('');
    setEvLocation('');
    setShowAddModal(false);
  };

  const selectedStandupList = useMemo(() => {
    if (!selectedStandupDate) return [];
    return standupsByDate.get(selectedStandupDate) ?? [];
  }, [selectedStandupDate, standupsByDate]);

  return (
    <div className="space-y-5">
      {/* Header matching reference hierarchy in clean INNOVARD Light Theme */}
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            CHƯƠNG TRÌNH · {systemConfig.programName}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Lịch <span className="italic text-indigo-600">sự kiện</span>
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-slate-500 sm:text-sm">
            {currentTeam.id
              ? `Mọi thứ của đội ${currentTeam.name} và chương trình nằm chung một chỗ: buổi coaching, mentoring 1-1, hạn nộp Daily Standup (${systemConfig.standupDeadlineTime}), báo cáo tuần và các sự kiện khác. Bấm vào nhãn bên dưới để ẩn bớt loại bạn không cần xem. Giờ trên lịch là giờ Việt Nam.`
              : `Lịch sự kiện chung của chương trình, buổi coaching, mentoring 1-1 và hạn nộp Daily Standup (${systemConfig.standupDeadlineTime}). Bạn chưa có đội nên chỉ hiển thị các sự kiện toàn chương trình. Giờ trên lịch là giờ Việt Nam.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={googleCalendarReminderUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-semibold text-indigo-700 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            Nhắc lịch qua Google Calendar
          </a>
          {isAdmin && (
            <button
              type="button"
              onClick={openStandupConfigModal}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              Chỉnh lịch Standup
            </button>
          )}
          <button
            type="button"
            onClick={() => openAddModalFor()}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
          >
            + Thêm sự kiện
          </button>
        </div>
      </header>

      {/* Toolbar: Week/Month Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <button
              type="button"
              aria-label={viewMode === 'week' ? 'Tuần trước' : 'Tháng trước'}
              onClick={goPrev}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-white"
            >
              {'<'}
            </button>
            <button
              type="button"
              aria-label={viewMode === 'week' ? 'Tuần sau' : 'Tháng sau'}
              onClick={goNext}
              className="border-l border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-white"
            >
              {'>'}
            </button>
          </div>

          <span className="px-1 text-sm font-extrabold tracking-tight text-slate-900">
            {viewMode === 'week'
              ? `Tuần ${formatShortDDMM(weekStartISO)} – ${formatShortDDMM(weekEndISO)}`
              : formatMonthYearVI(viewYear, viewMonth)}
          </span>

          <input
            type="date"
            aria-label="Chọn ngày trên lịch"
            value={anchorDateISO}
            onChange={(e) => {
              if (e.target.value) setAnchorDateISO(e.target.value);
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
          />

          <button
            type="button"
            onClick={goToday}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Hôm nay
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {viewMode === 'week' && (
            <button
              type="button"
              onClick={() => setShowFullDayHours((prev) => !prev)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              {showFullDayHours ? 'Thu gọn (18:00–24:00)' : 'Mở rộng cả ngày (08:00–24:00)'}
            </button>
          )}

          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                viewMode === 'week'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lịch tuần
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                viewMode === 'month'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lịch tháng
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Pills Row */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORY_LIST.map((cat) => {
          const isHidden = hiddenCategories.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggleCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                isHidden
                  ? 'border-slate-200 bg-white text-slate-400 opacity-60 hover:opacity-90 line-through'
                  : `${cat.chipActiveClass} shadow-2xs hover:brightness-95`
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isHidden ? 'bg-slate-300' : cat.dotClass
                }`}
              />
              <span>{cat.label}</span>
            </button>
          );
        })}

        {hiddenCategories.length > 0 && (
          <button
            type="button"
            onClick={() => setHiddenCategories([])}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            Hiện tất cả
          </button>
        )}
      </div>

      {/* VIEW MODE 1: WEEKLY SCHEDULE GRID (Template Layout + Light Theme) */}
      {viewMode === 'week' ? (
        <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <div className="min-w-[960px]">
              {/* Day Column Headers */}
              <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50/70">
                <div className="flex items-end justify-center border-r border-slate-200/80 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  GMT+7
                </div>
                {weekDays.map((col) => {
                  const data = weekDayData.get(col.dateStr);
                  return (
                    <div
                      key={col.dateStr}
                      className={`border-r border-slate-200/70 px-3 py-2.5 text-center last:border-r-0 ${
                        col.isToday ? 'bg-indigo-50/60' : ''
                      }`}
                    >
                      <p
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          col.isToday ? 'text-indigo-600' : 'text-slate-400'
                        }`}
                      >
                        {col.weekday}
                      </p>
                      <div className="mt-1 flex items-center justify-center gap-1.5">
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-lg font-extrabold tracking-tight ${
                            col.isToday
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-900'
                          }`}
                        >
                          {col.dayNumber}
                        </span>
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                          {data?.totalItemsCount ?? 0}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* All-day / Deadlines Row ("Đến hạn") including Daily Standup */}
              <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50/30">
                <div className="flex items-start justify-center border-r border-slate-200/80 pt-3 text-[11px] font-bold text-slate-400">
                  Đến hạn
                </div>

                {weekDays.map((col) => {
                  const dayStandups = standupsByDate.get(col.dateStr) ?? [];
                  const uniqueSubmitterIds = new Set(dayStandups.map((s) => s.userId));
                  const mySubmitted = Boolean(
                    currentUser && uniqueSubmitterIds.has(currentUser.id)
                  );
                  const submittedCount = uniqueSubmitterIds.size;
                  const totalMembersCount = teamMembers.length;
                  const isPastDay = col.dateStr < todayISO;
                  const data = weekDayData.get(col.dateStr);
                  const dayDeadlines = data?.deadlines ?? [];
                  const isStandupDay =
                    showDailyStandupRow &&
                    isStandupScheduledForDate(col.dateStr, systemConfig);

                  const standupCardStyle = mySubmitted
                    ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900 hover:border-emerald-300'
                    : isPastDay
                    ? 'border-rose-200 bg-rose-50/80 text-rose-800 hover:border-rose-300'
                    : 'border-indigo-200 bg-indigo-50/80 text-indigo-900 hover:border-indigo-300';

                  const standupBadgeStyle = mySubmitted
                    ? 'bg-emerald-100 text-emerald-700'
                    : isPastDay
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-white text-indigo-700';

                  return (
                    <div
                      key={col.dateStr}
                      className={`min-h-[68px] space-y-1.5 border-r border-slate-200/70 p-2 last:border-r-0 ${
                        col.isToday ? 'bg-indigo-50/25' : ''
                      }`}
                    >
                      {isStandupDay && (
                        <button
                          type="button"
                          onClick={() => setSelectedStandupDate(col.dateStr)}
                          className={`flex w-full items-center justify-between gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition ${standupCardStyle}`}
                          title={`Khung giờ nộp Daily Standup (${systemConfig.standupStartTime} – ${systemConfig.standupDeadlineTime})`}
                        >
                          <span className="truncate">
                            {systemConfig.standupStartTime}–{systemConfig.standupDeadlineTime} · Daily Standup
                          </span>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${standupBadgeStyle}`}
                          >
                            {mySubmitted ? 'OK' : `${submittedCount}/${totalMembersCount}`}
                          </span>
                        </button>
                      )}

                      {dayDeadlines.map((item) => (
                        <button
                          key={item.event.id}
                          type="button"
                          onClick={() => setSelectedEvent(item.event)}
                          className={`flex w-full items-center justify-between gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition hover:brightness-95 ${item.category.cardClass}`}
                          title={item.event.title}
                        >
                          <span className="truncate">
                            {item.event.time} · {item.event.title}
                          </span>
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${item.category.dotClass}`}
                          />
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Hourly Timeline Area */}
              <div className="relative grid grid-cols-[72px_repeat(7,minmax(0,1fr))]">
                {/* Left Time Axis */}
                <div className="border-r border-slate-200/80 bg-slate-50/30">
                  {hourSlots.map((hour) => (
                    <div
                      key={hour}
                      className="relative border-b border-slate-100 pr-2 text-right text-[11px] font-medium text-slate-400 last:border-b-0"
                      style={{ height: HOUR_ROW_HEIGHT }}
                    >
                      <span className="block -translate-y-2 pt-1 tabular-nums">
                        {String(hour).padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* 7 Day Columns */}
                {weekDays.map((col) => {
                  const dayTimedEvents = weekDayData.get(col.dateStr)?.timed ?? [];
                  return (
                    <div
                      key={col.dateStr}
                      className={`relative border-r border-slate-200/70 last:border-r-0 ${
                        col.isToday ? 'bg-indigo-50/15' : ''
                      }`}
                    >
                      {/* Clickable Hourly Slots */}
                      {hourSlots.map((hour) => (
                        <button
                          key={hour}
                          type="button"
                          aria-label={`Thêm sự kiện ngày ${col.dateStr} lúc ${hour}:00`}
                          onClick={() => openAddModalFor(col.dateStr, hour)}
                          className="block w-full border-b border-slate-100 text-left transition hover:bg-indigo-50/30 last:border-b-0"
                          style={{ height: HOUR_ROW_HEIGHT }}
                        />
                      ))}

                      {/* Live Current Time Line on Today Column */}
                      {col.isToday && showCurrentTimeLine && (
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute right-0 left-0 z-20 flex items-center"
                          style={{ top: currentTimeOffsetPx }}
                        >
                          <span className="-ml-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                          <div className="h-[2px] flex-1 bg-rose-500" />
                        </div>
                      )}

                      {/* Timed Event Blocks */}
                      {dayTimedEvents.map((item) => {
                        const gridStartMin = startHour * 60;
                        const clampedStart = Math.max(gridStartMin, item.startMin);
                        const clampedEnd = Math.min(24 * 60, Math.max(clampedStart + 45, item.endMin));
                        const topPx =
                          ((clampedStart - gridStartMin) / 60) * HOUR_ROW_HEIGHT + 2;
                        const heightPx = Math.max(
                          54,
                          ((clampedEnd - clampedStart) / 60) * HOUR_ROW_HEIGHT - 4
                        );
                        const widthPct = 100 / item.colCount;
                        const leftPct = item.colIndex * widthPct;

                        return (
                          <button
                            key={item.event.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(item.event);
                            }}
                            style={{
                              top: topPx,
                              height: heightPx,
                              left: `calc(${leftPct}% + 4px)`,
                              width: `calc(${widthPct}% - 8px)`,
                            }}
                            className={`absolute z-10 flex flex-col justify-start overflow-hidden rounded-xl border p-2 text-left shadow-2xs transition hover:z-30 hover:shadow-md ${item.category.cardClass}`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-[10px] font-bold tabular-nums opacity-80">
                                {item.event.time}–{item.endTime}
                              </span>
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.category.dotClass}`}
                              />
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs font-extrabold leading-snug">
                              {item.event.title}
                            </p>
                            {(item.event.location || item.cleanDescription) && (
                              <p className="mt-1 truncate text-[10px] font-medium opacity-75">
                                {item.event.location || item.cleanDescription}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* VIEW MODE 2: MONTHLY GRID VIEW */
        <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-6">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 sm:text-sm">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthCells.map((cell) => {
              const dayEvents = eventsByDateMap.get(cell.dateStr) ?? [];
              const dayStandups = standupsByDate.get(cell.dateStr) ?? [];
              const myStandupDone = Boolean(
                currentUser && dayStandups.some((s) => s.userId === currentUser.id)
              );
              const isStandupDay =
                showDailyStandupRow &&
                isStandupScheduledForDate(cell.dateStr, systemConfig);
              const isToday = cell.dateStr === todayISO;
              const isSelected = selectedMonthDay === cell.dateStr;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedMonthDay(cell.dateStr)}
                  className={`flex min-h-28 flex-col items-stretch rounded-2xl border p-2 text-left transition sm:min-h-36 sm:p-3 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/30'
                      : cell.inMonth
                      ? 'border-slate-200/80 bg-white hover:border-indigo-300 hover:bg-slate-50/70'
                      : 'border-transparent bg-slate-50/50 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold sm:text-sm ${
                        isToday
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : cell.inMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.day}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {dayEvents.length + (isStandupDay ? 1 : 0)}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 overflow-hidden">
                    {isStandupDay && (
                      <div
                        className={`truncate rounded-lg px-2 py-1 text-[10px] font-semibold ${
                          myStandupDone
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-indigo-50 text-indigo-800'
                        }`}
                      >
                        {systemConfig.standupStartTime}–{systemConfig.standupDeadlineTime} · Daily Standup
                      </div>
                    )}
                    {dayEvents.slice(0, 2).map((item) => (
                      <div
                        key={item.event.id}
                        className={`truncate rounded-lg border px-2 py-1 text-[10px] font-semibold ${item.category.cardClass}`}
                        title={item.event.title}
                      >
                        {item.event.time} · {item.event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="px-1 text-[10px] font-semibold text-indigo-600">
                        +{dayEvents.length - 2} sự kiện khác
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* MODAL: Daily Standup Status for Selected Day */}
      {selectedStandupDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          onClick={() => setSelectedStandupDate(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  Lịch Daily Standup
                </span>
                <h3 className="mt-1.5 text-xl font-bold text-slate-900">
                  {formatVietnameseDate(selectedStandupDate)}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Khung giờ nộp quy định:{' '}
                  <span className="font-bold text-slate-800">
                    {systemConfig.standupStartTime} – {systemConfig.standupDeadlineTime}
                  </span>{' '}
                  · {systemConfig.standupDeadlineLabel}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStandupDate(null)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {teamMembers.map((member) => {
                const entry = selectedStandupList.find((s) => s.userId === member.id);
                return (
                  <div
                    key={member.id}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <UserAvatar
                          src={member.avatarUrl}
                          name={member.name}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold uppercase text-slate-900">
                            {member.name}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          entry
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {entry ? 'Đã nộp Standup' : 'Chưa nộp'}
                      </span>
                    </div>

                    {entry && (
                      <div className="mt-2.5 space-y-1 border-t border-slate-200/70 pt-2 text-xs text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-800">Hôm qua:</span>{' '}
                          {entry.yesterday}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Hôm nay:</span>{' '}
                          {entry.today}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStandupDate(null);
                    openStandupConfigModal();
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  Chỉnh lịch &amp; giờ Standup (Admin)
                </button>
              ) : (
                <span className="text-xs text-slate-400">
                  Đội: {currentTeam.name}
                </span>
              )}

              <Link
                href="/project/submissions"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
              >
                Đi tới trang nộp Daily Standup
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Single Event Detail */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const meta = parseEventMeta(selectedEvent);
              const cat = CATEGORY_MAP[meta.categoryId] ?? CATEGORY_MAP.general;
              return (
                <>
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cat.badgeClass}`}>
                        {cat.label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {formatVietnameseDate(selectedEvent.date)} · {selectedEvent.time}
                        {selectedEvent.type === 'meeting' ? `–${meta.endTime}` : ''}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {selectedEvent.teamId ? currentTeam.name : 'Toàn chương trình'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedEvent(null)}
                      className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Đóng
                    </button>
                  </div>

                  <h3 className="mt-4 text-xl font-extrabold text-slate-900">
                    {selectedEvent.title}
                  </h3>

                  {meta.cleanDescription && (
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {meta.cleanDescription}
                    </p>
                  )}

                  {(selectedEvent.location || selectedEvent.meetingLink) && (
                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-xs">
                      {selectedEvent.location && (
                        <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-700">
                          Địa điểm / Diễn giả: {selectedEvent.location}
                        </span>
                      )}
                      {selectedEvent.meetingLink && (
                        <a
                          href={selectedEvent.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-indigo-600 px-3.5 py-2 font-semibold text-white shadow-2xs transition hover:bg-indigo-700"
                        >
                          Mở liên kết sự kiện
                        </a>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        deleteCalendarEvent(selectedEvent.id);
                        setSelectedEvent(null);
                      }}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Xóa sự kiện này
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: Month View Selected Day Popup */}
      {selectedMonthDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          onClick={() => setSelectedMonthDay(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                    Chi tiết ngày
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {formatCountdownLabel(selectedMonthDay).text}
                  </span>
                </div>
                <h3 className="mt-1.5 text-xl font-bold text-slate-900">
                  {formatVietnameseDate(selectedMonthDay)}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAddModalFor(selectedMonthDay)}
                  className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Thêm sự kiện
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMonthDay(null)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {showDailyStandupRow &&
                isStandupScheduledForDate(selectedMonthDay, systemConfig) && (
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedMonthDay;
                    setSelectedMonthDay(null);
                    setSelectedStandupDate(target);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left transition hover:border-emerald-300"
                >
                  <div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                      Hạn daily standup
                    </span>
                    <p className="mt-1.5 text-sm font-bold text-slate-900">
                      Khung giờ nộp Daily Standup: {systemConfig.standupStartTime} – {systemConfig.standupDeadlineTime}
                    </p>
                  </div>
                  <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-2xs">
                    {(standupsByDate.get(selectedMonthDay) ?? []).length}/{teamMembers.length} đã nộp
                  </span>
                </button>
              )}

              {(eventsByDateMap.get(selectedMonthDay) ?? []).map((item) => (
                <div
                  key={item.event.id}
                  onClick={() => {
                    setSelectedMonthDay(null);
                    setSelectedEvent(item.event);
                  }}
                  className={`cursor-pointer rounded-2xl border p-4 transition hover:shadow-xs ${item.category.cardClass}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${item.category.badgeClass}`}>
                      {item.category.label}
                    </span>
                    <span className="font-mono text-xs font-bold">
                      {item.event.time}
                    </span>
                  </div>
                  <p className="mt-2 text-base font-bold text-slate-900">
                    {item.event.title}
                  </p>
                  {item.cleanDescription && (
                    <p className="mt-1 text-xs text-slate-600">{item.cleanDescription}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Calendar Event */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Thêm Deadline / Lịch sự kiện mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Phân loại nhãn sự kiện
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_LIST.filter((c) => c.id !== 'standup').map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryChangeInModal(cat.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                        evCategory === cat.id
                          ? `${cat.chipActiveClass} ring-2 ring-indigo-500/30`
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${cat.dotClass}`} />
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setEvType('deadline')}
                  className={`rounded-xl border py-2 text-xs font-bold transition ${
                    evType === 'deadline'
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Hiển thị ở dòng Đến hạn
                </button>
                <button
                  type="button"
                  onClick={() => setEvType('meeting')}
                  className={`rounded-xl border py-2 text-xs font-bold transition ${
                    evType === 'meeting'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Hiển thị theo khung giờ
                </button>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tiêu đề sự kiện *
                </label>
                <input
                  type="text"
                  required
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                  placeholder="Ví dụ: WORKSHOP 04: Vibe coding 101"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Ngày *
                  </label>
                  <input
                    type="date"
                    required
                    value={evDate}
                    onChange={(e) => setEvDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Giờ bắt đầu
                  </label>
                  <input
                    type="time"
                    value={evTime}
                    onChange={(e) => setEvTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                {evType === 'meeting' ? (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Giờ kết thúc
                    </label>
                    <input
                      type="time"
                      value={evEndTime}
                      onChange={(e) => setEvEndTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Mức ưu tiên
                    </label>
                    <select
                      value={evPriority}
                      onChange={(e) =>
                        setEvPriority(e.target.value as 'low' | 'medium' | 'high')
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                      <option value="high">Cao</option>
                      <option value="medium">Trung bình</option>
                      <option value="low">Thấp</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Phạm vi
                  </label>
                  <select
                    value={evScope}
                    onChange={(e) =>
                      setEvScope(e.target.value as 'team' | 'global')
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="team">Đội {currentTeam.name}</option>
                    <option value="global">Toàn chương trình</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Địa điểm / Diễn giả / Mentor
                  </label>
                  <input
                    type="text"
                    value={evLocation}
                    onChange={(e) => setEvLocation(e.target.value)}
                    placeholder="BTC · Mentor · Discord..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Link liên quan (Meet / Discord / Tài liệu / Nộp bài)
                </label>
                <input
                  type="url"
                  value={evLink}
                  onChange={(e) => setEvLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Mô tả chi tiết
                </label>
                <textarea
                  rows={2}
                  value={evDesc}
                  onChange={(e) => setEvDesc(e.target.value)}
                  placeholder="Ghi chú nội dung cần chuẩn bị..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Lưu sự kiện
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Admin Configure Daily Standup Schedule & Window */}
      {isAdmin && showStandupConfigModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          onClick={() => setShowStandupConfigModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Cấu hình lịch &amp; khung giờ Daily Standup
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Chọn ngày bắt đầu áp dụng, các ngày trong tuần và khung giờ được phép nộp bài.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStandupConfigModal(false)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateSystemConfig({
                  standupStartTime: cfgStandupStartTime,
                  standupDeadlineTime: cfgStandupDeadlineTime,
                  standupStartDate: cfgStandupStartDate,
                  standupEndDate: cfgStandupEndDate,
                  standupDaysOfWeek: cfgStandupDays,
                  allowLateStandup: cfgAllowLateStandup,
                  allowBackdateStandup: cfgAllowBackdateStandup,
                });
                setShowStandupConfigModal(false);
              }}
              className="mt-4 space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Được phép nộp từ giờ
                  </label>
                  <input
                    type="time"
                    required
                    value={cfgStandupStartTime}
                    onChange={(e) => setCfgStandupStartTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Đến giờ (Hạn chót)
                  </label>
                  <input
                    type="time"
                    required
                    value={cfgStandupDeadlineTime}
                    onChange={(e) => setCfgStandupDeadlineTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Bắt đầu áp dụng từ ngày
                </label>
                <input
                  type="date"
                  value={cfgStandupStartDate}
                  onChange={(e) => setCfgStandupStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCfgStandupStartDate(todayISO)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Từ hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={() => setCfgStandupStartDate(addDaysISO(todayISO, 1))}
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
                  Kết thúc vào ngày (tùy chọn)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={cfgStandupEndDate}
                    onChange={(e) => setCfgStandupEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
                  />
                  {cfgStandupEndDate && (
                    <button
                      type="button"
                      onClick={() => setCfgStandupEndDate('')}
                      className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Các ngày trong tuần có Standup
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCfgStandupDays([1, 2, 3, 4, 5, 6, 0])}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cả tuần
                    </button>
                    <button
                      type="button"
                      onClick={() => setCfgStandupDays([1, 2, 3, 4, 5])}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      T2–T6
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STANDUP_WEEKDAY_OPTIONS.map((opt) => {
                    const active = cfgStandupDays.includes(opt.day);
                    return (
                      <button
                        key={opt.day}
                        type="button"
                        onClick={() =>
                          setCfgStandupDays((prev) =>
                            prev.includes(opt.day)
                              ? prev.length > 1
                                ? prev.filter((d) => d !== opt.day)
                                : prev
                              : [...prev, opt.day]
                          )
                        }
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
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

              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={cfgAllowLateStandup}
                    onChange={(e) => setCfgAllowLateStandup(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  Cho phép thành viên nộp sau giờ hạn chót
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={cfgAllowBackdateStandup}
                    onChange={(e) => setCfgAllowBackdateStandup(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  Cho phép thành viên chọn lại ngày nộp khác
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowStandupConfigModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Lưu lịch Standup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
