import React, { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import jsQR from "jsqr";
import api from "../api";
import { formatEventDateDisplay } from "../utils/eventTiming";
import "../attendance-dashboard.css";

// Helper to reliably extract registration ID from raw QR strings, JSON payloads, or pass URLs
function extractRegistrationIdentifier(raw) {
  if (!raw || typeof raw !== "string") return "";
  let clean = raw.trim();

  // 1. JSON QR payload e.g. from generated PDF tickets
  if (clean.startsWith("{") && clean.endsWith("}")) {
    try {
      const parsed = JSON.parse(clean);
      if (parsed.regId) return String(parsed.regId).trim();
      if (parsed.registrationId) return String(parsed.registrationId).trim();
      if (parsed.id) return String(parsed.id).trim();
    } catch (_) {}
  }

  // 2. URL containing /tickets/:id
  try {
    if (clean.includes("/tickets/")) {
      const parts = clean.split("/tickets/")[1].split(/[?#/]/);
      if (parts[0]) return decodeURIComponent(parts[0]).trim();
    }
  } catch (_) {}

  return clean;
}

export default function AttendanceDashboard() {
  const { eventId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scanInput, setScanInput] = useState("");
  const [processingScan, setProcessingScan] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null); // { type: 'success'|'warning'|'error', message, participant }

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'attended' | 'absent' | 'attended_all' | 'missed_some' | 'attended_day' | 'absent_day' | 'attended_session'

  // Multi-day & Session scanning mode
  const [scanMode, setScanMode] = useState("daily"); // 'daily' | 'session'
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const scanModeRef = useRef("daily");
  const selectedDayRef = useRef(1);
  const selectedSessionRef = useRef("");

  useEffect(() => {
    scanModeRef.current = scanMode;
  }, [scanMode]);
  useEffect(() => {
    selectedDayRef.current = selectedDayNumber;
  }, [selectedDayNumber]);
  useEffect(() => {
    selectedSessionRef.current = selectedSessionId;
  }, [selectedSessionId]);

  // Camera QR Scanner State & Refs
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState("environment"); // 'environment' | 'user'
  const [scannedFlash, setScannedFlash] = useState(false);
  const [uploadingScan, setUploadingScan] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const cameraActiveRef = useRef(false);
  const lastScannedCodeRef = useRef("");
  const lastScannedTimeRef = useRef(0);
  const audioCtxRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadAttendanceData();
    return () => stopCamera();
  }, [eventId]);

  const isAttendanceLocked = Boolean(
    data?.attendanceLocked ||
    data?.event?.status === "completed" ||
    data?.event?.status === "closed"
  );

  // Immediately turn off camera if event becomes locked
  useEffect(() => {
    if (isAttendanceLocked && cameraActive) {
      stopCamera();
    }
  }, [isAttendanceLocked, cameraActive]);

  // Synchronize stream attachment when video mounts
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
        video.setAttribute("playsinline", "true");
        video.muted = true;
        video.play().catch((err) => console.debug("Video play catch:", err));
      }
    }
  }, [cameraActive]);

  async function loadAttendanceData() {
    try {
      const res = await api.get(`/registrations/event/${eventId}`);
      setData(res.data);

      const loadedDays = res.data?.event?.days || [];
      if (loadedDays.length > 0) {
        const hasCurrentDay = loadedDays.some((d) => d.dayNumber === selectedDayRef.current);
        if (!hasCurrentDay) {
          const todayKey = new Date().toISOString().slice(0, 10);
          const todayDay = loadedDays.find((d) => String(d.date).slice(0, 10) === todayKey);
          setSelectedDayNumber(todayDay ? todayDay.dayNumber : loadedDays[0].dayNumber);
        }
        const allSes = loadedDays.flatMap((d) => d.sessions || []);
        if (allSes.length > 0 && !allSes.some((s) => s.sessionId === selectedSessionRef.current)) {
          setSelectedSessionId(allSes[0].sessionId);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not load event attendance records.");
    } finally {
      setLoading(false);
    }
  }

  // Audio tone synthesizer for instant gate entry feedback
  function playScanBeep(success = true) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(success ? 880 : 330, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (_) {}
  }

  // Start Camera Stream
  async function startCamera(mode = facingMode) {
    if (isAttendanceLocked) {
      setCameraError("Attendance scanning is locked because this event has already ended.");
      return;
    }
    setCameraError("");
    setCameraReady(false);
    stopCamera();

    // Prepare audio context on user action
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && !audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume();
      }
    } catch (_) {}

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera access is not supported on this browser or connection is not secure (requires HTTPS or localhost).");
        return;
      }

      cameraActiveRef.current = true;
      setCameraActive(true);

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (streamErr) {
        // Fallback without width/height constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        video.muted = true;
        try {
          await video.play();
        } catch (_) {}
      }

      // Start continuous scanning loop
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
    } catch (err) {
      console.error("Camera access error:", err);
      cameraActiveRef.current = false;
      setCameraActive(false);
      setCameraReady(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. Please allow camera permissions in your browser address bar.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera device was detected on your computer or phone.");
      } else {
        setCameraError(`Camera error: ${err.message || "Could not access video feed."}`);
      }
    }
  }

  // Stop Camera Stream
  function stopCamera() {
    cameraActiveRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraReady(false);
  }

  // Flip front/back camera
  function toggleCameraFlip() {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  }

  // Continuous frame analysis loop
  async function scanVideoFrame() {
    if (!cameraActiveRef.current) return;

    try {
      const video = videoRef.current;
      if (video && streamRef.current) {
        // Ensure stream is bound to video element
        if (!video.srcObject) {
          video.srcObject = streamRef.current;
          video.setAttribute("playsinline", "true");
          video.muted = true;
          video.play().catch(() => {});
        }

        // Ready to analyze when video has loaded current data and dimensions
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          setCameraReady(true);
          await analyzeVideoFrame(video);
        }
      }
    } catch (loopErr) {
      console.debug("Video scan loop tick:", loopErr);
    } finally {
      // Loop NEVER terminates prematurely while camera is active
      if (cameraActiveRef.current) {
        animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
      }
    }
  }

  // Frame Decoder: BarcodeDetector + jsQR fallback
  async function analyzeVideoFrame(video) {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;

    let detectedCode = null;

    // 1. Try Native BarcodeDetector (hardware accelerated)
    if ("BarcodeDetector" in window) {
      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code", "code_128"] });
        const barcodes = await detector.detect(video);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          detectedCode = barcodes[0].rawValue;
        }
      } catch (_) {
        // Fallback to jsQR
      }
    }

    // 2. jsQR Engine (reliable fallback across all browsers and inverted QR tickets)
    if (!detectedCode) {
      try {
        if (!canvasRef.current) {
          canvasRef.current = document.createElement("canvas");
        }
        const canvas = canvasRef.current;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });
          if (qrResult && qrResult.data) {
            detectedCode = qrResult.data;
          }
        }
      } catch (scanErr) {
        console.debug("Frame decode error:", scanErr);
      }
    }

    // 3. Handle detected QR Code
    if (detectedCode && detectedCode.trim()) {
      const cleanRaw = detectedCode.trim();
      const extractedId = extractRegistrationIdentifier(cleanRaw);
      const now = Date.now();

      // Debounce: don't scan the exact same code within 3 seconds
      if (extractedId !== lastScannedCodeRef.current || now - lastScannedTimeRef.current > 3000) {
        lastScannedCodeRef.current = extractedId;
        lastScannedTimeRef.current = now;

        // Flash green border on camera
        setScannedFlash(true);
        setTimeout(() => setScannedFlash(false), 900);

        // Trigger check-in
        handleCheckIn(extractedId);
      }
    }
  }

  // Scan QR code from uploaded image or ticket screenshot
  async function handleImageUpload(e) {
    if (isAttendanceLocked) {
      e.target.value = "";
      setScanFeedback({
        type: "error",
        message: "🔒 Attendance entry is locked because this event has already ended.",
      });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingScan(true);
    setScanFeedback(null);

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, img.width, img.height);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const qr = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });

          if (qr && qr.data) {
            playScanBeep(true);
            const extracted = extractRegistrationIdentifier(qr.data);
            handleCheckIn(extracted);
          } else {
            playScanBeep(false);
            setScanFeedback({
              type: "error",
              message: "❌ No QR code detected in the uploaded image. Please ensure the QR code is clear and not cropped.",
            });
          }
          setUploadingScan(false);
        };
        img.onerror = () => {
          setUploadingScan(false);
          setScanFeedback({ type: "error", message: "Could not decode image file." });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadingScan(false);
      setScanFeedback({ type: "error", message: "Failed to process image file." });
    }
  }

  // Handle Check-In Submission
  async function handleCheckIn(rawIdentifier) {
    if (isAttendanceLocked) {
      setScanFeedback({
        type: "error",
        message: "🔒 Attendance entry is locked because this event has already ended.",
      });
      return;
    }
    const identifier = extractRegistrationIdentifier(rawIdentifier);
    if (!identifier || !identifier.trim()) return;

    setProcessingScan(true);
    setScanFeedback(null);

    try {
      const activeMode = scanModeRef.current;
      const res = await api.post(`/registrations/event/${eventId}/checkin`, {
        identifier: identifier.trim(),
        attendanceType: activeMode,
        dayNumber: selectedDayRef.current,
        sessionId: activeMode === "session" ? selectedSessionRef.current : null,
      });

      if (res.data.alreadyCheckedIn) {
        playScanBeep(false);
        setScanFeedback({
          type: "warning",
          message: `⚠️ Already Checked In: ${res.data.registration?.name} (${res.data.message})`,
          participant: res.data.registration,
        });
      } else {
        playScanBeep(true);
        setScanFeedback({
          type: "success",
          message: res.data.message || `✓ Verified! Welcome, ${res.data.registration?.name}`,
          participant: res.data.registration,
        });
      }

      setScanInput("");
      loadAttendanceData();
    } catch (err) {
      playScanBeep(false);
      if (err.response?.status === 403 && err.response?.data?.locked) {
        stopCamera();
        loadAttendanceData();
      }
      setScanFeedback({
        type: "error",
        message: `❌ ${err.response?.data?.message || "Check-in failed. Registration not found for this event."}`,
      });
    } finally {
      setProcessingScan(false);
    }
  }

  // Handle Quick Toggle
  async function handleToggleAttendance(registrationId) {
    if (isAttendanceLocked) {
      setScanFeedback({
        type: "error",
        message: "🔒 Attendance entry is locked because this event has already ended.",
      });
      return;
    }
    try {
      await api.post(`/registrations/event/${eventId}/registrations/${registrationId}/toggle-attendance`, {
        attendanceType: scanMode,
        dayNumber: selectedDayNumber,
        sessionId: scanMode === "session" ? selectedSessionId : null,
      });
      loadAttendanceData();
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.locked) {
        stopCamera();
        loadAttendanceData();
      }
      alert(err.response?.data?.message || "Could not toggle attendance status.");
    }
  }

  // Handle Delete Registration (e.g. duplicate booking, revoked attendee)
  async function handleDeleteRegistration(reg) {
    if (!reg) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the registration for "${reg.name}" (${reg.registrationId})?\n\nThis will remove the attendee, revoke their ticket pass, and release 1 seat back to event capacity.`
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/registrations/event/${eventId}/registrations/${reg._id}`);
      setScanFeedback({
        type: "success",
        message: `Registration for ${reg.name} (${reg.registrationId}) deleted successfully.`,
        participant: null,
      });
      loadAttendanceData();
    } catch (err) {
      alert(err.response?.data?.message || "Could not delete registration.");
    }
  }

  // CSV Export
  function exportCsv() {
    if (!data?.registrations?.length) return;

    const isMulti = data?.multiDayAnalytics?.isMultiDay || (data?.event?.days?.length > 1);
    const headers = [
      "Registration ID",
      "Full Name",
      "Email",
      "Phone",
      "College",
      "Department",
      "Ticket Tier",
      "Gate Status",
      ...(isMulti
        ? [
            "Attended All Days",
            "Days Attended Count",
            "Days Attended (List)",
            "Sessions Attended Count",
            "Sessions Attended (List)",
          ]
        : []),
      "First Checked In At",
      "Last Checked In At",
    ];

    const rows = data.registrations.map((r) => [
      `"${r.registrationId || ""}"`,
      `"${r.name || ""}"`,
      `"${r.email || ""}"`,
      `"${r.phone || ""}"`,
      `"${r.college || ""}"`,
      `"${r.department || ""}"`,
      `"${r.ticketType || "General"}"`,
      r.checkedIn ? '"Attended"' : '"Absent"',
      ...(isMulti
        ? [
            r.attendedAllDays ? '"Yes"' : '"No"',
            `"${(r.attendedDays || []).length}"`,
            `"${(r.attendedDays || []).join(", ")}"`,
            `"${(r.attendedSessions || []).length}"`,
            `"${(r.attendedSessions || []).join(", ")}"`,
          ]
        : []),
      r.checkedInAt ? `"${new Date(r.checkedInAt).toLocaleString()}"` : '""',
      r.lastCheckedInAt ? `"${new Date(r.lastCheckedInAt).toLocaleString()}"` : '""',
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `eventra-attendance-${eventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) {
    return (
      <main className="attendance-page-root">
        <div className="attendance-container" style={{ textAlign: "center", padding: 60 }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "#94a3b8" }}>Loading attendance manager...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="attendance-page-root">
        <div className="attendance-container" style={{ textAlign: "center", padding: 60 }}>
          <h1>{error || "Could not load attendance"}</h1>
          <Link className="btn-hero-primary" to={`/dashboard/events/${eventId}`}>
            Back to Event Hub
          </Link>
        </div>
      </main>
    );
  }

  const { event, stats, registrations, multiDayAnalytics } = data;
  const isMulti = Boolean(multiDayAnalytics?.isMultiDay || (event?.days && event.days.length > 1));
  const eventDays = event?.days || [];
  const allSessions = eventDays.flatMap((d) => (d.sessions || []).map((s) => ({ ...s, dayNumber: d.dayNumber, dayTitle: d.title })));
  const currentTargetDay = eventDays.find((d) => d.dayNumber === selectedDayNumber) || eventDays[0];
  const currentTargetSession = allSessions.find((s) => s.sessionId === selectedSessionId) || allSessions[0];

  const sessionAnalyticsList = data.sessionAnalytics?.sessions ||
    allSessions.map((ses) => {
      const sesId = String(ses.sessionId);
      const enrolled = registrations.filter((r) => r.status === "confirmed" && (r.selectedSessions || []).includes(sesId));
      const attended = registrations.filter((r) => r.status === "confirmed" && (r.attendedSessions || []).includes(sesId));
      const effectiveRegistered = Math.max(enrolled.length, attended.length);
      const absentCount = Math.max(0, effectiveRegistered - attended.length);
      const pct = effectiveRegistered > 0 ? Math.round((attended.length / effectiveRegistered) * 1000) / 10 : 0;
      return {
        ...ses,
        registeredCount: effectiveRegistered,
        attendedCount: attended.length,
        absentCount,
        attendancePercentage: pct,
      };
    });

  function exportSessionsCsv() {
    const headers = [
      "Session Title",
      "Event Day",
      "Start Time",
      "End Time",
      "Venue",
      "Speaker",
      "Status",
      "Capacity",
      "Enrolled Count",
      "Attended Count",
      "Absent Count",
      "Attendance Rate (%)",
    ];
    const rows = sessionAnalyticsList.map((s) => [
      `"${s.title || ""}"`,
      `"Day ${s.dayNumber || 1}"`,
      `"${s.startTime || ""}"`,
      `"${s.endTime || ""}"`,
      `"${s.venue || ""}"`,
      `"${s.speaker || ""}"`,
      `"${s.status || "UPCOMING"}"`,
      `"${s.capacity ?? "Unlimited"}"`,
      `"${s.registeredCount}"`,
      `"${s.attendedCount}"`,
      `"${s.absentCount}"`,
      `"${s.attendancePercentage}%"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${event.slug || "event"}-session-attendance-report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filteredList = registrations.filter((r) => {
    const matchesSearch =
      r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.registrationId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.college?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "attended") return r.checkedIn === true;
    if (statusFilter === "absent") return r.status === "confirmed" && !r.checkedIn;
    if (statusFilter === "attended_all") return r.status === "confirmed" && r.attendedAllDays;
    if (statusFilter === "missed_some") return r.status === "confirmed" && !r.attendedAllDays;
    if (statusFilter === "attended_day") return (r.attendedDays || []).includes(selectedDayNumber);
    if (statusFilter === "absent_day") return r.status === "confirmed" && !(r.attendedDays || []).includes(selectedDayNumber);
    if (statusFilter === "enrolled_session") return (r.selectedSessions || []).includes(selectedSessionId);
    if (statusFilter === "attended_session") return (r.attendedSessions || []).includes(selectedSessionId);
    if (statusFilter === "absent_session") return (r.selectedSessions || []).includes(selectedSessionId) && !(r.attendedSessions || []).includes(selectedSessionId);
    return true;
  });

  return (
    <main className="attendance-page-root">
      <div className="attendance-container">
        {/* Navigation & Header */}
        <div style={{ marginBottom: 16 }}>
          <Link to={`/dashboard/events/${eventId}`} style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.85rem" }}>
            ← Back to Event Overview
          </Link>
        </div>

        <div className="attendance-header">
          <div className="attendance-title-box">
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 800,
                color: isAttendanceLocked ? "#f59e0b" : "#10b981",
                letterSpacing: "0.12em",
              }}
            >
              {isAttendanceLocked ? "🔒 ATTENDANCE DESK LOCKED · EVENT ENDED" : "LIVE ATTENDANCE DESK"}
            </span>
            <h1>{event.title}</h1>
            <p style={{ color: "#94a3b8", margin: "4px 0 0", fontSize: "0.9rem" }}>
              📅 {formatEventDateDisplay(event)}
              {isMulti ? ` · 🗓️ ${eventDays.length}-Day Multi-Day Event` : ""}
              {" "}· 📍 {event.venue}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn-hero-secondary"
              style={{ padding: "10px 16px", fontSize: "0.85rem" }}
              onClick={exportCsv}
            >
              📥 Export CSV Report
            </button>
            <Link
              className="btn-hero-secondary"
              style={{ padding: "10px 16px", fontSize: "0.85rem" }}
              to={`/dashboard/events/${eventId}/registrations`}
            >
              📋 All Registrations
            </Link>
          </div>
        </div>

        {/* 1. ATTENDANCE METRICS */}
        <div className="attendance-stats-grid">
          <div className="attendance-stat-card">
            <span>Total Registered</span>
            <strong>{stats.confirmedRegistrations}</strong>
          </div>

          <div className="attendance-stat-card highlight">
            <span>Attended / Verified</span>
            <strong>{stats.attendedParticipants}</strong>
          </div>

          {isMulti ? (
            <>
              <div className="attendance-stat-card highlight">
                <span>Attending All {eventDays.length} Days</span>
                <strong>{multiDayAnalytics?.participantsAttendingAllDaysCount ?? 0}</strong>
              </div>
              <div className="attendance-stat-card">
                <span>Missing Some Days</span>
                <strong>{multiDayAnalytics?.participantsMissingSomeDaysCount ?? 0}</strong>
              </div>
            </>
          ) : (
            <div className="attendance-stat-card">
              <span>Absent Attendees</span>
              <strong>{stats.absentParticipants}</strong>
            </div>
          )}

          <div className="attendance-stat-card highlight">
            <span>Attendance Rate</span>
            <strong>{stats.attendancePercentage}%</strong>
          </div>

          <div className="attendance-stat-card">
            <span>Total Capacity</span>
            <strong>{event.capacity}</strong>
          </div>
        </div>

        {/* Multi-Day & Session Target Control */}
        {(isMulti || event.sessionAttendanceEnabled) && (
          <div className="multiday-attendance-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <div>
                <strong style={{ color: "#ffffff", fontSize: "0.95rem" }}>
                  Active Check-In Target: {scanMode === "session" ? `Session: ${currentTargetSession?.title || "Selected Session"}` : `Day ${selectedDayNumber} (${currentTargetDay?.title || `Day ${selectedDayNumber}`})`}
                </strong>
                <span style={{ display: "block", color: "#94a3b8", fontSize: "0.78rem", marginTop: 2 }}>
                  Scans and manual entries will be recorded under this selected {scanMode === "session" ? "session" : "event day"}.
                </span>
              </div>

              {event.sessionAttendanceEnabled && (
                <div className="multiday-mode-switch">
                  <button
                    type="button"
                    className={`filter-pill ${scanMode === "daily" ? "active" : ""}`}
                    onClick={() => setScanMode("daily")}
                  >
                    📅 Daily Attendance
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${scanMode === "session" ? "active" : ""}`}
                    onClick={() => setScanMode("session")}
                  >
                    🏷️ Session Attendance
                  </button>
                </div>
              )}
            </div>

            {scanMode === "daily" ? (
              <div className="multiday-day-strip">
                {eventDays.map((d) => {
                  const dayStat = (multiDayAnalytics?.days || []).find((ds) => ds.dayNumber === d.dayNumber);
                  const isSel = selectedDayNumber === d.dayNumber;
                  return (
                    <button
                      key={d.dayNumber}
                      type="button"
                      className={`multiday-day-card${isSel ? " is-selected" : ""}`}
                      onClick={() => setSelectedDayNumber(d.dayNumber)}
                    >
                      <strong style={{ display: "block", fontSize: "0.85rem" }}>
                        {d.title || `Day ${d.dayNumber}`}
                      </strong>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        {d.date ? new Date(d.date).toLocaleDateString([], { month: "short", day: "numeric", timeZone: "UTC" }) : ""}
                      </span>
                      <div style={{ marginTop: 6, fontSize: "0.82rem", fontWeight: 700, color: isSel ? "#6ee7b7" : "#38bdf8" }}>
                        {dayStat?.attendedCount ?? 0} Attended ({dayStat?.attendancePercentage ?? 0}%)
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "#cbd5e1", fontWeight: 600 }}>Select Session:</span>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    border: "1px solid rgba(129, 140, 248, 0.4)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: "0.85rem",
                    maxWidth: 380,
                  }}
                >
                  {allSessions.map((s) => (
                    <option key={s.sessionId} value={s.sessionId}>
                      D{s.dayNumber} · {s.title} ({s.startTime || "Scheduled"}){s.venue ? ` @ ${s.venue}` : ""}
                    </option>
                  ))}
                </select>
                {currentTargetSession?.capacity > 0 && (
                  <span style={{ fontSize: "0.8rem", color: "#38bdf8", background: "rgba(56, 189, 248, 0.12)", padding: "4px 8px", borderRadius: 6 }}>
                    Cap: {currentTargetSession.capacity}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* SESSION PERFORMANCE & ATTENDANCE REPORT */}
        {sessionAnalyticsList.length > 0 && (
          <div className="attendee-table-wrap" style={{ marginBottom: 24, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#38bdf8", letterSpacing: "0.08em" }}>
                  SESSION PERFORMANCE &amp; ENROLLMENT
                </span>
                <h3 style={{ fontSize: "1.2rem", margin: "4px 0 0", color: "#ffffff" }}>
                  Session-Wise Attendance Analytics
                </h3>
                <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: "0.82rem" }}>
                  Enrolled attendee counts and verified QR check-ins per session
                </p>
              </div>
              <button
                type="button"
                className="btn-hero-secondary"
                style={{ padding: "8px 14px", fontSize: "0.82rem" }}
                onClick={exportSessionsCsv}
              >
                📥 Export Session Report CSV
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="registration-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Day / Time</th>
                    <th>Session Title</th>
                    <th>Venue &amp; Speaker</th>
                    <th>Status</th>
                    <th>Capacity</th>
                    <th>Enrolled</th>
                    <th>Attended</th>
                    <th>Absent</th>
                    <th style={{ textAlign: "right" }}>Attendance Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionAnalyticsList.map((s) => (
                    <tr key={s.sessionId}>
                      <td>
                        <span style={{ padding: "3px 8px", background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", borderRadius: 4, fontSize: "0.75rem", fontWeight: 700 }}>
                          Day {s.dayNumber || 1}
                        </span>
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>
                          {s.startTime || "TBD"} {s.endTime ? `- ${s.endTime}` : ""}
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: "#ffffff", fontSize: "0.9rem" }}>{s.title}</strong>
                        {s.description && (
                          <small style={{ display: "block", color: "#64748b", marginTop: 2, maxWidth: 260, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {s.description}
                          </small>
                        )}
                      </td>
                      <td>
                        <div style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>📍 {s.venue || "Main Hall"}</div>
                        {s.speaker && <small style={{ color: "#a5b4fc" }}>🎙️ {s.speaker}</small>}
                      </td>
                      <td>
                        <span className={`status-badge ${s.status === "COMPLETED" ? "present" : s.status === "CANCELLED" ? "absent" : "pending"}`} style={{ fontSize: "0.75rem" }}>
                          {s.status || "UPCOMING"}
                        </span>
                      </td>
                      <td style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                        {s.capacity ? `${s.capacity} seats` : "Unlimited"}
                      </td>
                      <td>
                        <strong style={{ color: "#38bdf8" }}>{s.registeredCount}</strong>
                      </td>
                      <td>
                        <strong style={{ color: "#34d399" }}>{s.attendedCount}</strong>
                      </td>
                      <td>
                        <strong style={{ color: "#f87171" }}>{s.absentCount}</strong>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{ fontWeight: 800, color: s.attendancePercentage >= 75 ? "#34d399" : s.attendancePercentage >= 50 ? "#fbbf24" : "#94a3b8" }}>
                          {s.attendancePercentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. SCANNER & FAST CHECK-IN DESK */}
        <div className="scanner-checkin-card">
          {isAttendanceLocked ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
                padding: "8px 4px",
              }}
            >
              <div style={{ maxWidth: 680 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    color: "#fbbf24",
                    background: "rgba(245, 158, 11, 0.14)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    borderRadius: 999,
                    padding: "4px 12px",
                    letterSpacing: "0.06em",
                  }}
                >
                  🔒 ENTRY LOCKED — EVENT CONCLUDED
                </span>
                <h2 style={{ fontSize: "1.35rem", margin: "10px 0 6px", color: "#ffffff" }}>
                  QR Scanning &amp; New Check-Ins Are Closed
                </h2>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.55 }}>
                  This event has ended, so camera scanning, QR image uploads, manual code entry, and attendance status overrides are locked to preserve final attendance and certificate eligibility records.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link
                  className="btn-hero-secondary"
                  style={{ padding: "10px 16px", fontSize: "0.85rem" }}
                  to={`/dashboard/events/${eventId}/certificates`}
                >
                  🏆 Issue Certificates
                </Link>
                <Link
                  className="btn-hero-primary"
                  style={{ padding: "10px 18px", fontSize: "0.85rem" }}
                  to={`/dashboard/events/${eventId}/report`}
                >
                  📊 Post-Event Report
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#a855f7", letterSpacing: "0.08em" }}>
                    GATE SCANNER &amp; FAST ENTRY
                  </span>
                  <h2 style={{ fontSize: "1.4rem", margin: "4px 0 0", color: "#ffffff" }}>
                    Scan QR Pass or Enter Registration Code
                  </h2>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept="image/*"
                    onChange={handleImageUpload}
                  />

                  <button
                    type="button"
                    className="btn-hero-secondary"
                    style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingScan}
                  >
                    {uploadingScan ? "Reading Image…" : "📁 Scan QR Image / Screenshot"}
                  </button>

                  {cameraActive && (
                    <button
                      type="button"
                      className="btn-hero-secondary"
                      style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                      onClick={toggleCameraFlip}
                      title="Switch front and back camera"
                    >
                      🔄 Flip Camera ({facingMode === "environment" ? "Back" : "Front"})
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-hero-primary"
                    style={{ padding: "8px 18px", fontSize: "0.85rem" }}
                    onClick={cameraActive ? stopCamera : () => startCamera()}
                  >
                    {cameraActive ? "⏹ Stop Camera" : "📷 Start Camera QR Scanner"}
                  </button>
                </div>
              </div>

              {/* Camera Scanner Viewport */}
              {cameraActive && (
                <div style={{ marginTop: 22, textAlign: "center" }}>
                  <div className={`camera-scan-viewport ${scannedFlash ? "scanned" : ""}`}>
                    <video
                      ref={(el) => {
                        videoRef.current = el;
                        if (el && streamRef.current && el.srcObject !== streamRef.current) {
                          el.srcObject = streamRef.current;
                          el.setAttribute("playsinline", "true");
                          el.muted = true;
                          el.play().catch(() => {});
                        }
                      }}
                      playsInline
                      muted
                      autoPlay
                      onLoadedMetadata={() => {
                        if (videoRef.current) {
                          videoRef.current.play().catch(() => {});
                          setCameraReady(true);
                        }
                      }}
                      onPlaying={() => setCameraReady(true)}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />

                    {/* Loading state indicator before webcam frames arrive */}
                    {!cameraReady && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(8, 12, 22, 0.92)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 12,
                          zIndex: 3,
                        }}
                      >
                        <div className="spinner" />
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>
                          Connecting camera feed…
                        </p>
                      </div>
                    )}

                    {/* Real-time moving green laser scan line */}
                    {cameraReady && <div className="scan-laser-line" />}

                    {/* Target Framing Box */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "68%",
                        height: "68%",
                        border: "2px dashed rgba(255, 255, 255, 0.8)",
                        borderRadius: 14,
                        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
                        pointerEvents: "none",
                        zIndex: 4,
                      }}
                    />

                    {scannedFlash && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(16, 185, 129, 0.35)",
                          display: "grid",
                          placeItems: "center",
                          color: "#ffffff",
                          fontWeight: 900,
                          fontSize: "1.4rem",
                          letterSpacing: "0.08em",
                          pointerEvents: "none",
                          zIndex: 10,
                        }}
                      >
                        ✓ SCANNED!
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 12, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: cameraReady ? "#10b981" : "#f59e0b",
                        boxShadow: cameraReady ? "0 0 10px #10b981" : "none",
                      }}
                    />
                    <small style={{ color: "#a5b4fc", fontWeight: 700, fontSize: "0.84rem" }}>
                      {cameraReady
                        ? "Live Camera Scanner Active — Center attendee's QR ticket pass in the frame"
                        : "Connecting camera feed…"}
                    </small>
                  </div>
                </div>
              )}

              {cameraError && (
                <p style={{ color: "#f87171", fontSize: "0.85rem", marginTop: 12 }}>
                  {cameraError}
                </p>
              )}

              {/* Manual Input / Barcode Scanner Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCheckIn(scanInput);
                }}
                className="scan-input-row"
              >
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Paste / scan Registration ID (e.g. EVT-2026-XXXX) or attendee email"
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn-hero-primary"
                  disabled={processingScan || !scanInput.trim()}
                  style={{ padding: "12px 24px" }}
                >
                  {processingScan ? "Verifying..." : "Verify & Check-In →"}
                </button>
              </form>
            </>
          )}

          {/* Scan Feedback Banner */}
          {scanFeedback && (
            <div className={`scan-feedback-banner ${scanFeedback.type}`}>
              <div>
                <strong>{scanFeedback.message}</strong>
                {scanFeedback.participant && (
                  <span style={{ display: "block", fontSize: "0.82rem", opacity: 0.9, marginTop: 2 }}>
                    ID: {scanFeedback.participant.registrationId} · Email: {scanFeedback.participant.email} · {scanFeedback.participant.college}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. ATTENDEE DIRECTORY & CHECK-IN TABLE */}
        <div className="attendee-table-wrap">
          <div className="attendee-toolbar">
            <input
              type="text"
              className="attendee-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Search by name, email, code, college..."
            />

            <div className="filter-pills">
              <button
                type="button"
                className={`filter-pill ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                All ({registrations.length})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === "attended" ? "active" : ""}`}
                onClick={() => setStatusFilter("attended")}
              >
                Checked In ({stats.attendedParticipants})
              </button>
              <button
                type="button"
                className={`filter-pill ${statusFilter === "absent" ? "active" : ""}`}
                onClick={() => setStatusFilter("absent")}
              >
                Absent ({stats.absentParticipants})
              </button>
              {isMulti && (
                <>
                  <button
                    type="button"
                    className={`filter-pill ${statusFilter === "attended_all" ? "active" : ""}`}
                    onClick={() => setStatusFilter("attended_all")}
                  >
                    Attended All Days ({multiDayAnalytics?.participantsAttendingAllDaysCount ?? 0})
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${statusFilter === "missed_some" ? "active" : ""}`}
                    onClick={() => setStatusFilter("missed_some")}
                  >
                    Missed Some Days ({multiDayAnalytics?.participantsMissingSomeDaysCount ?? 0})
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${statusFilter === "attended_day" ? "active" : ""}`}
                    onClick={() => setStatusFilter("attended_day")}
                  >
                    Day {selectedDayNumber} Present
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${statusFilter === "absent_day" ? "active" : ""}`}
                    onClick={() => setStatusFilter("absent_day")}
                  >
                    Day {selectedDayNumber} Absent
                  </button>
                </>
              )}
              {scanMode === "session" && selectedSessionId && (
                <>
                  <button
                    type="button"
                    className={`filter-pill ${statusFilter === "enrolled_session" ? "active" : ""}`}
                    onClick={() => setStatusFilter("enrolled_session")}
                  >
                    Enrolled in Session
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${statusFilter === "attended_session" ? "active" : ""}`}
                    onClick={() => setStatusFilter("attended_session")}
                  >
                    Attended Session
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${statusFilter === "absent_session" ? "active" : ""}`}
                    onClick={() => setStatusFilter("absent_session")}
                  >
                    Absent in Session
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="registration-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Ticket / Reg ID</th>
                  <th>Attendee Name</th>
                  <th>Contact Details</th>
                  <th>College &amp; Dept</th>
                  <th>Gate Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                      No attendee matches your search filter.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((reg) => {
                    const attendedTarget =
                      scanMode === "session" && selectedSessionId
                        ? (reg.attendedSessions || []).includes(selectedSessionId)
                        : isMulti
                        ? (reg.attendedDays || []).includes(selectedDayNumber)
                        : reg.checkedIn === true;

                    const hasSelectedSessions = Array.isArray(reg.selectedSessions) && reg.selectedSessions.length > 0;
                    const isEnrolledInSession =
                      scanMode !== "session" ||
                      !selectedSessionId ||
                      !hasSelectedSessions ||
                      (reg.selectedSessions || []).includes(selectedSessionId);

                    return (
                    <tr key={reg._id}>
                      <td>
                        <span style={{ padding: "4px 8px", background: "rgba(255,255,255,0.06)", borderRadius: 6, fontSize: "0.8rem", color: "#38bdf8", fontWeight: 700 }}>
                          {reg.registrationId}
                        </span>
                        <small style={{ display: "block", color: "#64748b", marginTop: 4 }}>
                          {reg.ticketType || "General"}
                        </small>
                      </td>
                      <td>
                        <strong style={{ color: "#ffffff" }}>{reg.name}</strong>
                        {isMulti && (
                          <div className="day-progress-chips">
                            {eventDays.map((d) => {
                              const yes = (reg.attendedDays || []).includes(d.dayNumber);
                              return (
                                <span key={d.dayNumber} className={`day-chip ${yes ? "yes" : "no"}`}>
                                  D{d.dayNumber} {yes ? "✓" : "○"}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {hasSelectedSessions && (
                          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {reg.selectedSessions.map((sid) => {
                              const sesObj = allSessions.find((s) => String(s.sessionId) === String(sid));
                              const attended = (reg.attendedSessions || []).includes(String(sid));
                              return (
                                <span
                                  key={sid}
                                  style={{
                                    fontSize: "0.68rem",
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    background: attended ? "rgba(16, 185, 129, 0.16)" : "rgba(255, 255, 255, 0.05)",
                                    border: `1px solid ${attended ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
                                    color: attended ? "#6ee7b7" : "#94a3b8",
                                  }}
                                  title={`${sesObj?.title || sid} (${attended ? "Attended" : "Not attended"})`}
                                >
                                  {attended ? "✓ " : ""}{sesObj?.title || `Sess ${sid}`}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td>
                        <div>{reg.email}</div>
                        <small style={{ color: "#64748b" }}>{reg.phone}</small>
                      </td>
                      <td>
                        <div>{reg.college}</div>
                        <small style={{ color: "#64748b" }}>{reg.department || "General"}</small>
                      </td>
                      <td>
                        {!isEnrolledInSession ? (
                          <span
                            className="status-badge"
                            style={{
                              background: "rgba(148, 163, 184, 0.12)",
                              color: "#94a3b8",
                              border: "1px solid rgba(148, 163, 184, 0.25)",
                            }}
                          >
                            ⚠️ Not Enrolled
                          </span>
                        ) : attendedTarget ? (
                          <span className="status-badge present">
                            ✓ {scanMode === "session" ? "Session Present" : isMulti ? `Day ${selectedDayNumber} Present` : `Present (${new Date(reg.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`}
                          </span>
                        ) : (
                          <span className="status-badge absent">
                            ● {scanMode === "session" ? "Session Absent" : isMulti ? `Day ${selectedDayNumber} Absent` : "Absent"}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
                          {isAttendanceLocked ? (
                            <span
                              className="status-badge"
                              title="Attendance modifications are locked because this event has ended."
                              style={{
                                background: "rgba(148, 163, 184, 0.14)",
                                color: "#94a3b8",
                                border: "1px solid rgba(148, 163, 184, 0.25)",
                              }}
                            >
                              🔒 Entry Locked
                            </span>
                          ) : !isEnrolledInSession ? (
                            <button
                              type="button"
                              className="button button-ghost small"
                              style={{ padding: "6px 14px", fontSize: "0.78rem", opacity: 0.5, cursor: "not-allowed" }}
                              disabled
                              title="Participant is not registered for this session"
                            >
                              Not Enrolled
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={attendedTarget ? "button button-ghost small" : "button button-primary small"}
                              style={{ padding: "6px 14px", fontSize: "0.78rem" }}
                              onClick={() => handleToggleAttendance(reg._id)}
                            >
                              {attendedTarget
                                ? (scanMode === "session" ? "Undo Session" : isMulti ? `Undo D${selectedDayNumber}` : "Undo Entry")
                                : (scanMode === "session" ? "Mark Session ✓" : isMulti ? `Mark D${selectedDayNumber} ✓` : "Mark Present ✓")}
                            </button>
                          )}
                          <button
                            type="button"
                            className="button button-ghost small"
                            style={{
                              padding: "6px 10px",
                              fontSize: "0.78rem",
                              color: "#fb7185",
                              borderColor: "rgba(244, 63, 94, 0.35)",
                              background: "rgba(244, 63, 94, 0.1)",
                              cursor: "pointer",
                            }}
                            onClick={() => handleDeleteRegistration(reg)}
                            title={`Delete registration for ${reg.name}`}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
