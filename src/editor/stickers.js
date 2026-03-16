import { $, createElement } from '../utils/dom.js';

// Built-in sticker SVGs (no external files needed)
const STICKERS = [
  { id: 'arrow-right', label: 'Seta', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>' },
  { id: 'circle', label: 'Círculo', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>' },
  { id: 'star', label: 'Estrela', svg: '<svg viewBox="0 0 24 24" fill="#FFD700"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01z"/></svg>' },
  { id: 'heart', label: 'Coração', svg: '<svg viewBox="0 0 24 24" fill="#FF6B6B"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/></svg>' },
  { id: 'check', label: 'Check', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#2ECC71" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' },
  { id: 'x-mark', label: 'X', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#E74C3C" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' },
  { id: 'thumbs-up', label: 'Like', svg: '<svg viewBox="0 0 24 24" fill="#3498DB"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>' },
  { id: 'alert', label: 'Alerta', svg: '<svg viewBox="0 0 24 24" fill="#F39C12"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13" stroke="#fff" stroke-width="2"/><circle cx="12" cy="17" r="1" fill="#fff"/></svg>' },
  { id: 'cursor-click', label: 'Click', svg: '<svg viewBox="0 0 24 24" fill="#9B59B6"><path d="M4 4l7.07 17 2.51-7.39L21 11.07z"/></svg>' },
  { id: 'zap', label: 'Raio', svg: '<svg viewBox="0 0 24 24" fill="#F1C40F"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' },
  { id: 'number-1', label: '1', svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#E74C3C"/><text x="12" y="17" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">1</text></svg>' },
  { id: 'number-2', label: '2', svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#3498DB"/><text x="12" y="17" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">2</text></svg>' },
  { id: 'number-3', label: '3', svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#2ECC71"/><text x="12" y="17" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">3</text></svg>' },
  { id: 'highlight', label: 'Destaque', svg: '<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="4" stroke="#FFD700" stroke-width="3" stroke-dasharray="6 3"/></svg>' },
  { id: 'blur-box', label: 'Caixa', svg: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2" fill="rgba(0,0,0,0.6)"/></svg>' },
  { id: 'emoji-fire', label: 'Fogo', svg: '<svg viewBox="0 0 24 24" fill="#FF6B35"><path d="M12 23c-4.97 0-8-3.03-8-7 0-3 1.5-5.5 3-7.5.5 2 2 3 2 3s-.5-3 1-5.5c1.5-2.5 3.5-3.5 3.5-3.5s-1 2 0 4c1 2 2.5 2 2.5 2s-.5-2.5 1-4c.5 2.5 1 4 1 6.5 1.5-1.5 1-3 1-3s2 2.5 2 5.5c0 3.97-3.03 7-9 7z"/></svg>' },
];

const placedStickers = [];

export function setupStickers() {
  const list = $('#sticker-list');
  const canvas = $('#sticker-canvas');

  // Render sticker palette
  list.innerHTML = '';
  for (const sticker of STICKERS) {
    const btn = createElement('button', { className: 'sticker-thumb', title: sticker.label });
    btn.innerHTML = sticker.svg;
    btn.addEventListener('click', () => addStickerToCanvas(sticker, canvas));
    list.appendChild(btn);
  }

  return { getStickers: () => [...placedStickers] };
}

function addStickerToCanvas(sticker, canvas) {
  const item = createElement('div', {
    className: 'sticker-item',
    style: {
      width: '60px',
      height: '60px',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    },
  });

  item.innerHTML = sticker.svg;

  // Delete button
  const delBtn = createElement('button', { className: 'sticker-delete' }, ['x']);
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    item.remove();
    const idx = placedStickers.findIndex(s => s.element === item);
    if (idx >= 0) placedStickers.splice(idx, 1);
  });
  item.appendChild(delBtn);

  // Make draggable
  makeDraggable(item, canvas);

  // Make resizable with scroll
  item.addEventListener('wheel', (e) => {
    e.preventDefault();
    const currentW = item.offsetWidth;
    const delta = e.deltaY > 0 ? -5 : 5;
    const newSize = Math.max(30, Math.min(200, currentW + delta));
    item.style.width = newSize + 'px';
    item.style.height = newSize + 'px';
  });

  canvas.appendChild(item);

  placedStickers.push({
    id: sticker.id,
    svg: sticker.svg,
    element: item,
  });
}

function makeDraggable(el, container) {
  let isDragging = false;
  let offsetX, offsetY;

  el.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('sticker-delete')) return;
    isDragging = true;
    const rect = el.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    el.style.transform = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const containerRect = container.getBoundingClientRect();
    let x = e.clientX - containerRect.left - offsetX;
    let y = e.clientY - containerRect.top - offsetY;
    x = Math.max(0, Math.min(x, containerRect.width - el.offsetWidth));
    y = Math.max(0, Math.min(y, containerRect.height - el.offsetHeight));
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

export function getStickersData(videoWrapper) {
  const wrapperRect = videoWrapper.getBoundingClientRect();
  return placedStickers.map(s => {
    const rect = s.element.getBoundingClientRect();
    return {
      id: s.id,
      svg: s.svg,
      x: (rect.left - wrapperRect.left) / wrapperRect.width,
      y: (rect.top - wrapperRect.top) / wrapperRect.height,
      w: rect.width / wrapperRect.width,
      h: rect.height / wrapperRect.height,
    };
  });
}
