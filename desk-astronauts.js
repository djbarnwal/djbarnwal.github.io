// Porcelain-like astronaut keepsakes: sculpted suits and reflective gold visors.
export function addDeskAstronauts({
  THREE,
  mat,
  mesh,
  group,
  box,
  cylinder,
  sphere,
  curve,
  interactive,
  discoveries,
}) {
  const suit = new THREE.MeshPhysicalMaterial({
    color: '#e7e3d7',
    roughness: 0.44,
    clearcoat: 0.3,
    clearcoatRoughness: 0.32,
  });
  const trim = mat('#727970', { roughness: 0.66 }),
    seal = mat('#333b3b', { roughness: 0.72 });
  const gold = new THREE.MeshPhysicalMaterial({
    color: '#cfa14c',
    metalness: 1,
    roughness: 0.13,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
  const yAxis = new THREE.Vector3(0, 1, 0);
  function limb(a, b, r, parent) {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b),
      delta = end.clone().sub(start),
      length = delta.length();
    const m = mesh(
      new THREE.CapsuleGeometry(r, Math.max(0.001, length - 2 * r), 4, 12),
      suit,
      parent,
    );
    m.position.copy(start).add(end).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(yAxis, delta.normalize());
    return m;
  }
  function band(x, y, z, r, parent, material = trim) {
    const m = mesh(new THREE.TorusGeometry(r, 0.003, 7, 24), material, parent);
    m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z);
    return m;
  }
  const figures = [];
  for (let i = 0; i < 2; i++) {
    const seated = i === 1,
      x = seated ? -2.93 : -3.53,
      figure = group(x, 2.1675, 0.3);
    figure.name = seated ? 'seated-astronaut' : 'standing-astronaut';
    figure.rotation.y = seated ? -0.24 : 0.18;
    figures.push(figure);
    const torsoY = seated ? 0.177 : 0.22,
      helmetY = seated ? 0.291 : 0.346;
    if (seated) {
      const rock = sphere(0.077, 0, 0.04, -0.028, mat('#c7ba98', { roughness: 0.91 }), figure, 24);
      rock.scale.set(1.04, 0.52, 1);
      for (const [cx, cz, r] of [
        [-0.037, 0.024, 0.013],
        [0.019, 0.042, 0.009],
        [0.047, -0.012, 0.015],
      ]) {
        const crater = sphere(r, cx, 0.065, cz, mat('#a79c82', { roughness: 1 }), figure, 12);
        crater.scale.y = 0.18;
      }
    }
    const torso = box(0.125, 0.133, 0.094, 0, torsoY, 0, suit, figure, 0.029);
    torso.name = 'astronaut-suit';
    box(0.105, 0.095, 0.048, 0, torsoY, -0.065, suit, figure, 0.012);
    box(0.054, 0.062, 0.013, 0, torsoY + 0.006, -0.096, trim, figure, 0.004);
    for (const bx of [-0.031, 0.031])
      box(0.007, 0.084, 0.003, bx, torsoY, -0.101, suit, figure, 0.001);
    band(0, torsoY + 0.063, 0, 0.041, figure, seal);
    band(0, torsoY + 0.07, 0, 0.043, figure, suit);
    const helmet = group(0, helmetY, 0.011, figure);
    helmet.name = 'astronaut-helmet';
    helmet.rotation.x = seated ? -0.1 : 0.045;
    const shell = sphere(0.09, 0, 0, 0, suit, helmet, 32);
    shell.scale.set(1, 1.03, 0.96);
    const gasket = sphere(0.08, 0, -0.005, 0.056, seal, helmet, 28);
    gasket.scale.set(0.96, 0.69, 0.52);
    const visor = sphere(0.076, 0, -0.005, 0.065, gold, helmet, 32);
    visor.name = 'gold-helmet-visor';
    visor.scale.set(0.97, 0.68, 0.52);
    for (const side of [-1, 1]) {
      const latch = cylinder(0.013, 0.013, 0.016, side * 0.087, -0.012, 0.007, trim, helmet, 18);
      latch.rotation.z = Math.PI / 2;
      sphere(0.008, side * 0.094, -0.012, 0.007, suit, helmet, 16);
    }
    curve(
      [
        [-0.047, 0.024, 0.093],
        [-0.041, 0.035, 0.097],
        [-0.022, 0.041, 0.103],
      ],
      0.0018,
      mat('#f7e6ad', { metalness: 0.4, roughness: 0.25 }),
      helmet,
    );
    const panel = box(0.057, 0.042, 0.016, 0, torsoY + 0.014, 0.054, trim, figure, 0.005);
    panel.name = 'astronaut-control-panel';
    box(0.043, 0.02, 0.003, 0, torsoY + 0.022, 0.063, mat('#b3b7ac'), figure, 0.002);
    for (const [j, color] of ['#be694f', '#577b86', '#c3a965'].entries())
      sphere(0.0038, -0.014 + j * 0.014, torsoY + 0.005, 0.065, mat(color), figure, 12);
    box(0.024, 0.013, 0.003, -0.028, torsoY + 0.051, 0.049, mat('#b36753'), figure, 0.002);
    box(0.025, 0.011, 0.003, 0.029, torsoY + 0.051, 0.049, mat('#647a8b'), figure, 0.002);
    band(0, torsoY - 0.047, 0, 0.052, figure);
    curve(
      [
        [0.055, torsoY + 0.018, 0.016],
        [0.08, torsoY - 0.006, 0.035],
        [0.079, torsoY - 0.048, 0.054],
        [0.048, torsoY - 0.042, 0.064],
      ],
      0.0055,
      trim,
      figure,
    );
    const arms = [];
    for (const side of [-1, 1]) {
      const arm = group(side * 0.074, torsoY + 0.043, 0, figure);
      arm.name = side === 1 ? 'astronaut-right-arm' : 'astronaut-left-arm';
      arms.push(arm);
      const elbow = [side * 0.015, -0.055, seated ? 0.039 : 0.009],
        hand = [side * 0.011, seated ? -0.081 : -0.102, seated ? 0.071 : 0.024];
      limb([0, 0, 0], elbow, 0.025, arm);
      limb(elbow, hand, 0.022, arm);
      for (let rib = 0; rib < 3; rib++)
        band(elbow[0], elbow[1] + rib * 0.004, elbow[2], 0.023, arm, suit);
      band(hand[0], hand[1] + 0.012, hand[2], 0.02, arm, seal);
      const glove = sphere(0.023, ...hand, suit, arm, 18);
      glove.scale.set(0.84, 1, 0.9);
      sphere(0.01, hand[0] - side * 0.014, hand[1] + 0.002, hand[2] + 0.01, suit, arm, 12);
      const hip = [side * 0.032, torsoY - 0.065, 0],
        knee = [side * 0.043, seated ? 0.092 : 0.086, seated ? 0.073 : 0.008],
        ankle = [side * 0.049, 0.032, seated ? 0.119 : 0.025];
      limb(hip, knee, 0.03, figure);
      limb(knee, ankle, 0.027, figure);
      for (let rib = 0; rib < 3; rib++)
        band(knee[0], knee[1] + rib * 0.004, knee[2], 0.027, figure, suit);
      const boot = box(0.07, 0.04, 0.087, ankle[0], 0.026, ankle[2] + 0.013, suit, figure, 0.012);
      boot.name = 'astronaut-boot';
      box(0.072, 0.012, 0.09, ankle[0], 0.006, ankle[2] + 0.013, seal, figure, 0.004);
      band(ankle[0], 0.042, ankle[2], 0.026, figure, seal);
      for (let seam = 0; seam < 2; seam++)
        box(
          0.042,
          0.0018,
          0.0018,
          ankle[0],
          0.045,
          ankle[2] + 0.028 + seam * 0.009,
          trim,
          figure,
          0.0005,
        );
    }
    const headRest = helmet.quaternion.clone(),
      armRest = arms[1].quaternion.clone(),
      zAxis = new THREE.Vector3(0, 0, 1),
      turn = new THREE.Quaternion();
    const key = 'astronaut-' + i;
    discoveries.register(key, {
      duration: seated ? 1350 : 1700,
      message: seated
        ? 'The seated astronaut gives a small nod.'
        : 'The standing astronaut waves hello.',
      update(t) {
        const amount = Math.sin(Math.PI * t) ** 2;
        if (seated) {
          turn.setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            Math.sin(t * Math.PI * 3) * amount * 0.2,
          );
          helmet.quaternion.copy(headRest).multiply(turn);
        } else {
          turn.setFromAxisAngle(zAxis, amount * (1.68 + Math.sin(t * Math.PI * 8) * 0.13));
          arms[1].quaternion.copy(armRest).multiply(turn);
          turn.setFromAxisAngle(yAxis, amount * -0.14);
          helmet.quaternion.copy(headRest).multiply(turn);
        }
      },
      restore() {
        helmet.quaternion.copy(headRest);
        arms[1].quaternion.copy(armRest);
      },
    });
    interactive(figure, { type: 'toy', key });
  }
  return figures;
}
