export function createCompositor(canvas, screenStream, webcamStream, options = {}) {
  const ctx = canvas.getContext('2d');
  const { region, webcamPosition } = options;

  // Create hidden video elements for streams
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
  let animFrameId = null;

  // Wait for video metadata to set canvas size
  const ready = new Promise((resolve) => {
    screenVideo.onloadedmetadata = () => {
      if (region) {
        canvas.width = region.width;
        canvas.height = region.height;
      } else {
        canvas.width = screenVideo.videoWidth;
        canvas.height = screenVideo.videoHeight;
      }
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

    // Override with custom position if dragged
    if (pos.x !== undefined && pos.y !== undefined) {
      x = pos.x * canvas.width;
      y = pos.y * canvas.height;
    }

    return { x, y, size };
  }

  function draw() {
    if (!running) return;

    // Draw screen frame
    if (region) {
      ctx.drawImage(
        screenVideo,
        region.x, region.y, region.width, region.height,
        0, 0, canvas.width, canvas.height
      );
    } else {
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
    }

    // Draw webcam circle overlay
    if (camVideo && webcamStream && webcamStream.active) {
      const { x, y, size } = getWebcamPosition();
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(camVideo, x, y, size, size);
      ctx.restore();

      // Draw border around webcam
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#6c5ce7';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    animFrameId = requestAnimationFrame(draw);
  }

  function start() {
    draw();
    return canvas.captureStream(30);
  }

  function stop() {
    running = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    screenVideo.pause();
    screenVideo.srcObject = null;
    if (camVideo) {
      camVideo.pause();
      camVideo.srcObject = null;
    }
  }

  return { ready, start, stop, canvas };
}
