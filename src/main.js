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
  micStream: null,
  compositor: null,
  recorder: null,
  recordedBlob: null,
  player: null,
  trimState: null,
  timerInterval: null,
  recordingStartTime: 0,
  pausedDuration: 0,
  pauseStartTime: 0,
  needsCompositor: false,
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

    // 3. Decide: compositor needed only if webcam OR region crop
    const webcamStream = state.webcamEnabled ? getWebcamStream() : null;
    state.needsCompositor = !!(webcamStream || state.region);

    let streamToRecord;

    if (state.needsCompositor) {
      // Use canvas compositor (heavier, but needed for overlay/crop)
      const canvas = /** @type {HTMLCanvasElement} */ ($('#recording-canvas'));
      state.compositor = createCompositor(canvas, state.screenStream, webcamStream, {
        region: state.region,
        webcamPosition: state.webcamPosition,
      });
      await state.compositor.ready;
      streamToRecord = state.compositor.start();

      // Show preview canvas
      canvas.classList.remove('hidden');

      // Setup webcam drag handle
      const webcamHandle = $('#webcam-drag-handle');
      const webcamRecVideo = /** @type {HTMLVideoElement} */ ($('#webcam-recording'));
      if (webcamStream) {
        webcamRecVideo.srcObject = webcamStream;
        webcamHandle.classList.remove('hidden');
        setupDraggableWebcam(webcamHandle, $('.recording-preview-wrapper'), state.webcamPosition);
      }
    } else {
      // DIRECT recording — no canvas, no overhead!
      // Just show a simple preview via video element
      streamToRecord = state.screenStream;
      state.compositor = null;

      // Hide the canvas, show a video preview instead
      const canvas = $('#recording-canvas');
      canvas.classList.add('hidden');

      let previewVideo = $('#recording-preview-video');
      if (!previewVideo) {
        previewVideo = document.createElement('video');
        previewVideo.id = 'recording-preview-video';
        previewVideo.autoplay = true;
        previewVideo.muted = true;
        previewVideo.playsInline = true;
        previewVideo.style.cssText = 'width:100%;height:100%;object-fit:contain;';
        $('.recording-preview-wrapper').appendChild(previewVideo);
      }
      previewVideo.classList.remove('hidden');
      previewVideo.srcObject = state.screenStream;
    }

    $('#webcam-drag-handle').classList.toggle('hidden', !webcamStream);

    // 4. Collect audio tracks
    const audioTracks = [];
    audioTracks.push(...state.screenStream.getAudioTracks());

    if (state.micEnabled) {
      try {
        state.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioTracks.push(...state.micStream.getAudioTracks());
      } catch (err) {
        showToast('Erro ao acessar microfone: ' + err.message, 'error');
      }
    }

    const mixedAudio = mixAudioTracks(audioTracks);

    // 5. Create and start recorder
    state.recorder = createRecorder(streamToRecord, mixedAudio);
    state.recorder.start();

    // 6. Switch to recording view
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
  const btnPause = $('#btn-pause');
  btnPause.addEventListener('click', () => {
    if (!state.recorder) return;
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

  $('#btn-stop').addEventListener('click', stopRecording);
}

async function stopRecording() {
  if (!state.recorder) return;

  // 1. Stop recorder first
  let blob;
  try {
    blob = await state.recorder.stop();
  } catch (err) {
    showToast('Erro ao parar gravação', 'error');
    console.error(err);
    return;
  }

  // 2. Cleanup all streams and compositor
  stopTimer();
  if (state.compositor) {
    state.compositor.stop();
    state.compositor = null;
  }
  if (state.screenStream) {
    state.screenStream.getTracks().forEach(t => t.stop());
    state.screenStream = null;
  }
  if (state.micStream) {
    state.micStream.getTracks().forEach(t => t.stop());
    state.micStream = null;
  }

  // Clean up preview video if used
  const previewVideo = $('#recording-preview-video');
  if (previewVideo) {
    previewVideo.srcObject = null;
    previewVideo.classList.add('hidden');
  }

  // Reset UI
  const btnPause = $('#btn-pause');
  btnPause.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16"/>
      <rect x="14" y="4" width="4" height="16"/>
    </svg>`;
  btnPause.title = 'Pausar';
  $('.rec-dot').classList.remove('paused');
  $('#webcam-drag-handle').classList.add('hidden');
  $('#recording-canvas').classList.remove('hidden');

  // 3. Save blob and switch to editor after a brief delay
  //    (let the browser release resources before loading editor)
  state.recordedBlob = blob;

  switchView('editor');
  // Use setTimeout to let the browser breathe before loading the video
  setTimeout(() => {
    initEditorWithBlob(state.recordedBlob);
    showToast('Gravação concluída!', 'success');
  }, 100);
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
let exportListenersAttached = false;

function initEditorWithBlob(blob) {
  state.player = setupPlayer(blob);
  state.trimState = setupTimeline(state.player.video);
  setupStickers();

  // Only attach export listeners once to avoid stacking
  if (!exportListenersAttached) {
    setupExport();
    exportListenersAttached = true;
  }
}

function setupExport() {
  const btnExport = $('#btn-export');
  const btnQuickDownload = $('#btn-quick-download');
  const progressBar = $('#export-progress');
  const progressFill = $('.progress-fill');
  const progressText = $('.progress-text');
  const downloadLink = /** @type {HTMLAnchorElement} */ ($('#download-link'));

  // === QUICK DOWNLOAD: instant, no processing ===
  btnQuickDownload.addEventListener('click', () => {
    if (!state.recordedBlob) return;
    const url = URL.createObjectURL(state.recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording.webm';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Download iniciado!', 'success');
  });

  // === EXPORT WITH EDITS ===
  btnExport.addEventListener('click', async () => {
    if (!state.recordedBlob) return;
    btnExport.disabled = true;
    progressBar.classList.remove('hidden');
    downloadLink.classList.add('hidden');
    progressText.textContent = 'Preparando...';

    try {
      const speed = parseFloat(/** @type {HTMLSelectElement} */ ($('#export-speed')).value);

      const result = await exportVideo(state.recordedBlob, {
        trimStart: state.trimState.startTime,
        trimEnd: state.trimState.endTime,
        speed,
        format: 'webm',
      }, (progress) => {
        const pct = Math.round(progress * 100);
        progressFill.style.width = pct + '%';
        progressText.textContent = `Exportando... ${pct}%`;
      });

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
  $('#btn-new-recording').addEventListener('click', () => {
    if (state.player) state.player.cleanup();
    state.recordedBlob = null;
    state.player = null;
    state.trimState = null;

    $('#export-progress').classList.add('hidden');
    $('#download-link').classList.add('hidden');
    $('.progress-fill').style.width = '0%';
    $('.progress-text').textContent = '0%';
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
