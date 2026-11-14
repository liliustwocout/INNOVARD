'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  formatCountdownLabel,
  formatMonthYearVI,
  formatVietnameseDate,
  getMonthGrid,
  getTodayISO,
} from '@/lib/date-utils';
import type { CalendarEvent } from '@/types/innovard';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function CalendarPage() {
  const { currentTeam, events, addCalendarEvent, deleteCalendarEvent } = useApp();

  const todayISO = getTodayISO();
  const initialDate = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [showDayPopup, setShowDayPopup] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'deadline' | 'meeting'>('all');

  // Add event modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [evDate, setEvDate] = useState(todayISO);
  const [evTime, setEvTime] = useState('20:00');
  const [evType, setEvType] = useState<'deadline' | 'meeting'>('meeting');
  const [evPriority, setEvPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [evScope, setEvScope] = useState<'team' | 'global'>('team');
  const [evLink, setEvLink] = useState('');
  const [evLocation, setEvLocation] = useState('');

  const visibleEvents = useMemo(() => {
    return events
      .filter((e) => e.teamId === null || e.teamId === currentTeam.id)
      .filter((e) => typeFilter === 'all' || e.type === typeFilter)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [events, currentTeam.id, typeFilter]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of visibleEvents) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [visibleEvents]);

  const gridCells = useMemo(
    () => getMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const selectedDayEvents = useMemo(
    () => eventsByDate.get(selectedDate) ?? [],
    [eventsByDate, selectedDate]
  );

  const deadlineCount = visibleEvents.filter((e) => e.type === 'deadline').length;
  const meetingCount = visibleEvents.filter((e) => e.type === 'meeting').length;

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(getTodayISO());
  };

  const handleOpenAddForDate = (dateStr?: string) => {
    setEvDate(dateStr || selectedDate || todayISO);
    setShowDayPopup(false);
    setShowAddModal(true);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) return;
    addCalendarEvent({
      teamId: evScope === 'team' ? currentTeam.id : null,
      title: evTitle.trim(),
      description: evDesc.trim(),
      date: evDate || todayISO,
      time: evTime || '23:59',
      type: evType,
      priority: evPriority,
      meetingLink: evLink.trim() || undefined,
      location: evType === 'meeting' ? evLocation.trim() || undefined : undefined,
    });
    setSelectedDate(evDate || todayISO);
    setEvTitle('');
    setEvDesc('');
    setEvLink('');
    setEvLocation('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Lịch sự kiện
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Trực quan hóa toàn bộ Deadline và Lịch họp của đội {currentTeam.name} & chương trình INNOVARD.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenAddForDate()}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 sm:text-sm"
        >
          Thêm Deadline / Lịch họp
        </button>
      </div>

      {/* Legend & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: `Tất cả (${visibleEvents.length})` },
              { id: 'deadline', label: `Deadline (${deadlineCount})` },
              { id: 'meeting', label: `Lịch họp (${meetingCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                typeFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            Deadline nộp bài
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
            Lịch họp nhóm / Mentor
          </span>
        </div>
      </div>

      {/* Full-width Monthly Calendar Grid */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              {formatMonthYearVI(viewYear, viewMonth)}
            </h2>
            <p className="text-xs text-slate-500">
              Nhấn vào từng ngày trên lịch để xem chi tiết thông tin và liên kết
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={goPrevMonth}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Tháng trước
            </button>
            <button
              type="button"
              onClick={goToday}
              className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={goNextMonth}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Tháng sau
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 sm:text-sm">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>

        {/* 6x7 Expanded Month Cells */}
        <div className="grid grid-cols-7 gap-2">
          {gridCells.map((cell) => {
            const dayEvents = eventsByDate.get(cell.dateStr) ?? [];
            const isToday = cell.dateStr === todayISO;
            const isSelected = cell.dateStr === selectedDate && showDayPopup;

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => {
                  setSelectedDate(cell.dateStr);
                  setShowDayPopup(true);
                }}
                className={`group flex min-h-28 flex-col items-stretch rounded-2xl border p-2 text-left transition sm:min-h-36 sm:p-3 ${
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
                  {dayEvents.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {dayEvents.length} sự kiện
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-1.5 overflow-hidden">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className={`truncate rounded-lg px-2 py-1 text-[11px] font-semibold ${
                        ev.type === 'deadline'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                      title={ev.title}
                    >
                      {ev.time} · {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="px-1 text-[11px] font-semibold text-indigo-600">
                      +{dayEvents.length - 3} sự kiện khác
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Day Detail Popup Modal */}
      {showDayPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          onClick={() => setShowDayPopup(false)}
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
                    {formatCountdownLabel(selectedDate).text}
                  </span>
                </div>
                <h3 className="mt-1.5 text-xl font-bold text-slate-900">
                  {formatVietnameseDate(selectedDate)}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAddForDate(selectedDate)}
                  className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Thêm sự kiện
                </button>
                <button
                  type="button"
                  onClick={() => setShowDayPopup(false)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-3.5">
              {selectedDayEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    Không có deadline hay lịch họp nào trong ngày{' '}
                    {formatVietnameseDate(selectedDate)}.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenAddForDate(selectedDate)}
                    className="mt-3 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                  >
                    Tạo sự kiện cho ngày này
                  </button>
                </div>
              ) : (
                selectedDayEvents.map((ev) => (
                  <article
                    key={ev.id}
                    className={`rounded-2xl border p-4 sm:p-5 ${
                      ev.type === 'deadline'
                        ? 'border-rose-200 bg-rose-50/40'
                        : 'border-indigo-200 bg-indigo-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            ev.type === 'deadline'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {ev.type === 'deadline' ? 'Deadline' : 'Lịch họp'}
                        </span>

                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
                          Giờ: {ev.time}
                        </span>

                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-2xs">
                          {ev.teamId ? currentTeam.name : 'Toàn chương trình'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteCalendarEvent(ev.id)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      >
                        Xóa
                      </button>
                    </div>

                    <h4 className="mt-3 text-base font-bold text-slate-900">
                      {ev.title}
                    </h4>

                    {ev.description && (
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                        {ev.description}
                      </p>
                    )}

                    {(ev.location || ev.meetingLink) && (
                      <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-slate-200/70 pt-3 text-xs">
                        {ev.location && (
                          <span className="rounded-lg bg-white px-3 py-1.5 font-medium text-slate-700 shadow-2xs">
                            Địa điểm: {ev.location}
                          </span>
                        )}
                        {ev.meetingLink && (
                          <a
                            href={ev.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white shadow-2xs transition hover:bg-indigo-700"
                          >
                            Mở link: {ev.meetingLink}
                          </a>
                        )}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Calendar Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Thêm Deadline / Lịch họp mới
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
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setEvType('deadline')}
                  className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                    evType === 'deadline'
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Deadline nộp bài
                </button>
                <button
                  type="button"
                  onClick={() => setEvType('meeting')}
                  className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                    evType === 'meeting'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Lịch họp nhóm / Mentor
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
                  placeholder="Ví dụ: Deadline nộp Slide Demo"
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
                    Giờ
                  </label>
                  <input
                    type="time"
                    value={evTime}
                    onChange={(e) => setEvTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
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
              </div>

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

              <div className="grid gap-3 sm:grid-cols-2">
                <div className={evType === 'meeting' ? '' : 'sm:col-span-2'}>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Link liên quan (Discord / Meet / Tài liệu / Nộp bài)
                  </label>
                  <input
                    type="url"
                    value={evLink}
                    onChange={(e) => setEvLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                {evType === 'meeting' && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Địa điểm / Kênh họp
                    </label>
                    <input
                      type="text"
                      value={evLocation}
                      onChange={(e) => setEvLocation(e.target.value)}
                      placeholder="Discord #alpha-voice"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
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
    </div>
  );
}
