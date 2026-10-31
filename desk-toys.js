import { DESK_TOP } from './desk-furniture.js';
import { createDeskCube } from './desk-cube.js';

// Small playable objects to the right of the monitors: a tissue box whose tissue
// unfurls, and two Rubik's cubes. Returns the cubes, which animate every frame.
export function addDeskToys(kit) {
  addTissueBox(kit);
  const cubes = [
    createDeskCube({ ...kit, DESK_TOP, x: 2.76, z: 0.86, angle: 0.19 }),
    createDeskCube({ ...kit, DESK_TOP, x: 3.29, z: 1.03, angle: -0.28, flipped: true }),
  ];
  cubes.forEach((cube, i) => kit.interactive(cube, { type: 'toy', key: 'cube-' + i }));
  return cubes;
}

function addTissueBox({ THREE, mat, mesh, box, sphere, group, interactive, discoveries }) {
  const tissueBox = group(3.4, DESK_TOP, 0.25);
  tissueBox.name = 'tissue-box';
  tissueBox.rotation.y = -0.08;
  box(0.65, 0.29, 0.4, 0, 0.145, 0, mat('#b3a58f', { roughness: 0.92 }), tissueBox, 0.025);
  box(0.64, 0.045, 0.005, 0, 0.064, 0.2, mat('#91816a', { roughness: 0.94 }), tissueBox, 0.002);
  const opening = sphere(0.15, 0, 0.289, 0, mat('#413b33'), tissueBox);
  opening.scale.set(1, 0.035, 0.34);

  const tissue = mesh(
    createTissueGeometry(THREE),
    mat('#ede9df', { roughness: 1, side: THREE.DoubleSide }),
    tissueBox,
  );
  tissue.name = 'tissue-paper';
  tissue.position.y = 0.288;

  discoveries.register('tissue', {
    duration: 1350,
    message: 'The tissue unfurls, then folds back into its box.',
    update(t) {
      const lift = Math.sin(Math.PI * t) ** 2;
      tissue.scale.y = 1 + lift * 0.8;
      tissue.rotation.z = Math.sin(t * Math.PI * 4) * lift * 0.11;
      tissue.rotation.x = lift * 0.13;
    },
    restore() {
      tissue.scale.set(1, 1, 1);
      tissue.rotation.set(0, 0, 0);
    },
  });
  interactive(tissueBox, { type: 'toy', key: 'tissue' });
}

// A crumpled sheet poking out of the box: a 12 × 10 grid that widens and
// ripples towards the top.
function createTissueGeometry(THREE) {
  const rows = 12;
  const columns = 10;
  const positions = [];
  const indices = [];
  for (let i = 0; i <= rows; i++) {
    const v = i / rows;
    for (let j = 0; j <= columns; j++) {
      const u = (j / columns) * 2 - 1;
      positions.push(
        u * (0.043 + 0.075 * v) + 0.035 * v * v,
        v * 0.255 + 0.008 * Math.sin(u * 5) * v,
        0.018 * Math.sin(u * 5 + v * 3) * v + 0.035 * v * v,
      );
      if (i < rows && j < columns) {
        const a = i * (columns + 1) + j;
        indices.push(a, a + 1, a + columns + 1, a + 1, a + columns + 2, a + columns + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
