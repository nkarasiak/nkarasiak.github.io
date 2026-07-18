import { SELECTORS }       from './config.js';
import { Typewriter }      from './typewriter.js';
import { Terminal }        from './terminal.js';
import { initClipboard }  from './clipboard.js';
import { initPrint }      from './print.js';

function injectListMarkers(container) {
  container.querySelectorAll(SELECTORS.listItem).forEach((li) => {
    const marker = document.createElement('span');
    marker.className = 'li-marker';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = '[*]';
    li.insertBefore(marker, li.firstChild);
  });
}

function injectHeadingRules(container) {
  container.querySelectorAll(SELECTORS.heading2).forEach((h2) => {
    h2.setAttribute('tabindex', '0');
    const rule = document.createElement('span');
    rule.className = 'h2-rule';
    rule.setAttribute('aria-hidden', 'true');
    rule.textContent = '─'.repeat(60);
    h2.appendChild(rule);
  });
}

let typewriterRef = null;

// Register before initPrint's beforeprint so revealAll() fires first,
// ensuring text nodes are populated when the print handler reads the DOM.
window.addEventListener('beforeprint', () => typewriterRef?.revealAll());

function init() {
  const container = document.querySelector(SELECTORS.container);
  if (!container) return;

  const config = JSON.parse(container.dataset.cv);

  injectListMarkers(container);
  injectHeadingRules(container);
  initClipboard();
  initPrint();

  new Terminal(config);

  typewriterRef = new Typewriter(SELECTORS.container);
  typewriterRef.start();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
