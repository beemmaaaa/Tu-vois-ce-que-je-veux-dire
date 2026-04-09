/* =========================================================
   TU VOIS CE QUE JE VEUX DIRE — SCRIPT CLEAN + STABLE
========================================================= */

/* =========================
   GLOBAL
========================= */

const accueilScreen = document.getElementById("screen-accueil");
const feedScreen = document.getElementById("screen-feed");
const slides = Array.from(document.querySelectorAll(".slide"));

let currentSlide = 0;
let feedVisible = false;
let wheelLocked = false;
let wheelAccumulator = 0;
let touchStartY = 0;
let touchDeltaY = 0;

/* =========================
   SAFE DOM HELPERS
========================= */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isEditableTarget(target) {
  if (!target) return false;
  return !!target.closest("textarea, input, [contenteditable='true']");
}

/* =========================
   VIDEO MANAGEMENT
========================= */

const allVideos = Array.from(document.querySelectorAll("video"));

function prepareAllVideos() {
  allVideos.forEach((video) => {
    video.setAttribute("playsinline", "");
  });
}

function pauseAllVideos() {
  allVideos.forEach((video) => {
    try {
      video.pause();
    } catch (e) {}
  });
}

function getSlideVideo(slide) {
  if (!slide) return null;
  return slide.querySelector(".video-zone video, .ressentir-bg-video, .publish-video-player");
}

function shouldVideoStayMuted(video) {
  if (!video) return true;

  if (video.classList.contains("ressentir-bg-video")) return true;
  if (video.classList.contains("publish-video-player")) return true;
  if (video.closest(".publish-video-shell")) return true;

  return false;
}

function syncActiveSlideVideos() {
  pauseAllVideos();

  if (!feedVisible) return;

  const activeSlide = slides[currentSlide];
  if (!activeSlide) return;

  const activeVideo = getSlideVideo(activeSlide);
  if (!activeVideo) return;

  if (shouldVideoStayMuted(activeVideo)) {
    activeVideo.muted = true;
    activeVideo.volume = 0;
  } else {
    activeVideo.muted = false;
    activeVideo.volume = 1;
  }

  activeVideo.play().catch(() => {});
}

/* =========================
   SLIDE NAV
========================= */

function goToSlide(index) {
  const nextIndex = clamp(index, 0, slides.length - 1);

  slides.forEach((slide, i) => {
    slide.classList.remove("active", "prev");
    if (i < nextIndex) slide.classList.add("prev");
    if (i === nextIndex) slide.classList.add("active");
  });

  currentSlide = nextIndex;
  syncActiveSlideVideos();
}

function nextSlide() {
  if (currentSlide < slides.length - 1) {
    goToSlide(currentSlide + 1);
  }
}

function prevSlide() {
  if (currentSlide > 0) {
    goToSlide(currentSlide - 1);
  }
}

/* =========================================================
   ACCUEIL
========================================================= */

/* ── ACCUEIL PIXELS ── */
(function () {
  const PIXEL = 12;
  const COLOR = "#FCF3FF";

  const canvas = document.getElementById("pixel-canvas");
  const swipe = document.getElementById("swipe");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let W, H, pixels, order, frame, raf;

  function buildGrid() {
    const cols = Math.ceil(W / PIXEL);
    const rows = Math.ceil(H / PIXEL);
    pixels = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < Math.max(0.04, 1 - (r / rows) * 1.3)) {
          pixels.push({
            x: c * PIXEL,
            y: r * PIXEL,
            size: Math.random() < 0.3 ? PIXEL * 0.45 : PIXEL,
            alpha: Math.random() * 0.45 + 0.55,
          });
        }
      }
    }

    order = pixels.map((_, i) => i).sort(() => Math.random() - 0.5);
    frame = 0;
  }

  function drawGrid() {
    ctx.clearRect(0, 0, W, H);

    pixels.forEach((p) => {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = COLOR;

      const off = (PIXEL - p.size) / 2;
      ctx.fillRect(
        p.x + off,
        p.y + off,
        Math.max(1, p.size - 1),
        Math.max(1, p.size - 1)
      );
    });

    ctx.globalAlpha = 1;
  }

  function dissolve() {
    const perFrame = Math.ceil(pixels.length / Math.round(2000 / 16));

    function tick() {
      const start = frame * perFrame;
      const end = Math.min(start + perFrame, pixels.length);

      for (let i = start; i < end; i++) {
        const p = pixels[order[i]];
        if (p) ctx.clearRect(p.x, p.y, PIXEL, PIXEL);
      }

      frame++;

      if (start < pixels.length) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          if (swipe) swipe.classList.add("visible");
        }, 300);
      }
    }

    raf = requestAnimationFrame(tick);
  }

  function initCanvas() {
    cancelAnimationFrame(raf);

    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;

    buildGrid();
    drawGrid();
  }

  window.addEventListener("resize", () => {
    initCanvas();
    setTimeout(dissolve, 400);
  });

  initCanvas();
  setTimeout(dissolve, 500);
})();

/* ── OUVRIR LE FEED ── */

function showFeed() {
  if (feedVisible) return;

  feedVisible = true;

  accueilScreen.classList.add("hidden");
  feedScreen.classList.add("visible");

  goToSlide(0);
}

window.showFeed = showFeed;

const swipeBtn = document.getElementById("swipe");

if (swipeBtn) {
  swipeBtn.addEventListener("click", showFeed);
}

if (accueilScreen) {
  accueilScreen.addEventListener(
    "wheel",
    (e) => {
      if (e.deltaY > 10) {
        e.preventDefault();
        showFeed();
      }
    },
    { passive: false }
  );

  accueilScreen.addEventListener(
    "touchstart",
    (e) => {
      if (!e.touches || !e.touches.length) return;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  accueilScreen.addEventListener(
    "touchend",
    (e) => {
      if (!e.changedTouches || !e.changedTouches.length) return;
      const endY = e.changedTouches[0].clientY;
      const delta = touchStartY - endY;

      if (delta > 30) {
        showFeed();
      }
    },
    { passive: true }
  );
}

/* =========================
   WHEEL CONTROL
========================= */

function lockWheel() {
  wheelLocked = true;
  setTimeout(() => {
    wheelLocked = false;
    wheelAccumulator = 0;
  }, 520);
}

window.addEventListener(
  "wheel",
  (e) => {
    if (isEditableTarget(e.target)) return;

    if (!feedVisible) {
      if (Math.abs(e.deltaY) > 6) {
        e.preventDefault();
        showFeed();
      }
      return;
    }

    e.preventDefault();

    if (wheelLocked) return;

    wheelAccumulator += e.deltaY;

    const threshold = 70;

    if (wheelAccumulator > threshold) {
      nextSlide();
      lockWheel();
    } else if (wheelAccumulator < -threshold) {
      prevSlide();
      lockWheel();
    }
  },
  { passive: false }
);

/* =========================
   TOUCH / SWIPE
========================= */

window.addEventListener(
  "touchstart",
  (e) => {
    if (!e.touches || !e.touches.length) return;
    touchStartY = e.touches[0].clientY;
    touchDeltaY = 0;
  },
  { passive: true }
);

window.addEventListener(
  "touchmove",
  (e) => {
    if (!e.touches || !e.touches.length) return;
    touchDeltaY = e.touches[0].clientY - touchStartY;
  },
  { passive: true }
);

window.addEventListener(
  "touchend",
  () => {
    if (!feedVisible) {
      if (Math.abs(touchDeltaY) > 40) {
        showFeed();
      }
      return;
    }

    if (wheelLocked) return;

    const threshold = 60;

    if (touchDeltaY < -threshold) {
      nextSlide();
      lockWheel();
    } else if (touchDeltaY > threshold) {
      prevSlide();
      lockWheel();
    }
  },
  { passive: true }
);

/* =========================
   TIKTOK TAP PAUSE/PLAY
========================= */

function createPauseIndicator(zone) {
  const indicator = document.createElement("div");
  indicator.className = "video-pause-indicator";
  indicator.textContent = "PAUSE";
  zone.appendChild(indicator);
  return indicator;
}

document.querySelectorAll(".video-zone").forEach((zone) => {
  const video = zone.querySelector("video");
  if (!video) return;

  const actions = zone.querySelector(".actions");
  const info = zone.querySelector(".info");
  const indicator = createPauseIndicator(zone);

  zone.addEventListener("click", (e) => {
    if (
      e.target.closest(".actions") ||
      e.target.closest(".action-item") ||
      e.target.closest("button") ||
      e.target.closest("a")
    ) {
      return;
    }

    if (video.paused) {
      video.play().catch(() => {});
      indicator.classList.remove("is-visible");
      zone.classList.remove("is-paused");
    } else {
      video.pause();
      indicator.classList.add("is-visible");
      zone.classList.add("is-paused");
    }
  });

  if (actions) actions.style.zIndex = "10";
  if (info) info.style.zIndex = "10";
});

/* =========================
   LIKE
========================= */

function toggleLike(el) {
  el.classList.toggle("liked");

  const img = el.querySelector("img");
  if (img) {
    img.src = el.classList.contains("liked")
      ? "./assets/LIKE_red.svg"
      : "./assets/LIKE.svg";
  }

  el.style.transform = "scale(1.15)";
  setTimeout(() => {
    el.style.transform = "scale(1)";
  }, 150);
}

window.toggleLike = toggleLike;

/* =========================
   CROIRE — HOTSPOTS PANEL
========================= */

const infoPanel = document.getElementById("infoPanel");
const closePanel = document.getElementById("closePanel");
const panelTitle = document.getElementById("panelTitle");
const panelText = document.getElementById("panelText");
const panelTextDuplicate = document.getElementById("panelTextDuplicate");
const panelImage = document.getElementById("panelImage");

document.querySelectorAll(".hotspot").forEach((hotspot) => {
  hotspot.addEventListener("click", () => {
    if (!infoPanel) return;

    const title = hotspot.dataset.title || "";
    const text = hotspot.dataset.text || "";
    const image = hotspot.dataset.image || "";

    if (panelTitle) panelTitle.textContent = title;
    if (panelText) panelText.textContent = text;
    if (panelTextDuplicate) panelTextDuplicate.textContent = text;
    if (panelImage) panelImage.src = image;

    infoPanel.classList.add("active");
    infoPanel.setAttribute("aria-hidden", "false");
  });
});

if (closePanel && infoPanel) {
  closePanel.addEventListener("click", () => {
    infoPanel.classList.remove("active");
    infoPanel.setAttribute("aria-hidden", "true");
  });

  infoPanel.addEventListener("click", (e) => {
    if (e.target === infoPanel) {
      infoPanel.classList.remove("active");
      infoPanel.setAttribute("aria-hidden", "true");
    }
  });
}

/* =========================
   RESSENTIR
========================= */

document.querySelectorAll(".ressentir-options").forEach((group) => {
  const buttons = Array.from(group.querySelectorAll(".ressentir-option"));
  const continueBtn = group.parentElement.querySelector(".ressentir-continue");
  const question = group.dataset.question || "";
  const isSingle = question === "intention";

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (isSingle) {
        buttons.forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
      } else {
        btn.classList.toggle("is-selected");
      }

      const selectedCount = group.querySelectorAll(".is-selected").length;
      if (continueBtn) continueBtn.disabled = selectedCount === 0;
    });
  });
});

document.querySelectorAll(".ressentir-continue").forEach((btn) => {
  btn.addEventListener("click", () => nextSlide());
});

/* =========================================================
   EDITOR + PUBLISH — VERSION PROPRE
========================================================= */

const mainVideo = document.getElementById("mainVideo");
const playPauseBtn = document.getElementById("playPauseBtn");
const playPauseIcon = document.getElementById("playPauseIcon");
const editorNextBtn = document.getElementById("editorNextBtn");

const subtitleOverlay = document.getElementById("subtitleOverlay");
const publishSubtitlePreview = document.getElementById("publishSubtitlePreview");

const bgMusic = document.getElementById("bgMusic");

const trimWindows = Array.from(document.querySelectorAll(".trim-window"));
const timelineTrack = document.getElementById("timelineTrack");
const startTimeLabel = document.getElementById("startTimeLabel");
const endTimeLabel = document.getElementById("endTimeLabel");

const publishPage = document.getElementById("publishPage");
const publishActionBtn = document.getElementById("publishActionBtn");
const publishOverlay = document.getElementById("publishOverlay");
const publishOverlayBtn = document.getElementById("publishOverlayBtn");
const publishDescription = document.getElementById("publishDescription");
const publishBackBtn = document.getElementById("publishBackBtn");
const publishPreviewVideo = document.getElementById("publishPreviewVideo");
const publishTimePreview = document.getElementById("publishTimePreview");
const publishProgressFill = document.getElementById("publishProgressFill");

const progressFill = document.getElementById("progressFill");
const timeDisplay = document.getElementById("timeDisplay");

/* =========================
   CONFIG
========================= */

const CUT_DURATION = 5; // 5 secondes par box
const TOTAL_CUTS = 3;

const editorState = {
  videoDuration: 0,
  currentCutIndex: 0,
  cuts: [0, 5, 10],
  trimWidthPercent: 0,
  draggingTrimIndex: null,
  dragStartX: 0,
  trimStartLeft: 0,
  selectedMusicSrc: "",
  selectedSubtitleText: subtitleOverlay ? subtitleOverlay.textContent : "",
  selectedSubtitleClass: subtitleOverlay ? [...subtitleOverlay.classList].find(c => c.startsWith("style-")) || "style-1" : "style-1",
  isCompositePlaying: false,
  compositeMode: false,
  compositeSegmentIndex: 0,
  compositeStartTimestamp: 0,
  compositeCurrentSegmentStart: 0
};


/* =========================
   HELPERS
========================= */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function formatTimelineLabel(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `0:00:${String(s).padStart(2, "0")}`;
}

function getMaxCutStart() {
  return Math.max(0, editorState.videoDuration - CUT_DURATION);
}

function getCutStartPercent(startSec) {
  if (!editorState.videoDuration || editorState.videoDuration <= CUT_DURATION) return 0;
  return (startSec / editorState.videoDuration) * 100;
}

function getCutWidthPercent() {
  if (!editorState.videoDuration) return 100;
  return (CUT_DURATION / editorState.videoDuration) * 100;
}

function setPlayIcon(isPlaying) {
  if (!playPauseIcon) return;
  playPauseIcon.src = isPlaying ? "./assets/pause.svg" : "./assets/play.svg";
  playPauseIcon.alt = isPlaying ? "Pause" : "Lecture";
}

function updateTimeUI(current, total) {
  if (timeDisplay) {
    timeDisplay.textContent = `${formatTime(current)} / ${formatTime(total)}`;
  }

  const progress = total > 0 ? (current / total) * 100 : 0;
  if (progressFill) {
    progressFill.style.width = `${clamp(progress, 0, 100)}%`;
  }
}

function updatePublishTimeUI(current, total) {
  if (publishTimePreview) {
    publishTimePreview.textContent = `${formatTime(current)} / ${formatTime(total)}`;
  }

  const progress = total > 0 ? (current / total) * 100 : 0;
  if (publishProgressFill) {
    publishProgressFill.style.width = `${clamp(progress, 0, 100)}%`;
  }
}

function syncPublishPreviewSource() {
  if (!mainVideo || !publishPreviewVideo) return;

  const source = mainVideo.querySelector("source");
  const publishSource = publishPreviewVideo.querySelector("source");

  if (source && publishSource) {
    publishSource.src = source.src || source.getAttribute("src");
    publishPreviewVideo.load();
  }
}

function updateTrimWidthPercent() {
  editorState.trimWidthPercent = getCutWidthPercent();
}

function updateTrimUI() {
  if (!trimWindows.length) return;

  trimWindows.forEach((windowEl, index) => {
    const startSec = editorState.cuts[index] ?? 0;
    const leftPercent = getCutStartPercent(startSec);

    windowEl.style.left = `${leftPercent}%`;
    windowEl.style.width = `${editorState.trimWidthPercent}%`;
    windowEl.classList.toggle("active", index === editorState.currentCutIndex);
  });

  const currentStart = editorState.cuts[editorState.currentCutIndex] ?? 0;
  const currentEnd = currentStart + CUT_DURATION;

  if (startTimeLabel) startTimeLabel.textContent = formatTimelineLabel(currentStart);
  if (endTimeLabel) endTimeLabel.textContent = formatTimelineLabel(currentEnd);
}

function updateCurrentTrimFromState() {
  updateTrimUI();
}

function saveCurrentCutFromPercent(leftPercent) {
  const maxStart = getMaxCutStart();
  const startSec = (leftPercent / 100) * editorState.videoDuration;
  editorState.cuts[editorState.currentCutIndex] = clamp(startSec, 0, maxStart);
}

function playSelectedMusic() {
  if (!bgMusic) return;

  if (!editorState.selectedMusicSrc) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
    return;
  }

  if (bgMusic.src !== new URL(editorState.selectedMusicSrc, window.location.href).href) {
    bgMusic.src = editorState.selectedMusicSrc;
    bgMusic.load();
  }

  bgMusic.currentTime = 0;
  bgMusic.volume = 1;
  bgMusic.play().catch(() => {});
}

function stopSelectedMusic() {
  if (!bgMusic) return;
  bgMusic.pause();
  bgMusic.currentTime = 0;
}

function playCurrentCutPreview() {
  if (!mainVideo) return;

  editorState.compositeMode = false;
  editorState.isCompositePlaying = false;

  const currentStart = editorState.cuts[editorState.currentCutIndex] ?? 0;
  mainVideo.currentTime = currentStart;
  mainVideo.play().catch(() => {});
  setPlayIcon(true);

  if (editorState.selectedMusicSrc) {
    playSelectedMusic();
  }
}

function startCompositePlayback(videoEl, options = {}) {
  const isPublish = !!options.publish;
  const totalDuration = CUT_DURATION * TOTAL_CUTS;
  const cutsReady = editorState.cuts.every(c => typeof c === "number");

  if (!cutsReady || !videoEl) return;

  videoEl.pause();

  editorState.compositeStartTimestamp = performance.now();
  editorState.compositeSegmentIndex = 0;

  const firstStart = editorState.cuts[0];
  videoEl.currentTime = firstStart;

  if (isPublish) {
    updatePublishTimeUI(0, totalDuration);
  } else {
    editorState.compositeMode = true;
    editorState.isCompositePlaying = true;
    updateTimeUI(0, totalDuration);
    setPlayIcon(true);

    if (editorState.selectedMusicSrc) {
      playSelectedMusic();
    }
  }

  videoEl.play().catch(() => {});
}

function handleCompositeLoop(videoEl, isPublish = false) {
  if (!videoEl) return;

  const totalDuration = CUT_DURATION * TOTAL_CUTS;
  const elapsed = (performance.now() - editorState.compositeStartTimestamp) / 1000;
  const clampedElapsed = clamp(elapsed, 0, totalDuration);

  const segmentIndex = Math.min(
    TOTAL_CUTS - 1,
    Math.floor(clampedElapsed / CUT_DURATION)
  );

  const segmentElapsed = clampedElapsed - segmentIndex * CUT_DURATION;
  const segmentStart = editorState.cuts[segmentIndex];

  if (typeof segmentStart !== "number") return;

  const targetTime = segmentStart + segmentElapsed;

  if (Math.abs(videoEl.currentTime - targetTime) > 0.12) {
    videoEl.currentTime = targetTime;
  }

  if (isPublish) {
    updatePublishTimeUI(clampedElapsed, totalDuration);
  } else {
    updateTimeUI(clampedElapsed, totalDuration);
  }

  if (clampedElapsed >= totalDuration) {
    videoEl.pause();
    videoEl.currentTime = editorState.cuts[0];

    if (isPublish) {
      updatePublishTimeUI(totalDuration, totalDuration);
    } else {
      editorState.isCompositePlaying = false;
      editorState.compositeMode = false;
      stopSelectedMusic();
      setPlayIcon(false);
      updateTimeUI(totalDuration, totalDuration);
    }
  }
}

/* =========================
   INIT VIDEO
========================= */

if (mainVideo) {
  mainVideo.muted = false;
  mainVideo.volume = 1;

  mainVideo.addEventListener("loadedmetadata", () => {
  editorState.videoDuration = mainVideo.duration || 15;
  updateTrimWidthPercent();

  const maxStart = getMaxCutStart();
  editorState.cuts = [
    0,
    clamp(5, 0, maxStart),
    clamp(10, 0, maxStart)
  ];

  updateTrimUI();
  updateTimeUI(0, CUT_DURATION * TOTAL_CUTS);
  syncPublishPreviewSource();
});

  mainVideo.addEventListener("timeupdate", () => {
    if (editorState.compositeMode) return;

    const currentStart = editorState.cuts[editorState.currentCutIndex] ?? 0;
    const currentEnd = currentStart + CUT_DURATION;

    if (mainVideo.currentTime >= currentEnd) {
      mainVideo.pause();
      mainVideo.currentTime = currentStart;
      setPlayIcon(false);
      stopSelectedMusic();
    }

    const localTime = clamp(mainVideo.currentTime - currentStart, 0, CUT_DURATION);
    updateTimeUI(localTime, CUT_DURATION);
  });

  mainVideo.addEventListener("play", () => {
    if (!editorState.compositeMode) setPlayIcon(true);
  });

  mainVideo.addEventListener("pause", () => {
    if (!editorState.compositeMode) setPlayIcon(false);
  });
}

/* =========================
   PLAY / PAUSE
========================= */

if (playPauseBtn && mainVideo) {
  playPauseBtn.addEventListener("click", () => {
    const cutsReady = editorState.cuts.every(c => typeof c === "number");

    if (!cutsReady) return;

    if (editorState.isCompositePlaying) {
      editorState.isCompositePlaying = false;
      editorState.compositeMode = false;
      mainVideo.pause();
      stopSelectedMusic();
      setPlayIcon(false);
      updateTimeUI(0, CUT_DURATION * TOTAL_CUTS);
    } else {
      startCompositePlayback(mainVideo, { publish: false });
    }
  });
}

/* =========================
   TOOL PANELS
========================= */

document.querySelectorAll(".tool-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const panelId = btn.dataset.panel;
    if (!panelId) return;

    document.querySelectorAll(".tool-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tool-panel").forEach((panel) => panel.classList.remove("active"));

    btn.classList.add("active");
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add("active");
  });
});

/* =========================
   SUBTITLES
========================= */

document.querySelectorAll(".subtitle-choice").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".subtitle-choice").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const text = btn.dataset.text || "";
    const style = btn.dataset.style || "style-1";

    editorState.selectedSubtitleText = text;
    editorState.selectedSubtitleClass = style;

    if (style === "none") {
    subtitleOverlay.textContent = "";
    subtitleOverlay.className = "subtitle-overlay hidden";
    } else {
    subtitleOverlay.textContent = text;
    subtitleOverlay.className = `subtitle-overlay ${style}`;
    }
  });
});

/* =========================
   MUSIC
========================= */

document.querySelectorAll(".music-choice").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".music-choice").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    editorState.selectedMusicSrc = btn.dataset.audio || "";

    if (!editorState.selectedMusicSrc) {
      stopSelectedMusic();
      return;
    }

    bgMusic.src = editorState.selectedMusicSrc;
    bgMusic.load();

    if (!mainVideo.paused || editorState.isCompositePlaying) {
      playSelectedMusic();
    }
  });
});

/* =========================
   TIMELINE / TRIM
========================= */

if (trimWindows.length && timelineTrack) {
  trimWindows.forEach((windowEl, index) => {
    windowEl.addEventListener("mousedown", (e) => {
      editorState.currentCutIndex = index;
      editorState.draggingTrimIndex = index;
      editorState.dragStartX = e.clientX;
      editorState.trimStartLeft = getCutStartPercent(editorState.cuts[index] ?? 0);

      trimWindows.forEach((el) => el.classList.remove("dragging"));
      windowEl.classList.add("dragging");

      updateTrimUI();
    });
  });

  window.addEventListener("mousemove", (e) => {
    if (editorState.draggingTrimIndex === null) return;

    const trackRect = timelineTrack.getBoundingClientRect();
    const deltaPx = e.clientX - editorState.dragStartX;
    const deltaPercent = (deltaPx / trackRect.width) * 100;

    const maxLeft = 100 - editorState.trimWidthPercent;
    const nextLeftPercent = clamp(editorState.trimStartLeft + deltaPercent, 0, maxLeft);

    saveCurrentCutFromPercent(nextLeftPercent);
    updateTrimUI();
  });

  window.addEventListener("mouseup", () => {
    if (editorState.draggingTrimIndex === null) return;

    trimWindows.forEach((el) => el.classList.remove("dragging"));
    editorState.draggingTrimIndex = null;
  });
}

/* =========================
   NEXT BUTTON
========================= */

if (editorNextBtn) {
  editorNextBtn.addEventListener("click", () => {
    mainVideo.pause();
    setPlayIcon(false);
    stopSelectedMusic();

    syncPublishPreviewSource();

    if (publishSubtitlePreview) {
      publishSubtitlePreview.textContent = editorState.selectedSubtitleText || "";
      publishSubtitlePreview.className = `publish-subtitle-preview ${editorState.selectedSubtitleClass}`;
    }

    goToSlide(11);

    setTimeout(() => {
      if (publishPreviewVideo) {
        startCompositePlayback(publishPreviewVideo, { publish: true });
      }
    }, 120);
  });
}

/* =========================
   PUBLISH
========================= */

if (publishBackBtn) {
  publishBackBtn.addEventListener("click", () => {
    if (publishPreviewVideo) {
      publishPreviewVideo.pause();
      publishPreviewVideo.currentTime = 0;
      updatePublishTimeUI(0, CUT_DURATION * TOTAL_CUTS);
    }
    goToSlide(10);
  });
}

if (publishActionBtn && publishOverlay) {
  publishActionBtn.addEventListener("click", () => {
    publishOverlay.classList.add("is-visible");
    publishOverlay.setAttribute("aria-hidden", "false");
  });
}

if (publishOverlayBtn && publishOverlay) {
  publishOverlayBtn.addEventListener("click", () => {
    publishOverlay.classList.remove("is-visible");
    publishOverlay.setAttribute("aria-hidden", "true");

    if (publishPreviewVideo) {
      publishPreviewVideo.pause();
    }

    goToSlide(12);
  });
}

if (publishDescription && publishPage) {
  publishDescription.addEventListener("focus", () => {
    publishPage.classList.add("keyboard-open");
  });

  publishDescription.addEventListener("blur", () => {
    publishPage.classList.remove("keyboard-open");
  });
}

/* =========================
   LOOP RAF FOR COMPOSITE PLAYBACK
========================= */

function animationLoop() {
  if (editorState.isCompositePlaying && mainVideo) {
    handleCompositeLoop(mainVideo, false);
  }

  if (publishPreviewVideo && !publishPreviewVideo.paused && goToSlide) {
    const publishSlide = document.getElementById("slide-11");
    if (publishSlide && publishSlide.classList.contains("active")) {
      handleCompositeLoop(publishPreviewVideo, true);
    }
  }

  requestAnimationFrame(animationLoop);
}


/* =========================
   REAL OR FAKE INTRO
========================= */

const startRealFakeBtn = document.getElementById("startRealFakeBtn");
if (startRealFakeBtn) {
  startRealFakeBtn.addEventListener("click", () => {
    goToSlide(13);
  });
}

/* =========================
   INIT
========================= */

function init() {
  prepareAllVideos();

  slides.forEach((slide, i) => {
    slide.classList.remove("active", "prev");
    if (i === 0) slide.classList.add("active");
  });

  currentSlide = 0;
  feedVisible = false;

  pauseAllVideos();
}

init();

