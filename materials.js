import * as THREE from 'three';

// Repeatable surface maps, evaluated once and shared by the physical materials.
// These are material microstructure, not a background image of the room.
export function surfaceMaterials(maxAnisotropy = 8) {
  function map(w, h, pixel, color = true, repeat = [1, 1]) {
    const data = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const rgb = pixel(x, y);
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, rgb[c]));
        data[i + 3] = 255;
      }
    const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = maxAnisotropy;
    t.needsUpdate = true;
    return t;
  }
  const noise = (x, y) => {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const grain = (x, y) => {
    const bend = 7 * Math.sin(x * 0.011) + 3.5 * Math.sin(x * 0.031 + y * 0.006);
    const broad = Math.sin((y + bend) * 0.115);
    const fine = Math.sin((y + bend) * 1.8 + Math.sin(x * 0.02));
    return broad * 9 + fine * 3 + (noise(x, y) - 0.5) * 7;
  };
  const woodColor = map(1024, 256, (x, y) => {
    const g = grain(x, y);
    return [103 + g, 71 + g * 0.75, 51 + g * 0.5];
  });
  const woodBump = map(
    1024,
    256,
    (x, y) => {
      const v = 128 + grain(x, y) * 2;
      return [v, v, v];
    },
    false,
  );
  const woodRoughness = map(
    512,
    128,
    (x, y) => {
      const v = 142 + grain(x * 2, y * 2);
      return [v, v, v];
    },
    false,
  );
  const wood = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    map: woodColor,
    bumpMap: woodBump,
    bumpScale: 0.012,
    roughnessMap: woodRoughness,
    roughness: 0.76,
    metalness: 0,
    clearcoat: 0.18,
    clearcoatRoughness: 0.46,
  });
  const fabricColor = map(
    128,
    128,
    (x, y) => {
      const warp = Math.sin((x * Math.PI) / 2) * Math.sin((y * Math.PI) / 2);
      const n = noise(x, y) * 3;
      const v = 25 + warp * 7 + n;
      return [v, v + 1, v + 2];
    },
    true,
    [12, 14],
  );
  const fabricBump = map(
    128,
    128,
    (x, y) => {
      const v = 120 + 42 * Math.sin((x * Math.PI) / 2) * Math.sin((y * Math.PI) / 2);
      return [v, v, v];
    },
    false,
    [12, 14],
  );
  const fabric = new THREE.MeshPhysicalMaterial({
    color: '#cccccc',
    map: fabricColor,
    bumpMap: fabricBump,
    bumpScale: 0.007,
    roughness: 0.88,
    sheen: 0.32,
    sheenColor: new THREE.Color('#454a50'),
    sheenRoughness: 0.72,
  });
  const micro = map(
    128,
    128,
    (x, y) => {
      const v = 128 + (noise(x, y) - 0.5) * 55;
      return [v, v, v];
    },
    false,
    [40, 30],
  );
  const plaster = new THREE.MeshStandardMaterial({
    color: '#c0b5a5',
    roughness: 0.93,
    bumpMap: micro,
    bumpScale: 0.012,
  });
  const floor = new THREE.MeshStandardMaterial({
    color: '#999487',
    roughness: 0.82,
    bumpMap: micro,
    bumpScale: 0.008,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: '#22282b',
    roughness: 0.34,
    metalness: 0.65,
  });
  const leafBump = map(
    128,
    256,
    (x, y) => {
      const mid = 1 - Math.min(1, Math.abs(x - 64) / 3);
      const side = Math.pow(Math.max(0, Math.cos((y + Math.abs(x - 64) * 0.7) * 0.3)), 16);
      const v = 110 + mid * 50 + side * 18 + noise(x, y) * 9;
      return [v, v, v];
    },
    false,
  );
  const rugColor = map(512, 512, (x, y) => {
    const edge = Math.min(x, y, 511 - x, 511 - y);
    const woven =
      Math.sin((x * Math.PI) / 2) * Math.sin((y * Math.PI) / 2) * 7 + (noise(x, y) - 0.5) * 11;
    const border = (edge > 12 && edge < 22) || (edge > 32 && edge < 35);
    const tone = border ? -25 : 0;
    return [165 + woven + tone, 145 + woven + tone, 115 + woven + tone];
  });
  const rugBump = map(
    256,
    256,
    (x, y) => {
      const v =
        125 +
        35 * Math.sin((x * Math.PI) / 2) * Math.sin((y * Math.PI) / 2) +
        (noise(x, y) - 0.5) * 22;
      return [v, v, v];
    },
    false,
    [4, 4],
  );
  const rug = new THREE.MeshStandardMaterial({
    map: rugColor,
    bumpMap: rugBump,
    bumpScale: 0.012,
    roughness: 1,
    metalness: 0,
  });
  return { wood, fabric, plaster, floor, metal, leafBump, rug };
}
