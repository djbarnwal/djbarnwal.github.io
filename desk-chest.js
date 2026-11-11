import { ROOM } from './desk-layout.js';

export function addDeskChest({ THREE, materials, mat, mesh, box, curve, group, texture }, addPlant) {
  const width = 3.52;
  const depth = 1.18;
  const top = 2.2625;
  const topThickness = 0.145;
  const topCenterZ = 0.015;
  const chest = group(ROOM.left + depth / 2 + 0.14, -0.055, 3.78);
  chest.name = 'sheesham-chest-of-drawers';
  chest.rotation.y = Math.PI / 2;

  const grain = texture(paintSheesham, 512, 192);
  const wood = mat('#ffffff', { map: grain, roughness: 0.66 });
  const uprightGrain = grain.clone();
  uprightGrain.center.set(0.5, 0.5);
  uprightGrain.rotation = Math.PI / 2;
  uprightGrain.needsUpdate = true;
  const uprightWood = mat('#ffffff', { map: uprightGrain, roughness: 0.66 });
  const shadow = mat('#39251b', { roughness: 0.92 });
  const brass = mat('#a58354', { roughness: 0.44, metalness: 0.57 });

  // The top overhangs the case, and the drawer fronts sit inside its outer frame.
  box(width, topThickness, depth + 0.08, 0, top - topThickness / 2, topCenterZ, wood, chest, 0.036);
  const plant = addPlant(1.02, top, topCenterZ, 1.18, false, materials.terra, chest);
  plant.name = 'chest-plant';
  box(width - 0.12, 0.13, depth - 0.04, 0, 0.30, 0, wood, chest, 0.018);
  box(width - 0.16, 1.79, 0.12, 0, 1.24, -0.52, uprightWood, chest, 0.018);
  box(width - 0.22, 1.79, 0.05, 0, 1.24, 0.47, shadow, chest, 0.008);
  for (const side of [-1, 1]) {
    const x = side * (width / 2 - 0.1);
    box(0.108, 1.86, depth, x, 1.22, 0, uprightWood, chest, 0.018);
    for (const z of [-0.43, 0.43]) {
      box(0.17, 0.26, 0.17, x - side * 0.11, 0.13, z, uprightWood, chest, 0.027);
    }
  }

  const drawerWidth = 1.57;
  const drawerHeight = 0.55;
  const stile = 0.105;
  const rail = 0.09;
  const insetWidth = drawerWidth - 2 * stile;
  const insetHeight = drawerHeight - 2 * rail;
  const webbing = texture(paintCane, 256, 256);
  webbing.wrapS = webbing.wrapT = THREE.RepeatWrapping;
  webbing.repeat.set(insetWidth / 0.30, insetHeight / 0.30);
  const cane = mat('#ffffff', {
    map: webbing, bumpMap: webbing, bumpScale: 0.007, roughness: 0.89,
    emissiveMap: webbing, emissive: '#fff1d1', emissiveIntensity: 0.11,
  });
  const canePanel = new THREE.PlaneGeometry(insetWidth + 0.012, insetHeight + 0.012);

  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 2; column++) {
      const drawer = group((column - 0.5) * 1.61, 0.656 + row * 0.585, 0.55, chest);
      drawer.name = `cane-drawer-${row * 2 + column + 1}`;
      for (const side of [-1, 1]) {
        box(stile, drawerHeight, 0.105, side * (drawerWidth - stile) / 2, 0, 0,
          uprightWood, drawer, 0.014);
        box(insetWidth + 0.009, rail, 0.105, 0, side * (drawerHeight - rail) / 2, 0,
          wood, drawer, 0.014);
      }
      const panel = mesh(canePanel, cane, drawer);
      panel.position.z = 0.014;
      panel.castShadow = false;

      const handleY = (drawerHeight - rail) / 2;
      curve([
        [-0.11, handleY, 0.052], [-0.09, handleY, 0.111],
        [0.09, handleY, 0.111], [0.11, handleY, 0.052],
      ], 0.016, brass, drawer);
    }
  }
}

function paintSheesham(ctx, width, height) {
  const pixels = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const bend = y + 3 * Math.sin(x * 0.009 + y * 0.041) + 1.5 * Math.sin(x * 0.032 + y * 0.027);
      const fibers = 8 * Math.sin(bend * 0.21 + 1.5 * Math.sin(bend * 0.035))
        + 4 * Math.sin(bend * 0.56 + 0.8 * Math.sin(x * 0.02));
      const pore = 3 * Math.sin(bend * 1.66 + Math.sin(x * 0.16));
      const tone = fibers + pore + 9 * Math.sin(y * 0.043 + x * 0.002);
      const i = 4 * (y * width + x);
      pixels.data[i] = 130 + tone;
      pixels.data[i + 1] = 79 + tone * 0.84;
      pixels.data[i + 2] = 48 + tone * 0.6;
      pixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
}

// Straight reeds and diagonal crossings frame the dark octagonal gaps in the cane.
function paintCane(ctx, size) {
  const cell = size / 4;
  ctx.fillStyle = '#51402c';
  ctx.fillRect(0, 0, size, size);

  function reed(x1, y1, x2, y2, width, color) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#8b6036';
    ctx.lineWidth = width + 3;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.strokeStyle = '#efdb9f';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          const x = (column + (sx < 0 ? 1 : 0)) * cell;
          const y = (row + (sy < 0 ? 1 : 0)) * cell;
          reed(x + sx * cell * 0.32, y, x, y + sy * cell * 0.32, 6, '#b99559');
        }
      }
    }
  }
  for (let line = 0; line <= 4; line++) {
    const at = line * cell;
    reed(at, 0, at, size, 10, '#d3b479');
    reed(0, at, size, at, 9, '#caa46a');
  }
  for (let y = 0; y <= 4; y++) {
    for (let x = y % 2; x <= 4; x += 2) {
      reed(x * cell, y * cell - 8, x * cell, y * cell + 8, 10, '#d3b479');
    }
  }
}
