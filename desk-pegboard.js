import { PEGBOARD_Z, ROOM } from './desk-layout.js';

// Visible size of the photograph inside each Polaroid frame.
const PRINT_WIDTH = 0.273;
const PRINT_HEIGHT = 0.281;

// Outer size of each Polaroid.
const POLAROID_WIDTH = 0.315;
const POLAROID_HEIGHT = 0.405;

// The white SKÅDIS-style clip holding each Polaroid: a rounded front lever over a
// back plate fixed to the board. `grip` is how far the lever reaches down over the
// top of the Polaroid.
const CLIP = { width: 0.064, height: 0.21, grip: 0.04 };

// The three instant photos clipped to the pegboard. `caption` names the photo for
// screen readers in the pegboard view; `handwriting` is written under the photo.
// The photos are pre-cropped to the print's shape (1000 × 1029). For any other photo,
// `rotate` turns a sideways one upright and `verticalCrop` picks which part of a tall
// one shows (0 keeps the bottom, 1 the top). `clipOffset` slides the clip along the
// top edge (negative is left) to keep it off the subject.
const POLAROIDS = [
  {
    x: -0.44,
    tilt: -0.07,
    photo: 'assets/polaroid-1.jpg',
    caption: 'Manhattan at dusk from the Empire State Building, New York, 2019',
    handwriting: 'New York, 2019',
  },
  {
    x: 0,
    tilt: 0.04,
    clipOffset: -0.065,
    photo: 'assets/polaroid-2.jpg',
    caption: 'The Eiffel Tower in the low morning sun, Paris, 2018',
    handwriting: 'Paris, 2018',
  },
  {
    x: 0.44,
    tilt: -0.045,
    photo: 'assets/polaroid-3.jpg',
    caption: 'The Dhauladhar range at sunset from Triund, 2025',
    handwriting: 'Triund, 2025',
  },
];

// Keepsakes hanging on the pegboard: three Polaroids (a click on any of them zooms in
// on the board, see desk-focus.js), a pair of scissors, and a keychain that swings
// when clicked.
export function addDeskPegboard({
  THREE,
  materials,
  mat,
  mesh,
  group,
  box,
  cylinder,
  sphere,
  curve,
  texture,
  photoMaterial,
  interactive,
  discoveries,
}) {
  const { steel, charcoal } = materials;

  function ring(radius, tube, x, y, z, material, parent, scaleX = 1, scaleY = 1) {
    const m = mesh(new THREE.TorusGeometry(radius, tube, 10, 40), material, parent);
    m.position.set(x, y, z);
    m.scale.set(scaleX, scaleY, 1);
    return m;
  }

  // A J-shaped steel hook sticking out of the board.
  function hook(x, y, z, parent) {
    curve(
      [
        [x, y + 0.055, z - 0.06],
        [x, y + 0.055, z],
        [x, y - 0.025, z + 0.027],
        [x, y - 0.047, z + 0.05],
        [x, y - 0.018, z + 0.072],
      ],
      0.009,
      steel,
      parent,
    );
  }

  const pegboard = group(ROOM.right, 3.18, PEGBOARD_Z);
  pegboard.name = 'side-wall-pegboard';
  pegboard.rotation.y = -Math.PI / 2;
  box(1.38, 1.52, 0.08, 0, 0, 0.05, mat('#e0dbcc'), pegboard, 0.035);

  const columns = 14;
  const rows = 15;
  const holes = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.018, 6),
    mat('#939c8a'),
    columns * rows,
  );
  const transform = new THREE.Matrix4();
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      transform.makeTranslation((column - 6.5) * 0.09, (row - 7) * 0.091, 0.096);
      holes.setMatrixAt(row * columns + column, transform);
    }
  }
  pegboard.add(holes);

  // A slab with fully rounded ends and softened edges, centred on its own depth.
  function stadium(width, height, thickness) {
    const bevel = Math.min(0.004, thickness / 3);
    const r = width / 2 - bevel;
    const straight = height / 2 - width / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-r, -straight);
    shape.lineTo(-r, straight);
    shape.absarc(0, straight, r, Math.PI, 0, true);
    shape.lineTo(r, -straight);
    shape.absarc(0, -straight, r, 0, Math.PI, true);
    const depth = thickness - 2 * bevel;
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 24,
    });
    geometry.translate(0, 0, -depth / 2);
    return geometry;
  }

  // The clip stays upright on the board while the Polaroid hangs from its jaw. Depths
  // are relative to the Polaroid's centre, which sits 0.025 in front of the board.
  const clipWhite = mat('#f3f0e8', { roughness: 0.5 });
  function clip(x, y, parent) {
    const g = group(x, y, 0, parent);
    const { width, height } = CLIP;
    const plate = mesh(stadium(width, height + 0.01, 0.016), clipWhite, g);
    plate.position.set(0, 0.012, -0.016);
    const lever = mesh(stadium(width, height, 0.018), clipWhite, g);
    lever.position.z = 0.019;
    const pin = cylinder(0.006, 0.006, width + 0.012, 0, -0.01, 0.002, steel, g, 16);
    pin.rotation.z = Math.PI / 2;
  }

  // The Polaroids and their clips share one group, so a click on any of them zooms
  // in on all three.
  const photos = group(0, 0.34, 0.115, pegboard);
  photos.name = 'pegboard-photos';
  photos.userData.caption =
    'Photos on the pegboard: ' + POLAROIDS.map(({ caption }) => caption).join(', ');
  POLAROIDS.forEach(addPolaroid);
  interactive(photos, { type: 'pegboard' });

  function addPolaroid({
    x,
    tilt,
    clipOffset = 0,
    photo,
    rotate,
    verticalCrop = 0.5,
    handwriting,
  }) {
    // The clip sits on the tilted Polaroid's top edge, `clipOffset` from its middle.
    clip(
      x - Math.sin(tilt) * (POLAROID_HEIGHT / 2) + Math.cos(tilt) * clipOffset,
      POLAROID_HEIGHT / 2 - CLIP.grip + CLIP.height / 2 + Math.sin(tilt) * clipOffset,
      photos,
    );

    const print = group(x, 0, 0, photos);
    print.rotation.z = tilt;
    box(
      POLAROID_WIDTH,
      POLAROID_HEIGHT,
      0.012,
      0,
      0,
      0,
      mat('#eee8d9', { roughness: 0.88 }),
      print,
      0.003,
    );

    // Front: the placeholder until the photograph loads, then a cropped photo.
    const image = mesh(
      new THREE.PlaneGeometry(PRINT_WIDTH, PRINT_HEIGHT),
      new THREE.MeshBasicMaterial({ map: photoMaterial, color: '#c9c4bb', toneMapped: false }),
      print,
    );
    image.position.set(0, 0.035, 0.008);
    new THREE.TextureLoader().load(photo, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      if (rotate) {
        t.image = rotateQuarterTurn(t.image);
        t.needsUpdate = true;
      }
      cropToFill(t, verticalCrop);
      image.material.map = t;
      image.material.needsUpdate = true;
    });

    const handwritingTexture = texture(
      (ctx) => {
        ctx.fillStyle = '#605448';
        ctx.textAlign = 'center';
        ctx.font = 'italic 38px Georgia';
        ctx.fillText(handwriting, 320, 64);
      },
      640,
      100,
    );
    const handwritingLine = mesh(
      new THREE.PlaneGeometry(0.276, 0.045),
      new THREE.MeshBasicMaterial({
        map: handwritingTexture,
        transparent: true,
        depthWrite: false,
      }),
      print,
    );
    handwritingLine.position.set(0, -0.157, 0.009);
  }

  // Scissors: two handle loops, two blades, and a pivot screw.
  const scissors = group(-0.37, -0.05, 0.265, pegboard);
  scissors.name = 'pegboard-scissors';
  scissors.rotation.z = -0.1;
  hook(-0.44, 0.02, 0.15, pegboard);
  ring(0.055, 0.017, -0.07, 0, 0, charcoal, scissors, 1, 1.26);
  ring(0.055, 0.017, 0.07, 0, 0, charcoal, scissors, 1, 1.26);
  curve(
    [
      [-0.057, -0.047, 0],
      [-0.031, -0.09, 0],
      [0.008, -0.154, 0],
    ],
    0.017,
    steel,
    scissors,
  );
  curve(
    [
      [0.057, -0.047, 0.015],
      [0.031, -0.09, 0.015],
      [-0.008, -0.154, 0.015],
    ],
    0.017,
    steel,
    scissors,
  );
  function blade(outline, z) {
    const shape = new THREE.Shape();
    shape.moveTo(...outline[0]);
    outline.slice(1).forEach((point) => shape.lineTo(...point));
    shape.closePath();
    const m = mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.012,
        bevelEnabled: true,
        bevelSegments: 1,
        steps: 1,
        bevelSize: 0.003,
        bevelThickness: 0.002,
      }),
      steel,
      scissors,
    );
    m.position.z = z;
  }
  blade(
    [
      [-0.019, -0.12],
      [0.027, -0.15],
      [0.088, -0.43],
      [0.043, -0.35],
    ],
    0,
  );
  blade(
    [
      [0.019, -0.12],
      [-0.027, -0.15],
      [-0.077, -0.43],
      [-0.043, -0.35],
    ],
    0.015,
  );
  const pivot = cylinder(0.018, 0.018, 0.035, 0, -0.15, 0.024, steel, scissors, 20);
  pivot.rotation.x = Math.PI / 2;

  addKeychain();

  // A key ring with a leather fob and three keys (one brass) that swing when clicked.
  function addKeychain() {
    const keychain = group(0.26, -0.07, 0.255, pegboard);
    keychain.name = 'pegboard-keychain';
    hook(0.26, 0.03, 0.15, pegboard);
    ring(0.073, 0.009, 0, 0, 0, steel, keychain);
    const leather = mat('#8e593b', { roughness: 0.83 });
    box(0.102, 0.19, 0.022, 0.1, -0.13, 0.014, leather, keychain, 0.018);
    sphere(0.012, 0.1, -0.065, 0.03, steel, keychain);
    ring(0.024, 0.006, 0.065, -0.046, 0, steel, keychain);

    const keys = [];
    for (const [i, angle] of [-0.36, 0.06, 0.43].entries()) {
      const key = group(-0.014, -0.073, 0.02 + i * 0.026, keychain);
      key.name = 'hanging-key';
      key.rotation.z = angle;
      const metal = i === 1 ? mat('#b49d61', { metalness: 0.78, roughness: 0.31 }) : steel;
      ring(0.038, 0.013, 0, -0.037, 0, metal, key, 1, 0.86);
      box(0.029, 0.19, 0.017, 0, -0.151, 0, metal, key, 0.004);
      for (let tooth = 0; tooth < 3; tooth++) {
        const toothWidth = 0.028 + (tooth % 2) * 0.013;
        box(toothWidth, 0.023, 0.018, 0.019, -0.183 + tooth * 0.035, 0, metal, key, 0.002);
      }
      keys.push({ key, angle });
    }

    discoveries.register('keys', {
      duration: 1450,
      message: 'The keys swing on their hook and settle back into place.',
      update(t) {
        // The swing grows, then dies away to rest by the end.
        const fade = Math.sin(Math.PI * t) * (1 - t);
        keychain.rotation.z = Math.sin(t * Math.PI * 7) * fade * 0.28;
        keys.forEach(({ key, angle }, i) => {
          key.rotation.z = angle + Math.sin(t * Math.PI * 9 + i * 0.5) * fade * 0.21;
        });
      },
      restore() {
        keychain.rotation.z = 0;
        keys.forEach(({ key, angle }) => (key.rotation.z = angle));
      },
    });
    interactive(keychain, { type: 'toy', key: 'keys' });
  }
}

// Returns a canvas holding the image rotated 90° clockwise.
function rotateQuarterTurn(source) {
  const canvas = document.createElement('canvas');
  canvas.width = source.height;
  canvas.height = source.width;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

// Crop the texture to the print's aspect ratio: centred horizontally for a wide
// photo, or at `verticalCrop` for a tall one.
function cropToFill(t, verticalCrop) {
  const aspect = t.image.width / t.image.height;
  const printAspect = PRINT_WIDTH / PRINT_HEIGHT;
  if (aspect > printAspect) {
    t.repeat.x = printAspect / aspect;
    t.offset.x = (1 - t.repeat.x) / 2;
  } else {
    t.repeat.y = aspect / printAspect;
    t.offset.y = (1 - t.repeat.y) * verticalCrop;
  }
}
