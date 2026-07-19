const GOOGLE_EVENT_STATUSES = {
  cancelled: 'https://schema.org/EventCancelled',
  postponed: 'https://schema.org/EventPostponed',
  scheduled: 'https://schema.org/EventScheduled',
};

export function isoDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || '').slice(0, 10);
}

export function isCurrentOrFutureEvent(endDate, today = new Date()) {
  const eventDate = isoDate(endDate);
  const currentDate = isoDate(today);

  return /^\d{4}-\d{2}-\d{2}$/.test(eventDate) && eventDate >= currentDate;
}

export function googleEventStatus(value) {
  return GOOGLE_EVENT_STATUSES[String(value || '').toLowerCase()]
    ?? GOOGLE_EVENT_STATUSES.scheduled;
}

export function googleEventOffer({ price, eventStatus, startDate, url, name }) {
  const validFrom = isoDate(startDate);

  if (
    typeof price !== 'number'
    || !Number.isFinite(price)
    || !/^\d{4}-\d{2}-\d{2}$/.test(validFrom)
  ) {
    return null;
  }

  return {
    '@type': 'Offer',
    price,
    priceCurrency: 'EUR',
    availability: eventStatus === GOOGLE_EVENT_STATUSES.scheduled
      ? 'https://schema.org/InStock'
      : 'https://schema.org/SoldOut',
    validFrom,
    url,
    ...(name ? { name } : {}),
  };
}
