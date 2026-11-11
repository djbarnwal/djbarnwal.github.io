import { Reflector } from './vendor/addons/objects/Reflector.js';
import { addDeskCity } from './desk-city.js';
import { ROOM, STANDING_SHELF } from './desk-layout.js';

const WALL_DEPTH = 0.18;
const WINDOW = { back: 0.94, front: 7.25, sill: 1.06, head: 5.58 };

export function addDeskRoom({ THREE, scene, materials, mat, mesh, box, group, texture }) {
  const { left, right, back, front, height } = ROOM;
  const width = right - left;
  const depth = front - back;
  const centerX = (left + right) / 2;
  const centerZ = (back + front) / 2;
  const trim = mat('#b9aa93');
  // Soft bounced light keeps the ceiling from falling into shadow at dusk.
  const ceiling = mat('#b6ada2', { roughness: 1, emissive: '#b6ada2', emissiveIntensity: 0.36 });

  // The shell receives furniture shadows. The existing overhead light still reaches the room.
  function shell(width, height, depth, x, y, z, material) {
    const panel = box(width, height, depth, x, y, z, material, scene, 0);
    panel.castShadow = false;
    return panel;
  }

  materials.floor.map.repeat.set(width / 7.5, depth / 2.5);
  shell(width, 0.15, depth, centerX, -0.13, centerZ, materials.floor);
  shell(width, 0.15, depth, centerX, height + 0.075, centerZ, ceiling);
  shell(width, height, WALL_DEPTH, centerX, height / 2, back - WALL_DEPTH / 2, materials.wall);
  shell(width, height, WALL_DEPTH, centerX, height / 2, front + WALL_DEPTH / 2, materials.wall);
  shell(WALL_DEPTH, height, depth, left - WALL_DEPTH / 2, height / 2, centerZ, materials.sideWall);

  const { sill, head } = WINDOW;
  function rightPanel(fromY, toY, fromZ, toZ) {
    shell(
      WALL_DEPTH, toY - fromY, toZ - fromZ,
      right + WALL_DEPTH / 2, (fromY + toY) / 2, (fromZ + toZ) / 2, materials.sideWall,
    );
  }
  rightPanel(0, sill, back, front);
  rightPanel(head, height, back, front);
  rightPanel(sill, head, back, WINDOW.back);
  rightPanel(sill, head, WINDOW.front, front);

  shell(width, 0.15, 0.075, centerX, 0.02, back + 0.0375, trim);
  shell(width, 0.15, 0.075, centerX, 0.02, front - 0.0375, trim);
  for (const x of [left + 0.0375, right - 0.0375]) {
    shell(0.075, 0.15, depth, x, 0.02, centerZ, trim);
  }

  addWindowFrame({ scene, mat, box });
  addWickerPlates({ THREE, mat, mesh, texture });
  addStandingMirror({ THREE, mat, mesh, box, group });
  return addDeskCity({ THREE, scene }, right);
}

function addWindowFrame({ scene, mat, box }) {
  const { right } = ROOM;
  const { back, front, sill, head } = WINDOW;
  const width = front - back;
  const height = head - sill;
  const centerZ = (back + front) / 2;
  const centerY = (sill + head) / 2;
  const oak = mat('#9f805f', { roughness: 0.82 });
  const sash = mat('#3e3833', { roughness: 0.64 });
  const jambX = right + WALL_DEPTH / 2;

  box(0.38, 0.115, width + 0.16, right - 0.015, sill + 0.03, centerZ, oak, scene, 0.013);
  box(0.22, 0.09, width, jambX, head - 0.035, centerZ, oak, scene, 0);
  for (const z of [back + 0.035, front - 0.035]) {
    box(0.22, height, 0.09, jambX, centerY, z, oak, scene, 0);
  }
  for (const z of [back + width / 3, back + (2 * width) / 3]) {
    box(0.11, height, 0.07, jambX, centerY, z, sash, scene, 0.007);
  }

}

function addWickerPlates({ THREE, mat, mesh, texture }) {
  const shelfLeft = STANDING_SHELF.x - STANDING_SHELF.width / 2;
  for (const [name, x, y, radius, radial] of [
    ['coiled-wicker-plate', shelfLeft - 1.59, 3.84, 0.76, false],
    ['radial-wicker-plate', shelfLeft - 1.29, 2.21, 0.64, true],
  ]) {
    const weave = texture((ctx, size) => paintWicker(ctx, size, radial), 512, 512);
    const geometry = new THREE.RingGeometry(0, radius, 96, 24);
    const { position } = geometry.attributes;
    for (let i = 0; i < position.count; i++) {
      const r = Math.hypot(position.getX(i), position.getY(i)) / radius;
      const lip = Math.exp(-((r - 0.955) ** 2) / 0.002);
      position.setZ(i, radius * (0.09 * r ** 3 + 0.043 * lip));
    }
    geometry.computeVertexNormals();
    const plate = mesh(geometry, mat('#ffffff', {
      map: weave, bumpMap: weave, bumpScale: 0.012, roughness: 0.9, side: THREE.DoubleSide,
    }));
    plate.name = name;
    plate.position.set(x, y, ROOM.back + 0.014);
  }
}

// Coiled strands cross radial stakes. The smaller plate uses wider, lighter stakes
// and a tighter coil, so its spokes read clearly from across the room.
function paintWicker(ctx, size, radial) {
  const image = ctx.createImageData(size, size);
  const tau = Math.PI * 2;
  const coils = radial ? 22 : 18;
  const stakes = radial ? 28 : 48;
  const base = radial ? [117, 69, 37] : [93, 53, 31];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (2 * x + 1) / size - 1;
      const dy = (2 * y + 1) / size - 1;
      const r = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const coil = r * coils + 0.14 * Math.sin(8 * angle + 11 * r);
      const spoke = angle * stakes / tau + 0.11 * Math.sin(r * 19 + 4 * angle);
      const reed = Math.max(0, Math.cos(tau * coil)) ** 0.48;
      const rib = Math.max(0, Math.cos(tau * spoke)) ** (radial ? 0.65 : 1.4);
      const crossing = (Math.round(coil) + Math.round(spoke)) % 2 === 0;
      const weave = crossing ? Math.max(reed, 0.59 * rib) : Math.max(0.63 * reed, rib);
      const fibers = 4 * Math.sin(r * 643 + 5 * Math.sin(angle * 13)) + 3 * Math.sin(71 * angle + r * 73);
      const straw = 0.5 + 0.5 * Math.sin(Math.round(spoke) * 2.37 + Math.round(coil) * 1.62);
      let tone = ((radial ? 108 : 99) + 41 * straw) * weave + fibers;
      if (r < 0.095) {
        tone = 43 + 20 * Math.cos(195 * (dx + dy)) * Math.cos(173 * (dx - dy));
      } else if (r > 0.91) {
        const braid = 0.5 + 0.5 * Math.cos(tau * r * 25 + 53 * angle);
        tone = 20 + 67 * braid + fibers;
      }
      const index = 4 * (y * size + x);
      image.data[index] = base[0] + tone;
      image.data[index + 1] = base[1] + 0.85 * tone;
      image.data[index + 2] = base[2] + 0.63 * tone;
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function addStandingMirror({ THREE, mat, mesh, box, group }) {
  const stand = group(ROOM.left + 0.93, -0.055, 0.38);
  stand.name = 'standing-mirror';
  stand.rotation.y = 0.72;
  const oak = mat('#8e6d51', { roughness: 0.78 });
  for (const x of [-0.42, 0.42]) {
    box(0.12, 0.095, 0.55, x, 0.05, -0.09, oak, stand, 0.025);
  }

  const frame = group(0, 0, 0, stand);
  frame.rotation.x = -0.1;
  function roundedRectangle(width, top, bottom, radius) {
    const left = -width / 2;
    const right = width / 2;
    const shape = new THREE.Shape();
    shape.moveTo(left + radius, bottom);
    shape.lineTo(right - radius, bottom);
    shape.quadraticCurveTo(right, bottom, right, bottom + radius);
    shape.lineTo(right, top - radius);
    shape.quadraticCurveTo(right, top, right - radius, top);
    shape.lineTo(left + radius, top);
    shape.quadraticCurveTo(left, top, left, top - radius);
    shape.lineTo(left, bottom + radius);
    shape.quadraticCurveTo(left, bottom, left + radius, bottom);
    shape.closePath();
    return shape;
  }
  const body = new THREE.ExtrudeGeometry(roundedRectangle(1.5, 4.32, 0.065, 0.2), {
    depth: 0.06, bevelEnabled: false, curveSegments: 12,
  });
  mesh(body, oak, frame);

  const inset = roundedRectangle(1.39, 4.265, 0.12, 0.145);
  const glass = new Reflector(new THREE.ShapeGeometry(inset, 12), {
    color: 0xbab0a5, textureWidth: 640, textureHeight: 640, multisample: 0, clipBias: 0.002,
  });
  glass.position.z = 0.062;
  frame.add(glass);
  const reflect = glass.onBeforeRender;
  glass.onBeforeRender = function (renderer, scene, camera) {
    if (!scene.overrideMaterial) reflect.call(this, renderer, scene, camera);
  };
}
