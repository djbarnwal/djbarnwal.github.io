// Cover artwork is stored locally; the visible spines follow the original desk photo.
export function addDeskBooks({
  THREE,
  materials,
  mat,
  mesh,
  group,
  box,
  texture,
  interactive,
  discoveries,
}) {
  const coverLoader = new THREE.TextureLoader(),
    smooth = (t) => t * t * (3 - 2 * t);
  const editions = [
    {
      id: 'immune',
      title: 'Immune',
      author: 'Philipp Dettmer',
      x: -4.22,
      w: 0.94,
      h: 0.17,
      d: 0.68,
      color: '#e6ba39',
      ink: '#fcf5d9',
      cover: 'book-1.jpg',
    },
    {
      id: 'sapiens',
      title: 'Sapiens',
      author: 'Yuval Noah Harari',
      x: -4.25,
      w: 0.86,
      h: 0.19,
      d: 0.59,
      color: '#e9e1cb',
      ink: '#963d2e',
      cover: 'book-2.jpg',
    },
    {
      id: 'demon-slayer',
      title: 'Demon Slayer',
      author: 'Koyoharu Gotouge',
      x: -4.25,
      w: 0.79,
      h: 0.1,
      d: 0.57,
      color: '#202321',
      ink: '#eee9dc',
      cover: 'book-3.jpg',
    },
  ];
  const pageMap = texture(
    (ctx) => {
      ctx.fillStyle = '#e9e2d1';
      ctx.fillRect(0, 0, 512, 256);
      for (let y = 2; y < 256; y += 3) {
        ctx.strokeStyle = y % 9 ? '#d9d0be' : '#cec4ae';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }
    },
    512,
    256,
  );
  const paper = mat('#ffffff', { map: pageMap, roughness: 0.95 });
  let shelfTop = 3.1575;
  for (const edition of editions) {
    const { id, title, author, x, w, h, d, color, ink } = edition;
    const book = group(x, shelfTop + h / 2, 0.1);
    shelfTop += h;
    book.name = 'book-' + id;
    const binding = mat(color, { roughness: 0.72 });
    box(w - 0.019, h - 0.02, d - 0.018, 0.003, 0, -0.004, paper, book, 0.002);
    for (const y of [-h / 2 + 0.004, h / 2 - 0.004])
      box(w, 0.008, d, 0, y, 0, binding, book, 0.003);
    box(w, h - 0.006, 0.012, 0, 0, d / 2 - 0.002, binding, book, 0.004);
    const jacket = coverLoader.load('assets/book-covers/' + edition.cover);
    if (jacket) {
      jacket.colorSpace = THREE.SRGBColorSpace;
      jacket.anisotropy = 8;
    }
    const cover = mesh(
      new THREE.PlaneGeometry(d - 0.006, w - 0.006),
      mat('#ffffff', { map: jacket, roughness: 0.58 }),
      book,
    );
    cover.name = id + '-cover';
    cover.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    cover.position.y = h / 2 + 0.0006;
    const spineMap = texture(
      (ctx) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1536, 256);
        const edge = ctx.createLinearGradient(0, 0, 0, 256);
        edge.addColorStop(0, '#00000018');
        edge.addColorStop(0.22, '#ffffff12');
        edge.addColorStop(0.75, '#ffffff00');
        edge.addColorStop(1, '#00000024');
        ctx.fillStyle = edge;
        ctx.fillRect(0, 0, 1536, 256);
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillStyle = ink;
        if (id === 'sapiens') {
          ctx.font = '25px Georgia';
          ctx.save();
          ctx.translate(87, 185);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText('Yuval Noah Harari', 0, 0);
          ctx.restore();
          ctx.font = '118px Georgia';
          ctx.fillText('Sapiens', 200, 135);
          ctx.fillStyle = '#5a5144';
          ctx.font = '26px Georgia';
          ctx.fillText('A Brief History', 1080, 104);
          ctx.fillText('of Humankind', 1080, 143);
        } else if (id === 'immune') {
          ctx.fillStyle = '#35415d';
          ctx.fillRect(0, 0, 335, 256);
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            ctx.fillStyle = i % 2 ? '#b04a65' : '#e89167';
            ctx.beginPath();
            ctx.ellipse(166 + Math.cos(a) * 80, 128 + Math.sin(a) * 80, 23, 39, a, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#d8cbb6';
          ctx.beginPath();
          ctx.arc(166, 128, 53, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#526d79';
          ctx.beginPath();
          ctx.arc(166, 128, 25, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff5d7';
          ctx.font = 'bold 95px Arial';
          ctx.fillText('IMMUNE', 380, 138);
          ctx.fillStyle = '#4f4531';
          ctx.font = '31px Georgia';
          ctx.fillText('Philipp', 1260, 112);
          ctx.fillText('Dettmer', 1260, 151);
        } else {
          ctx.font = 'bold 74px Arial';
          ctx.fillText('DEMON SLAYER', 66, 118);
          ctx.font = '22px Arial';
          ctx.fillText('KIMETSU NO YAIBA', 70, 189);
          ctx.fillStyle = '#bba392';
          ctx.font = '24px Georgia';
          ctx.fillText('Koyoharu Gotouge', 1080, 131);
          ctx.fillStyle = '#dcccba';
          ctx.font = 'bold 65px Georgia';
          ctx.fillText('1', 1435, 127);
        }
      },
      1536,
      256,
    );
    const spine = mesh(
      new THREE.PlaneGeometry(w - 0.006, h - 0.004),
      mat('#ffffff', { map: spineMap, roughness: 0.76 }),
      book,
    );
    spine.name = id + '-spine';
    spine.position.z = d / 2 + 0.005;
    for (const z of [-d / 2 + 0.025, d / 2 - 0.02]) {
      const seam = box(
        w - 0.017,
        0.0015,
        0.0015,
        0,
        h / 2 + 0.001,
        z,
        mat(color, { roughness: 0.84 }),
        book,
        0.0005,
      );
      seam.castShadow = false;
    }
    const rest = { p: book.position.clone(), q: book.quaternion.clone() },
      reading = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.05, -Math.PI / 2 + 0.18, 0));
    discoveries.register('book-' + id, {
      duration: 3900,
      exclusiveGroup: 'books',
      message: 'A closer look at the cover of ' + title + '.',
      update(t) {
        const slide = t < 0.12 ? smooth(t / 0.12) : t > 0.87 ? 1 - smooth((t - 0.87) / 0.13) : 1;
        const tilt =
          t < 0.12
            ? 0
            : t < 0.28
              ? smooth((t - 0.12) / 0.16)
              : t > 0.72
                ? 1 - smooth(Math.min(1, (t - 0.72) / 0.15))
                : 1;
        book.position.copy(rest.p);
        book.position.x += slide * 0.12;
        book.position.y += tilt * 0.28;
        book.position.z += slide * 0.85;
        book.quaternion.slerpQuaternions(rest.q, reading, tilt);
      },
      restore() {
        book.position.copy(rest.p);
        book.quaternion.copy(rest.q);
      },
    });
    interactive(book, { type: 'toy', key: 'book-' + id });
  }
  // The lower shelf keeps the original neutral volumes, now with actual page edges.
  for (const [x, y, w, h, color] of [
    [-4.1, 0.51, 0.21, 0.58, '#b8b2a0'],
    [-3.84, 0.46, 0.21, 0.47, '#966c53'],
    [-3.59, 0.49, 0.22, 0.53, '#50615c'],
  ]) {
    const volume = group(x, y, 0.01);
    box(w, h, 0.5, 0, 0, 0, mat(color), volume, 0.009);
    box(w - 0.018, h - 0.025, 0.505, 0, 0, 0, paper, volume, 0.002);
    box(w, h, 0.012, 0, 0, 0.258, mat(color), volume, 0.003);
  }
  return editions;
}
