/**
 * Floating control panel for screen recording.
 * Shows countdown, timer, pause/stop controls.
 * Draggable and always-on-top (z-index: 9999).
 */

export function createFloatingPanel({ onStart, onPause, onResume, onStop, onCancel }) {
  let currentState = 'pre-recording';
  let element = null;
  let countdownInterval = null;

  // DOM references
  let statePreRec, stateCountdown, stateRecording;
  let countdownNumber, recDot, recTime;
  let btnPause;

  function buildDOM() {
    element = document.createElement('div');
    element.className = 'floating-panel';
    element.innerHTML = `
      <div class="fp-drag-bar">
        <span class="fp-title">ScreenRec</span>
      </div>
      <div class="fp-body">
        <div class="fp-state fp-pre-recording">
          <button class="fp-btn-start">Iniciar</button>
          <button class="fp-btn-cancel">Cancelar</button>
        </div>
        <div class="fp-state fp-countdown hidden">
          <span class="fp-countdown-number">3</span>
        </div>
        <div class="fp-state fp-recording hidden">
          <span class="fp-rec-dot"></span>
          <span class="fp-rec-time">00:00</span>
          <div class="fp-buttons">
            <button class="fp-btn-pause" title="Pausar">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            </button>
            <button class="fp-btn-stop" title="Parar">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    // Cache references
    statePreRec = element.querySelector('.fp-pre-recording');
    stateCountdown = element.querySelector('.fp-countdown');
    stateRecording = element.querySelector('.fp-recording');
    countdownNumber = element.querySelector('.fp-countdown-number');
    recDot = element.querySelector('.fp-rec-dot');
    recTime = element.querySelector('.fp-rec-time');
    btnPause = element.querySelector('.fp-btn-pause');

    // Button events
    element.querySelector('.fp-btn-start').addEventListener('click', handleStart);
    element.querySelector('.fp-btn-cancel').addEventListener('click', handleCancel);
    btnPause.addEventListener('click', handlePause);
    element.querySelector('.fp-btn-stop').addEventListener('click', () => onStop());

    makeDraggable(element);
    document.body.appendChild(element);
  }

  async function handleStart() {
    setState('countdown');
    await runCountdown();
    onStart();
  }

  function handleCancel() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    onCancel();
  }

  function handlePause() {
    if (currentState === 'recording') {
      setState('paused');
      onPause();
    } else if (currentState === 'paused') {
      setState('recording');
      onResume();
    }
  }

  function runCountdown() {
    return new Promise((resolve) => {
      const sequence = ['3', '2', '1', 'GO!'];
      let i = 0;

      countdownNumber.textContent = sequence[i];
      countdownNumber.classList.add('fp-countdown-animate');

      countdownInterval = setInterval(() => {
        i++;
        if (i >= sequence.length) {
          clearInterval(countdownInterval);
          countdownInterval = null;
          resolve();
          return;
        }
        countdownNumber.textContent = sequence[i];
        // Re-trigger animation
        countdownNumber.classList.remove('fp-countdown-animate');
        void countdownNumber.offsetWidth; // force reflow
        countdownNumber.classList.add('fp-countdown-animate');
      }, 1000);
    });
  }

  function setState(newState) {
    currentState = newState;

    statePreRec.classList.add('hidden');
    stateCountdown.classList.add('hidden');
    stateRecording.classList.add('hidden');

    switch (newState) {
      case 'pre-recording':
        statePreRec.classList.remove('hidden');
        break;
      case 'countdown':
        stateCountdown.classList.remove('hidden');
        break;
      case 'recording':
        stateRecording.classList.remove('hidden');
        recDot.classList.remove('paused');
        btnPause.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>`;
        btnPause.title = 'Pausar';
        break;
      case 'paused':
        stateRecording.classList.remove('hidden');
        recDot.classList.add('paused');
        btnPause.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>`;
        btnPause.title = 'Retomar';
        break;
    }
  }

  function updateTimer(elapsedMs) {
    if (!recTime) return;
    const secs = Math.floor(elapsedMs / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    recTime.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function show() {
    if (!element) buildDOM();
    setState('pre-recording');
  }

  function destroy() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    if (element) {
      element.remove();
      element = null;
    }
  }

  return { show, destroy, setState, updateTimer };
}

// ===== Draggable behavior =====
function makeDraggable(panelEl) {
  const dragBar = panelEl.querySelector('.fp-drag-bar');
  let isDragging = false;
  let offsetX, offsetY;

  dragBar.addEventListener('mousedown', onDown);
  dragBar.addEventListener('touchstart', onTouchDown, { passive: false });

  function onDown(e) {
    startDrag(e.clientX, e.clientY);
    e.preventDefault();
  }

  function onTouchDown(e) {
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
    e.preventDefault();
  }

  function startDrag(clientX, clientY) {
    isDragging = true;
    const rect = panelEl.getBoundingClientRect();
    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;

    // Switch from bottom/right to top/left positioning for dragging
    panelEl.style.bottom = 'auto';
    panelEl.style.right = 'auto';
    panelEl.style.left = rect.left + 'px';
    panelEl.style.top = rect.top + 'px';
  }

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    movePanel(e.clientX, e.clientY);
  });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const t = e.touches[0];
    movePanel(t.clientX, t.clientY);
  }, { passive: true });

  function movePanel(clientX, clientY) {
    let x = clientX - offsetX;
    let y = clientY - offsetY;
    x = Math.max(0, Math.min(x, window.innerWidth - panelEl.offsetWidth));
    y = Math.max(0, Math.min(y, window.innerHeight - panelEl.offsetHeight));
    panelEl.style.left = x + 'px';
    panelEl.style.top = y + 'px';
  }

  document.addEventListener('mouseup', () => { isDragging = false; });
  document.addEventListener('touchend', () => { isDragging = false; });
}
