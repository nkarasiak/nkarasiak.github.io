/**
 * Shared constants for the CV interactive layer.
 * All tunable values live here — no magic numbers elsewhere.
 */

export const CHARS_PER_FRAME       = 10;    // text nodes revealed per animation frame
export const SAFETY_TIMEOUT_MS     = 2500;  // ms before fallback reveal-all fires
export const CURSOR_CHAR           = '█';
export const COPY_TOAST_MS         = 1200;  // clipboard toast duration

export const TERM_MIN_HEIGHT_PX    = 100;   // minimum draggable terminal height
export const TERM_MAX_RATIO        = 0.8;   // max fraction of viewport height
export const TERM_RESIZE_HANDLE_PX = 8;     // mouse hit zone at top of terminal (px)
export const TERM_TOUCH_HANDLE_PX  = 20;    // touch hit zone (larger for fingers)

export const VISIBILITY_THRESHOLD  = 0.5;   // fraction of tall block that must be visible

export const SELECTORS = {
  container:       '.container',
  listItem:        'li',
  heading2:        'h2',
  terminal:        '#tui-term',
  terminalHistory: '#tui-hist',
  terminalInput:   '#tui-input',
  mailtoTelLinks:  'a[href^="mailto:"], a[href^="tel:"]',
};
