import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { surfaceMaterials } from './materials.js';

const PALETTE = {
  metal: '#303a3d',
  wood: '#986d48',
  woodLight: '#c19a70',
  wall: '#c7b8ac',
  floor: '#b5ad97',
  cream: '#e5dcc5',
  leaf: '#526f4c',
  leaf2: '#7b925c',
  leaf3: '#a1ae7a',
  redLeaf: '#90614b',
  terra: '#b87852',
  navy: '#1b2c3d',
};

// Shared building blocks for every part of the room: materials, primitive shapes,
// canvas textures, and clickable objects.
// Each desk module receives this kit and picks out the helpers it needs.
export function createSceneKit({ scene, renderer, discoveries }) {
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const mat = (color, props = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.63, metalness: 0, ...props });

  const materials = {};
  for (const [name, color] of Object.entries(PALETTE)) materials[name] = mat(color);
  const surfaces = surfaceMaterials(anisotropy);
  Object.assign(materials, {
    wood: surfaces.wood,
    woodLight: surfaces.wood,
    metal: surfaces.metal,
    wall: surfaces.plaster,
    floor: surfaces.floor,
  });
  for (const name of ['leaf', 'leaf2', 'leaf3']) {
    materials[name].roughness = 0.43;
    materials[name].side = THREE.DoubleSide;
    materials[name].bumpMap = surfaces.leafBump;
    materials[name].bumpScale = 0.012;
  }
  materials.terra.roughness = 0.76;
  // Polished steel and dark plastic for the small keepsakes.
  materials.steel = mat('#c2c7c8', { metalness: 0.85, roughness: 0.26 });
  materials.charcoal = mat('#232c30', { roughness: 0.46 });

  // Seeded pseudo-random numbers, so plants grow the same way on every visit.
  let seed = 8731;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  function mesh(geometry, material, parent = scene) {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  // A box with softly rounded edges; pass radius 0 for a sharp-edged box.
  function box(
    width,
    height,
    depth,
    x,
    y,
    z,
    material = materials.wood,
    parent = scene,
    radius = 0.03,
  ) {
    const geometry = radius
      ? new RoundedBoxGeometry(
          width,
          height,
          depth,
          3,
          Math.min(radius, width / 3, height / 3, depth / 3),
        )
      : new THREE.BoxGeometry(width, height, depth);
    const m = mesh(geometry, material, parent);
    m.position.set(x, y, z);
    return m;
  }

  function cylinder(
    radiusTop,
    radiusBottom,
    height,
    x,
    y,
    z,
    material,
    parent = scene,
    segments = 40,
  ) {
    const m = mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
      material,
      parent,
    );
    m.position.set(x, y, z);
    return m;
  }

  function sphere(radius, x, y, z, material, parent = scene, segments = 24) {
    const m = mesh(new THREE.SphereGeometry(radius, segments, 16), material, parent);
    m.position.set(x, y, z);
    return m;
  }

  // A smooth tube through a list of [x, y, z] points: stems, cables, chair legs.
  function curve(points, radius, material, parent = scene) {
    const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    const segments = Math.max(12, points.length * 5);
    return mesh(new THREE.TubeGeometry(path, segments, radius, 5, false), material, parent);
  }

  function group(x = 0, y = 0, z = 0, parent = scene) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }

  // Paints a 2D canvas and wraps it as a texture (screens, prints, glows).
  function texture(draw, width = 1024, height = 640) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext('2d'), width, height);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anisotropy;
    return t;
  }

  // Everything the pointer can select. `action` says what a click does.
  const pickables = [];
  function interactive(object, action) {
    object.userData.action = action;
    pickables.push(object);
    return object;
  }

  return {
    THREE,
    scene,
    discoveries,
    materials,
    surfaces,
    mat,
    rand,
    mesh,
    box,
    cylinder,
    sphere,
    curve,
    group,
    texture,
    interactive,
    pickables,
  };
}
