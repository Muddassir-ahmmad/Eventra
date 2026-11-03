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

  // Form State
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

    if (!ratingOverall || !ratingOrganization || !ratingSpeakers || !ratingVenue) {
      setError("Please provide star ratings for all categories.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post(`/feedback/${token}`, {
        ratingOverall,
        ratingOrganization,
        ratingSpeakers,
        ratingVenue,
        liked,
        improvements,
        suggestions,
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
              <div className="certificate-unlock-notice">
                ✨ <strong>Certificate Eligibility Verified!</strong> Your certificate of attendance is ready to be issued by the event organizers.
              </div>
            )}
            <div style={{ marginTop: "2rem" }}>
              <Link to="/" className="button button-primary">Return to Home</Link>
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
              <div className="certificate-unlock-notice">
                🎉 <strong>Attendance Certificate Unlocked!</strong> You have fulfilled the post-event requirements. Your certificate will be issued by the organizer.
              </div>
            )}
            <div style={{ marginTop: "2rem" }}>
              <Link to="/" className="button button-primary">Return to Eventra Home</Link>
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
          <span>Participant: <strong>{participant?.name}</strong></span>
          <span>{participant?.email}</span>
        </div>

        <form className="feedback-card-body" onSubmit={handleSubmit}>
          {error && <div className="certificate-alert is-error" style={{ marginBottom: "1.5rem" }}>{error}</div>}

          {/* Star Rating 1: Overall */}
          <StarRatingField
            label="Overall Event Experience"
            description="How would you rate the overall program?"
            value={ratingOverall}
            onChange={setRatingOverall}
          />

          {/* Star Rating 2: Organization */}
          <StarRatingField
            label="Event Organization & Execution"
            description="Punctuality, guidance, entry management, support"
            value={ratingOrganization}
            onChange={setRatingOrganization}
          />

          {/* Star Rating 3: Speakers & Sessions */}
          <StarRatingField
            label="Speakers & Session Content"
            description="Relevance, expertise, depth, and interactivity"
            value={ratingSpeakers}
            onChange={setRatingSpeakers}
          />

          {/* Star Rating 4: Venue & Facilities */}
          <StarRatingField
            label="Venue & Facilities"
            description="Seating, audio/visuals, accessibility, amenities"
            value={ratingVenue}
            onChange={setRatingVenue}
          />

          <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "1.75rem 0" }} />

          {/* Narrative: What was liked */}
          <div className="feedback-textarea-group">
            <label htmlFor="fb-liked">What did you like most about the event?</label>
            <textarea
              id="fb-liked"
              placeholder="Highlights, favorite talks, impactful moments..."
              value={liked}
              onChange={(e) => setLiked(e.target.value)}
              maxLength={2000}
            />
          </div>

          {/* Narrative: Improvements */}
          <div className="feedback-textarea-group">
            <label htmlFor="fb-improvements">What could be improved?</label>
            <textarea
              id="fb-improvements"
              placeholder="Pacing, technical setup, topic coverage..."
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              maxLength={2000}
            />
          </div>

          {/* Narrative: Suggestions */}
          <div className="feedback-textarea-group">
            <label htmlFor="fb-suggestions">Additional suggestions or topics for future events</label>
            <textarea
              id="fb-suggestions"
              placeholder="Any other comments or future session ideas..."
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              maxLength={2000}
            />
          </div>

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

function StarRatingField({ label, description, value, onChange }) {
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
        <span>{label}</span>
        {description && <small>{description}</small>}
      </div>
      <div className="stars-selector">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-btn ${star <= activeVal ? "is-active" : ""}`}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverVal(star)}
            onMouseLeave={() => setHoverVal(0)}
            aria-label={`${star} star`}
          >
            ★
          </button>
        ))}
        <span className="rating-score-pill">
          {activeVal} / 5 ({labels[activeVal]})
        </span>
      </div>
    </div>
  );
}
