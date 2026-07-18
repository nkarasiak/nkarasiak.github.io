import {
  SELECTORS,
  TERM_MIN_HEIGHT_PX,
  TERM_MAX_RATIO,
  TERM_RESIZE_HANDLE_PX,
  TERM_TOUCH_HANDLE_PX,
} from './config.js';

/* ── Section text extraction ─────────────────────────────────────────── */

function elemText(el) {
  let out = '';
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent;
    } else if (node.tagName === 'BR') {
      out += '\n';
    } else if (!node.classList?.contains('li-marker') && !node.classList?.contains('h2-rule')) {
      out += elemText(node);
    }
  }
  return out;
}

function sectionText(h2Id) {
  const start  = document.querySelector(`${SELECTORS.container} h2#${h2Id}`);
  if (!start) return null;

  const allH2s = Array.from(document.querySelectorAll(`${SELECTORS.container} h2`));
  const nextH2 = allH2s[allH2s.indexOf(start) + 1] ?? null;
  const parts  = [];

  let el = start.nextElementSibling;
  while (el && el !== nextH2) {
    if (el.tagName === 'DL') {
      const dts = el.querySelectorAll('dt');
      const dds = el.querySelectorAll('dd');
      dts.forEach((dt, i) => {
        parts.push(dt.textContent.trim().padEnd(12) + ': ' + (dds[i]?.textContent.trim() ?? ''));
      });
    } else {
      const txt = elemText(el).replace(/\n{2,}/g, '\n').trim();
      if (txt) {
        if (el.tagName === 'P' && el.firstElementChild?.tagName === 'STRONG' && parts.length > 0) {
          parts.push('');
        }
        parts.push(txt);
      }
    }
    el = el.nextElementSibling;
  }

  return parts.join('\n') || null;
}

/* ── DOM discovery helpers ───────────────────────────────────────────── */

/**
 * Build section map from rendered h2 elements.
 * File name = first segment of the h2 id (before '--') + '.txt'.
 * Example: id="projects--open-source" → file="projects.txt"
 */
function buildSectionMap() {
  const map = {};
  document.querySelectorAll(`${SELECTORS.container} h2`).forEach((h2) => {
    if (!h2.id) return;
    const file = h2.id.split('--')[0] + '.txt';
    map[file]  = h2.id;
  });
  return map;
}

/**
 * Derive a LINKS map from <a> elements in the contact section.
 * Key = first segment of the hostname (sans 'www.').
 * Example: https://github.com/nkarasiak → key "github"
 */
function buildLinks() {
  const contactH2 = document.querySelector(`${SELECTORS.container} h2#contact`);
  if (!contactH2) return {};

  const links = {};
  let el = contactH2.nextElementSibling;
  while (el && el.tagName !== 'H2') {
    const a = el.querySelector('a[href^="https://"]');
    if (a) {
      try {
        const key  = new URL(a.href).hostname.replace(/^www\./, '').split('.')[0];
        links[key] = a.href;
      } catch {}
    }
    el = el.nextElementSibling;
  }
  return links;
}

/** Read email from the contact section's mailto link. */
function getEmail() {
  const a = document.querySelector(`${SELECTORS.container} h2#contact ~ * a[href^="mailto:"]`);
  return a ? a.href.replace('mailto:', '') : null;
}

/* ── Terminal class ──────────────────────────────────────────────────── */

export class Terminal {
  constructor(config) {
    this.config  = config;
    this.el      = document.querySelector(SELECTORS.terminal);
    this.history = document.querySelector(SELECTORS.terminalHistory);
    this.input   = document.querySelector(SELECTORS.terminalInput);

    this.cmdHistory      = [];
    this.historyIdx      = -1;
    this.searchMode      = false;
    this.searchQuery     = '';
    this.searchMatchIdx  = 0;
    this.searchIndicator = null;

    /* Resolved once on construction so DOM reads happen once */
    this.sectionMap = buildSectionMap();
    this.links      = buildLinks();
    this.email      = getEmail();

    this.bindEvents();
    this.bindResizer();
  }

  /* ── Resizer ────────────────────────────────────────────────────────── */

  bindResizer() {
    let isResizing = false;

    const onMove = (e) => {
      if (!isResizing) return;
      const clientY = e.clientY ?? e.touches?.[0].clientY;
      const h       = window.innerHeight - clientY;
      if (h > TERM_MIN_HEIGHT_PX && h < window.innerHeight * TERM_MAX_RATIO) {
        this.el.style.setProperty('--term-height', `${h}px`);
      }
    };

    const onUp = () => {
      isResizing = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend',  onUp);
    };

    this.el.addEventListener('mousedown', (e) => {
      if (e.target === this.el && e.offsetY <= TERM_RESIZE_HANDLE_PX) {
        isResizing = true;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup',   onUp);
      }
    });

    this.el.addEventListener('touchstart', (e) => {
      const touchY = e.touches[0].clientY - this.el.getBoundingClientRect().top;
      if (touchY <= TERM_TOUCH_HANDLE_PX) {
        isResizing = true;
        document.addEventListener('touchmove', onMove);
        document.addEventListener('touchend',  onUp);
      }
    }, { passive: true });
  }

  /* ── Reverse search ─────────────────────────────────────────────────── */

  _exitSearch(keep) {
    this.searchMode = false;
    if (this.searchIndicator) { this.searchIndicator.remove(); this.searchIndicator = null; }
    if (!keep) this.input.value = '';
  }

  _runSearch() {
    const q = this.searchQuery;
    if (!q) {
      this.input.value = '';
    } else {
      let match = '';
      for (let i = this.searchMatchIdx - 1; i >= 0; i--) {
        if (this.cmdHistory[i].includes(q)) {
          match = this.cmdHistory[i];
          this.searchMatchIdx = i;
          break;
        }
      }
      this.input.value = match;
    }
    if (this.searchIndicator) {
      this.searchIndicator.textContent = `(reverse-i-search)\`${q}': ${this.input.value}`;
    }
  }

  /* ── Events ─────────────────────────────────────────────────────────── */

  bindEvents() {
    this.input.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault(); e.stopPropagation();
        this.close();
        return;
      }

      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault(); e.stopPropagation();
        if (!this.searchMode) {
          this.searchMode      = true;
          this.searchQuery     = '';
          this.searchMatchIdx  = this.cmdHistory.length;
          this.searchIndicator = document.createElement('div');
          this.searchIndicator.className = 'out';
          this.history.appendChild(this.searchIndicator);
          this.history.scrollTop = this.history.scrollHeight;
        } else if (this.searchMatchIdx > 0) {
          this.searchMatchIdx--;
        }
        this._runSearch();
        return;
      }

      if (this.searchMode) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this._exitSearch(false); return; }
        if (e.key === 'Enter')  {
          const cmd = this.input.value;
          this._exitSearch(false); e.stopPropagation();
          if (cmd) this.run(cmd);
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault(); e.stopPropagation();
          this.searchQuery    = this.searchQuery.slice(0, -1);
          this.searchMatchIdx = this.cmdHistory.length;
          this._runSearch();
          return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          e.preventDefault(); e.stopPropagation();
          this.searchQuery   += e.key;
          this.searchMatchIdx = this.cmdHistory.length;
          this._runSearch();
          return;
        }
        e.stopPropagation();
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        if (this.historyIdx < this.cmdHistory.length - 1) {
          this.historyIdx++;
          this.input.value = this.cmdHistory[this.cmdHistory.length - 1 - this.historyIdx];
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation();
        if (this.historyIdx > 0) {
          this.historyIdx--;
          this.input.value = this.cmdHistory[this.cmdHistory.length - 1 - this.historyIdx];
        } else { this.historyIdx = -1; this.input.value = ''; }
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        this._tabComplete();
        return;
      }

      if (e.key === 'Enter') {
        this.run(this.input.value);
        this.input.value = '';
        this.historyIdx  = -1;
        return;
      }

      if (e.key === 'Escape') { this.close(); return; }
      e.stopPropagation();
    });

    document.addEventListener('keydown', (e) => {
      const inInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);

      if (e.key === 'k' && (e.ctrlKey || e.metaKey) && !inInput) {
        e.preventDefault();
        this.isOpen() ? this.close() : this.open();
        return;
      }

      if (e.key === 'Escape' && !inInput && this.isOpen()) {
        e.preventDefault();
        this.close();
      }
    });
  }

  _tabComplete() {
    const val     = this.input.value;
    if (!val.trim()) return;

    const files       = Object.keys(this.sectionMap);
    const openTargets = Object.keys(this.links);
    const cmds        = ['cat', 'cd', 'clear', 'exit', 'git log', 'grep', 'hire me', 'history', 'ls', 'open', 'rm', 'whoami'];

    if (['cat ', 'rm '].some((c) => val.startsWith(c))) {
      const [cmd, partial] = [val.slice(0, val.indexOf(' ')), val.slice(val.indexOf(' ') + 1)];
      const match = files.find((f) => f.startsWith(partial));
      if (match) this.input.value = cmd + ' ' + match;
    } else if (val.startsWith('open ')) {
      const partial = val.slice(5);
      const match   = openTargets.find((t) => t.startsWith(partial));
      if (match) this.input.value = 'open ' + match;
    } else {
      const match = cmds.find((c) => c.startsWith(val));
      if (match) this.input.value = match;
    }
  }

  /* ── Lifecycle ──────────────────────────────────────────────────────── */

  isOpen() { return this.el.classList.contains('open'); }

  open() {
    this.el.classList.add('open');
    this.input.focus();
    if (!this.history.children.length) {
      this.print(this.config.title + ' — type help for commands', 'ok');
    }
    document.getElementById('tui-hint-badge')?.style.setProperty('display', 'none');
  }

  close() {
    this.el.classList.remove('open');
    this.input.blur();
    this.input.type = 'text';
    const badge = document.getElementById('tui-hint-badge');
    if (badge) badge.style.removeProperty('display');
  }

  print(text, cls) {
    const line       = document.createElement('div');
    line.className   = cls ?? 'out';
    line.textContent = text;
    this.history.appendChild(line);
    this.history.scrollTop = this.history.scrollHeight;
  }

  /* ── Command dispatcher ─────────────────────────────────────────────── */

  run(raw) {
    const input = raw.trim();
    if (!input) return;

    this.print(`${this.config.handle}@cv:~$ ${input}`, 'cmd');

    if (input !== 'clear' && input !== 'history') {
      this.cmdHistory.push(input);
      this.historyIdx = -1;
    }

    switch (input) {
      case 'hire me':
        setTimeout(() => {
          this.print(`Redirecting... ${this.email ?? 'n/a'}`, 'ok');
          if (this.email) window.location.href = `mailto:${this.email}`;
        }, 400);
        return;

      case 'clear':
        this.history.innerHTML = '';
        return;

      case 'exit':
        this.close();
        return;

      case 'history':
        this.print(
          this.cmdHistory.length
            ? this.cmdHistory.map((c, i) => `${String(i + 1).padStart(4)}  ${c}`).join('\n')
            : '(no commands in history)',
          'out'
        );
        return;
    }

    const parts = input.split(/\s+/);
    const cmd   = parts[0];
    const fn    = this._commands[input] ?? this._commands[cmd];

    const result = fn ? fn(parts) : `bash: ${cmd}: command not found  (try: help)`;
    if (result != null) this.print(result, fn ? 'out' : 'err');
  }

  /* ── Commands ───────────────────────────────────────────────────────── */

  get _commands() {
    const files   = Object.keys(this.sectionMap).join('  ');
    const targets = Object.keys(this.links).join(', ');

    return {
      help: () =>
        `Commands:\n  whoami            who is this person\n  ls                list files\n  cat <file>        read a file  (try: ls)\n  rm <file>         ...\n  grep <pattern>    search CV content\n  open <target>     open link  (${targets})\n  cd <dir>          navigate\n  history           command history\n  git log           career commits\n  hire me           initiate contact\n  clear             clear output\n  exit              close terminal\n\n  ↑↓ history  ·  ctrl+r reverse search  ·  tab autocomplete`,

      whoami: () => 'Senior Geospatial ML Engineer · Distributed Systems',

      ls: () => files,

      cat: (parts) => {
        const file  = parts[1];
        if (!file) return 'Usage: cat <file>  (try: ls)';
        const h2Id = this.sectionMap[file];
        if (!h2Id) return `cat: ${file}: No such file or directory`;
        return sectionText(h2Id) ?? `cat: ${file}: (empty)`;
      },

      rm: (parts) => {
        const arg = parts.slice(1).join(' ');
        if (!arg) return 'Usage: rm <file>';
        const allFiles = Object.keys(this.sectionMap);
        const pattern  = arg.replace(/\./g, '\\.').replace(/\*/g, '.*');
        const re       = new RegExp('^' + pattern + '$');
        const targets  = allFiles.filter((f) => re.test(f));
        const list     = targets.length ? targets.join(', ') : arg;
        return `rm: cannot remove '${list}': we don't remove knowledge`;
      },

      grep: (parts) => {
        const term = parts.slice(1).join(' ');
        if (!term) return 'Usage: grep <pattern>';
        const re      = new RegExp(term, 'i');
        const results = [];
        Object.values(this.sectionMap).forEach((id) => {
          const text = sectionText(id);
          if (text) text.split('\n').forEach((l) => { if (re.test(l) && l.trim()) results.push(l.trim()); });
        });
        return results.length ? results.join('\n') : `grep: no matches for '${term}'`;
      },

      open: (parts) => {
        const target = parts.slice(1).join(' ').toLowerCase();
        if (!target) return `Usage: open <target>  (try: ${targets})`;
        const url = this.links[target]
          ?? (target.match(/^[\w.-]+\.\w{2,}/) ? 'https://' + target : null);
        if (!url) return `open: '${target}': unknown  (try: ${targets})`;
        setTimeout(() => window.open(url, '_blank'), 200);
        return `opening ${url}`;
      },

      cd: (parts) => {
        const dir = parts[1];
        if (!dir || dir === '~' || dir === '.') return null;
        return `cd: ${dir}: you can't navigate away from nicolas/`;
      },

      'git log': () =>
        'b4e9f1c (HEAD → main) feat: fine-tune GFMs (Tessera, Prithvi, Clay) for crop classification\ne2a3d07 feat: internal AI tooling — prompt engineering & slash-command integrations\na7f3c2d perf: geospatial platform — tens of millions of parcels, zonal stats > SOTA\n3b9e1a0 perf: ARM64 Graviton migration → -40% compute cost\nf2d8c45 feat: QGIS MCP Plugin — 50+ GitHub stars in first month\nc1a09e3 feat: EarthDaily Python SDK — sole designer/maintainer\n4c2f890 (tag: phd-v1.0) init: doctoral research, Dynafor/INRA',
    };
  }
}
