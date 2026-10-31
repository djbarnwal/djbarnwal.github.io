import * as THREE from 'three';
// Cubies retain their physical positions after each quarter turn.
export function createDeskCube({ x, z, angle, flipped = false, DESK_TOP, group, box, mat }) {
  const cube = group(x, DESK_TOP + 0.001, z);
  cube.name = 'rubiks-cube';
  cube.rotation.y = angle;
  const size = 0.28,
    unit = size / 3,
    black = mat('#101316', { roughness: 0.43 });
  const palette = ['#d73a2e', '#ed8b27', '#f2eadb', '#e6c636', '#3377ba', '#439351'].map((color) =>
    mat(color, { roughness: 0.37 }),
  );
  for (let a = -1; a <= 1; a++)
    for (let b = -1; b <= 1; b++)
      for (let c = -1; c <= 1; c++) {
        const cubie = group(a * unit, size / 2 + b * unit, c * unit, cube);
        cubie.userData.cubie = true;
        box(unit - 0.003, unit - 0.003, unit - 0.003, 0, 0, 0, black, cubie, 0.007);
        const edge = unit / 2 - 0.001;
        if (a)
          box(
            0.003,
            0.077,
            0.077,
            a * edge,
            0,
            0,
            palette[a === 1 ? (flipped ? 1 : 0) : flipped ? 0 : 1],
            cubie,
            0.005,
          );
        if (b)
          box(
            0.077,
            0.003,
            0.077,
            0,
            b * edge,
            0,
            palette[b === 1 ? (flipped ? 3 : 2) : flipped ? 2 : 3],
            cubie,
            0.005,
          );
        if (c) box(0.077, 0.077, 0.003, 0, 0, c * edge, palette[c === 1 ? 4 : 5], cubie, 0.005);
      }
  let job = null;
  cube.userData.turn = (now, reduced) => {
    if (job) return;
    const pivot = group(0, size / 2, 0, cube);
    cube.updateWorldMatrix(true, true);
    const layer = cube.children.filter(
      (o) => o.userData.cubie && o.position.y > size / 2 + unit * 0.5,
    );
    for (const piece of layer) pivot.attach(piece);
    job = { pivot, start: now, duration: reduced ? 0 : 580 };
    if (reduced) cube.userData.animate(now);
  };
  cube.userData.animate = (now) => {
    if (!job) return;
    const t = job.duration ? Math.min(1, Math.max(0, (now - job.start) / job.duration)) : 1,
      e = 1 - Math.pow(1 - t, 3);
    job.pivot.rotation.y = (Math.PI / 2) * e;
    if (t === 1) {
      job.pivot.updateWorldMatrix(true, true);
      for (const piece of [...job.pivot.children]) {
        cube.attach(piece);
        piece.position.set(
          Math.round(piece.position.x / unit) * unit,
          Math.round((piece.position.y - size / 2) / unit) * unit + size / 2,
          Math.round(piece.position.z / unit) * unit,
        );
      }
      cube.remove(job.pivot);
      job = null;
    }
  };
  return cube;
}
