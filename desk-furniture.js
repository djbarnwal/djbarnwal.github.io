// Height of the desk's top surface. Everything that sits on the desk is placed relative to it.
export const DESK_TOP = 1.74;

// The room shell and the large pieces of furniture. All of it is real geometry,
// in the same positions and proportions as the physical desk.
export function addDeskFurniture({ THREE, scene, materials, mat, box, cylinder, group }) {
  // Floor, back wall and skirting board, extending past the edges of the viewport.
  box(45, 0.15, 40, 0, -0.13, 8, materials.floor, scene, 0);
  box(45, 22, 0.18, 0, 10.8, -1.42, materials.wall, scene, 0);
  box(45, 0.16, 0.09, 0, 0.08, -1.29, mat('#b8aa97'));

  // Long wooden desk on a black steel frame.
  const desk = group(0.75, 0, 0);
  desk.name = 'long-wood-table';
  const desktop = box(6.5, 0.24, 2.18, 0, DESK_TOP - 0.12, 0.58, materials.wood, desk, 0.025);
  desktop.name = 'continuous-desktop';
  // Zooming in far enough over the desk lands here (see desk-zoom.js). Not clickable.
  desktop.userData.action = { type: 'desk' };
  desktop.userData.caption = 'A closer look at the desktop';
  box(6.44, 0.1, 2.12, 0, DESK_TOP - 0.285, 0.58, materials.wood, desk, 0.015);
  for (const x of [-2.98, 2.98]) {
    for (const z of [-0.31, 1.46])
      box(0.105, 1.43, 0.105, x, 0.755, z, materials.metal, desk, 0.012);
    box(0.11, 0.065, 1.91, x, 0.05, 0.58, materials.metal, desk, 0.012);
  }
  box(6.04, 0.09, 0.09, 0, 1.37, -0.31, materials.metal, desk, 0.008);
  box(6.02, 0.08, 0.08, 0, 0.41, -0.31, materials.metal, desk, 0.008);

  // Shelving unit to the left of the desk: four posts and five wooden shelves.
  const shelving = group(-3.75, 0, -0.1);
  for (const x of [-1.08, 1.08])
    for (const z of [-0.56, 0.56])
      box(0.065, 4.42, 0.065, x, 2.24, z, materials.metal, shelving, 0.01);
  for (const y of [0.14, 1.11, 2.13, 3.12, 4.4]) {
    box(2.22, 0.075, 1.16, 0, y, 0, materials.wood, shelving, 0.015);
    box(2.27, 0.06, 0.06, 0, y + 0.01, 0.59, materials.metal, shelving, 0.008);
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
  box(4.6, 0.12, 0.62, 0.55, 4.59, -0.96, materials.metal);
  box(4.65, 0.12, 0.67, 0.25, 3.53, -0.92, materials.metal);

  // Pegboard to the right of the monitors: a panel with a 14 × 15 grid of holes.
  box(1.38, 1.52, 0.08, 3.76, 2.88, -1.27, mat('#e0dbcc'), scene, 0.035);
  const columns = 14;
  const rows = 15;
  const holes = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.018, 6),
    mat('#939c8a'),
    columns * rows,
  );
  const transform = new THREE.Object3D();
  let holeIndex = 0;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      transform.position.set(3.17 + x * 0.09, 2.23 + y * 0.091, -1.224);
      transform.updateMatrix();
      holes.setMatrixAt(holeIndex++, transform.matrix);
    }
  scene.add(holes);
}
