import {
  CHARS_PER_FRAME,
  SAFETY_TIMEOUT_MS,
  CURSOR_CHAR,
  VISIBILITY_THRESHOLD,
} from './config.js';

export class Typewriter {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) return;

    this.entries       = [];
    this.nodeIndex     = 0;
    this.charIndex     = 0;
    this.isRunning     = false;
    this.blockStates   = new Map();
    this.cursor        = null;
    this.safetyTimer   = null;
    this.revealedBlocks = new Set();
  }

  start() {
    this.container.style.visibility = 'visible';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.revealAll();
      return;
    }

    this.collectTextNodes();
    if (!this.entries.length) return;

    this.cursor = document.createElement('span');
    this.cursor.className  = 'tui-cursor';
    this.cursor.textContent = CURSOR_CHAR;
    this.container.appendChild(this.cursor);

    this.initBlockStates();
    this.isRunning  = true;
    this.safetyTimer = setTimeout(() => this.safetyReveal(), SAFETY_TIMEOUT_MS);

    requestAnimationFrame(() => this.tick());
  }

  collectTextNodes() {
    const walker = document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while ((node = walker.nextNode())) {
      if (this.shouldSkipNode(node)) continue;
      if (!node.textContent.trim()) continue;

      const block = this.findBlock(node);
      this.entries.push({ node, full: node.textContent, block });
      node.textContent = '';
    }
  }

  shouldSkipNode(node) {
    let el = node.parentNode;
    while (el && el !== this.container) {
      if (el.tagName === 'PRE') return true;
      if (el.classList?.contains('print-header')) return true;
      if (el.classList?.contains('li-marker'))   return true;
      if (el.classList?.contains('h2-rule'))      return true;
      el = el.parentNode;
    }
    return false;
  }

  findBlock(node) {
    let el = node.parentElement;
    while (el && el !== this.container) {
      if (el.tagName === 'P' && el.parentElement?.tagName === 'LI') {
        return el.parentElement;
      }
      if (/^(P|LI|H[1-6]|DT|DD)$/.test(el.tagName)) return el;
      el = el.parentElement;
    }
    return this.container;
  }

  /*
   * A block is considered fully in-view when its entire bounding box fits
   * inside the viewport. For blocks taller than the viewport we fall back
   * to requiring at least VISIBILITY_THRESHOLD fraction.
   */
  isFullyVisible(block) {
    const rect = block.getBoundingClientRect();
    const vh   = window.innerHeight;
    if (rect.height > vh) {
      const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
      return visible / rect.height >= VISIBILITY_THRESHOLD;
    }
    return rect.top >= 0 && rect.bottom <= vh;
  }

  computeBlockState(block) {
    const rect = block.getBoundingClientRect();
    if (rect.bottom <= 0)              return 'above';
    if (rect.top >= window.innerHeight) return 'below';
    return this.isFullyVisible(block) ? 'in' : 'below';
  }

  initBlockStates() {
    const uniqueBlocks = new Set(this.entries.map((e) => e.block));

    if (!window.IntersectionObserver) {
      uniqueBlocks.forEach((block) => this.blockStates.set(block, 'in'));
      return;
    }

    uniqueBlocks.forEach((block) => {
      this.blockStates.set(block, this.computeBlockState(block));
      block.classList.add('typewriter-pending');
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          this.blockStates.set(entry.target, this.computeBlockState(entry.target));
        });
      },
      { threshold: 0 }
    );

    uniqueBlocks.forEach((block) => observer.observe(block));
  }

  revealBlock(block) {
    this.markBlockStarted(block);
    while (
      this.nodeIndex < this.entries.length &&
      this.entries[this.nodeIndex].block === block
    ) {
      this.entries[this.nodeIndex].node.textContent = this.entries[this.nodeIndex].full;
      this.nodeIndex++;
    }
    this.charIndex = 0;
  }

  markBlockStarted(block) {
    if (this.revealedBlocks.has(block)) return;
    this.revealedBlocks.add(block);
    block.classList.remove('typewriter-pending');
    block.classList.add('typewriter-active');
  }

  tick() {
    if (!this.isRunning) return;

    for (let k = 0; k < CHARS_PER_FRAME; k++) {
      if (this.nodeIndex >= this.entries.length) {
        this.finish();
        return;
      }

      const current = this.entries[this.nodeIndex];
      const state   = this.blockStates.get(current.block);

      /* Already scrolled past: reveal instantly */
      if (state === 'above') {
        this.revealBlock(current.block);
        continue;
      }

      /* Keep cursor with the node being typed */
      if (current.node.nextSibling !== this.cursor) {
        current.node.parentNode.insertBefore(this.cursor, current.node.nextSibling);
      }

      this.markBlockStarted(current.block);
      this.charIndex++;
      current.node.textContent = current.full.substring(0, this.charIndex);

      if (this.charIndex >= current.full.length) {
        this.nodeIndex++;
        this.charIndex = 0;
      }
    }

    requestAnimationFrame(() => this.tick());
  }

  safetyReveal() {
    if (this.nodeIndex === 0 && this.charIndex === 0) {
      this.revealAll();
    }
  }

  revealAll() {
    clearTimeout(this.safetyTimer);
    this.container.style.visibility = 'visible';
    this.entries.forEach((e) => {
      this.markBlockStarted(e.block);
      e.node.textContent = e.full;
    });
    if (this.cursor?.parentNode) {
      this.cursor.parentNode.removeChild(this.cursor);
    }
    this.isRunning = false;
  }

  finish() {
    clearTimeout(this.safetyTimer);
    if (this.cursor?.parentNode) {
      this.cursor.parentNode.removeChild(this.cursor);
    }
    this.isRunning = false;
  }
}
