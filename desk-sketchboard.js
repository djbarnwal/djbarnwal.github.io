// How long the doodle takes to redraw itself, in milliseconds.
const REDRAW_DURATION = 1700;

// A clear, edge-polished glass sketchboard on the upper wall shelf, with a
// SpongeBob doodle in dry-erase marker. Clicking it redraws the doodle top to bottom.
// Returns the drawing, whose userData.replay/animate are driven by scene.js.
export function addDeskSketchboard({
  THREE,
  materials,
  mat,
  mesh,
  group,
  box,
  texture,
  interactive,
}) {
  const board = group(-0.68, 3.6, -0.88);
  board.name = 'glass-spongebob-sketchboard';
  board.rotation.x = -0.065;

  const glass = new THREE.MeshPhysicalMaterial({
    color: '#c1ece7',
    transparent: true,
    opacity: 0.13,
    roughness: 0.08,
    metalness: 0.08,
    clearcoat: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const pane = box(1.02, 0.72, 0.018, 0, 0.43, 0, glass, board, 0.009);
  pane.castShadow = false;
  // Polished edges, and two small wooden feet.
  const edge = mat('#c1dfd8', {
    transparent: true,
    opacity: 0.5,
    roughness: 0.2,
    depthWrite: false,
  });
  for (const x of [-0.51, 0.51]) box(0.008, 0.72, 0.021, x, 0.43, 0, edge, board, 0.003);
  for (const y of [0.07, 0.79]) box(1.02, 0.008, 0.021, 0, y, 0, edge, board, 0.003);
  for (const x of [-0.34, 0.34]) box(0.14, 0.08, 0.22, x, 0.04, 0, materials.wood, board, 0.012);

  // The marker strokes sit on a transparent texture just in front of the glass.
  // A shader tweak hides everything below `drawProgress`, so raising it from 0 to 1
  // reveals the doodle from the top down.
  const drawProgress = { value: 1 };
  const markerMaterial = new THREE.MeshBasicMaterial({
    map: texture(paintSpongeBob, 640, 480),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  markerMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.drawProgress = drawProgress;
    shader.fragmentShader = 'uniform float drawProgress;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      'diffuseColor.a *= smoothstep(1. - drawProgress - .025, 1. - drawProgress + .025, vMapUv.y);\n#include <opaque_fragment>',
    );
  };
  markerMaterial.customProgramCacheKey = () => 'sketch-reveal-v1';
  const drawing = mesh(new THREE.PlaneGeometry(0.97, 0.7), markerMaterial, board);
  drawing.position.set(0, 0.43, 0.013);
  drawing.castShadow = false;

  let redrawStart = null;
  drawing.userData.replay = (now, reducedMotion) => {
    redrawStart = reducedMotion ? null : now;
    drawProgress.value = reducedMotion ? 1 : 0;
  };
  drawing.userData.animate = (now) => {
    if (redrawStart === null) return;
    const t = Math.min(1, (now - redrawStart) / REDRAW_DURATION);
    drawProgress.value = t;
    if (t === 1) redrawStart = null;
  };

  interactive(board, { type: 'toy', key: 'doodle' });
  return drawing;
}

// SpongeBob in coloured marker, on a 640 × 480 transparent canvas.
function paintSpongeBob(ctx) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = (color, width, points, close = false) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    points.slice(1).forEach((p) => ctx.lineTo(...p));
    if (close) ctx.closePath();
    ctx.stroke();
  };
  const ellipse = (x, y, rx, ry, color, width = 5) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  };
  const yellow = '#edc939';
  const ink = '#655231';
  const blue = '#47a8d6';
  const red = '#e77756';
  const white = '#f5ecd7';

  // Wobbly square body, with sponge holes.
  path(
    yellow,
    8,
    [
      [195, 87],
      [217, 82],
      [239, 87],
      [262, 81],
      [286, 85],
      [312, 80],
      [337, 85],
      [361, 80],
      [388, 86],
      [411, 81],
      [427, 88],
      [422, 112],
      [427, 137],
      [421, 162],
      [426, 189],
      [421, 215],
      [426, 242],
      [420, 267],
      [194, 267],
      [198, 242],
      [192, 218],
      [198, 191],
      [192, 166],
      [198, 139],
      [191, 113],
    ],
    true,
  );
  [
    [213, 107, 8, 10],
    [406, 119, 9, 13],
    [216, 231, 9, 6],
    [396, 245, 11, 7],
    [405, 190, 7, 10],
    [219, 179, 7, 9],
  ].forEach((hole) => ellipse(...hole, yellow, 5));

  // Eyes, irises, pupils and eyelashes.
  ellipse(274, 143, 36, 42, white, 7);
  ellipse(346, 143, 36, 42, white, 7);
  ellipse(283, 147, 15, 20, blue, 6);
  ellipse(337, 147, 15, 20, blue, 6);
  ellipse(285, 148, 5, 10, ink, 5);
  ellipse(335, 148, 5, 10, ink, 5);
  for (const x of [258, 277, 296, 328, 348, 368])
    path(ink, 4, [
      [x, 105],
      [x - 3, 91],
    ]);

  // Nose, smile, cheeks and two front teeth.
  path(yellow, 6, [
    [309, 158],
    [317, 167],
    [319, 191],
    [309, 197],
    [302, 193],
  ]);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(231, 207);
  ctx.bezierCurveTo(269, 246, 361, 247, 393, 207);
  ctx.stroke();
  ellipse(237, 201, 12, 8, red, 4);
  ellipse(387, 201, 12, 8, red, 4);
  path(white, 6, [
    [288, 230],
    [289, 248],
    [306, 248],
    [307, 233],
  ]);
  path(white, 6, [
    [316, 233],
    [317, 249],
    [334, 248],
    [334, 231],
  ]);

  // White shirt, brown trousers, collar and red tie.
  path(white, 6, [
    [195, 273],
    [195, 295],
    [421, 295],
    [421, 273],
  ]);
  path(
    '#be865b',
    7,
    [
      [195, 299],
      [195, 337],
      [421, 337],
      [421, 299],
    ],
    true,
  );
  path(white, 4, [
    [281, 273],
    [299, 288],
    [310, 274],
    [324, 288],
    [342, 273],
  ]);
  path(red, 6, [
    [311, 280],
    [303, 294],
    [309, 321],
    [320, 296],
    [311, 280],
  ]);

  // Arms, ending in little hands.
  path(yellow, 5, [
    [195, 199],
    [171, 243],
    [157, 259],
    [146, 253],
    [156, 260],
    [144, 268],
    [157, 261],
    [161, 274],
  ]);
  path(yellow, 5, [
    [427, 199],
    [451, 242],
    [466, 257],
    [477, 250],
    [467, 258],
    [480, 267],
    [467, 260],
    [464, 274],
  ]);

  // Legs, socks with a red stripe, and shoes pointing outwards.
  for (const x of [255, 364]) {
    path(yellow, 6, [
      [x, 339],
      [x, 367],
    ]);
    path(white, 8, [
      [x, 367],
      [x, 390],
    ]);
    path(red, 3, [
      [x - 5, 373],
      [x + 5, 373],
    ]);
    ellipse(x + (x < 300 ? -11 : 11), 401, 24, 10, ink, 7);
  }
}
