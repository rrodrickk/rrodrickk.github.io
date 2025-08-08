/**
 * perlin.js — mouse-responsive Perlin marching-squares background
 * - Uses window pointer/touch events so it reacts even when canvas has pointer-events:none.
 * - Keeps canvas non-blocking for your UI.
 */

import * as ChriscoursesPerlinNoise from 'https://esm.sh/@chriscourses/perlin-noise';

// CONFIG
let showFPS = false;
let MAX_FPS = 144; // 0 = uncapped
let thresholdIncrement = 3;
let thickLineThresholdMultiple = 1;
let res = 18;
let baseZOffset = 0.0015;
let lineColor = '#a9680094';
let backgroundColor = '#000000';

let canvas;
let ctx;
let fpsCountEl;
let frameValues = [];
let inputValues = [];
let zBoostValues = [];
let currentThreshold = 0;
let cols = 0;
let rows = 0;
let zOffset = 0;
let noiseMin = 100;
let noiseMax = 0;
let mousePos = { x: -999, y: -999 };
let mouseDown = false;
let lastFrameTime = 0;
let fpsSamples = [];

// make interactive by default; background usually has pointer-events:none in CSS
let interactive = true;

// Accessibility: if user prefers reduced motion, we won't animate
const prefersReducedMotion = window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('res-canvas');
  fpsCountEl = document.getElementById('fps-count');

  if (!canvas) {
    console.error('perlin: no canvas with id=res-canvas found');
    return;
  }
  ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('perlin: 2D context not available');
    return;
  }

  setupEvents();
  resizeCanvas();

  if (!prefersReducedMotion) {
    requestAnimationFrame(loop);
  } else {
    // draw one static frame for reduced-motion users
    zOffset += baseZOffset;
    generateNoise();
    render();
    if (fpsCountEl) fpsCountEl.innerText = 'reduced';
  }
});

function setupEvents() {
  // handle resizing
  window.addEventListener('resize', resizeCanvas);

  // Track pointer move globally so we react even if the canvas is behind other elements.
  // Use clientX/Y relative to canvas bounding rect.
  window.addEventListener('pointermove', (e) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
  });

  // pointerdown/up globally capture clicks/touches anywhere on page
  window.addEventListener('pointerdown', (e) => {
    mouseDown = true;
    // update pos immediately
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      mousePos.x = e.clientX - rect.left;
      mousePos.y = e.clientY - rect.top;
    }
  });
  window.addEventListener('pointerup', () => {
    mouseDown = false;
  });

  // touch fallback for some older browsers (touchmove gives multiple touches)
  window.addEventListener('touchmove', (e) => {
    if (!canvas) return;
    // prefer first touch
    const t = e.touches && e.touches[0];
    if (!t) return;
    const rect = canvas.getBoundingClientRect();
    mousePos.x = t.clientX - rect.left;
    mousePos.y = t.clientY - rect.top;
    // treat touch as "mouseDown" while moving
    mouseDown = true;
  }, { passive: true });

  window.addEventListener('touchend', () => {
    mouseDown = false;
  });
}

function resizeCanvas() {
  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;
  const dpr = Math.max(window.devicePixelRatio || 1, 1);

  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);

  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';

  // map drawing coordinates to CSS pixels
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  cols = Math.floor(cssWidth / res) + 1;
  rows = Math.floor(cssHeight / res) + 1;

  // (Re)initialize zBoost values
  zBoostValues = new Array(rows);
  for (let y = 0; y < rows; y++) {
    zBoostValues[y] = new Array(cols + 1).fill(0);
  }
}

function loop(time) {
  if (!lastFrameTime) lastFrameTime = time;
  const dt = time - lastFrameTime;

  if (MAX_FPS > 0) {
    const interval = 1000 / MAX_FPS;
    if (dt < interval) {
      requestAnimationFrame(loop);
      return;
    }
    lastFrameTime = time;
  } else {
    lastFrameTime = time;
  }

  if (showFPS && fpsCountEl) {
    fpsSamples.push(dt);
    if (fpsSamples.length > 60) fpsSamples.shift();
    const avg = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
    fpsCountEl.innerText = Math.round(1000 / avg).toString();
  }

  update(dt);
  render();

  requestAnimationFrame(loop);
}

function update() {
  // apply mouse influence when interactive is true and mouse has valid coordinates
  if (interactive && mousePos.x !== -99 && mousePos.y !== -99) {
    // apply ripple every frame — lighter for move, stronger when mouse down
    mouseOffset();
  }

  zOffset += baseZOffset;
  generateNoise();
}

function render() {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  const roundedNoiseMin = Math.floor(noiseMin / thresholdIncrement) * thresholdIncrement;
  const roundedNoiseMax = Math.ceil(noiseMax / thresholdIncrement) * thresholdIncrement;

  for (let threshold = roundedNoiseMin; threshold < roundedNoiseMax; threshold += thresholdIncrement) {
    currentThreshold = threshold;
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = currentThreshold % (thresholdIncrement * thickLineThresholdMultiple) === 0 ? 2 : 1;
    renderAtThreshold();
    ctx.stroke();
  }

  noiseMin = 100;
  noiseMax = 0;
}

function generateNoise() {
  const scale = 0.02;
  for (let y = 0; y < rows; y++) {
    inputValues[y] = [];
    for (let x = 0; x <= cols; x++) {
      const n = ChriscoursesPerlinNoise.noise(x * scale, y * scale, zOffset + (zBoostValues[y]?.[x] || 0)) * 100;
      inputValues[y][x] = n;
      if (n < noiseMin) noiseMin = n;
      if (n > noiseMax) noiseMax = n;
      if (zBoostValues[y]?.[x] > 0) {
        zBoostValues[y][x] *= 0.98; // slightly faster decay for responsiveness
        if (zBoostValues[y][x] < 1e-6) zBoostValues[y][x] = 0;
      }
    }
  }
}

function mouseOffset() {
  // compute cell under pointer
  const xCell = Math.floor(mousePos.x / res);
  const yCell = Math.floor(mousePos.y / res);
  if (xCell < 0 || yCell < 0 || yCell >= rows || xCell > cols) return;

  // different strength depending on whether pointer is pressed
  const baseIncrement = 0.01;
  const pressMultiplier = mouseDown ? 2.8 : 0.9;
  const incrementValue = baseIncrement * pressMultiplier;
  const radius = 6;

  for (let j = -radius; j <= radius; j++) {
    for (let i = -radius; i <= radius; i++) {
      const yy = yCell + j;
      const xx = xCell + i;
      if (yy < 0 || xx < 0 || yy >= rows || xx > cols) continue;
      const distSq = i * i + j * j;
      const radiusSq = radius * radius;
      if (distSq <= radiusSq) {
        const factor = 1 - distSq / radiusSq;
        zBoostValues[yy][xx] += incrementValue * factor;
      }
    }
  }
}

function renderAtThreshold() {
  const h = inputValues.length - 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < inputValues[y].length - 1; x++) {
      const a = inputValues[y][x];
      const b = inputValues[y][x + 1];
      const c = inputValues[y + 1][x + 1];
      const d = inputValues[y + 1][x];

      if (a > currentThreshold && b > currentThreshold && c > currentThreshold && d > currentThreshold) continue;
      if (a < currentThreshold && b < currentThreshold && c < currentThreshold && d < currentThreshold) continue;

      const gridValue = binaryToType(
        a > currentThreshold ? 1 : 0,
        b > currentThreshold ? 1 : 0,
        c > currentThreshold ? 1 : 0,
        d > currentThreshold ? 1 : 0
      );

      placeLines(gridValue, x, y, a, b, c, d);
    }
  }
}

function placeLines(gridValue, x, y, nw, ne, se, sw) {
  let a, b, c, d;
  switch (gridValue) {
    case 1:
    case 14:
      c = [x * res + res * linInterpolate(sw, se), y * res + res];
      d = [x * res, y * res + res * linInterpolate(nw, sw)];
      line(d, c);
      break;
    case 2:
    case 13:
      b = [x * res + res, y * res + res * linInterpolate(ne, se)];
      c = [x * res + res * linInterpolate(sw, se), y * res + res];
      line(b, c);
      break;
    case 3:
    case 12:
      b = [x * res + res, y * res + res * linInterpolate(ne, se)];
      d = [x * res, y * res + res * linInterpolate(nw, sw)];
      line(d, b);
      break;
    case 11:
    case 4:
      a = [x * res + res * linInterpolate(nw, ne), y * res];
      b = [x * res + res, y * res + res * linInterpolate(ne, se)];
      line(a, b);
      break;
    case 5:
      a = [x * res + res * linInterpolate(nw, ne), y * res];
      b = [x * res + res, y * res + res * linInterpolate(ne, se)];
      c = [x * res + res * linInterpolate(sw, se), y * res + res];
      d = [x * res, y * res + res * linInterpolate(nw, sw)];
      line(d, a);
      line(c, b);
      break;
    case 6:
    case 9:
      a = [x * res + res * linInterpolate(nw, ne), y * res];
      c = [x * res + res * linInterpolate(sw, se), y * res + res];
      line(c, a);
      break;
    case 7:
    case 8:
      a = [x * res + res * linInterpolate(nw, ne), y * res];
      d = [x * res, y * res + res * linInterpolate(nw, sw)];
      line(d, a);
      break;
    case 10:
      a = [x * res + res * linInterpolate(nw, ne), y * res];
      b = [x * res + res, y * res + res * linInterpolate(ne, se)];
      c = [x * res + res * linInterpolate(sw, se), y * res + res];
      d = [x * res, y * res + res * linInterpolate(nw, sw)];
      line(a, b);
      line(c, d);
      break;
    default:
      break;
  }
}

function line(from, to) {
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0], to[1]);
}

function linInterpolate(x0, x1, y0 = 0, y1 = 1) {
  if (x0 === x1) return 0;
  return y0 + ((y1 - y0) * (currentThreshold - x0)) / (x1 - x0);
}

function binaryToType(nw, ne, se, sw) {
  let a = [nw, ne, se, sw];
  return a.reduce((res, x) => (res << 1) | x, 0);
}
