export function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && !window.matchMedia('(min-width: 1024px)').matches);
}

export function hasScreenCapture() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
}
