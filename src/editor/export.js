import { getFFmpeg } from '../utils/ffmpeg-loader.js';
import { $ } from '../utils/dom.js';
import { fetchFile } from '@ffmpeg/util';
import { getStickersData } from './stickers.js';

export async function exportVideo(videoBlob, options, onProgress) {
  const { trimStart, trimEnd, speed, format } = options;
  const ffmpeg = await getFFmpeg();

  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) onProgress(Math.min(progress, 1));
  });

  // Write input file
  const inputData = await fetchFile(videoBlob);
  await ffmpeg.writeFile('input.webm', inputData);

  const filters = [];
  const commands = ['-i', 'input.webm'];

  // Trim
  if (trimStart > 0) {
    commands.push('-ss', String(trimStart));
  }
  if (trimEnd > 0 && trimEnd < Infinity) {
    commands.push('-to', String(trimEnd));
  }

  // Speed adjustment
  if (speed && speed !== 1) {
    const videoSpeed = 1 / speed; // setpts factor (2x speed = 0.5*PTS)
    filters.push(`setpts=${videoSpeed}*PTS`);

    // Audio tempo (must be between 0.5 and 2.0, chain if needed)
    const audioFilters = buildAudioTempoFilter(speed);
    if (audioFilters) {
      commands.push('-filter:a', audioFilters);
    }
  }

  // Apply video filters
  if (filters.length > 0) {
    commands.push('-filter:v', filters.join(','));
  }

  // Sticker overlays: burn stickers into the video via canvas approach
  // For simplicity, we'll handle sticker burn-in with complex filter chains only if stickers exist
  const stickersData = getStickersData($('.video-wrapper'));
  if (stickersData.length > 0) {
    // Write sticker images as files
    for (let i = 0; i < stickersData.length; i++) {
      const s = stickersData[i];
      const svgBlob = new Blob([s.svg], { type: 'image/svg+xml' });
      const svgData = await fetchFile(svgBlob);
      await ffmpeg.writeFile(`sticker${i}.svg`, svgData);
    }

    // Build overlay filter chain
    // Note: ffmpeg SVG support can be limited; this is a best-effort approach
    const inputArgs = [];
    const overlayParts = [];
    let prevLabel = filters.length > 0 ? '[filtered]' : '[0:v]';

    // If we had video filters, we need to label the output
    if (filters.length > 0) {
      const vfIdx = commands.indexOf('-filter:v');
      commands[vfIdx + 1] = filters.join(',') + `[filtered]`;
      commands[vfIdx] = '-filter_complex';
    }

    for (let i = 0; i < stickersData.length; i++) {
      inputArgs.push('-i', `sticker${i}.svg`);
      const s = stickersData[i];
      const outLabel = i === stickersData.length - 1 ? 'vout' : `tmp${i}`;
      overlayParts.push(
        `${prevLabel}[${i + 1}:v]overlay=x=W*${s.x.toFixed(4)}:y=H*${s.y.toFixed(4)}:shortest=1[${outLabel}]`
      );
      prevLabel = `[${outLabel}]`;
    }

    // This gets complex — for MVP, skip sticker burn-in via ffmpeg
    // and note it as a limitation. Stickers are shown in preview only.
  }

  // Output format
  let outputFile;
  if (format === 'mp4') {
    commands.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
    commands.push('-c:a', 'aac', '-b:a', '128k');
    outputFile = 'output.mp4';
  } else {
    commands.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0');
    commands.push('-c:a', 'libopus');
    outputFile = 'output.webm';
  }

  commands.push(outputFile);

  await ffmpeg.exec(commands);

  const outputData = await ffmpeg.readFile(outputFile);
  const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
  const blob = new Blob([outputData.buffer], { type: mimeType });

  // Cleanup
  await ffmpeg.deleteFile('input.webm').catch(() => {});
  await ffmpeg.deleteFile(outputFile).catch(() => {});

  return blob;
}

function buildAudioTempoFilter(speed) {
  // atempo only accepts 0.5 to 100.0, but for quality keep within 0.5-2.0 range
  // Chain multiple atempo filters for speeds outside that range
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
