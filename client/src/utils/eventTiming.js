/**
 * Checks whether an event has concluded or its date/time has passed.
 *
 * @param {Object} event Event document or object
 * @returns {boolean}
 */
export function isEventPastOrCompleted(event) {
  if (!event) return false;
  if (event.status === "completed") return true;
  if (!event.date) return false;

  const eventDate = new Date(event.date);
  if (isNaN(eventDate.getTime())) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());

  if (targetDate < today) return true;
  if (targetDate > today) return false;

  // Same day: check end time if available
  if (event.endTime && typeof event.endTime === "string" && event.endTime.trim()) {
    const raw = event.endTime.trim();
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

