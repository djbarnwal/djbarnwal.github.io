import { DESKTOP, STANDING_SHELF, UPPER_SHELF_SHIFT } from './desk-layout.js';

// Height of the desk's top surface. Everything that sits on the desk is placed relative to it.
export const DESK_TOP = 1.74;

// The large pieces of furniture. All of it is real geometry,
// in the same positions and proportions as the physical desk.
export function addDeskFurniture({ scene, materials, mat, box, cylinder, group }) {
  // Long wooden desk on a black steel frame.
  const width = DESKTOP.right - DESKTOP.left;
  const desk = group((DESKTOP.left + DESKTOP.right) / 2, 0, 0);
  desk.name = 'long-wood-table';
  const desktop = box(width, 0.24, 2.18, 0, DESK_TOP - 0.12, 0.58, materials.wood, desk, 0.025);
  desktop.name = 'continuous-desktop';
  // Zooming in far enough over the desk lands here (see desk-zoom.js). Not clickable.
  desktop.userData.action = { type: 'desk' };
  desktop.userData.caption = 'A closer look at the desktop';
  box(width - 0.06, 0.1, 2.12, 0, DESK_TOP - 0.285, 0.58, materials.wood, desk, 0.015);
  const legOffset = width / 2 - 0.27;
  for (const x of [-legOffset, legOffset]) {
    for (const z of [-0.31, 1.46])
      box(0.105, 1.43, 0.105, x, 0.755, z, materials.metal, desk, 0.012);
    box(0.11, 0.065, 1.91, x, 0.05, 0.58, materials.metal, desk, 0.012);
  }
  box(2 * legOffset + 0.08, 0.09, 0.09, 0, 1.37, -0.31, materials.metal, desk, 0.008);
  box(2 * legOffset + 0.06, 0.08, 0.08, 0, 0.41, -0.31, materials.metal, desk, 0.008);

  // Shelving unit to the left of the desk: four posts and five wooden shelves.
  const shelving = group(STANDING_SHELF.x, 0, -0.1);
  for (const x of [-1.08, 1.08])
    for (const z of [-0.56, 0.56])
      box(0.065, 4.42, 0.065, x, 2.24, z, materials.metal, shelving, 0.01);
  for (const y of [0.14, 1.11, 2.13, 3.12, 4.4]) {
    box(2.22, 0.075, 1.16, 0, y, 0, materials.wood, shelving, 0.015);
    box(STANDING_SHELF.width, 0.06, 0.06, 0, y + 0.01, 0.59, materials.metal, shelving, 0.008);
  }
  box(0.055, 4.23, 0.055, 0, 2.25, 0.56, materials.metal, shelving, 0.008);

  // Woven-looking basket on the shelving.
  cylinder(0.36, 0.31, 0.43, -4.27, 2.4, 0.04, mat('#bc9b68'));
  for (let band = 0; band < 9; band++)
    cylinder(
      0.365,
      0.365,
      0.013,
      -4.27,
      2.21 + band * 0.047,
      0.04,
      mat(band % 2 ? '#c8aa78' : '#a58961'),
    );
  box(0.33, 0.24, 0.12, -4.2, 2.64, 0.03, materials.metal, scene, 0.035).rotation.z = -0.22;

  // Two floating shelves on the wall above the monitors.
  box(4.6, 0.12, 0.62, 0.55 + UPPER_SHELF_SHIFT, 4.59, -0.96, materials.metal);
  box(4.65, 0.12, 0.67, 0.25, 3.53, -0.92, materials.metal);
}
