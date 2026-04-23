/**
 * perlin.js — mouse-responsive Perlin marching-squares background
 *
 * Performance notes:
 *  - Canvas renders at 1x DPR (no retina upscale needed for a background effect).
 *  - Grid resolution adapts on small screens (coarser = fewer cells = faster).
 *  - Noise & boost arrays are pre-allocated; no per-frame GC.
 *  - Animation pauses automatically when the tab is hidden.
 *  - Resize is debounced to avoid layout thrashing.
 */

import * as ChriscoursesPerlinNoise from 'https://esm.sh/@chriscourses/perlin-noise';

// ── CONFIG ──────────────────────────────────────────────────────
const THRESHOLD_INC    = 4;
const THICK_MULTIPLE   = 26;
const BASE_Z_OFFSET    = 0.0015;
const LINE_COLOR       = '#a9680094';
const BG_COLOR         = '#000000';
const NOISE_SCALE      = 0.02;
const BOOST_DECAY      = 0.98;
const MOUSE_RADIUS     = 6;
const MOUSE_BASE_INC   = 0.01;
const MOUSE_PRESS_MULT = 2.8;
const MOUSE_MOVE_MULT  = 0.9;
// Adaptive cell size: coarser on small screens
const RES = window.innerWidth < 600 ? 16 : 11;

// ── STATE ───────────────────────────────────────────────────────
let canvas, ctx;
let cols = 0, rows = 0;
let zOffset = 0;
let noiseMin = 100, noiseMax = 0;
let currentThreshold = 0;
let mousePos = { x: -999, y: -999 };
let mouseDown = false;
let paused = false;
let animId = 0;

// Pre-allocated 2-D arrays (filled on resize)
let inputValues  = [];
let zBoostValues = [];

// Resize debounce
let resizeTimer = 0;

// ── REDUCED-MOTION CHECK ────────────────────────────────────────
const prefersReducedMotion =
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ── INIT ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('res-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  if (!ctx) return;

  setupEvents();
  resizeCanvas();

  if (prefersReducedMotion) {
    zOffset += BASE_Z_OFFSET;
    generateNoise();
    render();
  } else {
    animId = requestAnimationFrame(loop);
  }
});

// ── EVENTS ──────────────────────────────────────────────────────
function setupEvents() {
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 120);
  });

  // Pointer (works for mouse + pen + touch on modern browsers)
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup',   () => { mouseDown = false; });

  // Touch fallback
  window.addEventListener('touchmove', (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    mousePos.x = t.clientX;
    mousePos.y = t.clientY;
    mouseDown = true;
  }, { passive: true });
  window.addEventListener('touchend', () => { mouseDown = false; });

  // Pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      paused = true;
      cancelAnimationFrame(animId);
    } else if (!prefersReducedMotion) {
      paused = false;
      animId = requestAnimationFrame(loop);
    }
  });
}

function onPointerMove(e) {
  mousePos.x = e.clientX;
  mousePos.y = e.clientY;
}
function onPointerDown(e) {
  mouseDown = true;
  mousePos.x = e.clientX;
  mousePos.y = e.clientY;
}

// ── RESIZE (1x DPR) ────────────────────────────────────────────
function resizeCanvas() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Render at 1x — this is a subtle background, retina is wasted work
  canvas.width  = w;
  canvas.height = h;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  cols = Math.floor(w / RES) + 1;
  rows = Math.floor(h / RES) + 1;

  // Pre-allocate flat arrays
  allocateArrays();
}

function allocateArrays() {
  inputValues  = new Array(rows);
  zBoostValues = new Array(rows);
  for (let y = 0; y < rows; y++) {
    inputValues[y]  = new Float64Array(cols + 1);
    zBoostValues[y] = new Float64Array(cols + 1); // zeros by default
  }
}

// ── LOOP ────────────────────────────────────────────────────────
function loop() {
  if (paused) return;
  update();
  render();
  animId = requestAnimationFrame(loop);
}

// ── UPDATE ──────────────────────────────────────────────────────
function update() {
  if (mousePos.x !== -999 && mousePos.y !== -999) {
    mouseOffset();
  }
  zOffset += BASE_Z_OFFSET;
  generateNoise();
}

// ── GENERATE NOISE ──────────────────────────────────────────────
function generateNoise() {
  let nMin = 100, nMax = 0;
  for (let y = 0; y < rows; y++) {
    const row   = inputValues[y];
    const boost = zBoostValues[y];
    for (let x = 0; x <= cols; x++) {
      const n = ChriscoursesPerlinNoise.noise(
        x * NOISE_SCALE, y * NOISE_SCALE, zOffset + boost[x]
      ) * 100;
      row[x] = n;
      if (n < nMin) nMin = n;
      if (n > nMax) nMax = n;
      if (boost[x] > 0) {
        boost[x] *= BOOST_DECAY;
        if (boost[x] < 1e-6) boost[x] = 0;
      }
    }
  }
  noiseMin = nMin;
  noiseMax = nMax;
}

// ── MOUSE INFLUENCE ─────────────────────────────────────────────
function mouseOffset() {
  const xCell = Math.floor(mousePos.x / RES);
  const yCell = Math.floor(mousePos.y / RES);
  if (xCell < 0 || yCell < 0 || yCell >= rows || xCell > cols) return;

  const inc = MOUSE_BASE_INC * (mouseDown ? MOUSE_PRESS_MULT : MOUSE_MOVE_MULT);
  const rSq = MOUSE_RADIUS * MOUSE_RADIUS;

  for (let j = -MOUSE_RADIUS; j <= MOUSE_RADIUS; j++) {
    const yy = yCell + j;
    if (yy < 0 || yy >= rows) continue;
    const boost = zBoostValues[yy];
    for (let i = -MOUSE_RADIUS; i <= MOUSE_RADIUS; i++) {
      const xx = xCell + i;
      if (xx < 0 || xx > cols) continue;
      const dSq = i * i + j * j;
      if (dSq <= rSq) {
        boost[xx] += inc * (1 - dSq / rSq);
      }
    }
  }
}

// ── RENDER ──────────────────────────────────────────────────────
function render() {
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, w, h);

  const tMin = Math.floor(noiseMin / THRESHOLD_INC) * THRESHOLD_INC;
  const tMax = Math.ceil(noiseMax / THRESHOLD_INC)  * THRESHOLD_INC;
  const thickMod = THRESHOLD_INC * THICK_MULTIPLE;

  for (let t = tMin; t < tMax; t += THRESHOLD_INC) {
    currentThreshold = t;
    ctx.beginPath();
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = (t % thickMod === 0) ? 2 : 1;
    renderAtThreshold();
    ctx.stroke();
  }
}

// ── MARCHING SQUARES ────────────────────────────────────────────
function renderAtThreshold() {
  const lastY = rows - 1;
  for (let y = 0; y < lastY; y++) {
    const rowA = inputValues[y];
    const rowB = inputValues[y + 1];
    const len  = rowA.length - 1;
    for (let x = 0; x < len; x++) {
      const a = rowA[x], b = rowA[x + 1];
      const d = rowB[x], c = rowB[x + 1];

      // skip fully inside / outside
      const t = currentThreshold;
      if (a > t && b > t && c > t && d > t) continue;
      if (a < t && b < t && c < t && d < t) continue;

      placeLines(
        (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0),
        x, y, a, b, c, d
      );
    }
  }
}

function placeLines(gv, x, y, nw, ne, se, sw) {
  const ox = x * RES, oy = y * RES;
  let ax, ay, bx, by, cx, cy, dx, dy;
  switch (gv) {
    case 1: case 14:
      cx = ox + RES * lerp(sw, se); cy = oy + RES;
      dx = ox;                      dy = oy + RES * lerp(nw, sw);
      moveLine(dx, dy, cx, cy); break;
    case 2: case 13:
      bx = ox + RES; by = oy + RES * lerp(ne, se);
      cx = ox + RES * lerp(sw, se); cy = oy + RES;
      moveLine(bx, by, cx, cy); break;
    case 3: case 12:
      bx = ox + RES; by = oy + RES * lerp(ne, se);
      dx = ox;        dy = oy + RES * lerp(nw, sw);
      moveLine(dx, dy, bx, by); break;
    case 4: case 11:
      ax = ox + RES * lerp(nw, ne); ay = oy;
      bx = ox + RES; by = oy + RES * lerp(ne, se);
      moveLine(ax, ay, bx, by); break;
    case 5:
      ax = ox + RES * lerp(nw, ne); ay = oy;
      bx = ox + RES; by = oy + RES * lerp(ne, se);
      cx = ox + RES * lerp(sw, se); cy = oy + RES;
      dx = ox;        dy = oy + RES * lerp(nw, sw);
      moveLine(dx, dy, ax, ay);
      moveLine(cx, cy, bx, by); break;
    case 6: case 9:
      ax = ox + RES * lerp(nw, ne); ay = oy;
      cx = ox + RES * lerp(sw, se); cy = oy + RES;
      moveLine(cx, cy, ax, ay); break;
    case 7: case 8:
      ax = ox + RES * lerp(nw, ne); ay = oy;
      dx = ox;        dy = oy + RES * lerp(nw, sw);
      moveLine(dx, dy, ax, ay); break;
    case 10:
      ax = ox + RES * lerp(nw, ne); ay = oy;
      bx = ox + RES; by = oy + RES * lerp(ne, se);
      cx = ox + RES * lerp(sw, se); cy = oy + RES;
      dx = ox;        dy = oy + RES * lerp(nw, sw);
      moveLine(ax, ay, bx, by);
      moveLine(cx, cy, dx, dy); break;
  }
}

function moveLine(x1, y1, x2, y2) {
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
}

function lerp(v0, v1) {
  if (v0 === v1) return 0;
  return (currentThreshold - v0) / (v1 - v0);
}

