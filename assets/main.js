(function () {
  'use strict';

  const PROMPT = { user: 'nkarasiak', host: 'earth', path: '~/cv' };

  // section heading (lowercased) -> shell command rendered above it
  const SECTION_CMDS = {
    'who i am':                'whoami',
    'impact (read this first)':'cat ~/impact.txt',
    'impact':                  'cat ~/impact.txt',
    'what i build':            'ls -la ~/build/',
    'current':                 'cat experience/now.md',
    'before':                  'cat experience/history.md',
    'open source (proof)':     'ls -la ~/oss/ | grep -v draft',
    'open source':             'ls -la ~/oss/',
    'skills':                  'cat skills.json',
    'how i think':             'cat ~/.principles',
    'contact':                 'cat ~/.contact',
  };

  function escape(s) {
    return s.replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function promptHTML(cmd) {
    const tokens = cmd.split(' ');
    const exe = tokens.shift();
    const argsHTML = tokens.map(t =>
      t.startsWith('-') ? `<span class="flag">${escape(t)}</span>`
                        : `<span class="args">${escape(t)}</span>`
    ).join(' ');
    return (
      `<span class="user">${PROMPT.user}</span>` +
      `<span class="at">@</span>` +
      `<span class="host">${PROMPT.host}</span>` +
      `<span class="colon">:</span>` +
      `<span class="path">${PROMPT.path}</span>` +
      `<span class="dollar">$</span>` +
      `<span class="exe">${escape(exe)}</span>` +
      (argsHTML ? ' ' + argsHTML : '')
    );
  }

  function tagSections() {
    const headings = document.querySelectorAll('.cv-content h2');
    headings.forEach(h => {
      const key = h.textContent.trim().toLowerCase();
      const cmd = SECTION_CMDS[key] || `cat ${key.replace(/[^a-z0-9]+/g, '_')}.md`;
      const div = document.createElement('div');
      div.className = 'cmd';
      div.innerHTML = promptHTML(cmd);
      h.parentNode.insertBefore(div, h);
    });
  }

  // ─── theme ──────────────────────────────────────────────────
  const THEMES = ['gruvbox', 'tokyonight', 'catppuccin', 'phosphor'];

  function applyTheme(name) {
    if (!THEMES.includes(name)) name = 'gruvbox';
    document.documentElement.className = 'theme-' + name;
    try { localStorage.setItem('cv.theme', name); } catch (e) {}
  }

  function buildSwitcher() {
    const label = document.createElement('div');
    label.className = 'theme-switcher-label';
    label.textContent = ':colorscheme';

    const sel = document.createElement('select');
    sel.className = 'theme-switcher';
    sel.setAttribute('aria-label', 'color scheme');
    THEMES.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      sel.appendChild(opt);
    });
    let cur = 'gruvbox';
    try { cur = localStorage.getItem('cv.theme') || 'gruvbox'; } catch (e) {}
    if (!THEMES.includes(cur)) cur = 'gruvbox';
    sel.value = cur;
    sel.addEventListener('change', e => applyTheme(e.target.value));

    document.body.appendChild(label);
    document.body.appendChild(sel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { tagSections(); buildSwitcher(); });
  } else {
    tagSections(); buildSwitcher();
  }
})();
