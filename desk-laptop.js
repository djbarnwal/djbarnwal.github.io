import { DESK_TOP } from './desk-furniture.js';

const LAPTOP_LINES = ['> hello, world', '> building something new…', '', '  ideas → things'];
const TYPED_REPLY = 'stretch. breathe. carry on.';

// The laptop on its inclined aluminium stand, the notebook beneath it, and the
// keyboard and mouse. Pressing the keyboard "types" a reply onto the laptop screen.
export function addDeskLaptop({
  THREE,
  materials,
  mat,
  mesh,
  box,
  sphere,
  group,
  texture,
  interactive,
  discoveries,
}) {
  const setup = group(-1.99, DESK_TOP, 0.83);
  setup.name = 'laptop-stand-assembly';
  setup.rotation.y = 0.15;

  // Stand: a foot, two arms, and a platform tilted towards the viewer.
  const STAND_TILT = 0.12;
  const aluminium = mat('#777d82', { metalness: 0.75, roughness: 0.3 });
  const stand = group(0, 0, 0, setup);
  stand.name = 'laptop-stand';
  const standFoot = box(0.7, 0.038, 0.6, 0, 0.019, 0, aluminium, stand, 0.022);
  standFoot.name = 'laptop-stand-foot';
  // Arms reach exactly to the underside of the tilted platform.
  const armTop = 0.36 + 0.16 * Math.tan(STAND_TILT) - 0.035 / Math.cos(STAND_TILT);
  for (const x of [-0.26, 0.26]) {
    box(0.045, armTop - 0.038, 0.06, x, (armTop + 0.038) / 2, -0.16, aluminium, stand, 0.01);
  }
  const deck = group(0, 0.36, 0, stand);
  deck.rotation.x = STAND_TILT;
  deck.name = 'inclined-laptop-platform';
  const plate = box(0.82, 0.035, 0.66, 0, -0.0175, 0, aluminium, deck, 0.018);
  plate.name = 'laptop-platform';
  for (const x of [-0.32, 0.32])
    box(0.06, 0.036, 0.035, x, 0.015, 0.33, materials.metal, deck, 0.007);

  // Laptop: base with keyboard and trackpad, and an open lid with a live screen.
  const laptop = group(0, 0.0225, 0, deck);
  laptop.name = 'raised-laptop';
  const laptopShell = mat('#626970', { metalness: 0.58, roughness: 0.36 });
  const laptopBase = box(0.9, 0.045, 0.66, 0, 0, 0, laptopShell, laptop, 0.016);
  laptopBase.name = 'laptop-base';
  const lid = group(0, 0.35, -0.3, laptop);
  lid.rotation.x = -0.12;
  box(0.9, 0.59, 0.045, 0, 0, 0, materials.metal, lid, 0.02);

  function paintLaptop(ctx, reply = '') {
    ctx.fillStyle = '#182c39';
    ctx.fillRect(0, 0, 1024, 640);
    ctx.fillStyle = '#a9c39d';
    ctx.font = '25px monospace';
    LAPTOP_LINES.forEach((line, i) => ctx.fillText(line, 45, 90 + i * 66));
    if (reply) {
      ctx.fillStyle = '#e1c392';
      ctx.fillText('> ' + reply, 45, 420);
    }
  }
  const laptopScreen = texture((ctx) => paintLaptop(ctx));
  const display = mesh(
    new THREE.PlaneGeometry(0.83, 0.52),
    new THREE.MeshBasicMaterial({ map: laptopScreen, color: '#cbd4df', toneMapped: false }),
    lid,
  );
  display.position.z = 0.03;
  box(0.58, 0.012, 0.26, 0, 0.026, -0.05, materials.metal, laptop, 0.007);
  box(0.25, 0.005, 0.17, 0, 0.027, 0.19, mat('#919a9f'), laptop, 0.01);
  interactive(laptop, { type: 'open', key: 'about' });

  // Notebook tucked under the stand: two covers, pages, spine and a bookmark ribbon.
  const notebook = group(0, 0.039, 0.14, setup);
  notebook.name = 'notebook-under-laptop';
  const cover = mat('#a18760', { roughness: 0.93 });
  box(0.59, 0.009, 0.51, 0, 0.005, 0, cover, notebook, 0.005);
  box(0.57, 0.025, 0.485, 0.005, 0.022, 0, materials.cream, notebook, 0.003);
  box(0.59, 0.009, 0.51, 0, 0.039, 0, cover, notebook, 0.005);
  box(0.025, 0.045, 0.51, -0.285, 0.022, 0, mat('#746648'), notebook, 0.003);
  box(0.012, 0.002, 0.514, 0.215, 0.045, 0, mat('#524f41'), notebook, 0.001);

  // Keyboard: 4 rows of 13 keys plus a space bar, directly on the desk.
  const keyboard = group();
  keyboard.name = 'desk-keyboard';
  box(1.21, 0.06, 0.44, 0.19, DESK_TOP + 0.03, 1.01, materials.metal, keyboard, 0.025);
  const keyMaterial = mat('#59615d');
  const keys = [];
  for (let row = 0; row < 4; row++)
    for (let column = 0; column < 13; column++) {
      const isEscape = row === 0 && column === 0;
      const key = box(
        0.066,
        0.022,
        0.068,
        -0.33 + column * 0.085,
        1.799,
        0.86 + row * 0.086,
        isEscape ? mat('#cca979') : keyMaterial.clone(),
        keyboard,
        0.009,
      );
      keys.push({ key, column, y: key.position.y });
    }
  const spaceBar = box(0.39, 0.023, 0.058, 0.13, 1.799, 1.169, mat('#baad85'), keyboard, 0.009);
  keys.push({ key: spaceBar, column: 13, y: spaceBar.position.y });
  // Remember each key's resting glow so the animation can restore it exactly.
  for (const pose of keys) {
    pose.emissive = pose.key.material.emissive.clone();
    pose.intensity = pose.key.material.emissiveIntensity;
  }

  let typedLength = 0;
  function showTypedReply(length) {
    if (length === typedLength) return;
    typedLength = length;
    paintLaptop(laptopScreen.image.getContext('2d'), TYPED_REPLY.slice(0, length));
    laptopScreen.needsUpdate = true;
  }

  discoveries.register('keyboard', {
    duration: 2100,
    message: 'The keyboard types a little reminder: ' + TYPED_REPLY,
    update(t) {
      // A wave of key presses sweeps left to right across the columns.
      for (const { key, column, y } of keys) {
        const pulse = Math.max(0, 1 - Math.abs(t * 18 - column - 1.5) / 1.4);
        key.position.y = y - 0.014 * pulse * pulse;
        key.material.emissive.set('#c9a16a');
        key.material.emissiveIntensity = pulse * 0.38;
      }
      showTypedReply(Math.min(TYPED_REPLY.length, Math.floor(t * 1.4 * TYPED_REPLY.length)));
    },
    restore() {
      for (const { key, y, emissive, intensity } of keys) {
        key.position.y = y;
        key.material.emissive.copy(emissive);
        key.material.emissiveIntensity = intensity;
      }
      showTypedReply(0);
    },
  });
  interactive(keyboard, { type: 'toy', key: 'keyboard' });

  const mouse = sphere(0.13, 1.14, 1.795, 0.99, materials.metal);
  mouse.scale.set(0.7, 0.4, 1.1);
}
