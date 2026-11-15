import React, { useEffect, useRef, useState } from "react";

const ASPECT_PRESETS = [
  { id: "free", label: "Free", ratio: null },
  { id: "square", label: "1:1 Square", ratio: 1 },
  { id: "standard", label: "4:3 Box", ratio: 4 / 3 },
  { id: "wide", label: "16:9 Wide", ratio: 16 / 9 },
  { id: "signature", label: "3:1 Banner", ratio: 3 },
];

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function getRotatedDimensions(w, h, rotationDeg) {
  if (!rotationDeg) return { w, h };
  const rad = (rotationDeg * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const newW = Math.max(1, Math.round(w * cos + h * sin));
  const newH = Math.max(1, Math.round(w * sin + h * cos));
  return { w: newW, h: newH };
}

function renderCroppedCanvas(
  img,
  crop,
  { rotation = 0, removeWhiteBg, whiteThreshold, darkModeInk, maxDim = 960 }
) {
  if (!img || !img.naturalWidth) return null;
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;
  const { w: rotW, h: rotH } = getRotatedDimensions(origW, origH, rotation);

  const cropX = crop.x * rotW;
  const cropY = crop.y * rotH;
  const cropW = Math.max(4, crop.w * rotW);
  const cropH = Math.max(4, crop.h * rotH);

  const scale = Math.min(1, maxDim / Math.max(cropW, cropH));
  const dw = Math.max(4, Math.round(cropW * scale));
  const dh = Math.max(4, Math.round(cropH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, dw, dh);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Center of crop box in rotated coordinates
  const cropCenterX = cropX + cropW / 2;
  const cropCenterY = cropY + cropH / 2;

  // Offset of crop center from rotated bounding box center
  const deltaX = cropCenterX - rotW / 2;
  const deltaY = cropCenterY - rotH / 2;

  ctx.save();
  ctx.translate(dw / 2, dh / 2);
  ctx.scale(scale, scale);
  ctx.translate(-deltaX, -deltaY);
  if (rotation) {
    ctx.rotate((rotation * Math.PI) / 180);
  }
  ctx.drawImage(img, -origW / 2, -origH / 2);
  ctx.restore();

  if (removeWhiteBg) {
    const imgData = ctx.getImageData(0, 0, dw, dh);
    const d = imgData.data;
    const cutoff = whiteThreshold;
    const feather = cutoff - 32;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const a = d[i + 3];
      if (a === 0) continue;
      const minC = Math.min(r, g, b);
      const maxC = Math.max(r, g, b);
      const spread = maxC - minC;
      // Only knock out neutral bright backgrounds (paper / studio white)
      if (minC >= cutoff && spread < 45) {
        d[i + 3] = 0;
      } else if (minC > feather && spread < 45) {
        const ratio = (cutoff - minC) / Math.max(1, cutoff - feather);
        d[i + 3] = Math.round(a * clamp(ratio, 0, 1));
      }
      if (darkModeInk && d[i + 3] > 20) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum < 150) {
          d[i] = 248;
          d[i + 1] = 250;
          d[i + 2] = 252;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
  return canvas;
}

export default function CertificateImageCropper({ file, kind, onCancel, onConfirm }) {
  const [imageUrl, setImageUrl] = useState("");
  const [imgLoaded, setImgLoaded] = useState(false);
  const [natSize, setNatSize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState({ x: 0.06, y: 0.08, w: 0.88, h: 0.84 });
  const [aspectId, setAspectId] = useState(kind === "signature" ? "signature" : kind === "stamp" ? "1:1" : "free");
  const [rotation, setRotation] = useState(0);
  const [removeWhiteBg, setRemoveWhiteBg] = useState(kind === "signature" || kind === "stamp");
  const [whiteThreshold, setWhiteThreshold] = useState(215);
  const [darkModeInk, setDarkModeInk] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState("");
  const [exporting, setExporting] = useState(false);

  const rawImageRef = useRef(null);
  const stageCanvasRef = useRef(null);
  const stageRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setImgLoaded(false);
    setRotation(0);

    const img = new Image();
    img.onload = () => {
      rawImageRef.current = img;
      const nw = img.naturalWidth || 1;
      const nh = img.naturalHeight || 1;
      setNatSize({ w: nw, h: nh });
      setImgLoaded(true);

      const initial = kind === "signature"
        ? { x: 0.06, y: 0.16, w: 0.88, h: 0.68 }
        : { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
      const preset = ASPECT_PRESETS.find((item) => item.id === aspectId);
      setCrop(preset?.ratio ? applyAspectToCrop(initial, preset.ratio, nw, nh) : initial);
    };
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [file]);

  function applyAspectToCrop(baseCrop, ratio, nw, nh) {
    if (!ratio || !nw || !nh) return baseCrop;
    const centerX = baseCrop.x + baseCrop.w / 2;
    const centerY = baseCrop.y + baseCrop.h / 2;
    let w = baseCrop.w;
    let h = (w * nw) / (ratio * nh);
    if (h > 0.92) {
      h = 0.92;
      w = (h * ratio * nh) / nw;
    }
    if (w > 0.94) {
      w = 0.94;
      h = (w * nw) / (ratio * nh);
    }
    const x = clamp(centerX - w / 2, 0, 1 - w);
    const y = clamp(centerY - h / 2, 0, 1 - h);
    return { x, y, w, h };
  }

  // Draw rotated image onto stage canvas whenever rotation or loaded image changes
  useEffect(() => {
    const rawImg = rawImageRef.current;
    const canvas = stageCanvasRef.current;
    if (!rawImg || !canvas || !imgLoaded) return;

    const origW = rawImg.naturalWidth;
    const origH = rawImg.naturalHeight;
    const { w: rotW, h: rotH } = getRotatedDimensions(origW, origH, rotation);

    canvas.width = rotW;
    canvas.height = rotH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, rotW, rotH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.save();
    ctx.translate(rotW / 2, rotH / 2);
    if (rotation) {
      ctx.rotate((rotation * Math.PI) / 180);
    }
    ctx.drawImage(rawImg, -origW / 2, -origH / 2);
    ctx.restore();

    setNatSize({ w: rotW, h: rotH });
  }, [rotation, imgLoaded]);

  function handleRotationChange(newRot) {
    let normalized = Math.round(newRot);
    if (normalized > 180) normalized -= 360;
    if (normalized < -180) normalized += 360;
    setRotation(normalized);

    const rawImg = rawImageRef.current;
    if (rawImg) {
      const origW = rawImg.naturalWidth;
      const origH = rawImg.naturalHeight;
      const { w: nextW, h: nextH } = getRotatedDimensions(origW, origH, normalized);
      const preset = ASPECT_PRESETS.find((item) => item.id === aspectId);
      if (preset?.ratio) {
        setCrop((curr) => applyAspectToCrop(curr, preset.ratio, nextW, nextH));
      } else {
        setCrop((curr) => ({
          ...curr,
          x: clamp(curr.x, 0, 1 - curr.w),
          y: clamp(curr.y, 0, 1 - curr.h),
        }));
      }
    }
  }

  // Update live preview result thumbnail
  useEffect(() => {
    const rawImg = rawImageRef.current;
    if (!rawImg || !imgLoaded) return;
    const canvas = renderCroppedCanvas(rawImg, crop, {
      rotation,
      removeWhiteBg,
      whiteThreshold,
      darkModeInk,
      maxDim: 360,
    });
    if (canvas) {
      setPreviewDataUrl(canvas.toDataURL("image/png"));
    }
  }, [crop, imgLoaded, rotation, removeWhiteBg, whiteThreshold, darkModeInk]);

  useEffect(() => {
    function onPointerMove(e) {
      const active = dragRef.current;
      const box = stageRef.current?.getBoundingClientRect();
      if (!active || !box || !box.width || !box.height) return;

      const dx = (e.clientX - active.startX) / box.width;
      const dy = (e.clientY - active.startY) / box.height;
      const orig = active.startCrop;
      const minSize = 0.08;
      const ratio = ASPECT_PRESETS.find((item) => item.id === aspectId)?.ratio || null;

      if (active.mode === "move") {
        setCrop({
          ...orig,
          x: clamp(orig.x + dx, 0, 1 - orig.w),
          y: clamp(orig.y + dy, 0, 1 - orig.h),
        });
        return;
      }

      const rightEdge = orig.x + orig.w;
      const bottomEdge = orig.y + orig.h;
      let nextX = orig.x;
      let nextY = orig.y;
      let nextW = orig.w;
      let nextH = orig.h;

      if (active.mode.includes("e")) {
        nextW = clamp(orig.w + dx, minSize, 1 - orig.x);
      }
      if (active.mode.includes("s")) {
        nextH = clamp(orig.h + dy, minSize, 1 - orig.y);
      }
      if (active.mode.includes("w")) {
        nextX = clamp(orig.x + dx, 0, rightEdge - minSize);
        nextW = rightEdge - nextX;
      }
      if (active.mode.includes("n")) {
        nextY = clamp(orig.y + dy, 0, bottomEdge - minSize);
        nextH = bottomEdge - nextY;
      }

      if (ratio && natSize.w && natSize.h) {
        nextH = (nextW * natSize.w) / (ratio * natSize.h);
        if (active.mode.includes("n")) {
          if (bottomEdge - nextH < 0) {
            nextH = bottomEdge;
            nextW = (nextH * ratio * natSize.h) / natSize.w;
            if (active.mode.includes("w")) nextX = rightEdge - nextW;
          }
          nextY = bottomEdge - nextH;
        } else if (nextY + nextH > 1) {
          nextH = 1 - nextY;
          nextW = (nextH * ratio * natSize.h) / natSize.w;
          if (active.mode.includes("w")) nextX = clamp(rightEdge - nextW, 0, rightEdge - minSize);
        }
        if (nextX < 0 || nextX + nextW > 1) return;
      }

      setCrop({ x: nextX, y: nextY, w: nextW, h: nextH });
    }

    function onPointerUp() {
      dragRef.current = null;
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [aspectId, natSize]);

  function startDrag(mode, e) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    };
  }

  function selectAspect(id) {
    setAspectId(id);
    const preset = ASPECT_PRESETS.find((item) => item.id === id);
    if (preset?.ratio && natSize.w && natSize.h) {
      setCrop((curr) => applyAspectToCrop(curr, preset.ratio, natSize.w, natSize.h));
    }
  }

  function handleConfirm() {
    const rawImg = rawImageRef.current;
    if (!rawImg || exporting) return;
    setExporting(true);
    const canvas = renderCroppedCanvas(rawImg, crop, {
      rotation,
      removeWhiteBg,
      whiteThreshold,
      darkModeInk,
      maxDim: 1000,
    });
    if (!canvas) {
      setExporting(false);
      return;
    }
    canvas.toBlob((blob) => {
      setExporting(false);
      if (!blob) return;
      const base = (file?.name || kind).replace(/\.[^.]+$/, "");
      const croppedFile = new File([blob], `${base}-cropped.png`, { type: "image/png" });
      onConfirm(croppedFile);
    }, "image/png");
  }

  return (
    <div className="crop-modal-backdrop" role="dialog" aria-modal="true" aria-label="Crop certificate image">
      <div className="crop-modal-card">
        <div className="crop-modal-header">
          <div>
            <p className="certificate-kicker">IMAGE CROPPER</p>
            <h3>Crop {kind === "signature" ? "Signature Image" : kind === "stamp" ? "Official Seal or Stamp" : "Organization Logo"}</h3>
          </div>
          <button type="button" className="remove-signatory" onClick={onCancel} aria-label="Close cropper">
            ×
          </button>
        </div>

        <div className="crop-aspect-bar" role="group" aria-label="Crop aspect ratios">
          {ASPECT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`certificate-pill-btn${aspectId === preset.id ? " is-active" : ""}`}
              onClick={() => selectAspect(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Angle & Free Rotation Bar */}
        <div className="crop-rotate-bar" role="group" aria-label="Image rotation controls">
          <div className="crop-rotate-label-group">
            <span className="crop-rotate-icon">⟳</span>
            <span>Rotation</span>
            <span className="crop-rotate-badge">{rotation > 0 ? `+${rotation}°` : `${rotation}°`}</span>
          </div>

          <div className="crop-rotate-slider-wrap">
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={rotation}
              onChange={(e) => handleRotationChange(Number(e.target.value))}
              className="crop-rotate-slider"
              title="Drag slider for custom angle rotation"
              aria-label="Image rotation angle"
            />
          </div>

          <div className="crop-rotate-actions">
            <button
              type="button"
              className="crop-rotate-step-btn"
              title="Nudge 1° counter-clockwise"
              onClick={() => handleRotationChange(rotation - 1)}
            >
              −1°
            </button>
            <button
              type="button"
              className="crop-rotate-step-btn"
              title="Nudge 1° clockwise"
              onClick={() => handleRotationChange(rotation + 1)}
            >
              +1°
            </button>
            <button
              type="button"
              className="crop-rotate-step-btn"
              title="Rotate 90° counter-clockwise"
              onClick={() => handleRotationChange(rotation - 90)}
            >
              ↺ 90°
            </button>
            <button
              type="button"
              className="crop-rotate-step-btn"
              title="Rotate 90° clockwise"
              onClick={() => handleRotationChange(rotation + 90)}
            >
              ↻ 90°
            </button>
            {rotation !== 0 && (
              <button
                type="button"
                className="crop-rotate-reset-btn"
                title="Reset rotation to 0°"
                onClick={() => handleRotationChange(0)}
              >
                0° Reset
              </button>
            )}
          </div>
        </div>

        <div className="crop-stage-wrap">
          <div className="crop-stage" ref={stageRef}>
            <canvas
              ref={stageCanvasRef}
              className="crop-stage-canvas"
              style={{ display: imgLoaded ? "block" : "none" }}
            />
            {!imgLoaded && (
              <div style={{ padding: "48px 24px", color: "#64748B", fontSize: "0.85rem", textAlign: "center" }}>
                Loading image for cropper…
              </div>
            )}
            {imgLoaded && (
              <div
                className="crop-selection-box"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.w * 100}%`,
                  height: `${crop.h * 100}%`,
                }}
                onPointerDown={(e) => startDrag("move", e)}
              >
                <span className="crop-grid-h" />
                <span className="crop-grid-v" />
                <button type="button" className="crop-handle is-nw" onPointerDown={(e) => startDrag("nw", e)} aria-label="Resize top left" />
                <button type="button" className="crop-handle is-ne" onPointerDown={(e) => startDrag("ne", e)} aria-label="Resize top right" />
                <button type="button" className="crop-handle is-sw" onPointerDown={(e) => startDrag("sw", e)} aria-label="Resize bottom left" />
                <button type="button" className="crop-handle is-se" onPointerDown={(e) => startDrag("se", e)} aria-label="Resize bottom right" />
              </div>
            )}
          </div>
        </div>

        <div className="crop-options-row">
          <div className="crop-toggles">
            <label className="certificate-switch" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={removeWhiteBg}
                onChange={(e) => setRemoveWhiteBg(e.target.checked)}
              />
              <span>Transparent background (remove white paper)</span>
            </label>
            {removeWhiteBg && (
              <div className="crop-bg-controls">
                <label className="crop-slider-field">
                  <span>Sensitivity</span>
                  <input
                    type="range"
                    min="175"
                    max="245"
                    value={whiteThreshold}
                    onChange={(e) => setWhiteThreshold(Number(e.target.value))}
                  />
                </label>
                {kind === "signature" && (
                  <label className="certificate-switch" style={{ margin: 0, fontSize: "0.74rem" }}>
                    <input
                      type="checkbox"
                      checked={darkModeInk}
                      onChange={(e) => setDarkModeInk(e.target.checked)}
                    />
                    <span>Light ink (for dark templates)</span>
                  </label>
                )}
              </div>
            )}
          </div>

          {previewDataUrl && (
            <div className={`crop-output-preview${darkModeInk ? " is-dark" : ""}`}>
              <span>Result</span>
              <img src={previewDataUrl} alt="Cropped output preview" />
            </div>
          )}
        </div>

        <div className="crop-modal-footer">
          <button type="button" className="cert-button" onClick={onCancel} disabled={exporting}>
            Cancel
          </button>
          <button type="button" className="cert-button cert-button-primary" onClick={handleConfirm} disabled={exporting || !imgLoaded}>
            {exporting ? "Processing…" : "Crop & Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
