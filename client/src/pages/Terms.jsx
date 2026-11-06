import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../terms.css";

export default function Terms() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="terms-page-root">
      {/* Ambient background glow */}
      <div className="terms-ambient-glow" />

      {/* Top Header Bar */}
      <header className="terms-nav-bar">
        <Link to="/" className="terms-nav-brand">
          EVENT<span>RA</span>
        </Link>
        <div className="terms-nav-actions">
          <button
            type="button"
            className="terms-btn-secondary"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <Link to="/register" className="terms-btn-primary">
            Create Account
          </Link>
        </div>
      </header>

      {/* Hero Header */}
      <section className="terms-hero">
        <div className="terms-shell">
          <span className="terms-kicker">LEGAL &amp; PLATFORM POLICIES</span>
          <h1 className="terms-title">Terms &amp; Conditions</h1>
          <p className="terms-subtitle">
            Please read these terms carefully before creating an account, publishing events, or registering for digital attendee passes on EVENTRA.
          </p>
          <div className="terms-meta-strip">
            <span>📅 Effective Date: November 6, 2026</span>
            <span>✦ Version: 2.4 (Phase 1 Platform Standard)</span>
            <span>⚖️ Applicable to: Organizers &amp; Attendees</span>
          </div>
        </div>
      </section>

      {/* Content Body */}
      <section className="terms-content-section">
        <div className="terms-shell terms-grid">
          {/* Quick Table of Contents Sticky Aside */}
          <aside className="terms-toc">
            <h3>Table of Contents</h3>
            <ul>
              <li><a href="#acceptance">1. Acceptance of Terms</a></li>
              <li><a href="#accounts">2. User Accounts &amp; Security</a></li>
              <li><a href="#organizers">3. Event Creation &amp; Hosting</a></li>
              <li><a href="#access-policy">4. Single-Access Policy &amp; Tickets</a></li>
              <li><a href="#checkin">5. QR Verification &amp; Check-In</a></li>
              <li><a href="#certificates">6. Certificates &amp; Feedback Gating</a></li>
              <li><a href="#ai-features">7. AI Services Disclaimer</a></li>
              <li><a href="#conduct">8. User Conduct &amp; Prohibitions</a></li>
              <li><a href="#privacy">9. Data Privacy &amp; Communications</a></li>
              <li><a href="#liability">10. Limitation of Liability</a></li>
              <li><a href="#modifications">11. Amendments &amp; Termination</a></li>
              <li><a href="#contact">12. Contact &amp; Legal Inquiries</a></li>
            </ul>

            <div className="terms-toc-card">
              <strong>Need Clarification?</strong>
              <p>Contact our support desk for questions regarding compliance and event verification.</p>
              <a href="mailto:support@eventra.app" className="terms-contact-link">support@eventra.app</a>
            </div>
          </aside>

          {/* Main Legal Clauses */}
          <article className="terms-body">
            {/* Section 1 */}
            <div id="acceptance" className="terms-block">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By creating an account, registering for an event, downloading a ticket pass, or otherwise accessing the EVENTRA platform (“Platform”, “we”, “our”), you agree to be bound by these Terms and Conditions (“Terms”).
              </p>
              <p>
                If you are using EVENTRA on behalf of an institution, educational body, organization, or corporate entity, you warrant that you are authorized to bind that entity to these Terms. If you do not agree with any part of these Terms, you must not use or access the Platform.
              </p>
            </div>

            {/* Section 2 */}
            <div id="accounts" className="terms-block">
              <h2>2. User Accounts &amp; Security</h2>
              <ul>
                <li>
                  <strong>Eligibility:</strong> You must be at least 16 years of age or possess legal parental/guardian consent to create an organizer account or register for events.
                </li>
                <li>
                  <strong>Accurate Information:</strong> All users agree to provide truthful, accurate, and up-to-date information during account registration and event pass sign-up.
                </li>
                <li>
                  <strong>Credential Protection:</strong> You are responsible for safeguarding your login credentials. EVENTRA is not liable for any unauthorized activity resulting from compromised credentials.
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div id="organizers" className="terms-block">
              <h2>3. Event Creation &amp; Organizer Responsibilities</h2>
              <p>
                Organizers who build and publish events using the EVENTRA Event Studio are solely responsible for:
              </p>
              <ul>
                <li>Providing accurate venue locations, schedules, timing, and ticket capacity limits.</li>
                <li>Ensuring their event complies with local laws, health standards, safety regulations, and intellectual property rights.</li>
                <li>Managing ticket pricing, admission conditions, and volunteer duties transparently.</li>
                <li>Properly notifying attendees in the event of schedule changes, venue relocations, or cancellations.</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div id="access-policy" className="terms-block">
              <h2>4. Single-Access Policy &amp; Digital Tickets</h2>
              <div className="terms-highlight-box">
                <strong>✦ Strict Single-Access Policy (Anti-Scalping / Anti-Duplication):</strong>
                <p>
                  To prevent ticket hoarding, fraudulent duplication, and registration spoofing, EVENTRA enforces a strict <strong>One Email &amp; One Phone Number per Registration</strong> rule for each event. Any attempt to register multiple passes under identical contact details for the same event will be rejected by the system.
                </p>
              </div>
              <p>
                Each digital ticket pass issued is unique and contains an encrypted QR verification payload. Digital passes remain the credential of the named attendee and are non-transferable unless explicitly permitted by the event organizer.
              </p>
            </div>

            {/* Section 5 */}
            <div id="checkin" className="terms-block">
              <h2>5. QR Verification &amp; Attendance Check-In</h2>
              <p>
                Admission to physical and hybrid events is conditioned on successful verification at the check-in point using EVENTRA's live camera scanner or attendee directory.
              </p>
              <ul>
                <li>Attendees must present their digital PDF ticket pass or printed pass with a legible QR code upon arrival.</li>
                <li>Once scanned and confirmed as checked-in, tickets cannot be reused for duplicate entries.</li>
                <li>Only confirmed, checked-in attendees become eligible for participation credentials and certificates.</li>
              </ul>
            </div>

            {/* Section 6 */}
            <div id="certificates" className="terms-block">
              <h2>6. Certificates of Participation &amp; Feedback Gating</h2>
              <p>
                EVENTRA provides verified digital PDF certificates endorsed with the standardized credential mark <strong>EVENTRA · EVENT CERTIFICATE</strong>. Issuance is subject to the following rules:
              </p>
              <ul>
                <li>
                  <strong>Attendance Mandate:</strong> Only attendees who are marked as checked in during the event are eligible to receive a certificate.
                </li>
                <li>
                  <strong>Feedback Gating:</strong> When the organizer has enabled the <em>“Require Feedback Before Issuing”</em> setting, attendees must complete their post-event feedback survey before their certificate download is unlocked.
                </li>
                <li>
                  <strong>Anti-Tampering:</strong> Any alteration, forgery, or unauthorized reproduction of cryptographic certificate credentials constitutes platform abuse.
                </li>
              </ul>
            </div>

            {/* Section 7 */}
            <div id="ai-features" className="terms-block">
              <h2>7. AI Services &amp; Content Disclaimer</h2>
              <p>
                EVENTRA integrates Google Gemini AI models to assist organizers in synthesizing marketing copy, headlines, vector posters, and certificate themes.
              </p>
              <ul>
                <li>AI-generated text and artwork are provided as assistive drafting tools. Organizers are responsible for reviewing and verifying the accuracy and appropriateness of all AI-generated copy.</li>
                <li>Organizers must ensure that promotional statements synthesized by AI do not mislead attendees or infringe upon trademark rights.</li>
              </ul>
            </div>

            {/* Section 8 */}
            <div id="conduct" className="terms-block">
              <h2>8. User Conduct &amp; Prohibitions</h2>
              <p>You agree not to use EVENTRA to:</p>
              <ul>
                <li>Host or promote deceptive, malicious, defamatory, or unlawful events.</li>
                <li>Circumvent or tamper with access controls, capacity quotas, or check-in security scanners.</li>
                <li>Scrape, reverse-engineer, overload, or launch denial-of-service attacks against platform servers.</li>
                <li>Harass organizers, attendees, or speakers via contact forms or feedback submissions.</li>
              </ul>
            </div>

            {/* Section 9 */}
            <div id="privacy" className="terms-block">
              <h2>9. Data Privacy &amp; Communications</h2>
              <p>
                We respect your personal privacy. Attendee contact information (names, emails, phone numbers, and institution affiliations) is collected solely for event administration, pass delivery, check-in verification, and official certificate dispatch.
              </p>
              <p>
                By registering for an event, you consent to receiving transactional emails regarding your ticket pass, schedule updates, event closure announcements, and feedback invitations.
              </p>
            </div>

            {/* Section 10 */}
            <div id="liability" className="terms-block">
              <h2>10. Limitation of Liability</h2>
              <p>
                EVENTRA is an event enablement and management technology platform. We do not organize, direct, or control the physical events hosted by independent organizers.
              </p>
              <p>
                To the fullest extent permitted by applicable law, EVENTRA and its affiliates shall not be liable for any personal injury, property loss, event cancellation, travel expense, or consequential damages arising from attendance at an event listed on our platform.
              </p>
            </div>

            {/* Section 11 */}
            <div id="modifications" className="terms-block">
              <h2>11. Amendments &amp; Termination</h2>
              <p>
                We reserve the right to modify these Terms at any time. When updates are published, the revised date at the top of this document will be amended. Continued usage of the Platform following published updates signifies your agreement to the modified Terms.
              </p>
            </div>

            {/* Section 12 */}
            <div id="contact" className="terms-block">
              <h2>12. Contact &amp; Legal Inquiries</h2>
              <p>
                If you have questions, feedback, or legal notices concerning these Terms and Conditions, please reach out to our administration team at:
              </p>
              <div className="terms-contact-card">
                <strong>EVENTRA Platform Legal Desk</strong>
                <p>Email: <a href="mailto:legal@eventra.app">legal@eventra.app</a></p>
                <p>Support Desk: <a href="mailto:support@eventra.app">support@eventra.app</a></p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="terms-bottom-bar">
              <button
                type="button"
                className="terms-btn-secondary"
                onClick={() => window.print()}
              >
                🖨️ Print Terms
              </button>
              <Link to="/register" className="terms-btn-primary">
                I Understand &amp; Agree — Continue to Sign Up →
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

