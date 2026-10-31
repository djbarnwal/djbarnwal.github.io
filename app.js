import { pages, SITE, LICHESS_URL, chessHtml } from './content.js';
import { onLichessTv } from './lichess-tv.js';

// The page around the 3D desk: the focus view for the monitors, poster and pegboard,
// light switching, and a plain dialog fallback for browsers without 3D support.

const $ = (selector) => document.querySelector(selector);

// ---- Page elements ----

// Fallback dialog, used only when the 3D desk could not start.
const modal = $('#window');
const body = $('#window-body');
const path = $('#window-path');
// Screen-reader announcements.
const status = $('#status');
// Focus view: the overlay shown while zoomed in on a monitor, the poster or the pegboard.
const focusView = $('#focus-view');
const monitorSurface = $('#monitor-surface');
const monitorContent = $('#monitor-content');
const backToDesk = $('#back-to-desk');

// ---- Content ----

// Path shown in the window title bar for each page.
const PAGE_PATHS = { about: SITE.url, chess: LICHESS_URL + '/tv', photos: 'photo-album' };

const MONITORS = {
  about: { title: 'About Dhiraj', label: 'Dhiraj’s website' },
  chess: { title: 'Lichess TV', label: 'Lichess TV, a live game of chess' },
};

// The live lichess TV game, kept up to date by lichess-tv.js.
let chessGame = null;

// Photos in the fallback dialog's album.
const ALBUM = [
  { title: 'The evening glow', file: 'desk-1.jpg', alt: 'Dhiraj’s desk in warm evening light' },
  {
    title: 'Where things take shape',
    file: 'desk-2.jpg',
    alt: 'Front view of Dhiraj’s desk',
    rotated: true,
  },
];

const LIGHT_NAMES = ['upperLamp', 'lowerLamp', 'white', 'purple'];
const LIGHT_LABELS = {
  upperLamp: 'Upper lamp',
  lowerLamp: 'Lower lamp',
  white: 'White light',
  purple: 'Purple light',
  warm: 'Both lamps',
  all: 'All lights',
};
// Names that switch several lights at once.
const LIGHT_GROUPS = { all: LIGHT_NAMES, warm: ['upperLamp', 'lowerLamp'] };

// ---- State ----

const lights = Object.fromEntries(LIGHT_NAMES.map((name) => [name, true]));
let engine = null; // The 3D desk from scene.js, or null if it isn't running.
let opener = null; // Element focused before the dialog opened, refocused on close.
let currentPhoto = 0; // Index into ALBUM while the dialog shows a photo.
let focusOpener = null; // Element focused before the focus view opened.
let focusMode = null; // 'monitor', 'poster' or 'pegboard' while the focus view is open.
let focusKey = null; // Which monitor is in focus.

// ---- Pages ----

// With the 3D desk running, pages open on a monitor. Otherwise they open in the
// fallback dialog.
function openPage(name) {
  if (engine) {
    if (!MONITORS[name]) return;
    if (modal.open) modal.close();
    engine.focus.openMonitor(name);
    return;
  }
  if (!pages[name]) return;
  if (!modal.open) opener = document.activeElement;
  body.innerHTML = pages[name];
  path.textContent = 'dhiraj / ' + PAGE_PATHS[name];
  if (!modal.open) modal.showModal();
  modal.scrollTop = 0;
  $('#close').focus();
}

function openPhoto(index) {
  currentPhoto = (index + ALBUM.length) % ALBUM.length;
  const photo = ALBUM[currentPhoto];
  const next = (currentPhoto + 1) % ALBUM.length;
  body.innerHTML = [
    '<section class="content">',
    `<h1 id="window-title" class="sr-only">${photo.title}</h1>`,
    '<div class="photo-view">',
    `<img ${photo.rotated ? 'class="rotated" ' : ''}src="assets/${photo.file}" alt="${photo.alt}">`,
    '</div>',
    '<div class="photo-controls">',
    '<button data-open="photos">← Album</button>',
    `<span>${currentPhoto + 1} / ${ALBUM.length}</span>`,
    `<button data-photo="${next}">Next photo →</button>`,
    '</div>',
    '</section>',
  ].join('');
  modal.scrollTop = 0;
  body.querySelector('button').focus();
}

function fallback() {
  engine = null;
  $('#loading').hidden = true;
  $('#fallback').hidden = false;
}

// ---- Lights ----

const anyLightOn = () => Object.values(lights).some(Boolean);

function syncLights() {
  engine?.setLights(lights);
}

// `key` is one of LIGHT_NAMES, or a group name from LIGHT_GROUPS.
function setLight(key, on) {
  if (key in LIGHT_GROUPS) LIGHT_GROUPS[key].forEach((name) => (lights[name] = on));
  else if (key in lights) lights[key] = on;
  else return;
  syncLights();
  status.textContent = LIGHT_LABELS[key] + (on ? ' on' : ' off');
}

const toggleLight = (key) => setLight(key, !lights[key]);
const toggleAllLights = () => setLight('all', !anyLightOn());

// ---- Focus view ----

// Keeps the HTML monitor page laid exactly over the 3D monitor's screen.
function placeScreen(rect) {
  for (const name of ['left', 'top', 'width', 'height'])
    monitorSurface.style[name] = rect[name] + 'px';
}

// Called by desk-focus.js whenever the focus view changes. `state.phase` is one of
// 'entering', 'changing', 'ready' or 'returning'; mode null means closed.
function showFocus(state) {
  if (!state.mode) return leaveFocus();
  const starting = focusView.hidden;
  const changed = focusKey !== state.key || focusMode !== state.mode;
  focusMode = state.mode;
  focusKey = state.key;
  if (starting) enterFocus();

  focusView.dataset.mode = state.mode;
  focusView.dataset.phase = state.phase;
  $('#focus-title').textContent =
    state.mode === 'monitor' ? MONITORS[state.key].title : state.caption;
  backToDesk.disabled = state.phase === 'returning';
  monitorSurface.hidden = state.mode !== 'monitor' || state.phase !== 'ready';

  if (state.mode === 'monitor') showMonitor(state, starting || changed);
  else if (state.phase === 'ready')
    status.textContent = state.caption + '. Escape returns to the desk.';
}

// Open the overlay and make the rest of the page unreachable until it closes.
function enterFocus() {
  focusOpener = document.activeElement;
  focusView.hidden = false;
  document.body.classList.add('inspecting');
  backToDesk.focus({ preventScroll: true });
}

function leaveFocus() {
  focusView.hidden = true;
  document.body.classList.remove('inspecting');
  focusMode = null;
  focusKey = null;
  if (focusOpener?.isConnected) focusOpener.focus({ preventScroll: true });
}

// The monitor already has a title, so the page's h1 gets a different id.
const monitorPage = (key) =>
  (key === 'chess' ? chessHtml(chessGame) : pages[key]).replace(
    'id="window-title"',
    'id="screen-title"',
  );

// Keeps lichess TV moving on the monitor page while it is open.
function updateChessPage(game) {
  chessGame = game;
  if (monitorSurface.dataset.screen === 'chess' && focusMode === 'monitor')
    monitorContent.innerHTML = monitorPage('chess');
}

function showMonitor(state, newPage) {
  if (newPage) {
    monitorContent.innerHTML = monitorPage(state.key);
    monitorContent.scrollTop = 0;
    monitorSurface.dataset.screen = state.key;
    $('#monitor-path').textContent = PAGE_PATHS[state.key];
  }
  for (const button of document.querySelectorAll('[data-screen]')) {
    button.setAttribute('aria-pressed', String(button.dataset.screen === state.key));
    button.disabled = state.phase !== 'ready';
  }
  if (state.phase === 'ready') {
    monitorContent.focus({ preventScroll: true });
    status.textContent = MONITORS[state.key].label + '. Escape returns to the desk.';
  }
}

// ---- Clicks ----

// Buttons in the fallback message, the dialog and the monitor tabs.
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const { open, photo, screen } = button.dataset;
  if (open) openPage(open);
  if (photo !== undefined) openPhoto(Number(photo));
  if (screen) engine?.focus.switchMonitor(screen);
});

$('#close').addEventListener('click', () => modal.close());
modal.addEventListener('close', () => opener?.focus());
// Close the dialog on a click on its backdrop.
modal.addEventListener('click', (event) => {
  if (event.target !== modal) return;
  const rect = modal.getBoundingClientRect();
  const outside =
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom;
  if (outside) modal.close();
});
modal.addEventListener('keydown', (event) => {
  if (body.querySelector('.photo-view') && ['ArrowRight', 'ArrowLeft'].includes(event.key)) {
    event.preventDefault();
    openPhoto(1 - currentPhoto);
  }
});

backToDesk.addEventListener('click', () => engine?.focus.back());

// ---- Keyboard ----

document.addEventListener('keydown', (event) => {
  if (!focusView.hidden) {
    handleFocusKeys(event);
    return;
  }
  // Leave shortcuts alone while the dialog is open, a modifier is held, or the visitor is typing.
  if (
    modal.open ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.repeat ||
    event.target.closest('input,textarea,[contenteditable="true"]')
  )
    return;
  if (event.key.toLowerCase() === 'l') toggleAllLights();
});

// In the focus view: Escape goes back, and Tab stays inside.
function handleFocusKeys(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    engine?.focus.back();
  } else if (event.key === 'Tab') {
    trapFocus(event);
  }
}

function trapFocus(event) {
  const items = [
    ...focusView.querySelectorAll('button:not(:disabled),[tabindex="0"],a[href]'),
  ].filter((el) => el.getClientRects().length);
  const first = items[0];
  const last = items.at(-1);
  if (!items.includes(document.activeElement)) {
    event.preventDefault();
    first?.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

// ---- Start ----

try {
  const { createDesk } = await import('./scene.js');
  engine = createDesk({
    onOpen: openPage,
    onLight: toggleLight,
    onError: fallback,
    onFocus: showFocus,
    onSurface: placeScreen,
    onObject: (kind, message) => (status.textContent = message),
  });
  syncLights();
  onLichessTv(updateChessPage);
  $('#loading').classList.add('loaded');
  setTimeout(() => ($('#loading').hidden = true), 500);
} catch (error) {
  console.error('Desk scene could not start', error);
  fallback();
}

registerLightingTool();

// Lets an AI agent in the browser switch the lights, where the browser supports
// WebMCP (document.modelContext). Does nothing elsewhere.
function registerLightingTool() {
  if (!document.modelContext?.registerTool) return;
  const choices = [...LIGHT_NAMES, ...Object.keys(LIGHT_GROUPS)];
  const lifecycle = new AbortController();
  try {
    Promise.resolve(
      document.modelContext.registerTool(
        {
          name: 'set_desk_lighting',
          title: 'Set desk lighting',
          description:
            'Turn the upper or lower warm lamp, both warm lamps ("warm"), the white shelf lights, the purple backlight, or all desk lights on or off.',
          inputSchema: {
            type: 'object',
            properties: {
              light: { type: 'string', enum: choices },
              on: { type: 'boolean' },
            },
            required: ['light', 'on'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            if (!input || typeof input.on !== 'boolean' || !choices.includes(input.light))
              throw new Error('Choose a valid light and a boolean on value.');
            setLight(input.light, input.on);
            return { ...lights };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {}
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
