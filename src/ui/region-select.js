import { $ } from '../utils/dom.js';

export function selectRegion(streamDimensions) {
  return new Promise((resolve) => {
    const overlay = $('#region-overlay');
    const canvas = /** @type {HTMLCanvasElement} */ ($('#region-canvas'));
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    overlay.classList.remove('hidden');

    let startX, startY, drawing = false;

    function drawRect(x1, y1, x2, y2) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Darken outside region
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Clear selected region
      const rx = Math.min(x1, x2);
      const ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1);
      const rh = Math.abs(y2 - y1);
      ctx.clearRect(rx, ry, rw, rh);

      // Border around selection
      ctx.strokeStyle = '#6c5ce7';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);

      // Dimensions label
      if (rw > 40 && rh > 20) {
        ctx.fillStyle = 'rgba(108, 92, 231, 0.85)';
        ctx.fillRect(rx, ry - 24, 100, 22);
        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.fillText(`${Math.round(rw)} x ${Math.round(rh)}`, rx + 6, ry - 8);
      }
    }

    function onMouseDown(e) {
      startX = e.clientX;
      startY = e.clientY;
      drawing = true;
    }

    function onMouseMove(e) {
      if (!drawing) return;
      drawRect(startX, startY, e.clientX, e.clientY);
    }

    function onMouseUp(e) {
      if (!drawing) return;
      drawing = false;

      const x1 = Math.min(startX, e.clientX);
      const y1 = Math.min(startY, e.clientY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);

      cleanup();

      // Ignore tiny selections
      if (w < 20 || h < 20) {
        resolve(null);
        return;
      }

      // Scale from screen CSS pixels to captured stream resolution
      const scaleX = streamDimensions.width / window.innerWidth;
      const scaleY = streamDimensions.height / window.innerHeight;

      resolve({
        x: Math.round(x1 * scaleX),
        y: Math.round(y1 * scaleY),
        width: Math.round(w * scaleX),
        height: Math.round(h * scaleY),
      });
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    }

    function cleanup() {
      overlay.classList.add('hidden');
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keydown', onKeyDown);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
  });
}
