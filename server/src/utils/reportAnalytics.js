/**
 * Computes all registration, attendance, department-wise, and college-wise
 * analytics for an event from real registration documents.
 *
 * @param {Array<Object>} registrations Array of registration documents
 * @returns {Object}
 */
export function calculateReportAnalytics(registrations = []) {
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
  };
}
