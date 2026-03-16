// Web Worker for ffmpeg.wasm processing
// Runs in a separate thread so the UI doesn't freeze

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

let ffmpeg = null;

async function initFFmpeg() {
  if (ffmpeg) return;
  ffmpeg = new FFmpeg();

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

  ffmpeg.on('progress', ({ progress }) => {
    self.postMessage({ type: 'progress', progress: Math.min(progress, 1) });
  });

  ffmpeg.on('log', ({ message }) => {
    // Optional: forward logs for debugging
    // self.postMessage({ type: 'log', message });
  });

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
}

async function processVideo(inputBuffer, options) {
  const { trimStart, trimEnd, speed, format } = options;

  await initFFmpeg();

  // Write input
  await ffmpeg.writeFile('input.webm', new Uint8Array(inputBuffer));

  const commands = ['-i', 'input.webm'];
  const filters = [];

  // Trim
  if (trimStart > 0) {
    commands.push('-ss', String(trimStart));
  }
  if (trimEnd > 0 && trimEnd < Infinity) {
    commands.push('-to', String(trimEnd));
  }

  // Speed
  if (speed && speed !== 1) {
    const videoSpeed = 1 / speed;
    filters.push(`setpts=${videoSpeed}*PTS`);

    // Audio tempo chain
    const audioFilter = buildAudioTempoFilter(speed);
    if (audioFilter) {
      commands.push('-filter:a', audioFilter);
    }
  }

  if (filters.length > 0) {
    commands.push('-filter:v', filters.join(','));
  }

  // Output format
  let outputFile;
  if (format === 'mp4') {
    commands.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28');
    commands.push('-c:a', 'aac', '-b:a', '96k');
    commands.push('-movflags', '+faststart');
    outputFile = 'output.mp4';
  } else {
    // WebM - use faster settings
    commands.push('-c:v', 'libvpx', '-crf', '30', '-b:v', '0', '-cpu-used', '4');
    commands.push('-c:a', 'libvorbis', '-q:a', '3');
    outputFile = 'output.webm';
  }

  commands.push('-threads', '2');
  commands.push(outputFile);

  await ffmpeg.exec(commands);

  const outputData = await ffmpeg.readFile(outputFile);

  // Cleanup
  await ffmpeg.deleteFile('input.webm').catch(() => {});
  await ffmpeg.deleteFile(outputFile).catch(() => {});

  return outputData.buffer;
}

function buildAudioTempoFilter(speed) {
  if (speed >= 0.5 && speed <= 2.0) {
    return `atempo=${speed}`;
  }
  const parts = [];
  let remaining = speed;
  while (remaining > 2.0) {
    parts.push('atempo=2.0');
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    parts.push('atempo=0.5');
    remaining /= 0.5;
  }
  parts.push(`atempo=${remaining.toFixed(4)}`);
  return parts.join(',');
}

// Handle messages from main thread
self.onmessage = async (e) => {
  const { type, inputBuffer, options } = e.data;

  if (type === 'process') {
    try {
      self.postMessage({ type: 'progress', progress: 0 });
      const resultBuffer = await processVideo(inputBuffer, options);
      self.postMessage({ type: 'done', resultBuffer }, [resultBuffer]);
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
    }
  }
};
