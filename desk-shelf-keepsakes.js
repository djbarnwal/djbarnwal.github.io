const WHEEL_RADIUS = 0.095;

// Keepsakes on the shelving unit: a ceramic car planter that drives a little way
// when clicked, and two perfume bottles with a deodorant can.
export function addDeskShelfKeepsakes(kit) {
  addCarPlanter(kit);
  addBottles(kit);
}

// Glazed ceramic car planter: open rear bed, tiny tyres, and a fleshy succulent rosette.
function addCarPlanter({
  THREE,
  materials,
  mat,
  box,
  cylinder,
  sphere,
  group,
  interactive,
  discoveries,
}) {
  const { steel, charcoal } = materials;
  const car = group(-3.15, 3.1575, 0.08);
  car.name = 'succulent-car-planter';
  car.rotation.y = -0.12;

  // Body, cabin and windows.
  const ceramic = mat('#8dada1', { roughness: 0.28, metalness: 0.04 });
  box(0.76, 0.2, 0.37, 0, 0.19, 0, ceramic, car, 0.065);
  box(0.26, 0.18, 0.34, 0.21, 0.355, 0, ceramic, car, 0.042);
  const windowGlass = mat('#314b50', { roughness: 0.25, metalness: 0.28 });
  box(0.17, 0.105, 0.008, 0.21, 0.372, 0.175, windowGlass, car, 0.013);
  box(0.008, 0.105, 0.25, 0.345, 0.372, 0, windowGlass, car, 0.015);

  // Four tyres with steel hubs. Both turn together when the car drives.
  const wheelParts = [];
  for (const x of [-0.25, 0.25])
    for (const z of [-0.19, 0.19]) {
      const tyre = cylinder(WHEEL_RADIUS, WHEEL_RADIUS, 0.045, x, 0.1, z, charcoal, car, 24);
      tyre.rotation.x = Math.PI / 2;
      const hub = cylinder(0.047, 0.047, 0.048, x, 0.1, z, steel, car, 20);
      hub.rotation.x = Math.PI / 2;
      box(0.064, 0.004, 0.01, 0, Math.sign(z) * 0.026, 0, charcoal, hub, 0.002);
      wheelParts.push(tyre, hub);
    }

  // Headlights.
  box(0.037, 0.05, 0.09, 0.383, 0.21, 0.1, mat('#e4dab5'), car, 0.014);
  box(0.037, 0.05, 0.09, 0.383, 0.21, -0.1, mat('#e4dab5'), car, 0.014);

  // Soil in the open rear bed, between two ceramic rails.
  const soil = mat('#3e342a', { roughness: 1 });
  box(0.34, 0.012, 0.26, -0.13, 0.294, 0, soil, car, 0.025);
  for (const z of [-0.17, 0.17]) box(0.39, 0.035, 0.026, -0.13, 0.305, z, ceramic, car, 0.01);

  // Succulent: three rings of fleshy leaves, smaller and more upright towards the centre.
  const succulent = group(-0.13, 0.31, 0, car);
  succulent.name = 'car-succulent';
  const leafMaterials = ['#6d967d', '#8bac89', '#a7bd91'].map((c) => mat(c, { roughness: 0.47 }));
  const up = new THREE.Vector3(0, 1, 0);
  for (let tier = 0; tier < 3; tier++) {
    const leafCount = 8 - tier;
    const radius = 0.087 - tier * 0.028;
    const spread = 0.9 - tier * 0.28;
    for (let j = 0; j < leafCount; j++) {
      const angle = (j / leafCount) * Math.PI * 2 + tier * 0.4;
      const dx = Math.cos(angle);
      const dz = Math.sin(angle);
      const leaf = sphere(
        1,
        dx * radius,
        0.035 + tier * 0.04,
        dz * radius,
        leafMaterials[tier],
        succulent,
        16,
      );
      leaf.scale.set(0.039, 0.105 - tier * 0.016, 0.027);
      const pointing = new THREE.Vector3(dx * spread, 0.6 + tier * 0.3, dz * spread).normalize();
      leaf.quaternion.setFromUnitVectors(up, pointing);
    }
  }

  const parked = car.position.clone();
  const wheelRest = wheelParts.map((part) => part.quaternion.clone());
  const axle = new THREE.Vector3(0, 1, 0);
  const wheelTurn = new THREE.Quaternion();
  discoveries.register('car', {
    duration: 1600,
    message: 'The succulent takes its little car for a short drive.',
    update(t) {
      // Roll forward a little and back again; the wheels turn to match the distance.
      const distance = -0.11 * Math.sin(Math.PI * t) ** 2;
      car.position.x = parked.x + distance;
      car.position.z = parked.z + distance * 0.12;
      succulent.rotation.z = Math.sin(t * Math.PI * 4) * Math.sin(Math.PI * t) ** 2 * 0.045;
      wheelTurn.setFromAxisAngle(axle, -distance / WHEEL_RADIUS);
      wheelParts.forEach((part, i) => part.quaternion.copy(wheelRest[i]).multiply(wheelTurn));
    },
    restore() {
      car.position.copy(parked);
      succulent.rotation.set(0, 0, 0);
      wheelParts.forEach((part, i) => part.quaternion.copy(wheelRest[i]));
    },
  });
  interactive(car, { type: 'toy', key: 'car' });
}

// Three bottles on the lowest-but-one shelf, beside the plant.
function addBottles({ materials, mat, box, cylinder, group }) {
  const { steel, charcoal } = materials;
  const bottles = group(-3.12, 1.1475, 0.07);
  bottles.name = 'perfume-and-deodorant';
  const label = mat('#cfbea0', { roughness: 0.92 });

  // Amber perfume bottle with a steel collar and dark cap.
  const amber = mat('#704326', {
    transparent: true,
    opacity: 0.84,
    roughness: 0.17,
    metalness: 0.12,
  });
  box(0.19, 0.31, 0.15, -0.23, 0.155, 0, amber, bottles, 0.017);
  box(0.09, 0.045, 0.09, -0.23, 0.334, 0, steel, bottles, 0.006);
  box(0.11, 0.085, 0.11, -0.23, 0.393, 0, charcoal, bottles, 0.01);
  box(0.123, 0.1, 0.003, -0.23, 0.16, 0.077, label, bottles, 0.002);

  // Deodorant can.
  const can = mat('#3f4b50', { metalness: 0.3, roughness: 0.4 });
  cylinder(0.071, 0.071, 0.43, 0.02, 0.215, -0.03, can, bottles);
  cylinder(0.073, 0.073, 0.1, 0.02, 0.48, -0.03, charcoal, bottles);
  box(0.058, 0.15, 0.005, 0.02, 0.225, 0.041, mat('#c7bd9f'), bottles, 0.003);

  // Clear glass perfume bottle with a brass cap.
  const clearGlass = mat('#9eaaa2', {
    transparent: true,
    opacity: 0.65,
    roughness: 0.12,
    metalness: 0.12,
  });
  box(0.17, 0.255, 0.14, 0.24, 0.1275, 0.025, clearGlass, bottles, 0.016);
  const brass = mat('#b39a65', { metalness: 0.75, roughness: 0.26 });
  box(0.073, 0.075, 0.072, 0.24, 0.292, 0.025, brass, bottles, 0.005);
  box(0.11, 0.08, 0.003, 0.24, 0.12, 0.097, label, bottles, 0.002);
}
