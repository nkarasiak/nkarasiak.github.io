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
- `_layouts/cv.html` — wraps the rendered Markdown in a minimal dark monochrome monospace shell. All CSS inline. No JavaScript. No theme switching. No section panels. Just `<div class="container">{{ content }}</div>`.
- `_config.yaml` — `theme: null`, kramdown + GFM, excludes `README.md` from `_site` output (the include still works because Jekyll reads it from the source tree before exclusion takes effect on output).
- `assets/favicon.svg` — only static asset.

When updating CV text, edit **`README.md` only**. The site picks it up on next build.

## Layout internals (`_layouts/cv.html`)

- CSS variables: `--bg: #0c0c0c`, `--fg: #888888`, `--fg-bright: #d0d0d0`, `--fg-dim: #555555`, `--accent: #ffffff`.
- Monospace font stack (`ui-monospace`, SF Mono, Cascadia Mono, JetBrains Mono, Consolas, …).
- `.container` — `max-width: 680px`, centered, vertical padding.
- `<h1>` white, `<h2>` light grey, `<strong>` light grey, `<em>` dim grey (used for job dates), `<a>` underlined via `border-bottom`.
- Bullets: `<ul>` is unstyled, `<li>` gets `[*]` marker via `::before` (`padding-left: 2.5rem`).
- Custom CSS for `p:has(em) > strong:first-child` stacks job title above date line.
- Webkit scrollbar themed dark.
- Mobile breakpoint at 600px: smaller font, reduced padding.
- Print: `@page A4 portrait`, forces black-on-white, drops the dark background, normalizes link styling.

Adding visual chrome (status bar, nav, theme switcher, etc.) means editing this file. Currently nothing scrolls/sticks — page is a single scroll of rendered Markdown.

## Known sharp edges

- `pre { overflow-x: hidden }` — ASCII art header in `README.md` lines 1–8 gets clipped on narrow viewports. Switch to `auto` if mobile rendering matters.
- `--fg-dim: #555` on `--bg: #0c0c0c` is ~3.0:1 contrast — fails WCAG AA for body text. Used by `<em>` (job dates) and bullet markers. Bump to `#6e6e6e+` if accessibility is a concern.
- No `:focus-visible` outline on links.

## Deployment

GitHub Pages serves from `main`. `baseurl: /cv` → local dev URL is `http://localhost:4000/cv/`.
