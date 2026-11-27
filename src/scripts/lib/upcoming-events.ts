export function berlinDate(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(now);
}

export function isFutureEvent(date: string | Date | undefined, now = new Date()) {
  if (!date) return false;
  const value = new Date(date);
  return Number.isFinite(value.getTime()) && value.toISOString().slice(0, 10) > berlinDate(now);
}

type CalendarEvent = { id: string; data: { status?: string; pubDate?: Date } };

export function upcomingEvents<T extends CalendarEvent>(events: T[], now = new Date()) {
  return events
    .filter(({ data }) => data.status === 'scheduled' && isFutureEvent(data.pubDate, now))
    .sort((a, b) => a.data.pubDate!.getTime() - b.data.pubDate!.getTime() || a.id.localeCompare(b.id));
}
