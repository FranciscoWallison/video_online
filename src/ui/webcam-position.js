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

  handleEl.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = handleEl.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    handleEl.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const containerRect = containerEl.getBoundingClientRect();
    let x = e.clientX - containerRect.left - offsetX;
    let y = e.clientY - containerRect.top - offsetY;

    // Clamp within container
    x = Math.max(0, Math.min(x, containerRect.width - handleEl.offsetWidth));
    y = Math.max(0, Math.min(y, containerRect.height - handleEl.offsetHeight));

    handleEl.style.left = x + 'px';
    handleEl.style.top = y + 'px';
    handleEl.style.right = 'auto';
    handleEl.style.bottom = 'auto';

    // Update state as percentages
    positionState.x = x / containerRect.width;
    positionState.y = y / containerRect.height;
    positionState.position = 'custom';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    handleEl.style.cursor = 'grab';
  });
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
