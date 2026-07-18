/**
 * Print handler: reconstructs a two-column header for A4 output
 * and hides the intro/contact sections (already rendered in header).
 *
 * Must be initialised after the typewriter's beforeprint listener so
 * revealAll() runs first and text nodes are populated before DOM reads.
 */
export function initPrint() {
  let _termEl         = null;
  let _printHeaderEl  = null;
  let _printHiddenEls = [];

  // Mark gap elements in intro (bare <br> or empty <p>) for screen hiding
  // and detection in beforeprint for extra spacing in the print header.
  const container = document.querySelector('.container');
  if (!container) return;

  for (const el of container.children) {
    if (el.tagName === 'H2') break;
    if (el.tagName === 'BR' || (el.tagName === 'P' && !el.textContent.trim())) {
      el.classList.add('intro-gap');
    }
  }

  window.addEventListener('beforeprint', () => {
    // Resolve all relative hrefs to absolute for print (PDF links work correctly)
    document.querySelectorAll('a[href]').forEach((a) => a.setAttribute('href', a.href));

    _termEl = document.getElementById('tui-term');
    if (_termEl) _termEl.remove();

    // Collect intro elements before first h2 (excluding h1.cv-name)
    const introEls = [];
    for (const el of container.children) {
      if (el.tagName === 'H2') break;
      if (!el.classList.contains('cv-name')) introEls.push(el);
    }

    // Collect contact h2 + all following siblings
    const contactH2      = container.querySelector('h2#contact');
    const contactSiblings = [];
    if (contactH2) {
      let el = contactH2;
      while (el) { contactSiblings.push(el); el = el.nextElementSibling; }
    }

    _printHiddenEls = [...introEls, ...contactSiblings];
    _printHiddenEls.forEach((el) => el.classList.add('print-hide'));

    // Extract name and intro content from DOM
    const name     = document.querySelector('.cv-name')?.textContent.trim() || '';
    const firstP   = introEls.find((el) => el.tagName === 'P');
    const roleHTML = firstP?.innerHTML || '';

    const summaryParas = [];
    let gapBefore = false;
    let pastRole  = false;
    for (const el of introEls) {
      if (el === firstP) { pastRole = true; continue; }
      if (!pastRole) continue;
      if (el.classList.contains('intro-gap')) { gapBefore = true; continue; }
      if (el.tagName === 'P') {
        const text = el.innerHTML.trim();
        if (text) { summaryParas.push({ text, gapBefore }); gapBefore = false; }
      }
    }

    const contactLinks = [];
    if (contactH2) {
      let el = contactH2.nextElementSibling;
      while (el) {
        const a = el.querySelector('a');
        if (a) contactLinks.push({ text: a.textContent.trim(), href: a.href });
        el = el.nextElementSibling;
      }
    }

    // Build print header
    const header  = document.createElement('header');
    header.className = 'print-header';

    const infoDiv = document.createElement('div');
    const h1      = document.createElement('h1');
    h1.textContent = name;
    infoDiv.appendChild(h1);

    if (roleHTML) {
      const p     = document.createElement('p');
      p.className = 'role';
      p.innerHTML = roleHTML;
      infoDiv.appendChild(p);
    }

    summaryParas.forEach(({ text, gapBefore }) => {
      const p     = document.createElement('p');
      p.className = 'summary' + (gapBefore ? ' summary-gap' : '');
      p.innerHTML = text;
      infoDiv.appendChild(p);
    });

    header.appendChild(infoDiv);

    if (contactLinks.length) {
      const div = document.createElement('div');
      div.className = 'contact';
      contactLinks.forEach(({ text, href }) => {
        const a   = document.createElement('a');
        a.textContent = text;
        a.href        = href;
        div.appendChild(a);
      });
      header.appendChild(div);
    }

    container.insertBefore(header, container.firstChild);
    _printHeaderEl = header;
  });

  window.addEventListener('afterprint', () => {
    if (_termEl)        { document.body.appendChild(_termEl); _termEl = null; }
    if (_printHeaderEl) { _printHeaderEl.remove(); _printHeaderEl = null; }
    _printHiddenEls.forEach((el) => el.classList.remove('print-hide'));
    _printHiddenEls = [];
  });
}
