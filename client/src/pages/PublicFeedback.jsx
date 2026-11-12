import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import api from "../api";
import "../feedback.css";

export default function PublicFeedback() {
  const params = useParams();
  const [searchParams] = useSearchParams();

  // Token can be in path /feedback/:token or query /events/:eventId/feedback?token=...
  const token = params.token || searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventData, setEventData] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [submittedInfo, setSubmittedInfo] = useState(null);

  // Dynamic Form State
  const [ratings, setRatings] = useState({});
  const [textAnswers, setTextAnswers] = useState({});

  // Legacy fallback states
  const [ratingOverall, setRatingOverall] = useState(5);
  const [ratingOrganization, setRatingOrganization] = useState(5);
  const [ratingSpeakers, setRatingSpeakers] = useState(5);
  const [ratingVenue, setRatingVenue] = useState(5);
  const [liked, setLiked] = useState("");
  const [improvements, setImprovements] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [downloadingCert, setDownloadingCert] = useState(false);

  async function downloadCertificatePdf(regId) {
    if (!regId) return;
    try {
      setDownloadingCert(true);
      const res = await api.get(`/certificates/public/${regId}/download`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `eventra-certificate-${regId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Could not download certificate PDF. Please ensure feedback is recorded.");
    } finally {
      setDownloadingCert(false);
    }
  }

  useEffect(() => {
    if (!token) {
      setError("No feedback token provided. Please use the personalized link sent to your email.");
      setLoading(false);
      return;
    }

    api.get(`/feedback/${token}`)
      .then(({ data }) => {
        if (data.alreadySubmitted) {
          setAlreadySubmitted(true);
          setSubmittedInfo(data);
        } else if (data.expired) {
          setExpired(true);
          setSubmittedInfo(data);
        } else {
          setEventData(data.event);
          setParticipant(data.participant);

          // Pre-populate rating questions with 5
          const qList = Array.isArray(data.event?.feedbackQuestions) && data.event.feedbackQuestions.length > 0
            ? data.event.feedbackQuestions
            : [];
          const initialRatings = {};
          const initialTexts = {};
          qList.forEach((q) => {
            if (q.type === "rating") initialRatings[q.id] = 5;
            else initialTexts[q.id] = "";
          });
          setRatings(initialRatings);
          setTextAnswers(initialTexts);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Invalid or expired feedback link.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const questions = Array.isArray(eventData?.feedbackQuestions) && eventData.feedbackQuestions.length > 0
      ? eventData.feedbackQuestions
      : [
          { id: "q_overall", label: "Overall Event Experience", type: "rating", required: true },
          { id: "q_org", label: "Event Organization & Execution", type: "rating", required: true },
          { id: "q_speakers", label: "Speakers & Session Content", type: "rating", required: true },
          { id: "q_venue", label: "Venue & Facilities", type: "rating", required: true },
        ];

    // Validate required questions
    for (const q of questions) {
      if (q.required) {
        if (q.type === "rating") {
          const val = ratings[q.id] || (q.id === "q_overall" ? ratingOverall : q.id === "q_org" ? ratingOrganization : q.id === "q_speakers" ? ratingSpeakers : q.id === "q_venue" ? ratingVenue : null);
          if (!val || val < 1 || val > 5) {
            setError(`"${q.label}" requires a star rating from 1 to 5.`);
            return;
          }
        } else {
          const val = textAnswers[q.id] || (q.id === "q_liked" ? liked : q.id === "q_improvements" ? improvements : q.id === "q_suggestions" ? suggestions : "");
          if (!val.trim()) {
            setError(`"${q.label}" is required.`);
            return;
          }
        }
      }
    }

    setSubmitting(true);
    try {
      const ratingVals = Object.values(ratings);
      const computedOverall = ratings.q_overall || (ratingVals.length > 0 ? Math.round(ratingVals.reduce((a, b) => a + b, 0) / ratingVals.length) : ratingOverall);

      const { data } = await api.post(`/feedback/${token}`, {
        ratings,
        textAnswers,
        ratingOverall: computedOverall || 5,
        ratingOrganization: ratings.q_org || ratingOrganization || computedOverall || 5,
        ratingSpeakers: ratings.q_speakers || ratingSpeakers || computedOverall || 5,
        ratingVenue: ratings.q_venue || ratingVenue || computedOverall || 5,
        liked: textAnswers.q_liked || liked || "",
        improvements: textAnswers.q_improvements || improvements || "",
        suggestions: textAnswers.q_suggestions || suggestions || "",
      });

      setSuccessData(data);
      setSubmitSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="feedback-public-shell">
        <div className="feedback-public-card">
          <div className="feedback-status-view">
            <div className="spinner" style={{ margin: "0 auto 1.5rem auto" }} />
            <h2>Loading event feedback...</h2>
            <p>Verifying your participation access token.</p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !eventData) {
    return (
      <main className="feedback-public-shell">
        <div className="feedback-public-card">
          <div className="feedback-status-view">
            <div className="status-icon-circle is-error">✕</div>
            <h2>Unable to Open Feedback</h2>
            <p>{error}</p>
            <Link to="/" className="button button-primary">Return to Eventra Home</Link>
          </div>
        </div>
      </main>
    );
  }

  if (alreadySubmitted) {
    return (
      <main className="feedback-public-shell">
        <div className="feedback-public-card">
          <div className="feedback-card-header">
            <span className="brand-pill">EVENTRA POST-EVENT FEEDBACK</span>
            <h1>{submittedInfo?.eventTitle || "Event"}</h1>
            <p>Participant Feedback Status</p>
          </div>
          <div className="feedback-status-view">
            <div className="status-icon-circle">✓</div>
            <h2>Feedback Already Received</h2>
            <p>
              Thank you, <strong>{submittedInfo?.participantName}</strong>! Your response was recorded on{" "}
              {submittedInfo?.submittedAt ? new Date(submittedInfo.submittedAt).toLocaleDateString() : "file"}.
            </p>
            {submittedInfo?.certificateEligible && (
              <div className="certificate-unlock-notice" style={{ marginBottom: "1.5rem" }}>
                <p style={{ margin: "0 0 10px 0" }}>
                  ✨ <strong>Certificate Eligibility Verified!</strong> Your certificate of attendance is ready.
                </p>
                <button
                  type="button"
                  onClick={() => downloadCertificatePdf(submittedInfo.registrationId)}
                  disabled={downloadingCert}
                  className="button button-primary"
                  style={{ background: "#059669", display: "inline-block", border: 0, cursor: "pointer" }}
                >
                  {downloadingCert ? "Downloading…" : "📥 Download Certificate PDF Now"}
                </button>
              </div>
            )}
            <div style={{ marginTop: "2rem" }}>
              <Link to="/participant/dashboard" className="button button-primary">
                👤 Go to Participant Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (expired) {
    return (
      <main className="feedback-public-shell">
        <div className="feedback-public-card">
          <div className="feedback-status-view">
            <div className="status-icon-circle is-warning">⏱</div>
            <h2>Submission Deadline Passed</h2>
            <p>The feedback submission window for <strong>{submittedInfo?.eventTitle}</strong> is now closed.</p>
            <Link to="/" className="button button-primary">Return to Home</Link>
          </div>
        </div>
      </main>
    );
  }

  if (submitSuccess) {
    return (
      <main className="feedback-public-shell">
        <div className="feedback-public-card">
          <div className="feedback-card-header">
            <span className="brand-pill">EVENTRA FEEDBACK COMPLETED</span>
            <h1>Thank You!</h1>
            <p>{eventData?.title}</p>
          </div>
          <div className="feedback-status-view">
            <div className="status-icon-circle">✓</div>
            <h2>Your Feedback Was Recorded!</h2>
            <p>We truly appreciate your insights and suggestions. Your evaluation helps make future editions even better.</p>
            {successData?.certificateEligible && (
              <div className="certificate-unlock-notice" style={{ marginBottom: "1.5rem" }}>
                <p style={{ margin: "0 0 10px 0" }}>
                  🎉 <strong>Attendance Certificate Unlocked!</strong> You have fulfilled the post-event survey requirement.
                </p>
                <button
                  type="button"
                  onClick={() => downloadCertificatePdf(successData.registrationId)}
                  disabled={downloadingCert}
                  className="button button-primary"
                  style={{ background: "#059669", display: "inline-block", border: 0, cursor: "pointer" }}
                >
                  {downloadingCert ? "Downloading…" : "📥 Download Certificate PDF Now"}
                </button>
              </div>
            )}
            <div style={{ marginTop: "2rem" }}>
              <Link to="/participant/dashboard" className="button button-primary">
                👤 Go to Participant Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="feedback-public-shell">
      <div className="feedback-public-card">
        <header className="feedback-card-header">
          <span className="brand-pill">PARTICIPANT FEEDBACK</span>
          <h1>{eventData?.title}</h1>
          <p>Please share your candid evaluation to help us improve future sessions.</p>
        </header>

        <div className="feedback-participant-strip">
          <div className="feedback-participant-name">
            <span className="feedback-participant-label">Participant</span>
            <strong>{participant?.name || "Attendee"}</strong>
          </div>
          {participant?.email && (
            <span className="feedback-participant-email">{participant.email}</span>
          )}
        </div>

        <form className="feedback-card-body" onSubmit={handleSubmit}>
          {error && <div className="feedback-error-alert">{error}</div>}

          {/* Dynamic Questionnaire Render */}
          {(() => {
            const configured = Array.isArray(eventData?.feedbackQuestions) && eventData.feedbackQuestions.length > 0
              ? eventData.feedbackQuestions
              : [
                  { id: "q_overall", label: "Overall Event Experience", type: "rating", required: true },
                  { id: "q_org", label: "Event Organization & Execution", type: "rating", required: true },
                  { id: "q_speakers", label: "Speakers & Session Content", type: "rating", required: true },
                  { id: "q_venue", label: "Venue & Facilities", type: "rating", required: false },
                  { id: "q_liked", label: "What did you like most about the event?", type: "text", required: false },
                  { id: "q_improvements", label: "What could be improved?", type: "text", required: false },
                  { id: "q_suggestions", label: "Additional suggestions or topics for future events", type: "text", required: false },
                ];

            const ratingQs = configured.filter((q) => q.type === "rating");
            const textQs = configured.filter((q) => q.type === "text");

            return (
              <>
                {ratingQs.length > 0 && (
                  <div className="feedback-section-block">
                    <div className="feedback-section-heading">
                      <span>Event Ratings</span>
                      <small>Select 1 to 5 stars for each criterion</small>
                    </div>
                    {ratingQs.map((q) => (
                      <StarRatingField
                        key={q.id}
                        label={q.label}
                        required={Boolean(q.required)}
                        description={q.required ? "Mandatory rating" : "Optional rating"}
                        value={ratings[q.id] || 5}
                        onChange={(val) => setRatings((prev) => ({ ...prev, [q.id]: val }))}
                      />
                    ))}
                  </div>
                )}

                {ratingQs.length > 0 && textQs.length > 0 && (
                  <div className="feedback-section-divider" />
                )}

                {textQs.length > 0 && (
                  <div className="feedback-section-block">
                    <div className="feedback-section-heading">
                      <span>Written Reflections</span>
                      <small>Your detailed feedback helps us improve</small>
                    </div>
                    {textQs.map((q) => (
                      <div className="feedback-textarea-group" key={q.id}>
                        <label htmlFor={`fb-${q.id}`}>
                          <span>{q.label}</span>
                          {q.required ? (
                            <small className="feedback-req-tag is-mandatory">Required</small>
                          ) : (
                            <small className="feedback-req-tag">Optional</small>
                          )}
                        </label>
                        <textarea
                          id={`fb-${q.id}`}
                          className="feedback-textarea"
                          placeholder="Share your thoughts..."
                          value={textAnswers[q.id] || ""}
                          onChange={(e) => setTextAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          maxLength={3000}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}

          <button
            type="submit"
            className="feedback-submit-btn"
            disabled={submitting}
          >
            {submitting ? "Submitting Feedback..." : "Submit Feedback"}
          </button>
        </form>
      </div>
    </main>
  );
}

function StarRatingField({ label, required, description, value, onChange }) {
  const [hoverVal, setHoverVal] = useState(0);

  const labels = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very Good",
    5: "Excellent",
  };

  const activeVal = hoverVal || value;

  return (
    <div className="rating-field-group">
      <div className="rating-field-label">
        <span>
          {label}
          {required && <em className="feedback-required-asterisk"> *</em>}
        </span>
        {description && (
          <small className={`feedback-req-tag${required ? " is-mandatory" : ""}`}>
            {description}
          </small>
        )}
      </div>
      <div className="stars-selector">
        <div className="stars-row" role="radiogroup" aria-label={label}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`star-btn ${star <= activeVal ? "is-active" : ""}`}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHoverVal(star)}
              onMouseLeave={() => setHoverVal(0)}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
            >
              ★
            </button>
          ))}
        </div>
        <span className="rating-score-pill">
          {activeVal} / 5 · {labels[activeVal]}
        </span>
      </div>
    </div>
  );
}
