import { UPPER_SHELF_SHIFT } from './desk-layout.js';

// Room light levels with the desk lights on, and with every desk light off.
const ROOM_LIGHT = {
  hemisphere: { on: 0.32, off: 0.12 },
  key: { on: 0.58, off: 0.1 },
  fill: { on: 0.18, off: 0.07 },
  sideWall: { on: 0.13, off: 0.05 },
  environment: { on: 0.15, off: 0.06 },
};

// How quickly lights fade towards their new level (higher is faster).
const FADE_SPEED = 6;

// Room lighting plus four switchable light groups: the upper and lower warm lamps on the
// shelving, white shelf lights, and the purple backlight. Each group has real light
// sources, glowing materials, and soft glow sprites on the wall, all faded together.
export function addDeskLighting({
  THREE,
  scene,
  materials,
  mat,
  mesh,
  box,
  cylinder,
  curve,
  group,
  texture,
  interactive,
}) {
  const hemisphere = new THREE.HemisphereLight('#fff4e4', '#726f69', ROOM_LIGHT.hemisphere.on);
  scene.add(hemisphere);

  // Main shadow-casting light from the upper left.
  const key = new THREE.DirectionalLight('#fff1df', ROOM_LIGHT.key.on);
  key.position.set(-3, 9, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -6, near: 0.5, far: 30 });
  key.shadow.normalBias = 0.018;
  key.shadow.bias = -0.00015;
  key.shadow.radius = 4;
  scene.add(key);

  const fill = new THREE.DirectionalLight('#d9dffa', ROOM_LIGHT.fill.on);
  fill.position.set(7, 5, -1);
  scene.add(fill);
  const { sideWall } = materials;
  sideWall.emissiveIntensity = ROOM_LIGHT.sideWall.on;

  // Everything that belongs to each switchable group, with its full-brightness value.
  const channels = {
    upperLamp: { lights: [], materials: [], glows: [] },
    lowerLamp: { lights: [], materials: [], glows: [] },
    white: { lights: [], materials: [], glows: [] },
    purple: { lights: [], materials: [], glows: [] },
  };

  function pointLight(channel, color, intensity, x, y, z, distance) {
    const light = new THREE.PointLight(color, intensity, distance, 1.6);
    light.position.set(x, y, z);
    scene.add(light);
    channels[channel].lights.push({ light, intensity });
    return light;
  }

  function glowingMaterial(channel, color, intensity = 1) {
    const m = mat(color, { emissive: color, emissiveIntensity: intensity });
    channels[channel].materials.push({ m, intensity });
    return m;
  }

  // A soft radial pool of light painted on the wall behind a light source.
  function wallGlow(channel, color, x, y, z, width, height, opacity) {
    const gradient = texture(
      (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, color);
        g.addColorStop(0.3, color + 'aa');
        g.addColorStop(1, color + '00');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      },
      256,
      256,
    );
    const m = new THREE.MeshBasicMaterial({
      map: gradient,
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: false,
    });
    const plane = mesh(new THREE.PlaneGeometry(width, height), m);
    plane.position.set(x, y, z);
    plane.castShadow = false;
    plane.receiveShadow = false;
    channels[channel].glows.push({ m, opacity });
    return plane;
  }

  // Brass table lamp with a pleated, glowing shade, switched as its own light group.
  function lamp(channel, x, y, z, size) {
    const g = group(x, y, z);
    const brass = mat('#b69b69', { metalness: 0.3, roughness: 0.55 });
    cylinder(0.18 * size, 0.21 * size, 0.05 * size, 0, 0.027 * size, 0, brass, g);
    cylinder(0.025 * size, 0.03 * size, 0.54 * size, 0, 0.31 * size, 0, brass, g, 12);
    const shade = glowingMaterial(channel, '#e8b765', 0.7);
    cylinder(0.23 * size, 0.31 * size, 0.42 * size, 0, 0.72 * size, 0, shade, g, 32);
    const pleat = mat('#bc874d', { emissive: '#a86d27', emissiveIntensity: 0.18 });
    channels[channel].materials.push({ m: pleat, intensity: 0.18 });
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const dx = Math.cos(angle);
      const dz = Math.sin(angle);
      curve(
        [
          [dx * 0.313 * size, 0.51 * size, dz * 0.313 * size],
          [dx * 0.233 * size, 0.93 * size, dz * 0.233 * size],
        ],
        0.006 * size,
        pleat,
        g,
      );
    }
    pointLight(channel, '#ffbc59', 4.5 * size, x, y + 0.59 * size, z, 4.5);
    interactive(g, { type: 'light', key: channel });
  }

  // Warm: two lamps on the shelving unit, each with its own switch.
  lamp('upperLamp', -2.65, 4.45, -0.32, 0.95);
  // Sized to clear the shelf above (its underside is at 3.08; the lamp is 0.93 × size tall).
  lamp('lowerLamp', -3.16, 2.2, 0.05, 0.85);
  wallGlow('upperLamp', '#ffc56d', -2.67, 4.91, -1.311, 3.1, 2.7, 0.48);
  wallGlow('lowerLamp', '#ffc56d', -3.05, 2.77, -1.309, 2.8, 2.7, 0.35);

  // White: a mushroom lamp on the lower wall shelf...
  const mushroom = group(1.92, 3.6, -0.8);
  // Kept soft: brighter glass blooms into a glare right above the monitors.
  const milkGlass = glowingMaterial('white', '#ffffdf', 0.25);
  cylinder(0.13, 0.18, 0.34, 0, 0.18, 0, milkGlass, mushroom);
  const cap = mesh(
    new THREE.SphereGeometry(0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    milkGlass,
    mushroom,
  );
  cap.position.y = 0.36;
  cylinder(0.3, 0.3, 0.025, 0, 0.365, 0, milkGlass, mushroom);
  pointLight('white', '#fff6ca', 0.9, 1.92, 4.06, -0.65, 4.5);
  interactive(mushroom, { type: 'light', key: 'white' });
  wallGlow('white', '#fff5c8', 1.87, 4.01, -1.308, 2.5, 2.2, 0.1);

  // ...and fairy lights draped along both wall shelves, a bulb on every other dip. Each
  // is a clear glass bulb hanging from a brass socket with a tiny filament inside; only
  // the filament is bright enough to bloom, so the glass stays visible around it.
  const socket = mat('#a08a5c', { metalness: 0.6, roughness: 0.4 });
  const glass = mat('#fff8ec', {
    roughness: 0.04,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    envMapIntensity: 2.5,
    emissive: '#ffb85c',
    emissiveIntensity: 0.18,
  });
  channels.white.materials.push({ m: glass, intensity: 0.18 });
  const support = mat('#6b6156', { metalness: 0.6, roughness: 0.45 });
  const filament = glowingMaterial('white', '#ffc46b', 15);
  const glassShape = new THREE.SphereGeometry(0.03, 20, 14);
  glassShape.scale(1, 1.2, 1);
  function fairyBulb(x, y, z) {
    const g = group(x, y, z);
    cylinder(0.011, 0.009, 0.022, 0, -0.011, 0, socket, g, 12);
    const shell = mesh(glassShape, glass, g);
    shell.position.y = -0.056;
    shell.castShadow = false;
    // Two thin support wires down from the socket, with the filament slung between them.
    for (const side of [-1, 1]) {
      curve(
        [
          [side * 0.005, -0.022, 0],
          [side * 0.009, -0.038, 0],
          [side * 0.012, -0.052, 0],
        ],
        0.0008,
        support,
        g,
      ).castShadow = false;
    }
    curve(
      [
        [-0.012, -0.052, 0],
        [-0.006, -0.058, 0],
        [0, -0.06, 0],
        [0.006, -0.058, 0],
        [0.012, -0.052, 0],
      ],
      0.0024,
      filament,
      g,
    ).castShadow = false;
  }
  for (const [shelfY, shift] of [[3.72, 0], [4.8, UPPER_SHELF_SHIFT]]) {
    const points = [];
    for (let i = 0; i < 13; i++) {
      const x = -1.8 + shift + i * 0.355;
      const y = shelfY - 0.07 * Math.sin((i * Math.PI) / 2);
      points.push([x, y, -0.62]);
      if (i % 2 === 0) fairyBulb(x, y, -0.6);
    }
    curve(points, 0.006, mat('#b9b293'));
  }

  // Purple: an LED strip under the lower wall shelf.
  const purpleStrip = box(
    3.6,
    0.02,
    0.07,
    0.16,
    3.453,
    -0.95,
    glowingMaterial('purple', '#a283e6', 0.8),
  );
  interactive(purpleStrip, { type: 'light', key: 'purple' });
  wallGlow('purple', '#b17cef', 0.15, 2.92, -1.306, 4.2, 2.7, 0.38);
  pointLight('purple', '#a36aff', 3.8, 0.12, 3.18, -1.08, 4);

  let switchedOn = Object.fromEntries(Object.keys(channels).map((name) => [name, true]));
  const brightness = Object.fromEntries(Object.keys(channels).map((name) => [name, 1]));

  // Fade every light a step towards its target. With `instant`, jump straight there.
  function update(seconds, instant = false) {
    const step = instant ? 1 : 1 - Math.exp(-seconds * FADE_SPEED);
    const level = Object.values(switchedOn).some(Boolean) ? 'on' : 'off';
    const lerp = THREE.MathUtils.lerp;
    hemisphere.intensity = lerp(hemisphere.intensity, ROOM_LIGHT.hemisphere[level], step);
    key.intensity = lerp(key.intensity, ROOM_LIGHT.key[level], step);
    fill.intensity = lerp(fill.intensity, ROOM_LIGHT.fill[level], step);
    sideWall.emissiveIntensity = lerp(sideWall.emissiveIntensity, ROOM_LIGHT.sideWall[level], step);
    scene.environmentIntensity = lerp(
      scene.environmentIntensity,
      ROOM_LIGHT.environment[level],
      step,
    );
    for (const [name, channel] of Object.entries(channels)) {
      const gain = (brightness[name] = lerp(brightness[name], switchedOn[name] ? 1 : 0, step));
      for (const { light, intensity } of channel.lights) light.intensity = intensity * gain;
      for (const { m, intensity } of channel.materials) m.emissiveIntensity = intensity * gain;
      for (const { m, opacity } of channel.glows) m.opacity = opacity * gain;
    }
  }

  function setState(state, instant) {
    switchedOn = { ...state };
    if (instant) update(0, true);
  }

  return { update, setState, brightness };
}
