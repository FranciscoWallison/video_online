import { $, $$ } from '../utils/dom.js';

const views = ['setup', 'recording', 'editor'];

export function switchView(name) {
  if (!views.includes(name)) return;
  for (const view of $$('.view')) {
    view.classList.remove('active');
  }
  $(`#view-${name}`).classList.add('active');
}
