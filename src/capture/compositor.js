/**
 * Canvas compositor — only used when webcam overlay or region crop is needed.
 * For simple screen recording, we skip this entirely and record the raw stream.
 */
export function createCompositor(canvas, screenStream, webcamStream, options = {}) {
  const ctx = canvas.getContext('2d');
  const { region, webcamPosition } = options;

  const screenVideo = document.createElement('video');
  screenVideo.srcObject = screenStream;
  screenVideo.muted = true;
  screenVideo.play();

  let camVideo = null;
  if (webcamStream) {
    camVideo = document.createElement('video');
    camVideo.srcObject = webcamStream;
    camVideo.muted = true;
    camVideo.play();
  }

  let running = true;
  let intervalId = null;

  // Limit resolution to keep it lightweight
  const MAX_WIDTH = 1280;
  const MAX_HEIGHT = 720;

  function clampSize(w, h) {
    if (w <= MAX_WIDTH && h <= MAX_HEIGHT) return { w, h };
    const ratio = Math.min(MAX_WIDTH / w, MAX_HEIGHT / h);
    return { w: Math.round(w * ratio), h: Math.round(h * ratio) };
  }

  const ready = new Promise((resolve) => {
    screenVideo.onloadedmetadata = () => {
      let rawW, rawH;
      if (region) {
        rawW = region.width;
        rawH = region.height;
      } else {
        rawW = screenVideo.videoWidth;
        rawH = screenVideo.videoHeight;
      }
      const { w, h } = clampSize(rawW, rawH);
      canvas.width = w;
      canvas.height = h;
      resolve();
    };
  });

  function getWebcamPosition() {
    const pos = webcamPosition || { position: 'bottom-right' };
    const size = Math.min(canvas.width, canvas.height) * 0.2;
    const margin = 16;
    let x, y;

    switch (pos.position) {
      case 'top-left':
        x = margin; y = margin; break;
      case 'top-right':
        x = canvas.width - size - margin; y = margin; break;
      case 'bottom-left':
        x = margin; y = canvas.height - size - margin; break;
      case 'bottom-right':
      default:
        x = canvas.width - size - margin; y = canvas.height - size - margin; break;
    }

    if (pos.x !== undefined && pos.y !== undefined) {
      x = pos.x * canvas.width;
      y = pos.y * canvas.height;
    }

    return { x, y, size };
  }

  function draw() {
    if (!running) return;

    if (region) {
      ctx.drawImage(
        screenVideo,
        region.x, region.y, region.width, region.height,
        0, 0, canvas.width, canvas.height
      );
    } else {
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
    }

    if (camVideo && webcamStream && webcamStream.active) {
      const { x, y, size } = getWebcamPosition();
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(camVideo, x, y, size, size);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#6c5ce7';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  function start() {
    // Use setInterval at 15fps instead of requestAnimationFrame (60fps)
    // Much lighter on CPU
    intervalId = setInterval(draw, 1000 / 15);
    return canvas.captureStream(15);
  }

  function stop() {
    running = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    screenVideo.pause();
    screenVideo.srcObject = null;
    if (camVideo) {
      camVideo.pause();
      camVideo.srcObject = null;
    }
  }

  return { ready, start, stop, canvas };
}
