import { $ } from '../utils/dom.js';

export function setupTimeline(videoEl) {
  const trimStart = /** @type {HTMLInputElement} */ ($('#trim-start'));
  const trimEnd = /** @type {HTMLInputElement} */ ($('#trim-end'));
  const trimStartTime = $('#trim-start-time');
  const trimEndTime = $('#trim-end-time');
  const canvas = /** @type {HTMLCanvasElement} */ ($('#timeline-canvas'));
  const ctx = canvas.getContext('2d');

  const state = { startTime: 0, endTime: 0 };

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function updateState() {
    const duration = videoEl.duration || 0;
    state.startTime = (parseFloat(trimStart.value) / 100) * duration;
    state.endTime = (parseFloat(trimEnd.value) / 100) * duration;
    trimStartTime.textContent = formatTime(state.startTime);
    trimEndTime.textContent = formatTime(state.endTime);
    drawTimeline();
  }

  function drawTimeline() {
    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    const duration = videoEl.duration || 1;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, w, h);

    // Full duration bar
    ctx.fillStyle = '#333345';
    ctx.fillRect(0, 0, w, h);

    // Selected range
    const startX = (state.startTime / duration) * w;
    const endX = (state.endTime / duration) * w;
    ctx.fillStyle = 'rgba(108, 92, 231, 0.3)';
    ctx.fillRect(startX, 0, endX - startX, h);

    // Trim handles
    ctx.fillStyle = '#6c5ce7';
    ctx.fillRect(startX, 0, 4, h);
    ctx.fillRect(endX - 4, 0, 4, h);

    // Current playback position
    if (videoEl.duration) {
      const posX = (videoEl.currentTime / duration) * w;
      ctx.fillStyle = '#fff';
      ctx.fillRect(posX - 1, 0, 2, h);
    }

    // Time markers
    ctx.fillStyle = '#8888a0';
    ctx.font = `${Math.round(h * 0.25)}px sans-serif`;
    const step = Math.max(1, Math.floor(duration / 10));
    for (let t = 0; t <= duration; t += step) {
      const x = (t / duration) * w;
      ctx.fillRect(x, h - 10, 1, 10);
      ctx.fillText(formatTime(t), x + 4, h - 14);
    }
  }

  // Ensure constraints: start < end
  trimStart.addEventListener('input', () => {
    if (parseFloat(trimStart.value) >= parseFloat(trimEnd.value)) {
      trimStart.value = String(parseFloat(trimEnd.value) - 0.1);
    }
    updateState();
  });

  trimEnd.addEventListener('input', () => {
    if (parseFloat(trimEnd.value) <= parseFloat(trimStart.value)) {
      trimEnd.value = String(parseFloat(trimStart.value) + 0.1);
    }
    updateState();
  });

  // Update playback position indicator
  videoEl.addEventListener('timeupdate', drawTimeline);

  videoEl.addEventListener('loadedmetadata', () => {
    state.endTime = videoEl.duration;
    trimEnd.value = '100';
    updateState();
  });

  updateState();

  return state;
}
