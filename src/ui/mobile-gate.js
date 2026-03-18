import { $, $$ } from '../utils/dom.js';
import { showToast } from './toast.js';

export function showMobileMessage(installPrompt) {
  // Hide all views
  for (const view of $$('.view')) {
    view.classList.add('hidden');
  }

  const appMain = $('.app-main');
  const gate = document.createElement('div');
  gate.className = 'mobile-gate';

  const appUrl = window.location.href;

  gate.innerHTML = `
    <div class="mobile-gate-icon">
      <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    </div>

    <h2>Este app funciona no desktop</h2>

    <p class="mg-subtitle">
      A gravação de tela requer um navegador desktop (Chrome, Edge ou Firefox).
      Navegadores mobile não suportam captura de tela.
    </p>

    <div class="mg-features">
      <h3>Funcionalidades</h3>
      <ul>
        <li>Gravação de tela inteira, janela ou região</li>
        <li>Overlay de webcam arrastável</li>
        <li>Áudio do sistema e microfone</li>
        <li>Contagem regressiva antes de gravar</li>
        <li>Download instantâneo em WebM</li>
        <li>100% grátis, sem cadastro</li>
      </ul>
    </div>

    <p class="mg-browsers">
      Compatível com Chrome 72+, Edge 79+, Firefox 66+
    </p>

    <div class="mg-actions">
      ${navigator.share ? `
        <button class="mg-btn-share" id="mg-share">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Compartilhar Link
        </button>
      ` : ''}
      <button class="mg-btn-copy" id="mg-copy">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        Copiar Link
      </button>
    </div>
  `;

  appMain.appendChild(gate);

  // Share button
  const shareBtn = gate.querySelector('#mg-share');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      try {
        await navigator.share({
          title: 'ScreenRec - Gravador de Tela Online',
          text: 'Grave sua tela direto no navegador. Grátis, sem download.',
          url: appUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          showToast('Erro ao compartilhar', 'error');
        }
      }
    });
  }

  // Copy button
  gate.querySelector('#mg-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      showToast('Link copiado!', 'success');
      gate.querySelector('#mg-copy').textContent = 'Copiado!';
      setTimeout(() => {
        const btn = gate.querySelector('#mg-copy');
        if (btn) btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          Copiar Link`;
      }, 2000);
    } catch {
      showToast('Erro ao copiar', 'error');
    }
  });

  // PWA install button (if prompt available)
  if (installPrompt) {
    const installBtn = document.createElement('button');
    installBtn.className = 'mg-btn-install';
    installBtn.id = 'mg-install';
    installBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Instalar App`;
    gate.querySelector('.mg-actions').appendChild(installBtn);

    installBtn.addEventListener('click', async () => {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === 'accepted') {
        showToast('App instalado!', 'success');
        installBtn.remove();
      }
    });
  }
}
