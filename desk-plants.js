import { DESK_TOP } from './desk-furniture.js';
import { UPPER_SHELF_SHIFT } from './desk-layout.js';

// Potted plants on the shelving, the wall shelves and the desk.
// Leaf angles come from the kit's seeded random sequence, so the plants must
// keep being created in this order to grow the same way every time.
export function addDeskPlants({ THREE, materials, mat, mesh, cylinder, curve, group, rand }) {
  const leafGeometry = createLeafGeometry(THREE);
  const leafColors = [materials.leaf, materials.leaf2, materials.leaf3];

  function leaf(parent, x, y, z, size, angle, material) {
    const l = mesh(leafGeometry, material, parent);
    l.scale.set(size, size, size);
    l.position.set(x, y, z);
    l.rotation.set(0.35 + rand() * 0.9, angle, rand() - 0.5);
    return l;
  }

  // A pot with seven leafy stems; trailing plants also get three vines hanging down.
  function plant(x, y, z, size = 1, trailing = false, potMaterial = materials.terra, parent) {
    const pot = group(x, y, z, parent);
    cylinder(0.21 * size, 0.16 * size, 0.34 * size, 0, 0.17 * size, 0, potMaterial, pot);
    cylinder(0.22 * size, 0.22 * size, 0.055 * size, 0, 0.33 * size, 0, potMaterial, pot);
    cylinder(0.185 * size, 0.185 * size, 0.012 * size, 0, 0.36 * size, 0, mat('#4a4432'), pot);
    const foliage = group(0, 0.34 * size, 0, pot);

    for (let stem = 0; stem < 7; stem++) {
      const angle = (stem / 7) * Math.PI * 2;
      const length = (0.42 + rand() * 0.32) * size;
      const tip = [
        Math.cos(angle) * length * 0.65,
        length * (0.65 + rand() * 0.3),
        Math.sin(angle) * length * 0.65,
      ];
      curve(
        [[0, 0, 0], [tip[0] * 0.35, tip[1] * 0.65, tip[2] * 0.35], tip],
        0.009 * size,
        materials.leaf,
        foliage,
      );
      for (let k = 1; k <= 3; k++) {
        const t = k / 3;
        const leafSize = size * (0.16 + rand() * 0.09);
        leaf(foliage, tip[0] * t, tip[1] * t, tip[2] * t, leafSize, angle, leafColors[stem % 3]);
      }
    }

    if (trailing) {
      for (let vine = 0; vine < 3; vine++) {
        const offsetX = (vine - 1) * 0.13 * size;
        const points = [];
        for (let j = 0; j <= 15; j++) {
          const t = j / 15;
          const sway = Math.sin(t * 9 + vine) * 0.09 * size;
          const drop = -t * 1.65 * size;
          points.push([offsetX + sway, drop, 0.22 * size + t * 0.07]);
          if (j > 1) {
            const side = j % 2 ? 1 : -1;
            leaf(
              foliage,
              offsetX + side * 0.13 * size + sway,
              drop,
              0.25 * size,
              0.12 * size,
              side * 0.6,
              materials.leaf,
            );
          }
        }
        curve(points, 0.012 * size, materials.leaf, foliage);
      }
    }
    return pot;
  }

  // On the shelving unit.
  plant(-4.47, 4.45, -0.08, 1.1, true, materials.cream);
  plant(-3.9, 4.45, -0.32, 1.24, false, materials.terra);
  plant(-2.72, 4.45, 0.2, 0.8, true, materials.cream);
  plant(-4.12, 1.17, 0.08, 0.85, false, materials.terra);
  // On the desk, beside the laptop.
  plant(-2.38, DESK_TOP, 0.01, 0.48, false, materials.terra);
  // On the two wall shelves.
  plant(-0.98 + UPPER_SHELF_SHIFT, 4.66, -1, 0.86, false, materials.terra);
  plant(2.44 + UPPER_SHELF_SHIFT, 4.66, -0.89, 0.9, true, materials.cream);
  plant(-1.83, 3.6, -0.87, 0.57, true, materials.cream);
  return plant;
}

// A thin, curved, pointed leaf with a visible central vein: a 14 × 8 grid of
// vertices, narrowing to a point at both ends and cupped along its length.
function createLeafGeometry(THREE) {
  const rows = 14;
  const columns = 8;
  const vertices = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= rows; i++) {
    const u = i / rows;
    const width = Math.pow(Math.sin(Math.PI * u), 0.8) * 0.47;
    for (let j = 0; j <= columns; j++) {
      const v = (j / columns) * 2 - 1;
      vertices.push(
        v * width,
        (u - 0.5) * 2,
        0.13 * Math.sin(u * Math.PI) + 0.1 * v * v * Math.sin(u * Math.PI),
      );
      uvs.push(j / columns, u);
      if (i < rows && j < columns) {
        const a = i * (columns + 1) + j;
        indices.push(a, a + 1, a + columns + 1, a + 1, a + columns + 2, a + columns + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
