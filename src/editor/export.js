import FFmpegWorker from '../utils/ffmpeg-worker.js?worker';

let worker = null;

export async function exportVideo(videoBlob, options, onProgress) {
  // Convert blob to ArrayBuffer to send to worker
  const inputBuffer = await videoBlob.arrayBuffer();

  return new Promise((resolve, reject) => {
    // Create worker (or reuse)
    if (worker) {
      worker.terminate();
    }
    worker = new FFmpegWorker();

    worker.onmessage = (e) => {
      const { type } = e.data;

      if (type === 'progress') {
        if (onProgress) onProgress(e.data.progress);
      } else if (type === 'done') {
        const mimeType = options.format === 'mp4' ? 'video/mp4' : 'video/webm';
        const blob = new Blob([e.data.resultBuffer], { type: mimeType });
        resolve(blob);
      } else if (type === 'error') {
        reject(new Error(e.data.message));
      }
    };

    worker.onerror = (err) => {
      reject(new Error('Worker error: ' + err.message));
    };

    // Send data to worker (transfer the buffer for zero-copy)
    worker.postMessage(
      { type: 'process', inputBuffer, options },
      [inputBuffer]
    );
  });
}
