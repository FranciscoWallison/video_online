import { $, $$ } from '../utils/dom.js';

export function setupWebcamPosition() {
  const state = { position: 'bottom-right', x: undefined, y: undefined };

  // Corner position buttons
  for (const btn of $$('.pos-btn')) {
    btn.addEventListener('click', () => {
      $$('.pos-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.position = btn.dataset.pos;
      state.x = undefined;
      state.y = undefined;
      updateDragHandle(state);
    });
  }

  return state;
}

export function setupDraggableWebcam(handleEl, containerEl, positionState) {
  let isDragging = false;
  let offsetX, offsetY;

  function startDrag(clientX, clientY) {
    isDragging = true;
    const rect = handleEl.getBoundingClientRect();
    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;
    handleEl.style.cursor = 'grabbing';
  }

  function moveDrag(clientX, clientY) {
    if (!isDragging) return;
    const containerRect = containerEl.getBoundingClientRect();
    let x = clientX - containerRect.left - offsetX;
    let y = clientY - containerRect.top - offsetY;

    x = Math.max(0, Math.min(x, containerRect.width - handleEl.offsetWidth));
    y = Math.max(0, Math.min(y, containerRect.height - handleEl.offsetHeight));

    handleEl.style.left = x + 'px';
    handleEl.style.top = y + 'px';
    handleEl.style.right = 'auto';
    handleEl.style.bottom = 'auto';

    positionState.x = x / containerRect.width;
    positionState.y = y / containerRect.height;
    positionState.position = 'custom';
  }

  function endDrag() {
    isDragging = false;
    handleEl.style.cursor = 'grab';
  }

  // Mouse events
  handleEl.addEventListener('mousedown', (e) => { startDrag(e.clientX, e.clientY); e.preventDefault(); });
  document.addEventListener('mousemove', (e) => { moveDrag(e.clientX, e.clientY); });
  document.addEventListener('mouseup', endDrag);

  // Touch events
  handleEl.addEventListener('touchstart', (e) => { startDrag(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove', (e) => { if (isDragging) moveDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  document.addEventListener('touchend', endDrag);
}

function updateDragHandle(state) {
  const handle = $('#webcam-drag-handle');
  if (!handle) return;

  handle.style.left = '';
  handle.style.top = '';
  handle.style.right = '';
  handle.style.bottom = '';

  switch (state.position) {
    case 'top-left':
      handle.style.top = '16px'; handle.style.left = '16px'; break;
    case 'top-right':
      handle.style.top = '16px'; handle.style.right = '16px'; break;
    case 'bottom-left':
      handle.style.bottom = '16px'; handle.style.left = '16px'; break;
    case 'bottom-right':
    default:
      handle.style.bottom = '16px'; handle.style.right = '16px'; break;
  }
}
