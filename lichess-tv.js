import { FALLBACK_GAME } from './content.js';

// Follows lichess TV's featured game through lichess's public streaming API. The
// first message describes the game; each later one carries the new position, the
// last move and both clocks. A new featured game arrives as a fresh first message.
// https://lichess.org/api#tag/TV/operation/tvFeed
const FEED_URL = 'https://lichess.org/api/tv/feed';

// Wait before reconnecting after the stream drops: longer after each failure in a row.
const RETRY_DELAYS_MS = [2000, 5000, 15000, 30000];

let game = FALLBACK_GAME;
const listeners = new Set();
let connection = null; // AbortController for the open stream.
let failures = 0;
let retryTimer = null;
let ticker = null;

// Calls `listener(game)` now, on every change, and once a second while a live game's
// clock is running. The stream opens with the first listener.
export function onLichessTv(listener) {
  listeners.add(listener);
  listener(game);
  if (listeners.size === 1) start();
  return () => listeners.delete(listener);
}

function emit() {
  for (const listener of listeners) listener(game);
}

function start() {
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : connect()));
  window.addEventListener('pagehide', stop);
  if (!document.hidden) connect();
}

// Close the stream while nobody can see the page.
function stop() {
  connection?.abort();
  connection = null;
  clearTimeout(retryTimer);
  clearInterval(ticker);
  ticker = null;
}

async function connect() {
  if (connection) return;
  const controller = (connection = new AbortController());
  ticker ??= setInterval(() => game.live && emit(), 1000);
  try {
    const response = await fetch(FEED_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/x-ndjson' },
    });
    if (!response.ok || !response.body) throw new Error('Lichess TV answered ' + response.status);
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) if (line.trim()) receive(JSON.parse(line));
    }
  } catch {
    // Retried below, unless the stream was closed on purpose.
  }
  if (controller.signal.aborted) return;
  connection = null;
  const delay = RETRY_DELAYS_MS[Math.min(failures++, RETRY_DELAYS_MS.length - 1)];
  retryTimer = setTimeout(connect, delay);
}

function receive({ t: type, d: data }) {
  const now = performance.now();
  if (type === 'featured') {
    const player = (color) => {
      const p = data.players.find((entry) => entry.color === color) || {};
      return {
        name: p.user?.name || 'Anonymous',
        title: p.user?.title || '',
        rating: p.rating || null,
        seconds: p.seconds ?? 0,
      };
    };
    game = {
      live: true,
      fen: data.fen,
      lastMove: [],
      orientation: data.orientation === 'black' ? 'black' : 'white',
      white: player('white'),
      black: player('black'),
      receivedAt: now,
    };
  } else if (type === 'fen' && game.live) {
    game = {
      ...game,
      fen: data.fen,
      lastMove: data.lm ? [data.lm.slice(0, 2), data.lm.slice(2, 4)] : [],
      white: { ...game.white, seconds: data.wc ?? game.white.seconds },
      black: { ...game.black, seconds: data.bc ?? game.black.seconds },
      receivedAt: now,
    };
  } else return;
  failures = 0;
  emit();
}
