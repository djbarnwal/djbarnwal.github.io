import { UPPER_SHELF_SHIFT } from './desk-layout.js';

// Framed prints: a Jamshedpur map on the shelving, a Triund photo on the lower wall
// shelf, and The Dark Knight Rises and Interstellar posters on the top one. A click on
// any of them zooms the camera in (see desk-focus.js). Returns the placeholder photo
// texture, which desk-pegboard.js uses for the Polaroids.

export function addDeskWallFrames({
  THREE,
  materials,
  mat,
  mesh,
  box,
  group,
  texture,
  interactive,
}) {
  function frame(x, y, z, width, height, picture, border = materials.metal) {
    const g = group(x, y, z);
    box(width, height, 0.075, 0, height / 2, 0, border, g, 0.018);
    box(width - 0.09, height - 0.09, 0.015, 0, height / 2, 0.045, materials.cream, g, 0.005);
    const image = mesh(
      new THREE.PlaneGeometry(width - 0.19, height - 0.2),
      new THREE.MeshBasicMaterial({ map: picture, toneMapped: false }),
      g,
    );
    image.position.set(0, height / 2, 0.057);
    g.rotation.x = -0.06;
    g.userData.image = image;
    return g;
  }

  // A frame whose picture is an image file, shown on a plain `blank` colour until it
  // loads. `tint` dims the print slightly so its brightest parts stay below the bloom
  // threshold, like paper in a dim room rather than a lightbox. If `verticalCrop` is
  // given, the image is cropped to fill the frame, and the number picks which part of a
  // tall image shows (0 keeps the bottom, 1 the top).
  function printFrame(x, y, z, width, height, url, { blank, tint, border, verticalCrop }) {
    const placeholder = texture(
      (ctx, w, h) => {
        ctx.fillStyle = blank;
        ctx.fillRect(0, 0, w, h);
      },
      8,
      8,
    );
    const g = frame(x, y, z, width, height, placeholder, border && mat(border));
    const { image } = g.userData;
    image.material.color.set(tint);
    const show = (src) =>
      new THREE.TextureLoader().load(
        src,
        (print) => {
          print.colorSpace = THREE.SRGBColorSpace;
          print.anisotropy = placeholder.anisotropy;
          if (verticalCrop !== undefined)
            cropToFill(print, (width - 0.19) / (height - 0.2), verticalCrop);
          image.material.map?.dispose();
          image.material.map = print;
          image.material.needsUpdate = true;
        },
        undefined,
        () => {},
      );
    show(url);
    return { g, show };
  }

  // Let a click zoom the camera in on a framed print (see posterPose in desk-focus.js).
  // `focus` describes the close-up: `point` is where to centre it, as fractions of the
  // visible print from the left and from the top; `span` zooms closer, to about that
  // fraction of the print; `whole` shows the entire print instead. A `detail` print, if
  // given, is only downloaded the first time someone zooms in.
  function zoomable(print, { name, caption, detail, focus }) {
    let detailed = !detail;
    print.g.name = name;
    Object.assign(print.g.userData, {
      caption,
      focus,
      loadDetail() {
        if (detailed) return;
        detailed = true;
        print.show(detail);
      },
    });
    interactive(print.g, { type: 'poster' });
  }

  // Black-and-white street map of Jamshedpur (OpenStreetMap data, see assets/SOURCES.md).
  zoomable(
    printFrame(-3.3, 4.45, 0.03, 0.76, 1.01, 'assets/print-1.png', {
      blank: '#eeeeee',
      tint: '#f2ece0',
    }),
    { name: 'jamshedpur-map', caption: 'Street map of Jamshedpur', focus: { whole: true } },
  );

  // Dhiraj, a small silhouette above the lights of the Kangra valley at Triund. The
  // close-up keeps him left of centre with the lights and the last of the sunset around him.
  zoomable(
    printFrame(0.48, 3.6, -0.8, 0.98, 0.73, 'assets/print-2.jpg', {
      blank: '#14161c',
      tint: '#ece6dc',
      border: '#d6c19b',
      verticalCrop: 0.5,
    }),
    {
      name: 'triund-photo',
      caption: 'Dhiraj above the valley lights at Triund',
      detail: 'assets/print-2-large.jpg',
      focus: { point: [0.37, 0.6], span: 0.5 },
    },
  );

  // Shown on the Polaroids until their photographs have loaded.
  const photoMaterial = texture((ctx, w, h) => {
    ctx.fillStyle = '#c5b89e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#536b59';
    ctx.fillRect(60, 60, w - 120, h - 120);
    ctx.fillStyle = '#dfd5ba';
    ctx.textAlign = 'center';
    ctx.font = '72px Georgia';
    ctx.fillText('Little moments', w / 2, h / 2);
    ctx.font = '30px monospace';
    ctx.fillText('PHOTO ALBUM', w / 2, h / 2 + 70);
  });

  // A movie poster on the top wall shelf. Zoomed in, it fills the screen, centred on
  // `focusPoint` (see `zoomable`).
  function moviePoster({ name, caption, x, width, url, detail, focusPoint }) {
    const poster = printFrame(x + UPPER_SHELF_SHIFT, 4.67, -0.98, width, 0.94, url, {
      blank: '#0b0806',
      tint: '#d9d3ca',
    });
    zoomable(poster, { name, caption, detail, focus: { point: focusPoint } });
  }

  // The Dark Knight Rises: a figure falling through the pit beneath the bats (see assets/SOURCES.md). The
  // frame is narrower than Interstellar's so the whole print fits uncropped.
  moviePoster({
    name: 'dark-knight-rises-poster',
    caption: 'The Dark Knight Rises poster',
    x: 0.47,
    width: 0.683,
    url: 'assets/poster-1.jpg',
    focusPoint: [0.58, 0.36],
  });

  // Interstellar: the Endurance skimming Gargantua's disk (see assets/SOURCES.md).
  moviePoster({
    name: 'interstellar-poster',
    caption: 'Interstellar poster',
    x: 1.57,
    width: 0.72,
    url: 'assets/poster-2.jpg',
    detail: 'assets/poster-2-large.jpg',
    focusPoint: [0.25, 0.48],
  });

  return { photoMaterial };
}

// Crop the texture to the frame's aspect ratio: centred horizontally for a wide
// photo, or at `verticalCrop` for a tall one.
function cropToFill(t, frameAspect, verticalCrop) {
  const aspect = t.image.width / t.image.height;
  if (aspect > frameAspect) {
    t.repeat.x = frameAspect / aspect;
    t.offset.x = (1 - t.repeat.x) / 2;
  } else {
    t.repeat.y = aspect / frameAspect;
    t.offset.y = (1 - t.repeat.y) * verticalCrop;
  }
}
