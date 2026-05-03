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
      ? "./LIKE_red.svg"
      : "./LIKE.svg";
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
   EDITOR — 1 VIDEO DE 60s / 1 FENÊTRE DE 15s
========================================================= */

const mainVideo = document.getElementById("mainVideo");
const playPauseBtn = document.getElementById("playPauseBtn");
const playPauseIcon = document.getElementById("playPauseIcon");

const subtitleOverlay = document.getElementById("subtitleOverlay");
const bgMusic = document.getElementById("bgMusic");

const trimWindow = document.getElementById("trimWindow");
const timelineTrack = document.getElementById("timelineTrack");
const trimStartMinus = document.getElementById("trimStartMinus");
const trimEndPlus = document.getElementById("trimEndPlus");

const startTimeLabel = document.getElementById("startTimeLabel");
const endTimeLabel = document.getElementById("endTimeLabel");

const progressFill = document.getElementById("progressFill");
const timeDisplay = document.getElementById("timeDisplay");

const editorNextBtn = document.getElementById("editorNextBtn");

/* =========================
   CONFIG
========================= */

const CUT_DURATION = 15;
const STEP = 1;

const editorState = {
  videoDuration: 60,
  trimStart: 0,
  trimWidthPercent: 25,
  isDragging: false,
  dragStartX: 0,
  dragStartLeftPercent: 0,
  selectedMusicSrc: "",
  selectedSubtitleText: "",
  selectedSubtitleClass: "none",
  isPlayingSelection: false
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
  const h = 0;
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function getMaxTrimStart() {
  return Math.max(0, editorState.videoDuration - CUT_DURATION);
}

function getTrimWidthPercent() {
  if (!editorState.videoDuration) return 100;
  return (CUT_DURATION / editorState.videoDuration) * 100;
}

function getTrimLeftPercent() {
  if (!editorState.videoDuration) return 0;
  return (editorState.trimStart / editorState.videoDuration) * 100;
}

function setPlayIcon(isPlaying) {
  if (!playPauseIcon) return;
  playPauseIcon.src = isPlaying ? "./pause.svg" : "./play.svg";
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

function updateTrimUI() {
  if (!trimWindow) return;

  trimWindow.style.width = `${editorState.trimWidthPercent}%`;
  trimWindow.style.left = `${getTrimLeftPercent()}%`;

  if (startTimeLabel) {
    startTimeLabel.textContent = formatTimelineLabel(editorState.trimStart);
  }

  if (endTimeLabel) {
    endTimeLabel.textContent = formatTimelineLabel(editorState.trimStart + CUT_DURATION);
  }
}

function stopMusic() {
  if (!bgMusic) return;
  bgMusic.pause();
  bgMusic.currentTime = 0;
}

function playMusic() {
  if (!bgMusic || !editorState.selectedMusicSrc) return;

  const resolvedSrc = new URL(editorState.selectedMusicSrc, window.location.href).href;

  if (bgMusic.src !== resolvedSrc) {
    bgMusic.src = editorState.selectedMusicSrc;
    bgMusic.load();
  }

  bgMusic.currentTime = 0;
  bgMusic.play().catch(() => {});
}

function stopVideoSelection(resetTime = true) {
  if (!mainVideo) return;

  mainVideo.pause();
  editorState.isPlayingSelection = false;
  setPlayIcon(false);
  stopMusic();

  if (resetTime) {
    mainVideo.currentTime = editorState.trimStart;
    updateTimeUI(0, CUT_DURATION);
  }
}

function playSelectedPart() {
  if (!mainVideo) return;

  stopVideoSelection(false);

  mainVideo.currentTime = editorState.trimStart;
  editorState.isPlayingSelection = true;
  setPlayIcon(true);
  updateTimeUI(0, CUT_DURATION);

  if (editorState.selectedMusicSrc) {
    playMusic();
  }

  mainVideo.play().catch(() => {});
}

function applySubtitle(text, style) {
  if (!subtitleOverlay) return;

  if (!text || style === "none") {
    subtitleOverlay.textContent = "";
    subtitleOverlay.className = "subtitle-overlay hidden";
    return;
  }

  subtitleOverlay.textContent = text;
  subtitleOverlay.className = `subtitle-overlay ${style}`;
}

/* =========================
   VIDEO INIT
========================= */

if (mainVideo) {
  mainVideo.muted = false;
  mainVideo.volume = 1;

  mainVideo.addEventListener("loadedmetadata", () => {
    editorState.videoDuration = Math.floor(mainVideo.duration || 60);
    editorState.trimWidthPercent = getTrimWidthPercent();
    editorState.trimStart = 0;

    updateTrimUI();
    updateTimeUI(0, CUT_DURATION);

    mainVideo.currentTime = 0;
  });

  mainVideo.addEventListener("timeupdate", () => {
    if (!editorState.isPlayingSelection) return;

    const trimEnd = editorState.trimStart + CUT_DURATION;
    const localTime = clamp(mainVideo.currentTime - editorState.trimStart, 0, CUT_DURATION);

    updateTimeUI(localTime, CUT_DURATION);

    if (mainVideo.currentTime >= trimEnd) {
      stopVideoSelection(true);
    }
  });

  mainVideo.addEventListener("pause", () => {
    if (!editorState.isPlayingSelection) {
      setPlayIcon(false);
    }
  });
}

/* =========================
   PLAY / PAUSE
========================= */

if (playPauseBtn) {
  playPauseBtn.addEventListener("click", () => {
    if (editorState.isPlayingSelection) {
      stopVideoSelection(true);
    } else {
      playSelectedPart();
    }
  });
}

/* =========================
   DRAG TIMELINE
========================= */

if (trimWindow && timelineTrack) {
  trimWindow.addEventListener("mousedown", (e) => {
    e.preventDefault();
    editorState.isDragging = true;
    editorState.dragStartX = e.clientX;
    editorState.dragStartLeftPercent = getTrimLeftPercent();
    trimWindow.classList.add("dragging");
  });

  window.addEventListener("mousemove", (e) => {
    if (!editorState.isDragging) return;

    const trackRect = timelineTrack.getBoundingClientRect();
    const deltaPx = e.clientX - editorState.dragStartX;
    const deltaPercent = (deltaPx / trackRect.width) * 100;

    const maxLeftPercent = 100 - editorState.trimWidthPercent;
    const nextLeftPercent = clamp(
      editorState.dragStartLeftPercent + deltaPercent,
      0,
      maxLeftPercent
    );

    const nextStart = (nextLeftPercent / 100) * editorState.videoDuration;
    editorState.trimStart = clamp(nextStart, 0, getMaxTrimStart());

    updateTrimUI();

    if (mainVideo && mainVideo.readyState >= 1) {
      mainVideo.currentTime = editorState.trimStart;
      updateTimeUI(0, CUT_DURATION);
    }
  });

  window.addEventListener("mouseup", () => {
    if (!editorState.isDragging) return;
    editorState.isDragging = false;
    trimWindow.classList.remove("dragging");
  });
}

/* =========================
   ARROWS
========================= */

if (trimStartMinus) {
  trimStartMinus.addEventListener("click", () => {
    editorState.trimStart = clamp(editorState.trimStart - STEP, 0, getMaxTrimStart());
    updateTrimUI();

    if (mainVideo && mainVideo.readyState >= 1) {
      mainVideo.currentTime = editorState.trimStart;
      updateTimeUI(0, CUT_DURATION);
    }
  });
}

if (trimEndPlus) {
  trimEndPlus.addEventListener("click", () => {
    editorState.trimStart = clamp(editorState.trimStart + STEP, 0, getMaxTrimStart());
    updateTrimUI();

    if (mainVideo && mainVideo.readyState >= 1) {
      mainVideo.currentTime = editorState.trimStart;
      updateTimeUI(0, CUT_DURATION);
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

    editorState.selectedSubtitleText = btn.dataset.text || "";
    editorState.selectedSubtitleClass = btn.dataset.style || "none";

    applySubtitle(editorState.selectedSubtitleText, editorState.selectedSubtitleClass);
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

    stopMusic();

    if (editorState.isPlayingSelection && editorState.selectedMusicSrc) {
      playMusic();
    }
  });
});

/* =========================
   NEXT BUTTON
========================= */

if (editorNextBtn) {
  editorNextBtn.addEventListener("click", () => {
    stopVideoSelection(true);

    if (typeof goToSlide === "function") {
      goToSlide(11);
    }
  });
}
/* =========================
   PUBLISH ELEMENTS
========================= */

const publishPage = document.getElementById("publishPage");
const publishBackBtn = document.getElementById("publishBackBtn");
const publishActionBtn = document.getElementById("publishActionBtn");
const publishOverlay = document.getElementById("publishOverlay");
const publishOverlayBtn = document.getElementById("publishOverlayBtn");
const publishDescription = document.getElementById("publishDescription");

const publishPreviewVideo = document.getElementById("publishPreviewVideo");
const publishSubtitlePreview = document.getElementById("publishSubtitlePreview");
const publishTimePreview = document.getElementById("publishTimePreview");
const publishProgressFill = document.getElementById("publishProgressFill");

/* =========================
   PUBLISH HELPERS
========================= */

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

function applySubtitleToPublish() {
  if (!publishSubtitlePreview) return;

  if (!editorState.selectedSubtitleText || editorState.selectedSubtitleClass === "none") {
    publishSubtitlePreview.textContent = "";
    publishSubtitlePreview.className = "publish-subtitle-preview hidden";
    return;
  }

  publishSubtitlePreview.textContent = editorState.selectedSubtitleText;
  publishSubtitlePreview.className = `publish-subtitle-preview ${editorState.selectedSubtitleClass}`;
}

function stopPublishPreview(reset = true) {
  if (!publishPreviewVideo) return;

  publishPreviewVideo.pause();

  if (reset) {
    publishPreviewVideo.currentTime = editorState.trimStart;
    updatePublishTimeUI(0, CUT_DURATION);
  }
}

function playPublishPreview() {
  if (!publishPreviewVideo) return;

  stopPublishPreview(false);
  publishPreviewVideo.currentTime = editorState.trimStart;
  updatePublishTimeUI(0, CUT_DURATION);
  publishPreviewVideo.play().catch(() => {});
}

/* =========================
   PUBLISH VIDEO
========================= */

if (publishPreviewVideo) {
  publishPreviewVideo.addEventListener("loadedmetadata", () => {
    publishPreviewVideo.currentTime = editorState.trimStart || 0;
    updatePublishTimeUI(0, CUT_DURATION);
  });

  publishPreviewVideo.addEventListener("timeupdate", () => {
    const trimEnd = editorState.trimStart + CUT_DURATION;
    const localTime = clamp(
      publishPreviewVideo.currentTime - editorState.trimStart,
      0,
      CUT_DURATION
    );

    updatePublishTimeUI(localTime, CUT_DURATION);

    if (publishPreviewVideo.currentTime >= trimEnd) {
      publishPreviewVideo.pause();
      publishPreviewVideo.currentTime = editorState.trimStart;
      updatePublishTimeUI(CUT_DURATION, CUT_DURATION);
    }
  });
}

/* =========================
   GO TO PUBLISH FROM EDITOR
========================= */

if (editorNextBtn) {
  editorNextBtn.addEventListener("click", () => {
    stopVideoSelection(true);
    syncPublishPreviewSource();
    applySubtitleToPublish();

    if (typeof goToSlide === "function") {
      goToSlide(11);
    }

    setTimeout(() => {
      playPublishPreview();
    }, 120);
  });
}

/* =========================
   PUBLISH ACTIONS
========================= */

if (publishBackBtn) {
  publishBackBtn.addEventListener("click", () => {
    stopPublishPreview(true);

    if (typeof goToSlide === "function") {
      goToSlide(10);
    }
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

    stopPublishPreview(false);

    if (typeof goToSlide === "function") {
      goToSlide(12);
    }
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
   REAL OR FAKE INTRO
========================= */

const startRealFakeBtn = document.getElementById("startRealFakeBtn");
if (startRealFakeBtn) {
  startRealFakeBtn.addEventListener("click", () => {
    goToSlide(13);
    initRealFakeGame();

  });
}

document.addEventListener("DOMContentLoaded", () => {
  const stack = document.getElementById("realfakeCardsStack");
  const progressEl = document.getElementById("realfakeProgress");
  const scoreEl = document.getElementById("realfakeScore");
  const resultScreen = document.getElementById("realfakeResultScreen");
  const resultTitle = document.getElementById("realfakeResultTitle");
  const resultText = document.getElementById("realfakeResultText");
  const replayBtn = document.getElementById("realfakeReplayBtn");

  if (!stack) return;

  let cards = [];
  let currentIndex = 0;
  let score = 0;
  let isAnimating = false;

  function initRefs() {
    cards = Array.from(stack.querySelectorAll(".realfake-card"));
  }

  function updateHUD() {
    const total = cards.length;
    const displayIndex = currentIndex < total ? currentIndex + 1 : total;
    if (progressEl) progressEl.textContent = `${displayIndex} / ${total}`;
    if (scoreEl) scoreEl.textContent = String(score);
  }

  function resetCard(card) {
    card.style.transition = "none";
    card.style.opacity = "0";
    card.style.pointerEvents = "none";
    card.style.transform = "translateX(0) translateY(0) rotate(0deg) scale(1)";

    const realStamp = card.querySelector(".realfake-stamp.real");
    const fakeStamp = card.querySelector(".realfake-stamp.fake");

    if (realStamp) {
      realStamp.style.opacity = "0";
      realStamp.style.transform = "rotate(-10deg) scale(.9)";
    }
    if (fakeStamp) {
      fakeStamp.style.opacity = "0";
      fakeStamp.style.transform = "rotate(10deg) scale(.9)";
    }
  }

  function renderStack() {
    cards.forEach((card, index) => {
      resetCard(card);
      card.style.zIndex = String(cards.length - index);

      if (index < currentIndex) {
        card.style.opacity = "0";
        card.style.pointerEvents = "none";
        card.style.transform = "translateY(30px) scale(.92)";
      } else if (index === currentIndex) {
        card.style.opacity = "1";
        card.style.pointerEvents = "auto";
        card.style.transform = "translateY(0) scale(1)";
      } else if (index === currentIndex + 1) {
        card.style.opacity = "0.72";
        card.style.transform = "translateY(10px) scale(.965)";
      } else if (index === currentIndex + 2) {
        card.style.opacity = "0.42";
        card.style.transform = "translateY(18px) scale(.93)";
      } else {
        card.style.opacity = "0";
        card.style.transform = "translateY(22px) scale(.9)";
      }
    });

    attachDragToTopCard();
    updateHUD();
  }

  function endGame() {
    const total = cards.length;
    const ratio = total > 0 ? score / total : 0;

    if (ratio === 1) {
      resultTitle.textContent = "Score parfait.";
      resultText.textContent = "Tu as parfaitement repéré les faux et les vrais. Ton regard critique est très solide.";
    } else if (ratio >= 0.66) {
      resultTitle.textContent = "Bien joué.";
      resultText.textContent = "Tu repères déjà beaucoup de signaux. Mais certains contenus restent très crédibles visuellement.";
    } else if (ratio >= 0.33) {
      resultTitle.textContent = "Tu t’es fait piéger plusieurs fois.";
      resultText.textContent = "C’est normal. Les contenus manipulés marchent justement parce qu’ils imitent très bien le réel.";
    } else {
      resultTitle.textContent = "Tu t’es bien fait piéger.";
      resultText.textContent = "Voir ne suffit plus. Sur les réseaux, une image crédible peut être entièrement fabriquée.";
    }

    resultScreen.classList.add("is-visible");
  }

  function validateChoice(direction) {
    if (isAnimating) return;

    const card = cards[currentIndex];
    if (!card) return;

    isAnimating = true;

    const expected = card.dataset.answer;
    const choice = direction === "right" ? "real" : "fake";

    if (choice === expected) {
      score += 1;
    }

    const flyX = direction === "right" ? window.innerWidth * 1.1 : -window.innerWidth * 1.1;
    const rotate = direction === "right" ? 18 : -18;

    card.style.transition = "transform 0.42s ease, opacity 0.42s ease";
    card.style.transform = `translateX(${flyX}px) rotate(${rotate}deg)`;
    card.style.opacity = "0";

    setTimeout(() => {
      currentIndex += 1;
      isAnimating = false;

      if (currentIndex >= cards.length) {
        updateHUD();
        endGame();
      } else {
        renderStack();
      }
    }, 430);
  }

  function attachDragToTopCard() {
    const card = cards[currentIndex];
    if (!card) return;

    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;
    let dragging = false;

    const realStamp = card.querySelector(".realfake-stamp.real");
    const fakeStamp = card.querySelector(".realfake-stamp.fake");

    function onPointerDown(e) {
      if (isAnimating) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      dy = 0;
      card.style.transition = "none";
      if (card.setPointerCapture) card.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      if (!dragging || isAnimating) return;

      dx = e.clientX - startX;
      dy = e.clientY - startY;

      const rotate = dx * 0.05;
      card.style.transform = `translateX(${dx}px) translateY(${dy * 0.12}px) rotate(${rotate}deg)`;

      const realOpacity = Math.max(0, Math.min(dx / 120, 1));
      const fakeOpacity = Math.max(0, Math.min((-dx) / 120, 1));

      if (realStamp) {
        realStamp.style.opacity = String(realOpacity);
        realStamp.style.transform = `rotate(-10deg) scale(${0.9 + realOpacity * 0.15})`;
      }

      if (fakeStamp) {
        fakeStamp.style.opacity = String(fakeOpacity);
        fakeStamp.style.transform = `rotate(10deg) scale(${0.9 + fakeOpacity * 0.15})`;
      }
    }

    function onPointerUp() {
      if (!dragging || isAnimating) return;
      dragging = false;

      const threshold = 110;

      if (dx > threshold) {
        removeListeners();
        validateChoice("right");
        return;
      }

      if (dx < -threshold) {
        removeListeners();
        validateChoice("left");
        return;
      }

      card.style.transition = "transform 0.25s ease";
      card.style.transform = "translateX(0) translateY(0) rotate(0deg)";

      if (realStamp) {
        realStamp.style.opacity = "0";
        realStamp.style.transform = "rotate(-10deg) scale(.9)";
      }

      if (fakeStamp) {
        fakeStamp.style.opacity = "0";
        fakeStamp.style.transform = "rotate(10deg) scale(.9)";
      }
    }

    function removeListeners() {
      card.removeEventListener("pointerdown", onPointerDown);
      card.removeEventListener("pointermove", onPointerMove);
      card.removeEventListener("pointerup", onPointerUp);
      card.removeEventListener("pointercancel", onPointerUp);
    }

    card.addEventListener("pointerdown", onPointerDown);
    card.addEventListener("pointermove", onPointerMove);
    card.addEventListener("pointerup", onPointerUp);
    card.addEventListener("pointercancel", onPointerUp);
  }

  function initGame() {
    initRefs();
    currentIndex = 0;
    score = 0;
    isAnimating = false;

    if (resultScreen) {
      resultScreen.classList.remove("is-visible");
    }

    renderStack();
  }

  if (replayBtn) {
    replayBtn.addEventListener("click", initGame);
  }

  initGame();
});

const finishBtn = document.getElementById("realfakeFinishBtn");
const endRestartBtn = document.getElementById("endRestartBtn");

function goToEndSlide() {
  const slide13 = document.getElementById("slide-13");
  const slide14 = document.getElementById("slide-14");

  if (resultScreen) resultScreen.classList.remove("is-visible");
  if (slide13) slide13.classList.remove("active");
  if (slide14) slide14.classList.add("active");
}

if (finishBtn) {
  finishBtn.addEventListener("click", goToEndSlide);
}

if (endRestartBtn) {
  endRestartBtn.addEventListener("click", () => {
    const slide13 = document.getElementById("slide-13");
    const slide14 = document.getElementById("slide-14");

    if (slide14) slide14.classList.remove("active");
    if (slide13) slide13.classList.add("active");

    initGame();
  });
}
