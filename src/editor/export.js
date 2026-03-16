/**
 * Lightweight export using Canvas + MediaRecorder.
 * Plays the video at the desired speed, draws to a small canvas,
 * and re-records only the trimmed portion at 15fps.
 */

export function exportVideo(sourceBlob, options, onProgress) {
  const { trimStart, trimEnd, speed } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.playsInline = true;
    // Must NOT be muted to capture audio via AudioContext
    video.volume = 0; // silent for user but audio still flows

    const url = URL.createObjectURL(sourceBlob);
    video.src = url;

    video.onloadedmetadata = () => {
      // Use a smaller canvas for export (max 1280x720)
      const scale = Math.min(1, 1280 / video.videoWidth, 720 / video.videoHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d');

      video.playbackRate = speed || 1;
      video.currentTime = trimStart || 0;

      const effectiveEnd = trimEnd || video.duration;
      const totalDuration = effectiveEnd - (trimStart || 0);

      // Capture canvas at 15fps
      const canvasStream = canvas.captureStream(15);

      // Try to capture audio
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        // Don't connect to audioCtx.destination (would play audibly)
        for (const track of dest.stream.getAudioTracks()) {
          canvasStream.addTrack(track);
        }
      } catch (e) {
        // No audio — fine
      }

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: 1_500_000,
      });

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        URL.revokeObjectURL(url);
        resolve(new Blob(chunks, { type: mimeType }));
      };

      recorder.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Erro na exportação'));
      };

      // Draw at 15fps using setInterval (lighter than requestAnimationFrame)
      let drawInterval;
      function startDrawing() {
        recorder.start(500);
        video.play();

        drawInterval = setInterval(() => {
          if (video.currentTime >= effectiveEnd || video.ended || video.paused) {
            clearInterval(drawInterval);
            recorder.stop();
            video.pause();
            return;
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const elapsed = video.currentTime - (trimStart || 0);
          if (onProgress && totalDuration > 0) {
            onProgress(Math.min(elapsed / totalDuration, 1));
          }
        }, 1000 / 15);
      }

      video.onseeked = () => startDrawing();
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Erro ao carregar vídeo'));
    };
  });
}

function pickMimeType() {
  const candidates = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return 'video/webm';
}
