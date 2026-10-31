import { DESK_TOP } from './desk-furniture.js';
import {
  SITE,
  LICHESS_URL,
  TV_CHANNELS,
  boardSquares,
  clockText,
  pieceGlyph,
  seats,
  sideToMove,
} from './content.js';
import { onLichessTv } from './lichess-tv.js';

// Top of the wooden riser the two monitors stand on.
const MONITOR_PLATFORM_TOP = DESK_TOP + 0.32;

// Size of the canvas painted onto each screen, and the browser bar at its top.
const SCREEN_W = 960;
const SCREEN_H = 550;
const BAR_H = 42;

// How bright each screen looks and how strongly its brightest text glows.
const SCREEN_LOOK = {
  about: { tint: '#cbd4df', textGlow: 0.5 },
  chess: { tint: '#cbd4df', textGlow: 0.9 },
};

// Two monitors on a shared riser: Dhiraj's website on the left, lichess TV's live game
// on the right. Their screens are painted into the 3D world; selecting one opens the
// matching page (see desk-focus.js and content.js).
export function addDeskMonitors({
  THREE,
  materials,
  mat,
  mesh,
  box,
  sphere,
  group,
  texture,
  interactive,
}) {
  // One continuous riser, supported at both ends.
  const riser = group(0.415, DESK_TOP, 0.16);
  riser.name = 'shared-monitor-riser';
  const riserTop = box(4.12, 0.105, 0.76, 0, 0.2675, 0, materials.wood, riser, 0.018);
  riserTop.name = 'shared-riser-top';
  for (const x of [-1.83, 1.83]) {
    const support = box(0.095, 0.215, 0.56, x, 0.1075, 0, materials.metal, riser, 0.012);
    support.name = 'riser-support';
  }

  function monitor(x, kind) {
    const g = group(x, MONITOR_PLATFORM_TOP + 0.8, 0.03);
    g.name = kind + '-monitor';
    box(1.79, 1.08, 0.1, 0, 0, 0, materials.metal, g, 0.025);
    const screen = mesh(
      new THREE.PlaneGeometry(1.71, 0.98),
      screenMaterial(THREE, paintScreen(texture, kind), SCREEN_LOOK[kind]),
      g,
    );
    screen.position.z = 0.057;
    g.userData.screenSurface = screen;
    // Neck, foot and power light.
    box(0.085, 0.26, 0.07, 0, -0.66, -0.015, materials.metal, g, 0.02);
    const base = box(0.78, 0.045, 0.48, 0, -0.7775, 0.13, materials.metal, g, 0.015);
    base.name = 'monitor-base';
    sphere(
      0.013,
      0.73,
      -0.515,
      0.058,
      mat('#a1bc8c', { emissive: '#a1bc8c', emissiveIntensity: 0.3 }),
      g,
    );
    interactive(g, { type: 'open', key: kind });
    return g;
  }

  monitor(-0.5, 'about');
  monitor(1.33, 'chess');
  // Slim bar resting on top of the left monitor.
  box(0.78, 0.035, 0.06, -0.5, MONITOR_PLATFORM_TOP + 1.357, 0.044, materials.metal);
}

// A lit LCD panel: the painted screen, brightest at the centre of the backlight and dimmer
// at the bezel, with a faint glossy sheen and warm lamp reflection. Bright text is pushed
// just past the bloom threshold so headings glow softly.
function screenMaterial(THREE, map, { tint, textGlow }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      tint: { value: new THREE.Color(tint) },
      textGlow: { value: textGlow },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform vec3 tint;
      uniform float textGlow;
      varying vec2 vUv;

      void main() {
        vec3 color = texture2D(map, vUv).rgb * tint;

        float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
        color += color * smoothstep(0.38, 0.62, luma) * textGlow;

        vec2 centred = (vUv - 0.5) * vec2(1.0, 1.25);
        color *= 0.95 + 0.1 * (1.0 - smoothstep(0.0, 0.7, length(centred)));
        vec2 edge = smoothstep(0.0, 0.035, vUv) * smoothstep(0.0, 0.035, 1.0 - vUv);
        color *= mix(0.78, 1.0, edge.x * edge.y);

        float sheen = 1.0 - smoothstep(0.0, 0.32, abs(vUv.x * 0.55 + vUv.y - 1.12));
        color += vec3(0.008, 0.009, 0.011) * sheen;
        color += vec3(1.0, 0.72, 0.42) * 0.007 * smoothstep(0.55, 1.0, vUv.y) * (1.0 - vUv.x);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

// Paints a screen. The website is painted again once its web fonts load; lichess TV
// is painted again on every move and clock tick.
function paintScreen(texture, kind) {
  if (kind === 'chess') {
    const screen = texture(() => {}, SCREEN_W, SCREEN_H);
    const ctx = screen.image.getContext('2d');
    onLichessTv((game) => {
      paintChess(ctx, game);
      screen.needsUpdate = true;
    });
    return screen;
  }
  const screen = texture((ctx) => paintSite(ctx), SCREEN_W, SCREEN_H);
  Promise.all(
    ['700 20px "Cormorant Garamond"', '200 36px "Nunito Sans"'].map((font) =>
      document.fonts?.load(font),
    ),
  )
    .then(() => {
      paintSite(screen.image.getContext('2d'));
      screen.needsUpdate = true;
    })
    .catch(() => {});
  return screen;
}

// The browser's top bar: three window buttons and the address.
function paintBrowserBar(ctx, { bar, pill, text }, url) {
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, SCREEN_W, BAR_H);
  ['#e2766a', '#e0b85a', '#7fb46b'].forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(24 + i * 20, BAR_H / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = pill;
  ctx.beginPath();
  ctx.roundRect(110, 9, 300, BAR_H - 18, 12);
  ctx.fill();
  ctx.fillStyle = text;
  ctx.font = '15px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(url, 126, BAR_H / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

// Splits text into lines no wider than `width`.
function wrap(ctx, text, width) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const next = lines.at(-1) ? lines.at(-1) + ' ' + word : word;
    if (ctx.measureText(next).width > width && lines.at(-1)) lines.push(word);
    else lines[lines.length - 1] = next;
  }
  return lines;
}

// djbarnwal.github.io in its dark theme, laid out like the page (see .site in screens.css).
function paintSite(ctx) {
  const w = SCREEN_W;
  const h = SCREEN_H - BAR_H;
  ctx.save();
  ctx.fillStyle = '#141312';
  ctx.fillRect(0, BAR_H, w, h);
  ctx.beginPath();
  ctx.rect(0, BAR_H, w, h);
  ctx.clip();
  ctx.fillStyle = '#221d16';
  ctx.beginPath();
  ctx.arc(0.16 * w + 0.55 * w, BAR_H + 0.08 * h + 0.55 * w, 0.55 * w, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#2f333b';
  ctx.beginPath();
  ctx.arc(0.57 * w + 0.275 * w, BAR_H - 0.45 * h + 0.275 * w, 0.275 * w, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Four blocks spread top to bottom with equal gaps between them, like the page's
  // flex layout: name, tagline, bio, links.
  const left = 0.15 * w;
  const serif = (size) => `700 ${size}px "Cormorant Garamond", Georgia, serif`;
  const blocks = [
    { font: serif(20), color: '#ece6da', lineHeight: 16, lines: [SITE.name] },
    {
      font: '200 38px "Nunito Sans", Arial, sans-serif',
      color: '#ece6da',
      lineHeight: 42,
      width: 11 * 38,
      text: SITE.tagline,
    },
    { font: serif(19), color: '#aaa397', lineHeight: 27, width: 0.6 * w, text: SITE.bio },
    {
      font: serif(14),
      color: '#ece6da',
      lineHeight: 16,
      lines: [[SITE.email, '—', ...SITE.links.map(({ label }) => label)].join('     ')],
    },
  ];
  for (const block of blocks) {
    ctx.font = block.font;
    block.lines ??= wrap(ctx, block.text, block.width);
  }
  const padding = 0.07 * h;
  const used = blocks.reduce((sum, b) => sum + b.lines.length * b.lineHeight, 0);
  const gap = (h - 2 * padding - used) / (blocks.length - 1);
  let top = BAR_H + padding;
  for (const { font, color, lineHeight, lines } of blocks) {
    ctx.font = font;
    ctx.fillStyle = color;
    lines.forEach((line, i) => ctx.fillText(line, left, top + (i + 0.8) * lineHeight));
    top += lines.length * lineHeight + gap;
  }

  paintBrowserBar(ctx, { bar: '#262421', pill: '#1a1917', text: '#9a9894' }, SITE.url);
}

// lichess.org/tv in the dark theme (see .lichess in screens.css).
function paintChess(ctx, game) {
  ctx.fillStyle = '#161512';
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  paintBrowserBar(ctx, { bar: '#262421', pill: '#1a1917', text: '#9a9894' }, LICHESS_URL + '/tv');

  const navY = BAR_H + 28;
  ctx.fillStyle = '#e3e3e3';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('♞\uFE0E lichess', 22, navY + 2);
  ctx.fillStyle = '#8a8a8a';
  ctx.fillText('.org', 22 + ctx.measureText('♞\uFE0E lichess').width, navY + 2);
  ctx.font = '13px system-ui, sans-serif';
  ['PLAY', 'PUZZLES', 'LEARN', 'WATCH', 'COMMUNITY', 'TOOLS'].forEach((item, i) => {
    ctx.fillStyle = item === 'WATCH' ? '#e3e3e3' : '#9a9894';
    ctx.fillText(item, 210 + i * 84, navY);
  });

  // Board.
  const size = 432;
  const square = size / 8;
  const boardX = 264;
  const boardY = BAR_H + 56;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${square * 0.8}px "Apple Symbols", "Segoe UI Symbol", "DejaVu Sans", serif`;
  for (const { row, col, piece, light, last } of boardSquares(game)) {
    ctx.fillStyle = last ? (light ? '#cdd26a' : '#aaa23a') : light ? '#f0d9b5' : '#b58863';
    const x = boardX + col * square;
    const y = boardY + row * square;
    ctx.fillRect(x, y, square, square);
    if (!piece) continue;
    const glyph = pieceGlyph(piece.letter);
    if (piece.white) {
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = '#222';
      ctx.strokeText(glyph, x + square / 2, y + square * 0.53);
      ctx.fillStyle = '#fff';
    } else ctx.fillStyle = '#1d1d1d';
    ctx.fillText(glyph, x + square / 2, y + square * 0.53);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Lichess TV channels on the left.
  ctx.fillStyle = '#262421';
  ctx.fillRect(48, boardY, 196, 50 + TV_CHANNELS.length * 26);
  ctx.fillStyle = '#dcdcdc';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Lichess TV', 64, boardY + 30);
  ctx.font = '13px system-ui, sans-serif';
  TV_CHANNELS.forEach((channel, i) => {
    const y = boardY + 58 + i * 26;
    if (i === 0) {
      ctx.fillStyle = '#3a3835';
      ctx.fillRect(56, y - 17, 180, 24);
    }
    ctx.fillStyle = i === 0 ? '#e3e3e3' : '#9a9894';
    ctx.fillText(channel, 64, y);
  });

  // Clocks and players on the right, centred beside the board.
  const tableX = boardX + size + 16;
  const tableW = 180;
  const { top, bottom } = seats(game);
  const running = game.live ? sideToMove(game) : null;
  let y = boardY + size / 2 - 106;
  function clock(color) {
    ctx.fillStyle = running === color ? '#3f5c25' : '#262421';
    ctx.fillRect(tableX, y, 120, 40);
    ctx.fillStyle = running === color ? '#fff' : '#8f8f8f';
    ctx.font = '28px ui-monospace, Menlo, monospace';
    ctx.fillText(clockText(game, color), tableX + 8, y + 30);
    y += 40;
  }
  function name(color) {
    const { name, title, rating } = game[color];
    ctx.fillStyle = '#262421';
    ctx.fillRect(tableX, y, tableW, 32);
    ctx.font = '14px system-ui, sans-serif';
    let x = tableX + 10;
    if (title) {
      ctx.fillStyle = '#d59120';
      ctx.fillText(title, x, y + 21);
      x += ctx.measureText(title + ' ').width;
    }
    ctx.fillStyle = '#dcdcdc';
    ctx.fillText(name, x, y + 21);
    if (rating) {
      x += ctx.measureText(name + ' ').width;
      ctx.fillStyle = '#8a8a8a';
      ctx.fillText(String(rating), x, y + 21);
    }
    y += 32;
  }
  clock(top);
  name(top);
  ctx.fillStyle = '#1f1e1c';
  ctx.fillRect(tableX, y, tableW, 68);
  ctx.font = '13px system-ui, sans-serif';
  if (game.live) {
    ctx.fillStyle = '#e04f4f';
    ctx.beginPath();
    ctx.arc(tableX + 16, y + 34, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#bababa';
    ctx.fillText('Live', tableX + 28, y + 39);
  } else {
    ctx.fillStyle = '#8a8a8a';
    ctx.fillText('Connecting to lichess TV…', tableX + 10, y + 39);
  }
  y += 68;
  name(bottom);
  clock(bottom);
}
