function formatDate(value) {
  if (!value) return "Event Date";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

const baseStyles = `
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; line-height: 1.6; }
  .email-wrapper { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
  .email-header { background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); color: #ffffff; padding: 32px 28px; text-align: left; }
  .brand-pill { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; background: rgba(255, 255, 255, 0.2); padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px; }
  .email-header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 800; line-height: 1.25; }
  .email-header p { margin: 0; opacity: 0.9; font-size: 14px; }
  .email-body { padding: 32px 28px; }
  .greeting { font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 16px; color: #0f172a; }
  .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
  .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px; }
  .info-row:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
  .info-label { color: #64748b; font-weight: 600; }
  .info-value { color: #0f172a; font-weight: 700; text-align: right; }
  .reg-badge { background: #f0fdfa; border: 1px solid #99f6e4; color: #0f766e; padding: 6px 14px; border-radius: 6px; font-family: monospace; font-size: 15px; font-weight: 700; display: inline-block; }
  .btn { display: inline-block; background: #0f766e; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 14px; margin-top: 20px; text-align: center; }
  .qr-container { text-align: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; display: inline-block; }
  .email-footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; font-size: 12px; color: #94a3b8; text-align: center; }
`;

/**
 * Registration Confirmation Email Template
 */
export function renderRegistrationConfirmationEmail({ event, registration, clientUrl = "http://localhost:5173" }) {
  const dateStr = formatDate(event.date);
  const timeStr = event.startTime
    ? `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ""}`
    : "Scheduled Event Time";
  const cleanLocation = event.location && !/^https?:\/\//i.test(event.location.trim()) ? event.location.trim() : "";
  const venueStr = [event.venue, cleanLocation].filter(Boolean).join(", ") || "Main Venue";
  const eventLink = `${clientUrl}/events/${event.slug}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Confirmed - ${event.title}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <span class="brand-pill">EVENTRA REGISTRATION</span>
      <h1>Registration Confirmed!</h1>
      <p>${event.title}</p>
    </div>
    <div class="email-body">
      <p class="greeting">Hello ${registration.name},</p>
      <p>Your registration for <strong>${event.title}</strong> has been successfully processed and confirmed.</p>
      
      <div style="text-align: center; margin: 20px 0;">
        <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 6px; font-weight: 600;">YOUR REGISTRATION ID</span>
        <span class="reg-badge">${registration.registrationId}</span>
      </div>

      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Event:</span>
          <span class="info-value">${event.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date:</span>
          <span class="info-value">${dateStr}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Timing:</span>
          <span class="info-value">${timeStr}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Venue:</span>
          <span class="info-value">${venueStr}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Attendee:</span>
          <span class="info-value">${registration.name}</span>
        </div>
        ${registration.department ? `
        <div class="info-row">
          <span class="info-label">Department:</span>
          <span class="info-value">${registration.department}</span>
        </div>` : ""}
      </div>

      <p style="font-size: 14px; color: #475569;">
        Please keep this confirmation handy. Your admission ticket and QR verification code have been prepared and can be accessed on the event portal.
      </p>

      <div style="text-align: center;">
        <a href="${eventLink}" class="btn">View Event Details & Ticket</a>
      </div>
    </div>
    <div class="email-footer">
      Sent by EVENTRA Smart Event Management Platform &middot; Verified Digital Registration
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Registration Confirmed: ${event.title}
Hello ${registration.name},

Your registration for ${event.title} has been confirmed.

Registration ID: ${registration.registrationId}
Date: ${dateStr}
Time: ${timeStr}
Venue: ${venueStr}

View event: ${eventLink}

Thank you,
EVENTRA Team
  `.trim();

  return { subject: `Registration Confirmed: ${event.title}`, html, text };
}

/**
 * Digital Ticket Email Template
 */
export function renderTicketEmail({ event, registration, qrDataUrl, clientUrl = "http://localhost:5173" }) {
  const dateStr = formatDate(event.date);
  const timeStr = event.startTime
    ? `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ""}`
    : "Standard Entry Timing";
  const cleanLocation = event.location && !/^https?:\/\//i.test(event.location.trim()) ? event.location.trim() : "";
  const venueStr = [event.venue, cleanLocation].filter(Boolean).join(", ") || "Main Venue";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Digital Ticket - ${event.title}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <span class="brand-pill">EVENTRA ADMISSION PASS</span>
      <h1>Your Digital Ticket</h1>
      <p>${event.title}</p>
    </div>
    <div class="email-body">
      <p class="greeting">Hello ${registration.name},</p>
      <p>Here is your digital ticket and entry pass for <strong>${event.title}</strong>. A PDF copy of your ticket is also attached to this email.</p>

      <div style="text-align: center; margin: 24px 0;">
        <div class="qr-container">
          ${qrDataUrl ? `<img src="${qrDataUrl}" alt="Admission QR Code" width="160" height="160" style="display:block; margin: 0 auto;" />` : `<div style="font-family: monospace; font-size: 20px; font-weight: bold; color: #0f766e;">${registration.registrationId}</div>`}
          <span style="font-size: 13px; font-family: monospace; font-weight: 700; color: #0f766e; display: block; margin-top: 8px;">${registration.registrationId}</span>
          <span style="font-size: 11px; color: #94a3b8; display: block;">SCAN AT ENTRANCE FOR CHECK-IN</span>
        </div>
      </div>

      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Event:</span>
          <span class="info-value">${event.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date & Time:</span>
          <span class="info-value">${dateStr} &middot; ${timeStr}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Venue:</span>
          <span class="info-value">${venueStr}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Attendee:</span>
          <span class="info-value">${registration.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="info-value" style="color: #15803d;">Confirmed Admission</span>
        </div>
      </div>

      <p style="font-size: 13px; color: #64748b; text-align: center;">
        Please have this QR code or the attached PDF ticket ready on your device when arriving at the venue.
      </p>
    </div>
    <div class="email-footer">
      EVENTRA Smart Event Platform &middot; Fast Entry QR System
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Digital Ticket: ${event.title}
Attendee: ${registration.name}
Registration ID: ${registration.registrationId}
Date: ${dateStr}
Time: ${timeStr}
Venue: ${venueStr}

Your official ticket PDF is attached to this email. Please present it at the entrance for QR check-in.
  `.trim();

  return { subject: `Your Digital Ticket: ${event.title}`, html, text };
}

/**
 * Certificate Delivery Email Template
 */
export function renderCertificateEmail({ event, registration }) {
  const certificateTitle = event.certificateTitle || "Certificate of Participation";
  const dateStr = formatDate(event.date);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${certificateTitle} - ${event.title}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <span class="brand-pill">EVENTRA · EVENT CERTIFICATE</span>
      <h1>${certificateTitle}</h1>
      <p>${event.title}</p>
    </div>
    <div class="email-body">
      <p class="greeting">Congratulations, ${registration.name}!</p>
      <p>Thank you for participating in <strong>${event.title}</strong> conducted on ${dateStr}.</p>
      
      <p>
        In recognition of your active participation, your official certificate of completion has been generated and is attached to this email as a high-resolution PDF document.
      </p>

      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Recipient:</span>
          <span class="info-value">${registration.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Event:</span>
          <span class="info-value">${event.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Credential:</span>
          <span class="info-value">${certificateTitle}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Verification ID:</span>
          <span class="info-value">${registration.registrationId}</span>
        </div>
      </div>

      <p style="font-size: 14px; color: #475569;">
        You can download, print, or attach this credential to your professional portfolio and profiles.
      </p>
    </div>
    <div class="email-footer">
      Official Certificate Issued via EVENTRA Smart Event Platform &middot; Verified Credential
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Congratulations ${registration.name}!

Your official ${certificateTitle} for ${event.title} has been issued and is attached to this email.

Verification ID: ${registration.registrationId}
Event Date: ${dateStr}

EVENTRA Team
  `.trim();

  return { subject: `${certificateTitle} - ${event.title}`, html, text };
}

/**
 * Organizer New Registration Alert Template
 */
export function renderOrganizerNewRegistrationAlert({ event, registration, currentCount, capacity }) {
  const percent = Math.min(100, Math.round((currentCount / capacity) * 100));

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Registration - ${event.title}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%);">
      <span class="brand-pill">ORGANIZER ALERT</span>
      <h1>New Participant Registered</h1>
      <p>${event.title}</p>
    </div>
    <div class="email-body">
      <p class="greeting">Hello Organizer,</p>
      <p>A new participant has just registered for your event <strong>${event.title}</strong>.</p>

      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Participant:</span>
          <span class="info-value">${registration.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">${registration.email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">College / Org:</span>
          <span class="info-value">${registration.college}</span>
        </div>
        ${registration.department ? `
        <div class="info-row">
          <span class="info-label">Department:</span>
          <span class="info-value">${registration.department}</span>
        </div>` : ""}
        <div class="info-row">
          <span class="info-label">Registration ID:</span>
          <span class="info-value">${registration.registrationId}</span>
        </div>
      </div>

      <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-top: 20px;">
        <span style="font-size: 13px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 6px;">
          Current Capacity: ${currentCount} / ${capacity} (${percent}%)
        </span>
        <div style="background: #e2e8f0; height: 8px; border-radius: 9999px; overflow: hidden;">
          <div style="background: #0f766e; height: 100%; width: ${percent}%;"></div>
        </div>
      </div>
    </div>
    <div class="email-footer">
      EVENTRA Organizer Notifications &middot; Automated Event Alerts
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
New Registration Alert: ${event.title}
Participant: ${registration.name} (${registration.email})
College: ${registration.college}
Department: ${registration.department || "N/A"}
Current Count: ${currentCount} / ${capacity} (${percent}%)
  `.trim();

  return { subject: `New Registration: ${registration.name} registered for ${event.title}`, html, text };
}

/**
 * Organizer Capacity Alert Template
 */
export function renderOrganizerCapacityAlert({ event, currentCount, capacity }) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Capacity Reached - ${event.title}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header" style="background: linear-gradient(135deg, #b45309 0%, #d97706 100%);">
      <span class="brand-pill" style="background: rgba(0,0,0,0.2);">CAPACITY ALERT</span>
      <h1>Event is Sold Out!</h1>
      <p>${event.title}</p>
    </div>
    <div class="email-body">
      <p class="greeting">Attention Organizer,</p>
      <p>Your event <strong>${event.title}</strong> has reached 100% capacity!</p>

      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Event:</span>
          <span class="info-value">${event.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Confirmed Seats:</span>
          <span class="info-value" style="color: #b45309;">${currentCount} / ${capacity} Seats</span>
        </div>
        <div class="info-row">
          <span class="info-label">Registration Status:</span>
          <span class="info-value">Full / Capacity Reached</span>
        </div>
      </div>

      <p style="font-size: 14px; color: #475569;">
        New registration attempts from public users will now see a "Sold Out" notice unless capacity is expanded.
      </p>
    </div>
    <div class="email-footer">
      EVENTRA Capacity Alerts &middot; Automated Threshold Tracking
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Capacity Alert: ${event.title} is now SOLD OUT!
Confirmed: ${currentCount} / ${capacity} seats reached.
  `.trim();

  return { subject: `Capacity Alert: ${event.title} is now SOLD OUT!`, html, text };
}

/**
 * Test Email Template
 */
export function renderTestEmail({ host, from }) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>EVENTRA Email Configuration Test</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <span class="brand-pill">CONFIGURATION TEST</span>
      <h1>Email System Operational</h1>
      <p>EVENTRA SMTP Verification</p>
    </div>
    <div class="email-body">
      <p class="greeting">Success!</p>
      <p>This test email confirms that your SMTP provider credentials and transport configuration are functioning properly.</p>

      <div class="info-card">
        <div class="info-row">
          <span class="info-label">SMTP Host:</span>
          <span class="info-value">${host}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Sender Address:</span>
          <span class="info-value">${from}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Timestamp:</span>
          <span class="info-value">${new Date().toISOString()}</span>
        </div>
      </div>
    </div>
    <div class="email-footer">
      EVENTRA Test Email &middot; System Health Check
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `EVENTRA Email Test: Connection to ${host} using ${from} is operational.`;

  return { subject: "EVENTRA Email Configuration Test Succeeded", html, text };
}

