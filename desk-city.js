const GROUND = -12.8;
const ORIGIN_Z = 2.3;
const BUILDING_SETBACK = 13;
const ARCH = { BRICK: 0, TERRACE: 1, STONE: 2, HOUSE: 3, GLASS: 4, SOLID: 5 };
const { BRICK, TERRACE, STONE, HOUSE, GLASS, SOLID } = ARCH;

// Distances are measured from the window. The tall blocks sit behind a belt of
// low, flat-roofed houses and trees, with their roofs close to the eye line.
export function addDeskCity({ THREE, scene }, windowX) {
  let seed = 83291;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const range = (min, max) => min + (max - min) * random();
  const pick = (items) => items[Math.floor(random() * items.length)];
  const position = (distance, angle) => ({
    x: windowX + Math.cos(angle) * distance,
    z: ORIGIN_Z + Math.sin(angle) * distance,
  });
  const clock = { value: 0 };
  const structures = [];
  const crowns = [];
  const lights = [];
  const neighborhoods = [];
  const concrete = ['#b6b1a9', '#aeb1b4', '#c5b3a1', '#bfc2bf', '#a9a1aa', '#c7bab3'];
  const canopy = ['#263838', '#2d403d', '#293c36', '#33443f', '#3c4940'];

  function block({ x, z }, width, depth, height, floors, style, color, rotation) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const add = (dx, y, dz, w, h, d, tint, stories = 0, type = SOLID) => {
      structures.push({
        x: x + dx * cos + dz * sin,
        z: z - dx * sin + dz * cos,
        y, w, h, d, color: tint, rotation, stories, type, id: range(1, 800),
      });
    };
    const section = (bottom, top, w, d, dx = 0, dz = 0) => {
      const fraction = top - bottom;
      add(dx, GROUND + height * (bottom + fraction / 2), dz, w, height * fraction, d,
        color, Math.max(1, Math.round(floors * fraction)), style);
    };
    const cap = (level, w, d, tint, dx = 0, dz = 0, thickness = 0.16) => {
      add(dx, GROUND + height * level, dz, w, thickness, d, tint);
    };

    const roof = GROUND + height;
    if (style === TERRACE) {
      const ledge = '#c5bdb0';
      section(0, 0.67, width, depth);
      section(0.67, 0.87, width * 0.77, depth * 0.77, width * 0.07, -depth * 0.10);
      section(0.87, 1, width * 0.55, depth * 0.57, width * 0.13, -depth * 0.17);
      cap(0.67, width * 1.035, depth * 1.035, ledge);
      cap(0.87, width * 0.79, depth * 0.80, ledge, width * 0.07, -depth * 0.10);
      cap(1, width * 0.57, depth * 0.60, ledge, width * 0.13, -depth * 0.17);
    } else if (style === GLASS) {
      section(0, 0.86, width, depth);
      section(0.86, 1, width * 0.68, depth * 0.81, -width * 0.10, -depth * 0.05);
      cap(0.86, width, depth, '#59656f');
      cap(1, width * 0.70, depth * 0.84, '#8c989e', -width * 0.10, -depth * 0.05);
    } else {
      section(0, 1, width, depth);
      if (style === BRICK) {
        cap(0.98, width * 1.035, depth * 1.04, '#b49282', 0, 0, 0.29);
        add(width * 0.08, roof + 0.40, -depth * 0.12, width * 0.60, 0.80, depth * 0.58, '#9b796d');
      } else if (style === STONE) {
        cap(1, width * 1.025, depth * 1.04, '#b9ae97');
        add(-width * 0.39, roof - height * 0.34, depth * 0.505, width * 0.14, height * 0.71, depth * 0.075, '#d3c6ad');
        add(-width * 0.20, roof + 0.36, depth * 0.12, width * 0.25, 0.79, depth * 0.34, color);
      } else {
        cap(1, width * 1.04, depth * 1.06, pick(['#baada3', '#a48877', '#aaa8a6']));
        add(width * 0.18, roof + 0.32, -depth * 0.14, width * range(0.31, 0.57), range(0.46, 0.67), depth * 0.52, color);
      }
    }

    if (style !== HOUSE && random() < 0.32) {
      lights.push({ x: x - width * 0.14, y: roof + 0.88, z, size: 0.29, color: '#ffac93', power: 1.3 });
    }
  }

  // The back row fills gaps between the main developments.
  for (let angle = -1.49; angle < 0.30; angle += range(0.08, 0.13)) {
    block(position(range(96, 107) + BUILDING_SETBACK, angle), range(3.2, 5.3), range(2.6, 4.5),
      range(7.6, 11.7), Math.round(range(12, 18)), pick([BRICK, STONE, GLASS]), pick(concrete), range(-0.22, 0.26));
  }

  // Each complex has its own footprint, roof profile and facade. Sibling
  // buildings repeat some materials but sit at different heights and setbacks.
  for (const [angle, radius, buildings] of [
    [-1.40, 84, [
      [-0.061, 3, 4.1, 3.4, 10.0, STONE, '#b2a694'],
      [0.012, 1, 5.7, 4.2, 11.2, BRICK, '#ad8980'],
    ]],
    [-1.18, 76, [
      [-0.069, 3, 4.8, 3.8, 10.2, TERRACE, '#bfb5a5'],
      [0.012, 0, 5.8, 4.3, 11.4, BRICK, '#ae8070'],
    ]],
    [-0.96, 84, [
      [-0.064, 1, 3.7, 3.3, 12.8, GLASS, '#7e98a5'],
      [-0.008, 0, 6.8, 4.3, 12.1, BRICK, '#b18572'],
      [0.070, -4, 6.1, 4.8, 10.5, TERRACE, '#d0c5b0'],
    ]],
    [-0.70, 81, [
      [-0.073, 1, 4.2, 4.2, 12.3, STONE, '#bdab8d'],
      [-0.015, -2, 6.9, 4.4, 10.2, TERRACE, '#c5bdb3'],
      [0.070, 2, 4.0, 3.7, 12.6, GLASS, '#8398a0'],
    ]],
    [-0.47, 89, [
      [-0.055, 0, 5.7, 4.1, 10.0, BRICK, '#a77b73'],
      [0.011, 2, 4.0, 3.9, 11.8, STONE, '#c3ac91'],
    ]],
    [-0.22, 80, [
      [-0.053, 0, 5.1, 4.2, 12.3, GLASS, '#8c9ba8'],
      [0.020, 2, 6.2, 4.5, 10.8, TERRACE, '#c5bdb2'],
    ]],
    [0.05, 88, [
      [-0.058, 1, 4.2, 3.7, 10.5, STONE, '#c0ae9a'],
      [0.011, 1, 6.0, 4.0, 11.6, BRICK, '#b39483'],
    ]],
  ]) {
    const rotation = range(-0.20, 0.23);
    for (const [offset, setback, w, d, h, style, color] of buildings) {
      const spot = position(radius + BUILDING_SETBACK + setback, angle + offset);
      block(spot, w, d, h, Math.round(h / 0.65), style, color, rotation);
      if (random() < 0.68) {
        lights.push({ x: spot.x - range(2, 4), y: GROUND + range(1.2, 2.4),
          z: spot.z + range(-1.8, 1.8), size: range(0.8, 1.3), color: '#ffd4a2', power: 1.65 });
      }
    }
  }

  for (const [angle, radius, spread, rows] of [
    [-1.28, 58, 0.18, 3], [-1.02, 62, 0.18, 3], [-0.75, 56, 0.15, 3],
    [-0.45, 62, 0.15, 2], [-0.17, 58, 0.17, 3], [0.08, 61, 0.17, 2],
  ]) {
    const distanceToPlot = radius + BUILDING_SETBACK * 0.7;
    neighborhoods.push({ angle, radius: distanceToPlot, spread });
    const rotation = range(-0.20, 0.36);
    for (let row = 0; row < rows; row++) {
      for (let a = angle - spread / 2; a < angle + spread / 2; a += range(0.042, 0.062)) {
        const distance = distanceToPlot + row * 4.7 + range(-1.1, 1.1);
        const floors = pick([5, 5, 6, 7, 8]);
        block(position(distance, a + range(-0.012, 0.012)), range(2.4, 3.6), range(2.1, 3.2),
          floors * range(0.59, 0.67), floors, HOUSE, pick(concrete), rotation);
      }
    }
  }

  for (let i = 0; i < 670; i++) {
    const distance = range(28, 90);
    const angle = range(-1.53, 0.35);
    // Clear the building plots and leave irregular openings in the canopy.
    if (neighborhoods.some(({ angle: a, radius, spread }) =>
      Math.abs(angle - a) < spread * 0.57 && distance > radius - 2 && distance < radius + 13)) continue;
    if (Math.sin(angle * 37 + distance * 0.16) * Math.cos(distance * 0.29) > 0.59) continue;
    const { x, z } = position(distance, angle);
    const height = range(1.55, 3.35);
    const width = height * range(0.32, 0.58);
    const color = pick(canopy);
    // Overlapping crowns make an irregular treetop silhouette at window scale.
    for (let j = 0; j < 3; j++) {
      crowns.push({
        x: x + width * range(-0.52, 0.52), z: z + width * range(-0.57, 0.57),
        y: GROUND + height * range(0.59, 0.81),
        w: width * range(0.61, 1.02), h: height * range(0.21, 0.35), d: width * range(0.68, 1.07),
        rotation: range(0, Math.PI), color,
      });
    }
  }

  const geometry = new THREE.BoxGeometry();
  const grids = [];
  for (const { w, d, stories, id } of structures) {
    grids.push(Math.max(1, Math.round(d * 1.45)), Math.max(1, Math.round(w * 1.45)), stories, id);
  }
  geometry.setAttribute('facadeGrid', new THREE.InstancedBufferAttribute(new Float32Array(grids), 4));
  geometry.setAttribute('facadeType', new THREE.InstancedBufferAttribute(
    new Float32Array(structures.map(({ type }) => type)), 1,
  ));
  addInstances(geometry, cityMaterial(facadeVertex, facadeFragment), structures);
  addInstances(new THREE.IcosahedronGeometry(1, 1), cityMaterial(treeVertex, treeFragment), crowns);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(230, 270), cityMaterial(groundVertex, groundFragment));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(windowX + 68, GROUND - 0.015, -42);
  scene.add(ground);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(100, 32, 20),
    cityMaterial(skyVertex, skyFragment, { side: THREE.BackSide, depthWrite: false, uniforms: { clock } }),
  );
  sky.position.set(windowX, 0, ORIGIN_Z);
  sky.renderOrder = 100;
  sky.frustumCulled = false;
  scene.add(sky);

  const lightGeometry = new THREE.PlaneGeometry(1, 1);
  lightGeometry.setAttribute('lightPower', new THREE.InstancedBufferAttribute(
    new Float32Array(lights.map(({ power }) => power)), 1,
  ));
  addInstances(lightGeometry, cityMaterial(lightVertex, lightFragment, {
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }), lights.map((light) => ({ ...light, w: light.size, h: light.size, d: light.size, rotation: 0 })));

  function cityMaterial(vertexShader, fragmentShader, options) {
    return new THREE.ShaderMaterial({ vertexShader, fragmentShader, ...options });
  }

  function addInstances(geometry, material, objects) {
    const mesh = new THREE.InstancedMesh(geometry, material, objects.length);
    const transform = new THREE.Object3D();
    const color = new THREE.Color();
    objects.forEach(({ x, y, z, w, h, d, color: tint, rotation }, index) => {
      transform.position.set(x, y, z);
      transform.scale.set(w, h, d);
      transform.rotation.y = rotation;
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      mesh.setColorAt(index, color.set(tint));
    });
    scene.add(mesh);
  }

  return (seconds, reducedMotion) => {
    if (!reducedMotion) clock.value += seconds;
  };
}

const noise = /* glsl */ `
  float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), u.x), u.y);
  }
`;

const atmosphere = /* glsl */ `
  vec3 aerialPerspective(vec3 color, vec3 world) {
    float distanceToEye = length(world - cameraPosition);
    float haze = 1.0 - exp(-max(distanceToEye - 20.0, 0.0) * 0.0057);
    float low = 1.0 - smoothstep(-12.8, 1.0, world.y);
    return mix(color, vec3(0.105, 0.104, 0.149), haze * (0.65 + 0.22 * low));
  }
`;

const outputColor = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

const facadeVertex = /* glsl */ `
  attribute vec4 facadeGrid;
  attribute float facadeType;
  varying vec4 vGrid;
  varying float vType;
  varying vec3 vTint;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec2 vUv;

  void main() {
    vec4 point = instanceMatrix * vec4(position, 1.0);
    vWorld = (modelMatrix * point).xyz;
    vGrid = facadeGrid;
    vType = facadeType;
    vTint = instanceColor;
    vNormal = normal;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * point;
  }
`;

const facadeFragment = /* glsl */ `
  varying vec4 vGrid;
  varying float vType;
  varying vec3 vTint;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec2 vUv;

  ${noise}
  ${atmosphere}

  float boxMask(vec2 p, vec2 lo, vec2 hi, vec2 aa) {
    vec2 mask = smoothstep(lo - aa, lo + aa, p) * (1.0 - smoothstep(hi - aa, hi + aa, p));
    return mask.x * mask.y;
  }

  void main() {
    float side = abs(vNormal.x);
    float roof = max(vNormal.y, 0.0);
    float wear = 0.84 + 0.28 * noise(vWorld.xz * 1.8 + vWorld.y * 0.4)
      + 0.11 * noise(vUv * 31.0 + vGrid.w);
    int style = int(vType + 0.5);
    bool brick = style == ${BRICK};
    bool terrace = style == ${TERRACE};
    bool stone = style == ${STONE};
    bool house = style == ${HOUSE};
    bool glazed = style == ${GLASS};
    float daylight = mix(0.31, 0.47, side) + roof * 0.26;
    if (house || terrace) daylight += 0.09;
    vec3 wall = vTint * daylight * vec3(0.91, 0.95, 1.05) * wear;

    if (vGrid.z > 0.0 && abs(vNormal.y) < 0.5) {
      vec2 grid = vUv * vec2(mix(vGrid.y, vGrid.x, side), vGrid.z);
      vec2 cell = floor(grid);
      vec2 at = fract(grid);
      vec2 aa = clamp(fwidth(grid) * 0.42, vec2(0.011), vec2(0.32));
      float id = vGrid.w + vNormal.x * 17.0 + vNormal.z * 11.0;
      float unit = hash(cell + id);
      float column = hash(vec2(cell.x, id));
      float stack = hash(vec2(floor(cell.x / 2.0), id * 0.21));
      float grouping = noise(vec2(cell.x * 0.40, cell.y * 0.24) + id);
      float last = step(vGrid.z - 1.0, cell.y);
      float base = 1.0 - step(1.0, cell.y);
      float balconies = terrace ? 1.0 : (stone ? step(0.55, stack) : 0.0);
      float stairwell = boxMask(vUv, vec2(0.40, 0.04), vec2(0.56, 0.96), fwidth(vUv));
      if (brick) {
        // Pale concrete surrounds set the paired windows apart from the masonry.
        float bays = step(0.44, stack) * boxMask(at, vec2(0.04, -1.0), vec2(0.96, 2.0), aa);
        wall = mix(wall, vec3(0.212, 0.152, 0.118) * (0.87 + unit * 0.15), bays * 0.71);
      } else if (stone) {
        wall = mix(wall, wall * 0.52, stairwell * 0.72);
        wall = mix(wall, wall * 1.19, (1.0 - stairwell) * step(0.72, column));
      } else if (glazed) {
        wall = mix(wall * 0.74, vec3(0.097, 0.139, 0.176), step(0.59, column) * 0.55);
      }
      wall *= mix(1.0, 0.65, last * 0.62 + base * 0.38);
      wall *= 1.0 - 0.10 * (1.0 - smoothstep(0.0, 0.20, at.y));

      float inset = terrace ? 0.12 : (glazed ? 0.055 : (brick ? 0.23 : 0.28));
      if (stone) inset -= balconies * 0.10;
      vec2 lo = vec2(inset, glazed ? 0.26 : 0.28);
      vec2 hi = vec2(1.0 - inset, glazed ? 0.83 : (brick ? 0.88 : 0.81));
      float recess = boxMask(at, lo - 0.05, hi + 0.05, aa);
      float glass = boxMask(at, lo, hi, aa);
      float muntin = boxMask(at, vec2(0.46, lo.y), vec2(0.52, hi.y), aa);
      float rail = boxMask(at, vec2(0.02, 0.13), vec2(0.98, 0.25), aa) * balconies;
      float occupied = step(0.83, unit + 0.21 * (grouping - 0.45) + 0.07 * balconies);
      float blinds = boxMask(at, vec2(lo.x, mix(lo.y, hi.y, 0.43 + unit * 0.31)), hi, aa);
      float interior = hash(cell + id * 0.48);
      vec3 lamp = mix(vec3(1.25, 0.56, 0.16), vec3(0.79, 0.79, 0.71), interior);
      float brightness = mix(0.27, 0.99, hash(cell + id * 0.33));
      brightness += step(0.985, unit) * 1.00;
      vec3 dark = mix(wall * 0.21, vec3(0.048, 0.055, 0.081), interior * 0.68);
      if (glazed) {
        dark = mix(vec3(0.035, 0.067, 0.090), vec3(0.116, 0.161, 0.193), column * 0.68 + grouping * 0.32);
        occupied *= 0.63;
      }
      vec3 room = mix(dark, lamp * brightness * (1.0 - 0.65 * blinds), occupied);
      wall = mix(wall, wall * 0.51, recess);
      wall = mix(wall, room, glass * (1.0 - muntin * (glazed ? 0.19 : 0.64)));
      wall = mix(wall, wall * 0.52 + vec3(0.028, 0.025, 0.030), rail);
      if (terrace) {
        float slab = smoothstep(0.04 - aa.y, 0.04 + aa.y, at.y)
          * (1.0 - smoothstep(0.16 - aa.y, 0.16 + aa.y, at.y));
        wall = mix(wall, vTint * daylight * 1.17, slab);
      }
      float spill = boxMask(at, lo - 0.11, hi + 0.10, aa) * (1.0 - glass);
      wall += lamp * brightness * occupied * spill * 0.05;
      // Keep the facade from turning into a checkerboard when a floor is subpixel.
      float footprint = max(fwidth(grid.x), fwidth(grid.y));
      wall = mix(wall, vTint * daylight * 0.75, smoothstep(0.68, 1.4, footprint) * 0.48);
    }

    gl_FragColor = vec4(aerialPerspective(wall, vWorld), 1.0);
    ${outputColor}
  }
`;

const treeVertex = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vTint;
  varying vec3 vNormal;
  void main() {
    vec4 point = instanceMatrix * vec4(position, 1.0);
    vWorld = (modelMatrix * point).xyz;
    vTint = instanceColor;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * point;
  }
`;

const treeFragment = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vTint;
  varying vec3 vNormal;
  ${noise}
  ${atmosphere}
  void main() {
    vec2 leaf = vWorld.xz + vWorld.y * vec2(0.62, 0.79);
    float texture = 0.50 + 0.44 * noise(leaf * 3.8) + 0.20 * noise(leaf * 12.5);
    float light = 0.29 + 0.42 * smoothstep(-0.62, 1.0, vNormal.y);
    vec3 foliage = aerialPerspective(vTint * texture * light, vWorld);
    gl_FragColor = vec4(foliage * 0.66, 1.0);
    ${outputColor}
  }
`;

const groundVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  }
`;

const groundFragment = /* glsl */ `
  varying vec3 vWorld;
  ${noise}
  ${atmosphere}
  void main() {
    vec2 p = vWorld.xz;
    float fields = noise(p * 0.13) * 0.70 + noise(p * 0.58) * 0.22 + noise(p * 3.1) * 0.08;
    vec3 ground = mix(vec3(0.012, 0.020, 0.019), vec3(0.035, 0.039, 0.036), smoothstep(0.25, 0.78, fields));
    gl_FragColor = vec4(aerialPerspective(ground, vWorld) * 0.67, 1.0);
    ${outputColor}
  }
`;

const lightVertex = /* glsl */ `
  attribute float lightPower;
  varying vec3 vLight;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vLight = instanceColor * lightPower;
    vec4 center = modelViewMatrix * instanceMatrix[3];
    float size = length(instanceMatrix[0].xyz);
    gl_Position = projectionMatrix * (center + vec4(position.xy * size, 0.0, 0.0));
  }
`;

const lightFragment = /* glsl */ `
  varying vec3 vLight;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float halo = exp(-r * r * 8.0) * (1.0 - smoothstep(0.45, 1.0, r));
    gl_FragColor = vec4(vLight, halo);
    ${outputColor}
  }
`;

const skyVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
    gl_Position.z = gl_Position.w * 0.99998;
  }
`;

const skyFragment = /* glsl */ `
  uniform float clock;
  varying vec3 vWorld;
  ${noise}
  void main() {
    vec3 direction = normalize(vWorld - cameraPosition);
    float elevation = direction.y;
    float bearing = atan(direction.z, direction.x);
    float fade = smoothstep(-0.09, 0.40, elevation);
    float afterglow = exp(-pow((bearing + 0.79) * 1.35, 2.0));
    vec3 horizon = mix(vec3(0.158, 0.127, 0.206), vec3(0.232, 0.153, 0.232), afterglow);
    vec3 sky = mix(horizon, vec3(0.066, 0.064, 0.143), fade);

    // Perspective compresses the wisps toward the horizon; higher clouds have
    // broader shapes and darker undersides.
    float height = max(elevation + 0.24, 0.065);
    vec2 p = vec2(bearing * 2.9 / (height + 0.40), log(height) * 4.8);
    p.x -= clock * 0.012;
    p.y += sin(bearing * 4.1) * 0.45;
    vec2 warp = vec2(noise(p * 0.71 + 16.7), noise(p * 0.83 - 6.1));
    p += (warp - 0.5) * 1.50;
    float cloud = noise(p) * 0.54 + noise(p * 2.16 + 5.1) * 0.28
      + noise(p * 4.54 - 13.1) * 0.12 + noise(p * 9.6) * 0.06;
    float density = smoothstep(0.33, 0.73, cloud) * smoothstep(-0.11, 0.15, elevation);
    vec3 underside = mix(vec3(0.075, 0.070, 0.135), vec3(0.046, 0.046, 0.101), fade);
    sky = mix(sky, underside, density * 0.83);
    float fringe = smoothstep(0.36, 0.48, cloud) * (1.0 - smoothstep(0.49, 0.62, cloud));
    sky += vec3(0.026, 0.014, 0.022) * fringe * (1.0 - fade) * afterglow;
    // Distant low roofs dissolve into haze in the gaps between the closer blocks.
    float roofs = hash(vec2(floor(bearing * 146.0), 3.4)) * 0.014;
    float ridge = -0.081 + noise(vec2(bearing * 8.5, 1.5)) * 0.021 + roofs;
    float land = 1.0 - smoothstep(ridge - 0.013, ridge + 0.002, elevation);
    vec3 distanceHaze = mix(vec3(0.084, 0.079, 0.126), vec3(0.126, 0.109, 0.161),
      smoothstep(-0.26, -0.04, elevation));
    sky = mix(sky, distanceHaze, land);
    sky += (hash(gl_FragCoord.xy) - 0.5) * 0.004;
    gl_FragColor = vec4(sky, 1.0);
    ${outputColor}
  }
`;
