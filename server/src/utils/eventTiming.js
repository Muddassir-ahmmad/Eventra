/**
 * Calculates the completion timestamp of an event based on its date,
 * start time, and end time.
 *
 * @param {Object} event Mongoose event document or plain object
 * @returns {Date|null}
 */
export function getEventEndDateTime(event) {
  if (!event || !event.date) return null;
  const baseDate = new Date(event.date);
  if (isNaN(baseDate.getTime())) return null;

  if (event.endTime && typeof event.endTime === "string" && event.endTime.trim()) {
    const raw = event.endTime.trim();
    // Matches "18:00", "06:30 PM", "9:45 am"
    const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = match[3]?.toUpperCase();

      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;

      const end = new Date(baseDate);
      end.setUTCHours(hours, minutes, 0, 0);
      return end;
    }
  }

  // Fallback: If startTime is present but no endTime, assume 3 hours duration
  if (event.startTime && typeof event.startTime === "string" && event.startTime.trim()) {
    const rawStart = event.startTime.trim();
    const startMatch = rawStart.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
    if (startMatch) {
      let hours = parseInt(startMatch[1], 10);
      const minutes = parseInt(startMatch[2], 10);
      const ampm = startMatch[3]?.toUpperCase();

      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;

      const end = new Date(baseDate);
      end.setUTCHours(hours + 3, minutes, 0, 0);
      return end;
    }
  }

  // Fallback to the end of the specified event date in UTC
  const endOfDay = new Date(baseDate);
  endOfDay.setUTCHours(23, 59, 59, 999);
  return endOfDay;
}

/**
 * Checks whether an event has ended and is eligible for post-event reporting.
 *
 * @param {Object} event Mongoose event document or plain object
 * @param {Date} [currentTime=new Date()]
 * @returns {boolean}
 */
export function isEventCompleted(event, currentTime = new Date()) {
  if (!event) return false;
  // If explicitly closed by the organizer, report is available
  if (event.status === "closed" || event.status === "completed") return true;

  const end = getEventEndDateTime(event);
  if (!end) return false;

  return currentTime.getTime() >= end.getTime();
}
