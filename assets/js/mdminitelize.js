(function (global) {
  function mdMinitelize(options) {
    var opts = options || {};
    var container = document.querySelector(opts.containerSelector || '.container');
    if (!container) return;

    setupCopyActions(container);
    decorateListMarkers(container);
    decorateSectionRules(container, opts.ruleLength || 60);

    container.style.visibility = 'visible';

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      runTypewriter(container, opts.charsPerFrame || 10);
    }

    createTerminal(opts.terminal || {});
  }

  function setupCopyActions(container) {
    if (!navigator.clipboard) return;

    container.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]').forEach(function (a) {
      if (a.dataset.mdmCopyBound === '1') return;
      a.dataset.mdmCopyBound = '1';

      a.addEventListener('click', function (e) {
        e.preventDefault();
        var value = a.getAttribute('href').replace(/^(mailto:|tel:)/, '');
        navigator.clipboard.writeText(value).then(function () {
          var original = a.textContent;
          var width = a.offsetWidth;
          a.style.display = 'inline-block';
          a.style.minWidth = width + 'px';
          a.classList.add('copy-toast');
          a.textContent = '[copied ✓]';
          setTimeout(function () {
            a.textContent = original;
            a.classList.remove('copy-toast');
            a.style.minWidth = '';
          }, 1200);
        }).catch(function () {
          window.location.href = a.getAttribute('href');
        });
      });
    });
  }

  function decorateListMarkers(container) {
    container.querySelectorAll('li').forEach(function (li) {
      if (li.querySelector(':scope > .li-marker')) return;
      var marker = document.createElement('span');
      marker.className = 'li-marker';
      marker.appendChild(document.createTextNode('[*]'));
      li.insertBefore(marker, li.firstChild);
    });
  }

  function decorateSectionRules(container, ruleLength) {
    container.querySelectorAll('h2').forEach(function (h2) {
      h2.setAttribute('tabindex', '0');
      if (h2.querySelector(':scope > .h2-rule')) return;
      var rule = document.createElement('span');
      rule.className = 'h2-rule';
      rule.appendChild(document.createTextNode('─'.repeat(ruleLength)));
      h2.appendChild(rule);
    });
  }

  function runTypewriter(container, charsPerFrame) {
    if (container.dataset.mdmTyped === '1') return;
    container.dataset.mdmTyped = '1';

    var nodes = [];
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    var node;

    while ((node = walker.nextNode())) {
      var skip = false;
      var p = node.parentNode;
      while (p && p !== container) {
        if (p.tagName === 'PRE' || (p.classList && p.classList.contains('print-header'))) {
          skip = true;
          break;
        }
        p = p.parentNode;
      }
      if (!skip && node.textContent.trim()) {
        nodes.push({ node: node, full: node.textContent });
        node.textContent = '';
      }
    }

    if (!nodes.length) return;

    var cursor = document.createElement('span');
    cursor.className = 'tui-cursor';
    cursor.textContent = '█';
    container.appendChild(cursor);

    var ni = 0, ci = 0;

    function tick() {
      for (var k = 0; k < charsPerFrame; k++) {
        if (ni >= nodes.length) return;

        var cur = nodes[ni];
        if (cur.node.nextSibling !== cursor) {
          cur.node.parentNode.insertBefore(cursor, cur.node.nextSibling);
        }
        cur.node.textContent = cur.full.substring(0, ci + 1);
        ci++;
        if (ci >= cur.full.length) { ni++; ci = 0; }
      }
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function createTerminal(options) {
    var term = document.getElementById(options.terminalId || 'tui-term');
    var hist = document.getElementById(options.historyId || 'tui-hist');
    var inp = document.getElementById(options.inputId || 'tui-input');
    if (!term || !hist || !inp || term.dataset.mdmBound === '1') return;
    term.dataset.mdmBound = '1';

    var sudoMode = false;

    function termPrint(text, cls) {
      var line = document.createElement('div');
      line.className = cls || 'out';
      line.textContent = text;
      hist.appendChild(line);
      hist.scrollTop = hist.scrollHeight;
    }

    var CMDS = {
      help: function () {
        return [
          'Commands:',
          '  whoami         who is this person',
          '  ls             list CV sections',
          '  cat cv.txt     quick summary',
          '  uname -a       system info',
          '  git log        career commits',
          '  ping <host>    network test',
          '  sudo hire me   initiate contact',
          '  clear          clear output',
          '  exit           close terminal'
        ].join('\n');
      },
      whoami: function () { return 'nicolas_karasiak'; },
      ls: function () { return 'EXPERIENCE/  EDUCATION/  PROJECTS/  SKILLS/  CONTACT/'; },
      'cat cv.txt': function () {
        return [
          'Staff Data & ML Engineer — Geospatial Platforms',
          '─────────────────────────────────────────────────',
          'EarthDaily  2022-now  · data platform, 20M parcels, -40% cost',
          'Pixstart     2020-22  · satellite change detection pipelines',
          'PhD INRA     2016-19  · remote sensing time series',
          '─────────────────────────────────────────────────',
          '600+ citations  ·  200k+ plugin downloads  ·  Python, Rust, SQL'
        ].join('\n');
      },
      'uname -a': function () {
        return 'NicolasOS 8.4.0-geospatial #1 SMP Coffee-powered Python3.12 x86_64';
      },
      'git log': function () {
        return [
          'a7f3c2d (HEAD → main) perf: 20M parcels, 5-day refresh, ~100× cheaper',
          '3b9e1a0 perf: ARM64 Graviton migration → -40% compute cost',
          'f2d8c45 feat: QGIS MCP Plugin — 50+ GitHub stars in first month',
          'c1a09e3 feat: EarthDaily Python SDK — sole designer/maintainer',
          '9a1e7b3 docs: publish 3 peer-reviewed papers on remote sensing',
          '4c2f890 (tag: phd-v1.0) init: doctoral research, Dynafor/INRA'
        ].join('\n');
      },
      ping: function (args) {
        var host = args[1] || 'karasiak.nicolas@gmail.com';
        return [
          'PING ' + host + ' 56 bytes of data.',
          '64 bytes from ' + host + ': icmp_seq=0 ttl=64 time=12ms',
          '64 bytes from ' + host + ': icmp_seq=1 ttl=64 time=9ms',
          '64 bytes from ' + host + ': icmp_seq=2 ttl=64 time=11ms',
          '^C',
          '3 packets transmitted, 3 received, 0% packet loss'
        ].join('\n');
      },
      clear: function () { hist.innerHTML = ''; return null; },
      exit: function () { closeTerm(); return null; }
    };

    function runCmd(raw) {
      var input = raw.trim();
      if (!input) return;

      if (sudoMode) {
        sudoMode = false;
        termPrint('[sudo] password: ' + '*'.repeat(input.length), 'cmd');
        setTimeout(function () {
          termPrint('Access granted.', 'ok');
          setTimeout(function () {
            termPrint('Redirecting... karasiak.nicolas@gmail.com', 'ok');
            window.location.href = 'mailto:karasiak.nicolas@gmail.com';
          }, 600);
        }, 900);
        return;
      }

      termPrint('nicolas@cv:~$ ' + input, 'cmd');

      if (input === 'sudo hire me') {
        sudoMode = true;
        setTimeout(function () {
          termPrint('[sudo] password for recruiter: ', 'out');
          inp.type = 'password';
        }, 200);
        return;
      }

      inp.type = 'text';
      var parts = input.split(/\s+/);
      var cmd = parts[0];
      var fn = CMDS[input] || CMDS[cmd];
      var result = fn ? fn(parts) : 'bash: ' + cmd + ': command not found  (try: help)';

      if (result !== null && result !== undefined) {
        termPrint(result, fn ? 'out' : 'err');
      }
    }

    function openTerm() {
      term.classList.add('open');
      inp.focus();
      if (!hist.children.length) termPrint('nicolas@cv terminal — type help for commands', 'ok');
    }

    function closeTerm() {
      term.classList.remove('open');
      inp.blur();
      sudoMode = false;
      inp.type = 'text';
    }

    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { runCmd(inp.value); inp.value = ''; }
      if (e.key === 'Escape') { closeTerm(); }
      e.stopPropagation();
    });

    document.addEventListener('keydown', function (e) {
      var tag = document.activeElement && document.activeElement.tagName;
      var inInput = tag === 'INPUT' || tag === 'TEXTAREA';

      if (e.key === 'k' && (e.ctrlKey || e.metaKey) && !inInput) {
        e.preventDefault();
        term.classList.contains('open') ? closeTerm() : openTerm();
        return;
      }

      if (e.key === 'Escape' && !inInput && term.classList.contains('open')) {
        e.preventDefault();
        closeTerm();
      }
    });
  }

  global.MdMinitelize = { init: mdMinitelize };
})(window);
