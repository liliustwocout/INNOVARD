export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatVietnameseDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatVietnameseWeekdayDayMonth(dateStr: string): string {
  if (!dateStr) return '';
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return formatVietnameseDate(dateStr);
  const weekdays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dayName = weekdays[target.getDay()];
  const day = String(target.getDate()).padStart(2, '0');
  const month = String(target.getMonth() + 1).padStart(2, '0');
  return `${dayName}, ${day}/${month}`;
}

export function formatLiveCountdown(
  dateStr: string,
  timeStr: string,
  nowMs: number
): { text: string; tone: 'urgent' | 'soon' | 'normal' | 'past' } {
  const normalizedTime = timeStr && /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : '23:59';
  const targetMs = new Date(`${dateStr}T${normalizedTime}:00`).getTime();
  if (Number.isNaN(targetMs)) {
    return { text: formatVietnameseDate(dateStr), tone: 'normal' };
  }

  const diffSec = Math.floor((targetMs - nowMs) / 1000);
  if (diffSec <= 0) {
    return { text: 'Đã qua hạn', tone: 'past' };
  }

  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (days === 0) {
    return { text: `${hh}:${mm}:${ss}`, tone: 'urgent' };
  }
  if (days <= 2) {
    return { text: `${days}n ${hh}:${mm}:${ss}`, tone: 'soon' };
  }
  return { text: `${days}n ${hh}:${mm}:${ss}`, tone: 'normal' };
}

export function getDaysRemaining(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function formatCountdownLabel(dateStr: string): {
  text: string;
  tone: 'urgent' | 'soon' | 'normal' | 'past';
} {
  const days = getDaysRemaining(dateStr);
  if (days < 0) return { text: `Quá hạn ${Math.abs(days)} ngày`, tone: 'past' };
  if (days === 0) return { text: 'Hôm nay', tone: 'urgent' };
  if (days === 1) return { text: 'Ngày mai', tone: 'urgent' };
  if (days <= 3) return { text: `Còn ${days} ngày`, tone: 'soon' };
  return { text: `Còn ${days} ngày`, tone: 'normal' };
}

export function getMonthGrid(
  year: number,
  monthIndex: number
): Array<{ dateStr: string; day: number; inMonth: boolean }> {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;
  const startDate = new Date(year, monthIndex, 1 - startWeekday);

  const cells: Array<{ dateStr: string; day: number; inMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + i);
    const y = cellDate.getFullYear();
    const m = String(cellDate.getMonth() + 1).padStart(2, '0');
    const d = String(cellDate.getDate()).padStart(2, '0');
    cells.push({
      dateStr: `${y}-${m}-${d}`,
      day: cellDate.getDate(),
      inMonth: cellDate.getMonth() === monthIndex,
    });
  }
  return cells;
}

export function formatMonthYearVI(year: number, monthIndex: number): string {
  const months = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
  ];
  return `${months[monthIndex]} năm ${year}`;
}
