/**
 * Computes all registration, attendance, department-wise, and college-wise
 * analytics for an event from real registration documents, plus actual feedback metrics.
 *
 * @param {Array<Object>} registrations Array of registration documents
 * @param {Array<Object>} feedbacks Array of feedback documents
 * @returns {Object}
 */
export function calculateReportAnalytics(registrations = [], feedbacks = []) {
  const totalRegistrations = registrations.length;
  const confirmed = registrations.filter((r) => r.status === "confirmed");
  const cancelled = registrations.filter((r) => r.status === "cancelled");
  const attended = confirmed.filter((r) => r.checkedIn === true);
  const absent = confirmed.filter((r) => r.checkedIn !== true);

  const confirmedCount = confirmed.length;
  const cancelledCount = cancelled.length;
  const attendedCount = attended.length;
  const absentCount = absent.length;

  // Attendance rate: (Checked-in participants / Confirmed registrations) * 100
  const attendanceRate = confirmedCount > 0
    ? Math.round((attendedCount / confirmedCount) * 1000) / 10
    : 0;

  // Registration-to-attendance rate
  const registrationToAttendanceRate = totalRegistrations > 0
    ? Math.round((attendedCount / totalRegistrations) * 1000) / 10
    : 0;

  // Department-wise breakdown (confirmed only)
  const departmentCounts = {};
  for (const r of confirmed) {
    const rawDept = (r.department || "General / Unspecified").trim();
    const dept = rawDept || "General / Unspecified";
    if (!departmentCounts[dept]) {
      departmentCounts[dept] = { registered: 0, attended: 0, absent: 0 };
    }
    departmentCounts[dept].registered += 1;
    if (r.checkedIn) {
      departmentCounts[dept].attended += 1;
    } else {
      departmentCounts[dept].absent += 1;
    }
  }

  // College-wise breakdown (confirmed only)
  const collegeCounts = {};
  for (const r of confirmed) {
    const rawCol = (r.college || "General / Unspecified").trim();
    const col = rawCol || "General / Unspecified";
    if (!collegeCounts[col]) {
      collegeCounts[col] = { registered: 0, attended: 0, absent: 0 };
    }
    collegeCounts[col].registered += 1;
    if (r.checkedIn) {
      collegeCounts[col].attended += 1;
    } else {
      collegeCounts[col].absent += 1;
    }
  }

  // Feedback Metrics
  const feedbackSubmissions = feedbacks.length;
  const feedbackResponseRate = confirmedCount > 0
    ? Math.round((feedbackSubmissions / confirmedCount) * 1000) / 10
    : 0;

  let avgRatingOverall = 0;
  let avgRatingOrg = 0;
  let avgRatingSpeakers = 0;
  let avgRatingVenue = 0;
  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  if (feedbackSubmissions > 0) {
    let sumOverall = 0;
    let sumOrg = 0;
    let sumSpeakers = 0;
    let sumVenue = 0;

    for (const f of feedbacks) {
      sumOverall += (f.ratingOverall || 0);
      sumOrg += (f.ratingOrganization || 0);
      sumSpeakers += (f.ratingSpeakers || 0);
      sumVenue += (f.ratingVenue || 0);

      const r = f.ratingOverall;
      if (ratingDistribution[r] !== undefined) {
        ratingDistribution[r]++;
      }
    }

    avgRatingOverall = Math.round((sumOverall / feedbackSubmissions) * 10) / 10;
    avgRatingOrg = Math.round((sumOrg / feedbackSubmissions) * 10) / 10;
    avgRatingSpeakers = Math.round((sumSpeakers / feedbackSubmissions) * 10) / 10;
    avgRatingVenue = Math.round((sumVenue / feedbackSubmissions) * 10) / 10;
  }

  const feedbackLiked = feedbacks.map((f) => f.liked).filter(Boolean).slice(0, 5);
  const feedbackImprovements = feedbacks.map((f) => f.improvements).filter(Boolean).slice(0, 5);
  const feedbackSuggestions = feedbacks.map((f) => f.suggestions).filter(Boolean).slice(0, 5);

  return {
    totalRegistrations,
    confirmedCount,
    cancelledCount,
    attendedCount,
    absentCount,
    attendanceRate,
    registrationToAttendanceRate,
    departmentCounts,
    collegeCounts,
    feedbackSubmissions,
    feedbackResponseRate,
    avgRatingOverall,
    avgRatingOrg,
    avgRatingSpeakers,
    avgRatingVenue,
    ratingDistribution,
    feedbackLiked,
    feedbackImprovements,
    feedbackSuggestions,
  };
}
