function formatDate(date) {
  if (!date) return "Event Date";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

/**
 * Pre-populates the 12 sections of the post-event report using actual
 * event information and calculated analytics.
 *
 * @param {Object} event Event document
 * @param {Object} organizer Organizer User document
 * @param {Object} analytics Analytics object
 * @returns {Object}
 */
export function generateDefaultReportContent(event, organizer, analytics) {
  const eventTitle = event.title || "The Event";
  const dateStr = formatDate(event.date);
  const venueStr = [event.venue, event.location].filter(Boolean).join(", ") || "the designated venue";
  const orgName = organizer?.organization || organizer?.name || "the Organizing Committee";

  const speakersList = (event.speakers || [])
    .filter((s) => s.name)
    .map((s) => {
      const details = [s.designation, s.organization].filter(Boolean).join(", ");
      return `- ${s.name}${details ? ` (${details})` : ""}${s.role ? ` – ${s.role}` : ""}`;
    })
    .join("\n");

  const volunteersSummary = (event.volunteerRoles || [])
    .filter((v) => v.name)
    .map((v) => `- ${v.name}: ${v.limit || 0} designated volunteer slots`)
    .join("\n");

  const executiveSummary =
    `The post-event evaluation for "${eventTitle}" provides a comprehensive overview of program execution, participant attendance, and outcomes achieved. ` +
    `Organized by ${orgName}, the event was conducted on ${dateStr} at ${venueStr}. ` +
    `A total of ${analytics.totalRegistrations} participants registered for the event (${analytics.confirmedCount} confirmed), ` +
    `with ${analytics.attendedCount} attendees present on-site via QR-verified check-in, yielding an attendance turnover of ${analytics.attendanceRate}%. ` +
    `Overall, the program met its core mission with strong engagement and seamless operations.`;

  const objectives =
    `- Deliver high-value, structured knowledge sessions centered on ${eventTitle}.\n` +
    `- Provide an interactive forum enabling peer collaboration and knowledge exchange.\n` +
    `- Maintain high operational standards in entry management, timekeeping, and participant support.\n` +
    `- Evaluate audience engagement through real-time check-in metrics and participant feedback.`;

  const eventOverview =
    `Event Name: ${eventTitle}\n` +
    `Date & Timing: ${dateStr}${event.startTime ? ` from ${event.startTime}` : ""}${event.endTime ? ` to ${event.endTime}` : ""}\n` +
    `Venue: ${venueStr}\n` +
    `Capacity: ${event.capacity} seats\n` +
    `Host / Organizer: ${orgName}\n` +
    `Event Type: ${event.eventType || "Academic / Professional Session"}\n` +
    `Description: ${event.description || event.shortDescription || "No detailed description provided."}`;

  const activities =
    `1. Registration & Verification: Attendees checked in through QR verification at entry counters.\n` +
    `2. Welcome & Inception: Opening remarks and introductory briefings delivered by the organizers.\n` +
    `3. Keynote & Presentations: Core technical and informational segments conducted according to the agenda.\n` +
    `4. Interactive Discussions: Floor opened for audience questions, problem solving, and peer interaction.\n` +
    `5. Wrap-Up & Formal Closing: Concluding remarks, acknowledgments, and issuance of participation credentials.`;

  const highlights =
    `- Successfully accommodated ${analytics.attendedCount} active attendees at ${venueStr}.\n` +
    `- Achieved an attendance conversion rate of ${analytics.attendanceRate}% of confirmed participants.\n` +
    `- Seamless QR code check-in operations with zero recorded admission bottlenecks.\n` +
    (speakersList ? `- Engaging sessions delivered by distinguished speakers and guests.\n` : ``) +
    `- High sustained attentiveness throughout the scheduled duration.`;

  const speakersSummary = speakersList
    ? `The following speakers and session contributors led presentations during the event:\n\n${speakersList}`
    : `No formal external guest speakers were listed in the event registry. The sessions were facilitated by the organizing committee members.`;

  const participantEngagement =
    `Participation was tracked via real-time QR attendance at admission checkpoints.\n\n` +
    `• Confirmed Registrations: ${analytics.confirmedCount}\n` +
    `• Verified Attendees: ${analytics.attendedCount}\n` +
    `• Absenteeism: ${analytics.absentCount} (${analytics.confirmedCount > 0 ? (100 - analytics.attendanceRate).toFixed(1) : 0}%)\n` +
    `• Cancelled Registrations: ${analytics.cancelledCount}\n\n` +
    (volunteersSummary ? `Volunteer Support Breakdown:\n${volunteersSummary}\n\n` : ``) +
    `Attendees demonstrated active involvement during key segments with consistent attendance across the scheduled timeline.`;

  const outcomes =
    `- Participants gained structured understanding and actionable takeaways relevant to ${eventTitle}.\n` +
    `- Direct interaction between attendees and organizers facilitated meaningful collaborative discussions.\n` +
    `- Successfully established attendance benchmarks for future editions of the program.`;

  const challenges =
    `- Time Management: Ensuring all agenda topics were comprehensively covered within the allotted end time.\n` +
    `- Absentee Follow-Up: Addressing the gap between confirmed registrations (${analytics.confirmedCount}) and attended participants (${analytics.attendedCount}).\n` +
    `- Facility Logistics: Continuous monitoring of seating capacity and technical audio-visual connectivity.`;

  const feedbackSummary =
    `Note: Formal in-app participant feedback surveys were not actively collected for this event. ` +
    `Informal floor feedback indicated strong appreciation for the content relevance, venue accessibility, and overall organization. ` +
    `Future editions will incorporate dedicated digital feedback surveys post-event.`;

  const futureImprovements =
    `1. Implement pre-event automated attendance reminders to improve attendance conversion rate beyond ${analytics.attendanceRate}%.\n` +
    `2. Expand hands-on interactive segments to deepen participant learning.\n` +
    `3. Introduce real-time digital participant polling and Q&A submission tools.\n` +
    `4. Distribute post-event satisfaction surveys immediately upon conclusion to capture granular feedback.`;

  const conclusion =
    `"${eventTitle}" was successfully concluded on ${dateStr}. ` +
    `Through disciplined planning and effective execution, ${orgName} fulfilled the event's primary objectives. ` +
    `The organizers extend sincere appreciation to all speakers, attendees, and supporting team members for their invaluable contribution to this event's success.`;

  return {
    executiveSummary,
    objectives,
    eventOverview,
    activities,
    highlights,
    speakersSummary,
    participantEngagement,
    outcomes,
    challenges,
    feedbackSummary,
    futureImprovements,
    conclusion,
  };
}
