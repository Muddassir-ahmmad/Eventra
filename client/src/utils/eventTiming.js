/**
 * Checks whether an event has concluded or its date/time has passed.
 * Accurately supports both single-day and multi-day events.
 *
 * @param {Object} event Event document or object
 * @returns {boolean}
 */
export function isEventPastOrCompleted(event) {
  if (!event) return false;
  if (event.status === "completed") return true;

  const isMulti = event.eventDurationType === "multi_day" || Boolean(event.endDate && event.endDate !== event.date);
  const targetDateRaw = isMulti
    ? (event.endDate || (Array.isArray(event.days) && event.days.length > 0 ? event.days[event.days.length - 1]?.date : null) || event.date)
    : (event.date || event.startDate);

  if (!targetDateRaw) return false;

  const eventDate = new Date(targetDateRaw);
  if (isNaN(eventDate.getTime())) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());

  if (targetDate < today) return true;
  if (targetDate > today) return false;

  // Same day: check end time if available (or last day's end time for multi-day)
  let lastEndTime = event.endTime;
  if (isMulti && Array.isArray(event.days) && event.days.length > 0) {
    const lastDay = event.days[event.days.length - 1];
    if (lastDay?.endTime) lastEndTime = lastDay.endTime;
  }

  if (lastEndTime && typeof lastEndTime === "string" && lastEndTime.trim()) {
    const raw = lastEndTime.trim();
    const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = match[3]?.toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;

      const endToday = new Date();
      endToday.setHours(hours, minutes, 0, 0);
      return now > endToday;
    }
  }

  return false;
}

/**
 * Returns total days count for single-day or multi-day event.
 *
 * @param {Object} event
 * @returns {number}
 */
export function getEventTotalDays(event) {
  if (!event) return 1;
  if (Array.isArray(event.days) && event.days.length > 0) {
    return event.days.length;
  }
  if (event.eventDurationType === "multi_day" && event.startDate && event.endDate) {
    const s = new Date(event.startDate).getTime();
    const e = new Date(event.endDate).getTime();
    if (!isNaN(s) && !isNaN(e) && e >= s) {
      return Math.round((e - s) / 86400000) + 1;
    }
  }
  return 1;
}

/**
 * Formats a clean single-day or multi-day range label (e.g. "Nov 15, 2026" or "Nov 15 – Nov 17, 2026").
 *
 * @param {Object} event
 * @returns {string}
 */
export function formatEventDateDisplay(event) {
  if (!event) return "Event Date";
  const startRaw = event.startDate || event.date;
  const isMulti = event.eventDurationType === "multi_day" || Boolean(event.endDate && event.endDate !== event.date);

  const fmt = (d) => {
    if (!d) return "";
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(d));
  };

  if (!isMulti || !event.endDate) {
    return fmt(startRaw) || "Event Date";
  }

  const sStr = fmt(startRaw);
  const eStr = fmt(event.endDate);
  if (!sStr) return eStr || "Event Date";
  if (!eStr || sStr === eStr) return sStr;

  return `${sStr} – ${eStr}`;
}
