let webcamStream = null;

export async function startWebcam() {
  if (webcamStream) return webcamStream;
  webcamStream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 480 }, height: { ideal: 480 }, facingMode: 'user' },
    audio: false,
  });
  return webcamStream;
}

export function stopWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach(t => t.stop());
    webcamStream = null;
  }
}

export function getWebcamStream() {
  return webcamStream;
}
