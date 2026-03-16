/**
 * Export video using native browser APIs only (Canvas + MediaRecorder).
 * No ffmpeg.wasm — lightweight and won't freeze the browser.
 *
 * Strategy: play the source video on a hidden canvas at the desired speed,
 * capture the canvas stream with MediaRecorder, and record only the
 * trimmed portion.
 */

export function exportVideo(sourceBlob, options, onProgress) {
  const { trimStart, trimEnd, speed, format } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = false;
    video.playsInline = true;

    const url = URL.createObjectURL(sourceBlob);
    video.src = url;

    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      // Set playback speed
      video.playbackRate = speed || 1;

      // Seek to trim start
      video.currentTime = trimStart || 0;

      const effectiveEnd = trimEnd || video.duration;
      const totalDuration = effectiveEnd - (trimStart || 0);

      // Capture canvas stream
      const canvasStream = canvas.captureStream(30);

      // Add audio from video if available
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination); // so we can hear during export? no, muted
        for (const track of dest.stream.getAudioTracks()) {
          canvasStream.addTrack(track);
        }
      } catch (e) {
        // No audio track, that's fine
      }

      // Setup MediaRecorder
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: 5_000_000,
      });

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        URL.revokeObjectURL(url);
        const outputMime = format === 'mp4' ? 'video/mp4' : mimeType;
        const blob = new Blob(chunks, { type: outputMime });
        resolve(blob);
      };

      recorder.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Erro na gravação: ' + e.error?.message));
      };

      // Draw loop
      let animId;
      function drawFrame() {
        if (video.currentTime >= effectiveEnd || video.ended) {
          cancelAnimationFrame(animId);
          recorder.stop();
          video.pause();
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Report progress
        const elapsed = video.currentTime - (trimStart || 0);
        if (onProgress && totalDuration > 0) {
          onProgress(Math.min(elapsed / totalDuration, 1));
        }

        animId = requestAnimationFrame(drawFrame);
      }

      // Start recording when video starts playing
      video.onseeked = () => {
        recorder.start(100);
        drawFrame();
        video.play();
      };
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Erro ao carregar vídeo'));
    };
  });
}

function pickMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return 'video/webm';
}
