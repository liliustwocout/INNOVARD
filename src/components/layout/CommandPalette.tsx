'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Compass, CornerDownLeft, History, Plus, Search, Send } from 'lucide-react';
import {
  matchesQuery,
  sortByFrequency,
  type NavItem,
  type VisitCounts,
} from '@/lib/navigation';

interface PaletteEntry {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  keywords: string;
  run: () => void;
}

interface PaletteSection {
  id: string;
  label: string;
  entries: PaletteEntry[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  visitCounts: VisitCounts;
  onNavigate: (href: string) => void;
  onStartTour: () => void;
}

/**
 * Jakob's law (Ctrl/⌘ K like every modern tool), Hick's & Miller's law (short, chunked
 * sections), Postel's law (accent-insensitive search), frequency of use (most-visited first).
 */
export function CommandPalette({
  open,
  onClose,
  items,
  visitCounts,
  onNavigate,
  onStartTour,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const sections: PaletteSection[] = useMemo(() => {
    const go = (href: string) => () => onNavigate(href);

    const pageEntries: PaletteEntry[] = items.map((item) => ({
      id: `page:${item.href}`,
      label: item.label,
      hint: 'Trang',
      icon: item.icon,
      keywords: `${item.label} ${item.keywords}`,
      run: go(item.href),
    }));

    const actionEntries: PaletteEntry[] = [
      {
        id: 'action:standup',
        label: 'Nộp Daily Standup hôm nay',
        hint: 'Thao tác',
        icon: Send,
        keywords: 'nop standup daily hom nay bao cao',
        run: go('/project/submissions'),
      },
      {
        id: 'action:task',
        label: 'Tạo task mới',
        hint: 'Thao tác',
        icon: Plus,
        keywords: 'tao task moi cong viec them',
        run: go('/project/progress'),
      },
      {
        id: 'action:event',
        label: 'Thêm deadline hoặc lịch họp',
        hint: 'Thao tác',
        icon: Plus,
        keywords: 'them su kien deadline lich hop meeting',
        run: go('/calendar'),
      },
      {
        id: 'action:tour',
        label: 'Xem hướng dẫn sử dụng',
        hint: 'Thao tác',
        icon: Compass,
        keywords: 'huong dan tour onboarding help tro giup',
        run: onStartTour,
      },
    ];

    const q = query.trim();
    if (q) {
      const matched = [...pageEntries, ...actionEntries].filter((e) =>
        matchesQuery(e.keywords, q)
      );
      return matched.length ? [{ id: 'results', label: 'Kết quả', entries: matched }] : [];
    }

    const frequent = sortByFrequency(items, visitCounts)
      .filter((item) => (visitCounts[item.href] ?? 0) > 0)
      .slice(0, 3)
      .map((item) => ({
        id: `recent:${item.href}`,
        label: item.label,
        hint: `${visitCounts[item.href]} lượt`,
        icon: History,
        keywords: item.label,
        run: go(item.href),
      }));

    const result: PaletteSection[] = [];
    if (frequent.length) result.push({ id: 'frequent', label: 'Hay dùng', entries: frequent });
    result.push({ id: 'actions', label: 'Thao tác nhanh', entries: actionEntries });
    result.push({ id: 'pages', label: 'Tất cả trang', entries: pageEntries });
    return result;
  }, [items, visitCounts, query, onNavigate, onStartTour]);

  const flat = useMemo(() => sections.flatMap((s) => s.entries), [sections]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const runEntry = (entry: PaletteEntry | undefined) => {
    if (!entry) return;
    onClose();
    entry.run();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runEntry(flat[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let runningIndex = -1;

  return (
    <div
      className="ui-overlay fixed inset-0 z-[90] flex items-start justify-center bg-slate-950/45 px-4 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bảng lệnh"
        onKeyDown={handleKeyDown}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm trang hoặc thao tác (gõ không dấu cũng được)"
            aria-label="Tìm trang hoặc thao tác"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={flat[activeIndex] ? `cmd-${flat[activeIndex].id}` : undefined}
            className="h-13 w-full bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus-visible:outline-none"
          />
          <kbd className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
            Esc
          </kbd>
        </div>

        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          className="max-h-[min(60vh,420px)] overflow-y-auto p-2"
        >
          {flat.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm font-semibold text-slate-800">
                Không có kết quả cho “{query}”
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Thử từ khoá ngắn hơn, ví dụ “standup”, “lich”, “doi”.
              </p>
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.id} className="mb-1 last:mb-0">
                <p className="px-3 pt-2 pb-1 text-xs font-medium text-slate-500">
                  {section.label}
                </p>
                {section.entries.map((entry) => {
                  runningIndex += 1;
                  const index = runningIndex;
                  const isActive = index === activeIndex;
                  const Icon = entry.icon;
                  return (
                    <button
                      key={entry.id}
                      id={`cmd-${entry.id}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      data-index={index}
                      onMouseMove={() => setActiveIndex(index)}
                      onClick={() => runEntry(entry)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                        isActive ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                          isActive
                            ? 'border-indigo-200 bg-white text-indigo-600'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        <Icon aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{entry.label}</span>
                      <span className="shrink-0 text-xs text-slate-400">{entry.hint}</span>
                      <CornerDownLeft
                        aria-hidden="true"
                        className={`h-3.5 w-3.5 shrink-0 transition-opacity ${
                          isActive ? 'text-indigo-500 opacity-100' : 'opacity-0'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
          <span>
            <kbd className="font-semibold text-slate-600">↑ ↓</kbd> chọn
          </span>
          <span>
            <kbd className="font-semibold text-slate-600">Enter</kbd> mở
          </span>
          <span>
            <kbd className="font-semibold text-slate-600">Ctrl K</kbd> bật/tắt
          </span>
        </div>
      </div>
    </div>
  );
}
