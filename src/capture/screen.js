export async function startScreenCapture(captureType, withAudio = true) {
  const constraints = {
    video: {
      cursor: 'always',
    },
    audio: withAudio,
  };

  // Set displaySurface hint based on capture type
  if (captureType === 'monitor') {
    constraints.video.displaySurface = 'monitor';
  } else if (captureType === 'window') {
    constraints.video.displaySurface = 'window';
  } else if (captureType === 'browser') {
    constraints.video.displaySurface = 'browser';
  }
  // For 'region', we capture full screen and crop later

  const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
  return stream;
}

export function getStreamDimensions(stream) {
  const track = stream.getVideoTracks()[0];
  const settings = track.getSettings();
  return { width: settings.width, height: settings.height };
}
