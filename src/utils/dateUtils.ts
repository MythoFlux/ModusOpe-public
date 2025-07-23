// src/utils/dateUtils.ts
export function formatDate(date: Date): string {
  return date.toLocaleDateString('fi-FI', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('fi-FI', { // MUUTOS: vaihdettu 'en-US' -> 'fi-FI'
    hour: '2-digit',
    minute: '2-digit'
  });
}

// --- LISÄTTY UUSI FUNKTIO ALKAA ---
/**
 * Muotoilee ainoastaan kellonajan merkkijonosta (esim. "08:00:00") muotoon "08:00".
 * @param timeString Kellonaika merkkijonona.
 * @returns Kellonaika muodossa HH:mm.
 */
export function formatTimeString(timeString?: string): string {
  if (!timeString || !timeString.includes(':')) {
    return '';
  }
  const parts = timeString.split(':');
  return `${parts[0]}:${parts[1]}`;
}
// --- LISÄTTY UUSI FUNKTIO PÄÄTTYY ---

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function getDaysInMonth(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  const firstDayOfWeek = (firstDay.getDay() + 6) % 7;

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevDate = new Date(year, month, -i);
    days.push(prevDate);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  const remainingDays = 42 - days.length;
  for (let day = 1; day <= remainingDays; day++) {
    days.push(new Date(year, month + 1, day));
  }

  return days;
}

export function getWeekDates(date: Date): Date[] {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day;
  startOfWeek.setDate(diff);

  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const weekDate = new Date(startOfWeek);
    weekDate.setDate(startOfWeek.getDate() + i);
    weekDates.push(weekDate);
  }

  return weekDates;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function getMonthName(date: Date): string {
  return date.toLocaleDateString('fi-FI', { month: 'long' });
}

export function getYear(date: Date): number {
  return date.getFullYear();
}
