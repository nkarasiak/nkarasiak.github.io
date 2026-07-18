# CLAUDE.md

Guidance for Claude Code working in this repo.

## Project

Personal CV site for Nicolas Karasiak. Jekyll static site, GitHub Pages, served at `/cv` (`baseurl` in `_config.yaml`).

## Commands

```bash
bundle install                  # install gems (first time)
bundle exec jekyll serve        # local dev server, live reload at http://localhost:4000/cv/
bundle exec jekyll build        # one-shot build into _site/
bundle exec jekyll clean        # remove _site/ and .jekyll-cache/
```

No tests. No linter. `_site/` is build output.

## Architecture

Single source of CV content: **`README.md`**.

- `index.md` — frontmatter sets `layout: cv`, body is `{% include_relative README.md %}`. README.md is also the GitHub repo landing page.
- `_layouts/cv.html` — clean HTML shell linking external assets. No inline CSS/JS.
- `_config.yaml` — `theme: null`, kramdown + GFM. `README.md` is not excluded (needed for `include_relative`).
- `assets/` — favicons, `cv.css`, and `cv.js`.

When updating CV text, edit **`README.md` only**. The site picks it up on next build.

## Layout internals (`_layouts/cv.html`)

- **CSS variables:** `--bg: #0c0c0c`, `--fg: #a0a0a0`, `--fg-bright: #d0d0d0`, `--fg-dim: #888888`, `--accent: #ffffff`.
- **Monospace font stack** (`ui-monospace`, SF Mono, Cascadia Mono, JetBrains Mono, Consolas, …).
- **`.container`** — `max-width: 680px`, centered, vertical padding.
- **Typography:** `<h1>` white, `<h2>` light grey with JS-injected `─` rule, `<strong>` light grey, `<em>` dim grey (job dates), `<a>` underlined via `border-bottom`.
- **Bullets:** `<ul>` is unstyled. JS injects `<span class="li-marker">[*]</span>` into each `<li>` so the typewriter can "type" the markers.
- **Scanline overlay** via `body::before`.
- **Typewriter effect:** JS progressively reveals all text nodes inside `.container` (skipping `<pre>` and `.print-header`). Hidden until JS injects DOM markers.
- **Terminal:** Hidden bottom panel toggled by `Ctrl+K`. Commands: `help`, `whoami`, `ls`, `cat <file>`, `rm <file>`, `grep <pattern>`, `open <target>`, `cd`, `history`, `git log`, `hire me`, `clear`, `exit`. `cat` and `grep` read live DOM. History navigation `↑↓`, `Ctrl+R` reverse search, `Tab` autocomplete.
- **`[ctrl+k]` badge:** Fixed bottom-right hint, visible on load, hides while terminal is open, restores on close.
- **Clipboard:** Clicking mailto/tel links copies the address/number to clipboard and shows a brief toast.
- **Print styles:** Custom two-column header (`.print-header`), hides dark background / terminal / ASCII art, reformats sections for A4.
- **Mobile breakpoint** at 600px: smaller font, reduced padding.

## Known sharp edges

- The typewriter safety timer (2.5s) reveals all text if animation stalls; on very slow devices this may flash briefly.
- Terminal `hire me` redirects to `mailto:` after a short delay — may trigger popup blocker in some browsers.

## Deployment

GitHub Pages serves from `main`. `baseurl: /cv` → local dev URL is `http://localhost:4000/cv/`.
