export function formatDate(date: Date): string {
  // MUUTOS: vaihdettu 'en-US' -> 'fi-FI'
  return date.toLocaleDateString('fi-FI', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

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

  // Muutettu: Suomalainen viikkojärjestys (Ma = 0, Ti = 1, ..., Su = 6)
  // JavaScript: Su = 0, Ma = 1, ..., Sa = 6
  // Muunnos: (jsDay + 6) % 7 antaa suomalaisen järjestyksen
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Ma = 0, Ti = 1, ..., Su = 6

  // Add previous month's days to fill the first week
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevDate = new Date(year, month, -i);
    days.push(prevDate);
  }

  // Add current month's days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  // Add next month's days to fill the last week
  const remainingDays = 42 - days.length; // 6 weeks * 7 days
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
  // MUUTOS: vaihdettu 'en-US' -> 'fi-FI'
  return date.toLocaleDateString('fi-FI', { month: 'long' });
}

export function getYear(date: Date): number {
  return date.getFullYear();
}
