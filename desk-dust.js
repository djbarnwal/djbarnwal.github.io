// Specks of dust drifting slowly through the light around each lamp. Each cloud fades
// with its light group, so switching a lamp off also hides its dust.
const CLOUDS = [
  { channel: 'upperLamp', color: '#ffc77a', center: [-2.65, 5.0, -0.2], radius: 1.15, count: 90 },
  { channel: 'lowerLamp', color: '#ffc77a', center: [-3.1, 2.75, 0.15], radius: 0.95, count: 60 },
  { channel: 'white', color: '#fff3cf', center: [1.92, 4.05, -0.5], radius: 0.95, count: 55 },
];

// Fewer specks on phones.
const SMALL_SCREEN_WIDTH = 700;

// World-space size of one speck, and the most screen pixels one may cover up close.
const SPECK_SIZE = 0.04;
const MAX_POINT_PIXELS = 18;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform float uRadius;
  uniform float uMaxSize;
  attribute vec4 aSeed;
  varying float vAlpha;

  void main() {
    vec3 offset = position;
    float t = uTime;
    // Rise slowly, wrapping from the bottom of the cloud to the top. Specks are invisible
    // at the cloud's edge (see the falloff below), so the wrap never shows.
    offset.y = mod(offset.y + uRadius + t * (0.012 + 0.02 * aSeed.z), 2.0 * uRadius) - uRadius;
    // Wander on slow, unrelated sine waves.
    offset += 0.09 * vec3(
      sin(t * (0.11 + 0.1 * aSeed.x) + aSeed.y * 6.2832),
      sin(t * (0.07 + 0.08 * aSeed.y) + aSeed.z * 6.2832),
      sin(t * (0.09 + 0.1 * aSeed.z) + aSeed.x * 6.2832)
    );
    float edge = 1.0 - smoothstep(0.35 * uRadius, uRadius, length(offset));
    // Specks catch the light and lose it again as they turn.
    float glint = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(t * (0.5 + aSeed.w) + aSeed.x * 40.0), 3.0);
    vAlpha = edge * glint;

    vec4 viewPosition = modelViewMatrix * vec4(offset, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = min(uMaxSize, uScale * (0.55 + 0.9 * aSeed.w) / -viewPosition.z);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uGain;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float soft = pow(1.0 - smoothstep(0.0, 0.5, d), 1.6);
    float a = soft * vAlpha * uGain;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

export function addDeskDust({ THREE, scene, rand }) {
  const small = window.innerWidth < SMALL_SCREEN_WIDTH;
  const clouds = CLOUDS.map(({ channel, color, center, radius, count }) => {
    const total = small ? Math.round(count * 0.5) : count;
    const positions = new Float32Array(total * 3);
    const seeds = new Float32Array(total * 4);
    for (let i = 0; i < total; i++) {
      // Even spread through a sphere, slightly denser towards the middle.
      const r = radius * Math.pow(rand(), 0.6);
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      for (let j = 0; j < 4; j++) seeds[i * 4 + j] = rand();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius + 0.2);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 1 },
        uRadius: { value: radius },
        uMaxSize: { value: MAX_POINT_PIXELS },
        uColor: { value: new THREE.Color(color).multiplyScalar(2.4) },
        uGain: { value: 1 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.name = 'dust-' + channel;
    points.position.set(...center);
    scene.add(points);
    return { channel, material };
  });

  let time = 0;

  // `brightness` maps each light group to its current level (0 to 1).
  function update(seconds, brightness, reducedMotion) {
    if (!reducedMotion) time += seconds;
    for (const { channel, material } of clouds) {
      material.uniforms.uTime.value = time;
      material.uniforms.uGain.value = brightness[channel];
    }
  }

  // Keeps specks the same world size at any resolution.
  function resize(camera, heightInPixels) {
    const scale =
      (SPECK_SIZE * heightInPixels) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    for (const { material } of clouds) material.uniforms.uScale.value = scale;
  }

  return { update, resize };
}
