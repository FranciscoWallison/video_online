import { $ } from '../utils/dom.js';

export function setupPlayer(videoBlob) {
  const video = /** @type {HTMLVideoElement} */ ($('#editor-video'));
  const speedSelect = /** @type {HTMLSelectElement} */ ($('#speed-select'));

  const url = URL.createObjectURL(videoBlob);
  video.src = url;
  video.load();

  speedSelect.addEventListener('change', () => {
    video.playbackRate = parseFloat(speedSelect.value);
  });

  return {
    get video() { return video; },
    get duration() { return video.duration; },
    get currentTime() { return video.currentTime; },
    set currentTime(t) { video.currentTime = t; },
    cleanup() { URL.revokeObjectURL(url); },
  };
}
