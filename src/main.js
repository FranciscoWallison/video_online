import { $, $$ } from './utils/dom.js';
import { switchView } from './ui/views.js';
import { showToast } from './ui/toast.js';
import { startScreenCapture, getStreamDimensions } from './capture/screen.js';
import { startWebcam, stopWebcam, getWebcamStream } from './capture/webcam.js';
import { createCompositor } from './capture/compositor.js';
import { createRecorder, mixAudioTracks } from './capture/recorder.js';
import { selectRegion } from './ui/region-select.js';
import { setupWebcamPosition, setupDraggableWebcam } from './ui/webcam-position.js';
import { setupPlayer } from './editor/player.js';
import { setupTimeline } from './editor/timeline.js';
import { setupStickers } from './editor/stickers.js';
import { exportVideo } from './editor/export.js';

// ============ APP STATE ============
const state = {
  captureType: 'monitor',
  webcamEnabled: false,
  systemAudio: true,
  micEnabled: false,
  region: null,
  webcamPosition: null,
  screenStream: null,
  compositor: null,
  recorder: null,
  recordedBlob: null,
  player: null,
  trimState: null,
  timerInterval: null,
  recordingStartTime: 0,
  pausedDuration: 0,
  pauseStartTime: 0,
};

// ============ SETUP VIEW ============
function initSetup() {
  // Capture type selection
  for (const btn of $$('.capture-btn')) {
    btn.addEventListener('click', () => {
      $$('.capture-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.captureType = btn.dataset.type;
    });
  }

  // Webcam toggle
  const webcamToggle = $('#toggle-webcam');
  const webcamOptions = $('#webcam-position-options');
  const webcamPreviewContainer = $('#webcam-preview-container');
  const webcamPreview = /** @type {HTMLVideoElement} */ ($('#webcam-preview'));

  state.webcamPosition = setupWebcamPosition();

  webcamToggle.addEventListener('change', async () => {
    state.webcamEnabled = webcamToggle.checked;
    if (state.webcamEnabled) {
      try {
        const stream = await startWebcam();
        webcamPreview.srcObject = stream;
        webcamOptions.classList.remove('hidden');
        webcamPreviewContainer.classList.remove('hidden');
      } catch (err) {
        showToast('Erro ao acessar webcam: ' + err.message, 'error');
        webcamToggle.checked = false;
        state.webcamEnabled = false;
      }
    } else {
      stopWebcam();
      webcamPreview.srcObject = null;
      webcamOptions.classList.add('hidden');
      webcamPreviewContainer.classList.add('hidden');
    }
  });

  // Audio toggles
  $('#toggle-system-audio').addEventListener('change', (e) => {
    state.systemAudio = e.target.checked;
  });
  $('#toggle-mic').addEventListener('change', (e) => {
    state.micEnabled = e.target.checked;
  });

  // Start recording button
  $('#btn-start-recording').addEventListener('click', startRecording);
}

// ============ RECORDING ============
async function startRecording() {
  try {
    // 1. Get screen stream
    state.screenStream = await startScreenCapture(
      state.captureType === 'region' ? 'monitor' : state.captureType,
      state.systemAudio
    );

    // Handle stream ending (user clicks "Stop sharing")
    state.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
      if (state.recorder && state.recorder.state !== 'inactive') {
        stopRecording();
      }
    });

    // 2. Region selection
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

    // 3. Setup compositor
    const canvas = /** @type {HTMLCanvasElement} */ ($('#recording-canvas'));
    const webcamStream = state.webcamEnabled ? getWebcamStream() : null;

    state.compositor = createCompositor(canvas, state.screenStream, webcamStream, {
      region: state.region,
      webcamPosition: state.webcamPosition,
    });

    await state.compositor.ready;
    const compositeStream = state.compositor.start();

    // 4. Setup webcam drag handle during recording
    const webcamHandle = $('#webcam-drag-handle');
    const webcamRecVideo = /** @type {HTMLVideoElement} */ ($('#webcam-recording'));
    if (webcamStream) {
      webcamRecVideo.srcObject = webcamStream;
      webcamHandle.classList.remove('hidden');
      setupDraggableWebcam(
        webcamHandle,
        $('.recording-preview-wrapper'),
        state.webcamPosition
      );
    } else {
      webcamHandle.classList.add('hidden');
    }

    // 5. Collect audio tracks
    const audioTracks = [];
    // System audio from screen stream
    const screenAudioTracks = state.screenStream.getAudioTracks();
    audioTracks.push(...screenAudioTracks);

    // Microphone
    if (state.micEnabled) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioTracks.push(...micStream.getAudioTracks());
      } catch (err) {
        showToast('Erro ao acessar microfone: ' + err.message, 'error');
      }
    }

    // Mix audio
    const mixedAudio = mixAudioTracks(audioTracks);

    // 6. Create and start recorder
    state.recorder = createRecorder(compositeStream, mixedAudio);
    state.recorder.start();

    // 7. Switch to recording view
    switchView('recording');
    startTimer();

    showToast('Gravação iniciada!', 'success');
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      showToast('Permissão de captura negada', 'error');
    } else {
      showToast('Erro ao iniciar gravação: ' + err.message, 'error');
      console.error(err);
    }
  }
}

function initRecording() {
  // Pause/Resume
  const btnPause = $('#btn-pause');
  btnPause.addEventListener('click', () => {
    if (state.recorder.state === 'recording') {
      state.recorder.pause();
      btnPause.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <polygon points="5,3 19,12 5,21"/>
        </svg>`;
      btnPause.title = 'Retomar';
      $('.rec-dot').classList.add('paused');
      state.pauseStartTime = Date.now();
    } else if (state.recorder.state === 'paused') {
      state.recorder.resume();
      btnPause.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>`;
      btnPause.title = 'Pausar';
      $('.rec-dot').classList.remove('paused');
      state.pausedDuration += Date.now() - state.pauseStartTime;
    }
  });

  // Stop
  $('#btn-stop').addEventListener('click', stopRecording);
}

async function stopRecording() {
  if (!state.recorder) return;

  try {
    state.recordedBlob = await state.recorder.stop();
  } catch (err) {
    showToast('Erro ao parar gravação', 'error');
    console.error(err);
    return;
  }

  // Cleanup
  stopTimer();
  if (state.compositor) state.compositor.stop();
  if (state.screenStream) {
    state.screenStream.getTracks().forEach(t => t.stop());
  }

  // Reset pause button
  const btnPause = $('#btn-pause');
  btnPause.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16"/>
      <rect x="14" y="4" width="4" height="16"/>
    </svg>`;
  btnPause.title = 'Pausar';
  $('.rec-dot').classList.remove('paused');
  $('#webcam-drag-handle').classList.add('hidden');

  // Switch to editor
  switchView('editor');
  initEditorWithBlob(state.recordedBlob);
  showToast('Gravação concluída!', 'success');
}

// Timer
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

// ============ EDITOR ============
function initEditorWithBlob(blob) {
  state.player = setupPlayer(blob);
  state.trimState = setupTimeline(state.player.video);
  setupStickers();
  setupExport(blob);
}

function setupExport(blob) {
  const btnExport = $('#btn-export');
  const btnQuickDownload = $('#btn-quick-download');
  const progressBar = $('#export-progress');
  const progressFill = $('.progress-fill');
  const progressText = $('.progress-text');
  const downloadLink = /** @type {HTMLAnchorElement} */ ($('#download-link'));

  // === QUICK DOWNLOAD: instant, no processing ===
  btnQuickDownload.addEventListener('click', () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording.webm';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Download iniciado!', 'success');
  });

  // === EXPORT WITH EDITS: uses Canvas + MediaRecorder (lightweight) ===
  btnExport.addEventListener('click', async () => {
    btnExport.disabled = true;
    progressBar.classList.remove('hidden');
    downloadLink.classList.add('hidden');
    progressText.textContent = 'Preparando...';

    try {
      const speed = parseFloat(/** @type {HTMLSelectElement} */ ($('#export-speed')).value);

      const result = await exportVideo(blob, {
        trimStart: state.trimState.startTime,
        trimEnd: state.trimState.endTime,
        speed,
        format: 'webm',
      }, (progress) => {
        const pct = Math.round(progress * 100);
        progressFill.style.width = pct + '%';
        progressText.textContent = `Exportando... ${pct}%`;
      });

      // Create download link
      const url = URL.createObjectURL(result);
      downloadLink.href = url;
      downloadLink.download = 'recording_editado.webm';
      downloadLink.textContent = 'Baixar Vídeo Editado (.webm)';
      downloadLink.classList.remove('hidden');

      progressFill.style.width = '100%';
      progressText.textContent = 'Concluído!';
      showToast('Exportação concluída!', 'success');
    } catch (err) {
      showToast('Erro na exportação: ' + err.message, 'error');
      console.error(err);
      progressBar.classList.add('hidden');
    } finally {
      btnExport.disabled = false;
    }
  });
}

function initEditor() {
  // New Recording button
  $('#btn-new-recording').addEventListener('click', () => {
    if (state.player) state.player.cleanup();
    state.recordedBlob = null;
    state.player = null;
    state.trimState = null;

    // Reset export UI
    $('#export-progress').classList.add('hidden');
    $('#download-link').classList.add('hidden');
    $('.progress-fill').style.width = '0%';
    $('.progress-text').textContent = '0%';

    // Clear stickers
    $('#sticker-canvas').innerHTML = '';

    switchView('setup');
  });
}

// ============ INIT ============
function init() {
  initSetup();
  initRecording();
  initEditor();
}

init();
