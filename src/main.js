import { $, $$ } from './utils/dom.js';
import { switchView } from './ui/views.js';
import { showToast } from './ui/toast.js';
import { startScreenCapture, getStreamDimensions } from './capture/screen.js';
import { startWebcam, stopWebcam, getWebcamStream } from './capture/webcam.js';
import { createCompositor } from './capture/compositor.js';
import { createRecorder, mixAudioTracks } from './capture/recorder.js';
import { selectRegion } from './ui/region-select.js';
import { setupWebcamPosition, setupDraggableWebcam } from './ui/webcam-position.js';
import { createFloatingPanel } from './ui/floating-panel.js';

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
  floatingPanel: null,
  streamToRecord: null,
  mixedAudioTracks: [],
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

  $('#btn-start-recording').addEventListener('click', prepareRecording);
}

// ============ PHASE 1: PREPARE (acquire streams, show floating panel) ============
async function prepareRecording() {
  try {
    // 1. Get screen stream
    state.screenStream = await startScreenCapture(
      state.captureType === 'region' ? 'monitor' : state.captureType,
      state.systemAudio
    );

    // Handle stream ending externally (user clicks "Stop sharing")
    state.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
      if (state.recorder && state.recorder.state !== 'inactive') {
        stopRecording();
      } else {
        cancelRecording();
      }
    });

    // 2. Check displaySurface and warn
    const settings = state.screenStream.getVideoTracks()[0].getSettings();
    if (settings.displaySurface === 'browser') {
      showToast('Aviso: os controles podem aparecer na gravação. Grave outra janela ou tela para evitar.', 'error', 5000);
    }

    // 3. Region selection
    if (state.captureType === 'region') {
      const dims = getStreamDimensions(state.screenStream);
      state.region = await selectRegion(dims);
      if (!state.region) {
        state.screenStream.getTracks().forEach(t => t.stop());
        state.screenStream = null;
        showToast('Seleção de região cancelada', 'error');
        return;
      }
    } else {
      state.region = null;
    }

    // 4. Setup compositor/stream
    const webcamStream = state.webcamEnabled ? getWebcamStream() : null;
    const needsCompositor = !!(webcamStream || state.region);

    if (needsCompositor) {
      const canvas = /** @type {HTMLCanvasElement} */ ($('#recording-canvas'));
      state.compositor = createCompositor(canvas, state.screenStream, webcamStream, {
        region: state.region,
        webcamPosition: state.webcamPosition,
      });
      await state.compositor.ready;
      state.streamToRecord = state.compositor.start();
      canvas.classList.remove('hidden');

      if (webcamStream) {
        const handle = $('#webcam-drag-handle');
        /** @type {HTMLVideoElement} */ ($('#webcam-recording')).srcObject = webcamStream;
        handle.classList.remove('hidden');
        setupDraggableWebcam(handle, $('.recording-preview-wrapper'), state.webcamPosition);
      }
    } else {
      state.streamToRecord = state.screenStream;
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

    // 5. Prepare audio
    const audioTracks = [...state.screenStream.getAudioTracks()];
    if (state.micEnabled) {
      try {
        state.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioTracks.push(...state.micStream.getAudioTracks());
      } catch (err) {
        showToast('Erro ao acessar microfone: ' + err.message, 'error');
      }
    }
    state.mixedAudioTracks = mixAudioTracks(audioTracks);

    // 6. Switch to recording view (shows preview) and hide inline controls
    switchView('recording');
    $('.recording-controls').classList.add('hidden');

    // 7. Create and show floating panel
    state.floatingPanel = createFloatingPanel({
      onStart: beginRecording,
      onPause: pauseRecording,
      onResume: resumeRecording,
      onStop: stopRecording,
      onCancel: cancelRecording,
    });
    state.floatingPanel.show();

  } catch (err) {
    if (err.name === 'NotAllowedError') {
      showToast('Permissão de captura negada', 'error');
    } else {
      showToast('Erro: ' + err.message, 'error');
      console.error(err);
    }
  }
}

// ============ PHASE 2: BEGIN (after countdown, start recording) ============
function beginRecording() {
  state.recorder = createRecorder(state.streamToRecord, state.mixedAudioTracks);
  state.recorder.start();

  state.floatingPanel.setState('recording');
  startTimer();
  showToast('Gravação iniciada!', 'success');
}

// ============ PAUSE / RESUME ============
function pauseRecording() {
  if (!state.recorder || state.recorder.state !== 'recording') return;
  state.recorder.pause();
  state.floatingPanel.setState('paused');
  state.pauseStartTime = Date.now();
}

function resumeRecording() {
  if (!state.recorder || state.recorder.state !== 'paused') return;
  state.recorder.resume();
  state.floatingPanel.setState('recording');
  state.pausedDuration += Date.now() - state.pauseStartTime;
}

// ============ STOP RECORDING ============
async function stopRecording() {
  if (!state.recorder) return;

  // Stop timer FIRST
  stopTimer();

  // Destroy floating panel
  if (state.floatingPanel) {
    state.floatingPanel.destroy();
    state.floatingPanel = null;
  }

  // Stop compositor
  if (state.compositor) {
    state.compositor.stop();
    state.compositor = null;
  }

  const pv = $('#recording-preview-video');
  if (pv) {
    pv.srcObject = null;
    pv.classList.add('hidden');
  }

  // Stop recorder and get blob
  let blob;
  try {
    blob = await state.recorder.stop();
  } catch (err) {
    showToast('Erro ao parar gravação', 'error');
    return;
  }

  // Stop remaining streams
  cleanupStreams();

  // Reset recording UI
  $('#webcam-drag-handle').classList.add('hidden');
  $('#recording-canvas').classList.remove('hidden');
  $('.recording-controls').classList.remove('hidden');

  // Save blob
  state.recordedBlob = blob;
  if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
  state.blobUrl = URL.createObjectURL(blob);

  // Show recording info
  const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
  $('#recording-info').textContent = `Tamanho: ${sizeMB} MB`;

  // Setup download link
  $('#btn-quick-download').href = state.blobUrl;
  $('#btn-quick-download').download = 'recording.webm';

  // Hide preview area
  $('#preview-area').classList.add('hidden');

  // Switch view
  switchView('editor');
  showToast('Gravação concluída!', 'success');
}

// ============ CANCEL (before recording starts) ============
function cancelRecording() {
  stopTimer();

  if (state.floatingPanel) {
    state.floatingPanel.destroy();
    state.floatingPanel = null;
  }

  if (state.compositor) {
    state.compositor.stop();
    state.compositor = null;
  }

  const pv = $('#recording-preview-video');
  if (pv) {
    pv.srcObject = null;
    pv.classList.add('hidden');
  }

  cleanupStreams();

  $('#webcam-drag-handle').classList.add('hidden');
  $('#recording-canvas').classList.remove('hidden');
  $('.recording-controls').classList.remove('hidden');

  state.recorder = null;
  state.streamToRecord = null;
  state.mixedAudioTracks = [];

  switchView('setup');
  showToast('Gravação cancelada', 'error');
}

function cleanupStreams() {
  if (state.screenStream) {
    state.screenStream.getTracks().forEach(t => t.stop());
    state.screenStream = null;
  }
  if (state.micStream) {
    state.micStream.getTracks().forEach(t => t.stop());
    state.micStream = null;
  }
}

// ============ TIMER ============
function startTimer() {
  state.recordingStartTime = Date.now();
  state.pausedDuration = 0;
  state.timerInterval = setInterval(() => {
    let elapsed = Date.now() - state.recordingStartTime - state.pausedDuration;
    if (state.recorder && state.recorder.state === 'paused') {
      elapsed -= (Date.now() - state.pauseStartTime);
    }
    if (state.floatingPanel) {
      state.floatingPanel.updateTimer(elapsed);
    }
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
  $('#btn-preview').addEventListener('click', () => {
    const area = $('#preview-area');
    const video = /** @type {HTMLVideoElement} */ ($('#editor-video'));

    if (area.classList.contains('hidden')) {
      video.src = state.blobUrl;
      area.classList.remove('hidden');
      $('#btn-preview').textContent = 'Fechar Preview';
    } else {
      video.pause();
      video.removeAttribute('src');
      video.load();
      area.classList.add('hidden');
      $('#btn-preview').innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Assistir Preview';
    }
  });

  $('#btn-new-recording').addEventListener('click', () => {
    const video = /** @type {HTMLVideoElement} */ ($('#editor-video'));
    video.pause();
    video.removeAttribute('src');
    video.load();
    $('#preview-area').classList.add('hidden');

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
initDoneView();

// ============ PWA SERVICE WORKER ============
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
