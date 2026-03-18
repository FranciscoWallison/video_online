import { $, $$ } from './utils/dom.js';
import { switchView } from './ui/views.js';
import { showToast } from './ui/toast.js';
import { startScreenCapture, getStreamDimensions } from './capture/screen.js';
import { startWebcam, stopWebcam, getWebcamStream } from './capture/webcam.js';
import { createCompositor } from './capture/compositor.js';
import { createRecorder, mixAudioTracks } from './capture/recorder.js';
import { selectRegion } from './ui/region-select.js';
import { setupWebcamPosition, setupDraggableWebcam } from './ui/webcam-position.js';

// ============ APP STATE ============
const state = {
  captureType: 'monitor',
  webcamEnabled: false,
  systemAudio: true,
  micEnabled: false,
  region: null,
  webcamPosition: null,
  screenStream: null,
  micStream: null,
  compositor: null,
  recorder: null,
  recordedBlob: null,
  blobUrl: null,
  timerInterval: null,
  recordingStartTime: 0,
  pausedDuration: 0,
  pauseStartTime: 0,
};

// ============ SETUP VIEW ============
function initSetup() {
  for (const btn of $$('.capture-btn')) {
    btn.addEventListener('click', () => {
      $$('.capture-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.captureType = btn.dataset.type;
    });
  }

  const webcamToggle = $('#toggle-webcam');
  state.webcamPosition = setupWebcamPosition();

  webcamToggle.addEventListener('change', async () => {
    state.webcamEnabled = webcamToggle.checked;
    if (state.webcamEnabled) {
      try {
        const stream = await startWebcam();
        /** @type {HTMLVideoElement} */ ($('#webcam-preview')).srcObject = stream;
        $('#webcam-position-options').classList.remove('hidden');
        $('#webcam-preview-container').classList.remove('hidden');
      } catch (err) {
        showToast('Erro ao acessar webcam: ' + err.message, 'error');
        webcamToggle.checked = false;
        state.webcamEnabled = false;
      }
    } else {
      stopWebcam();
      /** @type {HTMLVideoElement} */ ($('#webcam-preview')).srcObject = null;
      $('#webcam-position-options').classList.add('hidden');
      $('#webcam-preview-container').classList.add('hidden');
    }
  });

  $('#toggle-system-audio').addEventListener('change', (e) => {
    state.systemAudio = e.target.checked;
  });
  $('#toggle-mic').addEventListener('change', (e) => {
    state.micEnabled = e.target.checked;
  });

  $('#btn-start-recording').addEventListener('click', startRecording);
}

// ============ RECORDING ============
async function startRecording() {
  try {
    state.screenStream = await startScreenCapture(
      state.captureType === 'region' ? 'monitor' : state.captureType,
      state.systemAudio
    );

    state.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
      if (state.recorder && state.recorder.state !== 'inactive') {
        stopRecording();
      }
    });

    if (state.captureType === 'region') {
      const dims = getStreamDimensions(state.screenStream);
      state.region = await selectRegion(dims);
      if (!state.region) {
        state.screenStream.getTracks().forEach(t => t.stop());
        showToast('Seleção de região cancelada', 'error');
        return;
      }
    } else {
      state.region = null;
    }

    const webcamStream = state.webcamEnabled ? getWebcamStream() : null;
    const needsCompositor = !!(webcamStream || state.region);
    let streamToRecord;

    if (needsCompositor) {
      const canvas = /** @type {HTMLCanvasElement} */ ($('#recording-canvas'));
      state.compositor = createCompositor(canvas, state.screenStream, webcamStream, {
        region: state.region,
        webcamPosition: state.webcamPosition,
      });
      await state.compositor.ready;
      streamToRecord = state.compositor.start();
      canvas.classList.remove('hidden');

      if (webcamStream) {
        const handle = $('#webcam-drag-handle');
        /** @type {HTMLVideoElement} */ ($('#webcam-recording')).srcObject = webcamStream;
        handle.classList.remove('hidden');
        setupDraggableWebcam(handle, $('.recording-preview-wrapper'), state.webcamPosition);
      }
    } else {
      streamToRecord = state.screenStream;
      state.compositor = null;
      $('#recording-canvas').classList.add('hidden');

      let pv = $('#recording-preview-video');
      if (!pv) {
        pv = document.createElement('video');
        pv.id = 'recording-preview-video';
        pv.autoplay = true;
        pv.muted = true;
        pv.playsInline = true;
        pv.style.cssText = 'width:100%;height:100%;object-fit:contain;';
        $('.recording-preview-wrapper').appendChild(pv);
      }
      pv.classList.remove('hidden');
      pv.srcObject = state.screenStream;
    }

    $('#webcam-drag-handle').classList.toggle('hidden', !webcamStream);

    // Audio
    const audioTracks = [...state.screenStream.getAudioTracks()];
    if (state.micEnabled) {
      try {
        state.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioTracks.push(...state.micStream.getAudioTracks());
      } catch (err) {
        showToast('Erro ao acessar microfone: ' + err.message, 'error');
      }
    }

    state.recorder = createRecorder(streamToRecord, mixAudioTracks(audioTracks));
    state.recorder.start();

    switchView('recording');
    startTimer();
    showToast('Gravação iniciada!', 'success');
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      showToast('Permissão de captura negada', 'error');
    } else {
      showToast('Erro: ' + err.message, 'error');
      console.error(err);
    }
  }
}

function initRecording() {
  const btnPause = $('#btn-pause');
  btnPause.addEventListener('click', () => {
    if (!state.recorder) return;
    if (state.recorder.state === 'recording') {
      state.recorder.pause();
      btnPause.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
      btnPause.title = 'Retomar';
      $('.rec-dot').classList.add('paused');
      state.pauseStartTime = Date.now();
    } else if (state.recorder.state === 'paused') {
      state.recorder.resume();
      btnPause.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      btnPause.title = 'Pausar';
      $('.rec-dot').classList.remove('paused');
      state.pausedDuration += Date.now() - state.pauseStartTime;
    }
  });

  $('#btn-stop').addEventListener('click', stopRecording);
}

async function stopRecording() {
  if (!state.recorder) return;

  // Stop timer FIRST
  stopTimer();

  // Stop all streams BEFORE stopping recorder to reduce load
  if (state.compositor) {
    state.compositor.stop();
    state.compositor = null;
  }

  const pv = $('#recording-preview-video');
  if (pv) {
    pv.srcObject = null;
    pv.classList.add('hidden');
  }

  // Now stop recorder and get blob
  let blob;
  try {
    blob = await state.recorder.stop();
  } catch (err) {
    showToast('Erro ao parar gravação', 'error');
    return;
  }

  // Stop remaining streams
  if (state.screenStream) {
    state.screenStream.getTracks().forEach(t => t.stop());
    state.screenStream = null;
  }
  if (state.micStream) {
    state.micStream.getTracks().forEach(t => t.stop());
    state.micStream = null;
  }

  // Reset recording UI
  $('#btn-pause').innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  $('.rec-dot').classList.remove('paused');
  $('#webcam-drag-handle').classList.add('hidden');
  $('#recording-canvas').classList.remove('hidden');

  // Save blob — NO heavy processing here
  state.recordedBlob = blob;
  if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
  state.blobUrl = URL.createObjectURL(blob);

  // Show recording info
  const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
  $('#recording-info').textContent = `Tamanho: ${sizeMB} MB`;

  // Setup download link
  $('#btn-quick-download').href = state.blobUrl;
  $('#btn-quick-download').download = 'recording.webm';

  // Hide preview area (don't load video yet!)
  $('#preview-area').classList.add('hidden');

  // Switch view — this is instant, no video loading
  switchView('editor');
  showToast('Gravação concluída!', 'success');
}

function startTimer() {
  state.recordingStartTime = Date.now();
  state.pausedDuration = 0;
  const timerEl = $('#rec-time');
  state.timerInterval = setInterval(() => {
    let elapsed = Date.now() - state.recordingStartTime - state.pausedDuration;
    if (state.recorder && state.recorder.state === 'paused') {
      elapsed -= (Date.now() - state.pauseStartTime);
    }
    const secs = Math.floor(elapsed / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    timerEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, 500);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

// ============ DONE VIEW ============
function initDoneView() {
  // Preview button — only loads video when user explicitly clicks
  $('#btn-preview').addEventListener('click', () => {
    const area = $('#preview-area');
    const video = /** @type {HTMLVideoElement} */ ($('#editor-video'));

    if (area.classList.contains('hidden')) {
      // Load video only now
      video.src = state.blobUrl;
      area.classList.remove('hidden');
      $('#btn-preview').textContent = 'Fechar Preview';
    } else {
      // Unload video to free memory
      video.pause();
      video.removeAttribute('src');
      video.load();
      area.classList.add('hidden');
      $('#btn-preview').innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Assistir Preview';
    }
  });

  // New Recording
  $('#btn-new-recording').addEventListener('click', () => {
    // Unload video
    const video = /** @type {HTMLVideoElement} */ ($('#editor-video'));
    video.pause();
    video.removeAttribute('src');
    video.load();
    $('#preview-area').classList.add('hidden');

    // Free blob
    if (state.blobUrl) {
      URL.revokeObjectURL(state.blobUrl);
      state.blobUrl = null;
    }
    state.recordedBlob = null;

    switchView('setup');
  });
}

// ============ INIT ============
initSetup();
initRecording();
initDoneView();

// ============ PWA SERVICE WORKER ============
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
