import { COPY_TOAST_MS, SELECTORS } from './config.js';

export function initClipboard() {
  if (!navigator.clipboard) return;

  document.querySelectorAll(SELECTORS.mailtoTelLinks).forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const raw   = link.getAttribute('href');
      const value = raw.replace(/^(mailto:|tel:)/, '');

      navigator.clipboard.writeText(value).then(() => {
        const originalText = link.textContent;
        const width        = link.offsetWidth;

        link.style.cssText = `display:inline-block;min-width:${width}px`;
        link.classList.add('copy-toast');
        link.textContent = '[copied ✓]';

        setTimeout(() => {
          link.textContent = originalText;
          link.classList.remove('copy-toast');
          link.style.cssText = '';
        }, COPY_TOAST_MS);
      });
    });
  });
}
