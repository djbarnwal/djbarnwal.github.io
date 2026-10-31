// A softly rounded black office chair, pulled slightly to the side, and the rug under the desk.
export function addDeskChair({
  THREE,
  scene,
  materials,
  surfaces,
  mat,
  box,
  cylinder,
  curve,
  group,
}) {
  const chair = group(3.02, 0, 2.45);
  chair.name = 'black-office-chair';
  chair.rotation.y = -0.24;

  // Gas lift and five-star base with wheels.
  cylinder(0.065, 0.075, 0.65, 0, 0.52, 0, materials.metal, chair);
  cylinder(0.15, 0.15, 0.08, 0, 0.24, 0, materials.metal, chair);
  for (let leg = 0; leg < 5; leg++) {
    const angle = (leg / 5) * Math.PI * 2;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    curve(
      [
        [0, 0.24, 0],
        [dx * 0.32, 0.16, dz * 0.32],
        [dx * 0.64, 0.1, dz * 0.64],
      ],
      0.036,
      materials.metal,
      chair,
    );
    const wheel = cylinder(
      0.072,
      0.072,
      0.07,
      dx * 0.64,
      0.08,
      dz * 0.64,
      materials.metal,
      chair,
      12,
    );
    wheel.rotation.z = Math.PI / 2;
  }

  // Seat, backrest, headrest and armrests.
  const upholstery = surfaces.fabric;
  box(0.98, 0.14, 0.93, 0, 0.91, 0.04, upholstery, chair, 0.045);
  box(0.96, 1.43, 0.14, 0, 1.73, 0.51, upholstery, chair, 0.06);
  for (const x of [-0.19, 0.19])
    box(0.035, 0.19, 0.035, x, 2.48, 0.51, materials.metal, chair, 0.008);
  box(0.64, 0.31, 0.14, 0, 2.62, 0.54, upholstery, chair, 0.045);
  for (const x of [-0.58, 0.58]) {
    box(0.065, 0.4, 0.06, x, 1.14, 0.16, materials.metal, chair, 0.02);
    box(0.13, 0.075, 0.61, x, 1.37, 0.04, materials.metal, chair, 0.04);
  }

  // The chair's frame is darker and glossier than the desk's steel.
  const chairFrame = mat('#111419', { roughness: 0.42, metalness: 0.2 });
  chair.traverse((o) => {
    if (o.isMesh && o.material === materials.metal) o.material = chairFrame;
  });

  // Stitched seam around the seat cushion.
  const seam = mat('#35373a', { roughness: 0.88 });
  curve(
    [
      [-0.42, 0.994, -0.31],
      [-0.46, 0.994, 0.03],
      [-0.42, 0.994, 0.4],
      [0.42, 0.994, 0.4],
      [0.46, 0.994, 0.03],
      [0.42, 0.994, -0.31],
    ],
    0.005,
    seam,
    chair,
  );

  // The rug runs from just behind the desk to the chair's front edge, and no further.
  const rugBack = -0.7;
  const rugFront = new THREE.Box3().setFromObject(chair).max.z;
  const rug = box(
    6.9,
    0.05,
    rugFront - rugBack,
    0.75,
    -0.025,
    (rugFront + rugBack) / 2,
    surfaces.rug,
    scene,
    0.02,
  );
  rug.name = 'under-desk-rug';
}
