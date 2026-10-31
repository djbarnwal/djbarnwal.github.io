// What the two monitors show: Dhiraj's own website on the left, and lichess TV on the
// right. desk-monitors.js paints the same content onto the 3D screens, so it shares
// the text and helpers below.

export const SITE = {
  url: 'djbarnwal.github.io',
  name: 'Dhiraj Barnwal',
  tagline: 'AI, HCI and Data tools',
  bio: 'Building something new.',
  email: 'dhirajbarnwal at outlook dot com',
  links: [
    { label: 'github', href: 'https://github.com/djbarnwal/' },
    { label: 'linkedin', href: 'https://www.linkedin.com/in/dhiraj-barnwal-86b599a2/' },
  ],
};

export const LICHESS_URL = 'lichess.org';

// Shown until lichess TV's live game arrives, or if lichess can't be reached: an
// Italian Game twelve moves in, with White to move. Live games have the same shape
// (see lichess-tv.js).
export const FALLBACK_GAME = {
  live: false,
  fen: 'r1bq1rk1/pp2nppp/2p5/3n4/2BP4/1Q3N2/PP1N1PPP/R3R1K1 w - - 0 13',
  lastMove: ['c7', 'c6'],
  orientation: 'white',
  white: { name: 'djbarnwal', title: '', rating: null, seconds: 496 },
  black: { name: 'Anonymous', title: '', rating: null, seconds: 461 },
};

// Lichess TV channels, listed beside the board like on lichess.org/tv.
export const TV_CHANNELS = ['Top Rated', 'Bullet', 'Blitz', 'Rapid', 'Classical', 'Chess960'];

// Filled chess glyphs for both colours (styled white or black), forced to text style
// so phones don't swap in emoji.
const GLYPHS = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
export const pieceGlyph = (letter) => GLYPHS[letter.toLowerCase()] + '\uFE0E';

// The board as 8 rows of 8 squares, rank 8 first: null, or { letter, white }.
function boardRows(fen) {
  return fen
    .split(' ')[0]
    .split('/')
    .map((row) =>
      [...row].flatMap((c) =>
        /\d/.test(c) ? Array(Number(c)).fill(null) : [{ letter: c, white: c === c.toUpperCase() }],
      ),
    );
}

const FILES = 'abcdefgh';

// The 64 squares in screen order (top-left first), turned to the game's orientation.
// The right-hand column carries rank labels and the bottom row file labels.
export function boardSquares(game) {
  const rows = boardRows(game.fen);
  const flip = game.orientation === 'black';
  const squares = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const rank = flip ? row + 1 : 8 - row;
      const file = flip ? 7 - col : col;
      const name = FILES[file] + rank;
      squares.push({
        row,
        col,
        piece: rows[8 - rank][file],
        // a1 is dark: file index 0 + rank 1 is odd.
        light: (file + rank) % 2 === 0,
        last: game.lastMove.includes(name),
        rankLabel: col === 7 ? String(rank) : '',
        fileLabel: row === 7 ? FILES[file] : '',
      });
    }
  }
  return squares;
}

export const sideToMove = (game) => (game.fen.split(' ')[1] === 'b' ? 'black' : 'white');

// The player at the top and bottom of the board.
export function seats(game) {
  const bottom = game.orientation === 'black' ? 'black' : 'white';
  const top = bottom === 'white' ? 'black' : 'white';
  return { top, bottom };
}

// A clock reading such as 4:05 or 1:02:09, counting down for the side to move.
export function clockText(game, color, now = performance.now()) {
  let seconds = game[color].seconds ?? 0;
  if (game.live && sideToMove(game) === color && game.receivedAt)
    seconds -= (now - game.receivedAt) / 1000;
  seconds = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${String(m).padStart(2, '0')}:${s}`;
}

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function siteHtml() {
  const links = SITE.links
    .map(
      ({ label, href }) =>
        `<li><a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a></li>`,
    )
    .join('');
  return (
    '<div class="site">' +
    `<h1 class="site-name" id="window-title">${SITE.name}</h1>` +
    `<p class="site-tagline">${SITE.tagline}</p>` +
    `<p class="site-bio">${SITE.bio.replace('&', '&amp;')}</p>` +
    `<ul class="site-links"><li class="site-email">${SITE.email}</li>${links}</ul>` +
    '</div>'
  );
}

// lichess.org/tv for `game`, in lichess's dark theme with the brown board.
export function chessHtml(game) {
  const squares = boardSquares(game)
    .map(({ piece, light, last, rankLabel, fileLabel }) => {
      const classes = ['sq', light ? 'light' : 'dark', last ? 'last' : ''].join(' ').trim();
      const glyph = piece
        ? `<span class="pc ${piece.white ? 'w' : 'b'}">${pieceGlyph(piece.letter)}</span>`
        : '';
      const rank = rankLabel ? `<i class="rank">${rankLabel}</i>` : '';
      const file = fileLabel ? `<i class="file">${fileLabel}</i>` : '';
      return `<div class="${classes}">${glyph}${rank}${file}</div>`;
    })
    .join('');
  const { top, bottom } = seats(game);
  const running = game.live ? sideToMove(game) : null;
  const clock = (color) =>
    `<p class="li-clock${running === color ? ' running' : ''}">${clockText(game, color)}</p>`;
  const name = (color) => {
    const { name, title, rating } = game[color];
    return (
      `<p class="li-name">${title ? `<b class="li-title">${escapeHtml(title)}</b> ` : ''}` +
      `${escapeHtml(name)}${rating ? ` <span class="li-rating">${escapeHtml(rating)}</span>` : ''}</p>`
    );
  };
  const channels = TV_CHANNELS.map(
    (channel, i) => `<li${i === 0 ? ' class="on"' : ''}>${channel}</li>`,
  ).join('');
  const turn = sideToMove(game) === 'white' ? 'White' : 'Black';
  return (
    '<div class="lichess">' +
    '<h1 class="sr-only" id="window-title">Lichess TV, a live game of chess</h1>' +
    '<header class="li-top"><span class="li-logo"><b aria-hidden="true">♞&#xFE0E;</b><span>lichess<i>.org</i></span></span>' +
    '<nav aria-hidden="true"><span>Play</span><span>Puzzles</span><span>Learn</span>' +
    '<span class="on">Watch</span><span>Community</span><span>Tools</span></nav>' +
    `<span class="li-user">${FALLBACK_GAME.white.name}</span></header>` +
    '<div class="li-game">' +
    `<aside class="li-meta"><div class="li-card"><p class="li-card-title">Lichess TV</p><ul class="li-channels">${channels}</ul></div></aside>` +
    `<div class="li-board" role="img" aria-label="Chess board, ${turn} to move">${squares}</div>` +
    '<aside class="li-table">' +
    clock(top) +
    name(top) +
    `<p class="li-live">${game.live ? '<i></i>Live' : 'Connecting to lichess TV…'}</p>` +
    name(bottom) +
    clock(bottom) +
    '</aside></div></div>'
  );
}

export const pages = {
  about: siteHtml(),
  photos: `<section class="content"><span class="eyebrow">PHOTO ALBUM</span><h1 id="window-title">My little corner.</h1><p>Same desk. Two perspectives.</p><div class="gallery"><button class="photo-card" data-photo="0"><span class="photo-frame"><img src="assets/desk-1.jpg" alt="The desk from the left, with warm lamps and trailing plants."></span><span class="photo-caption">The evening glow</span></button><button class="photo-card" data-photo="1"><span class="photo-frame"><img class="rotated" src="assets/desk-2.jpg" alt="A front view of the desk and its two monitors."></span><span class="photo-caption">Where things take shape</span></button></div><p class="gallery-note">The real desk behind this little place on the internet.</p></section>`,
};
