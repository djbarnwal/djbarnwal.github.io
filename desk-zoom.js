import * as THREE from 'three';

// From this zoom on the visitor is caught: the nearest object pulls the camera in by
// itself, until it reaches the limit set in desk-camera.js and falls into the focus view.
const SUCTION_START = 1.7;
// How fast the suction raises the zoom, per second (exponential).
const SUCTION_PULL = 1;
// How much zoom a pixel of wheel travel adds. Trackpad pinches report far smaller deltas.
const WHEEL_STEP = 0.001;
const PINCH_STEP = 0.012;
// How quickly the camera catches up with the zoom asked for.
const ZOOM_SPEED = 10;
// Zooming out this far (in the same units as the steps) leaves a focused object.
const LEAVE_AFTER = 0.08;
// Moving the pointer further than this while being pulled picks the nearest object again.
const REPICK_PX = 12;

// Wheel and pinch zoom. The default view is the furthest out the camera goes. Zooming
// in moves toward whatever is under the pointer. The screen is split into Voronoi cells,
// one per site: every point belongs to the site whose on-screen rectangle is nearest.
// Past SUCTION_START, the cell the pointer is in decides what the camera is pulled into.
export function createDeskZoom({
  canvas,
  camera,
  controls,
  home,
  focus,
  sites,
  reducedMotion,
  onEnter,
  onPinchStart,
}) {
  const places = sites.map((object) => {
    const { screenSurface, image } = object.userData;
    const surface = screenSurface || image || object;
    surface.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(surface);
    return { object, bounds, center: bounds.getCenter(new THREE.Vector3()) };
  });
  const raycaster = new THREE.Raycaster();
  const cursor = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
  const offset = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const corner = new THREE.Vector3();
  const rect = new THREE.Box2();
  let goal = 1; // The zoom asked for: 1 is the default view.
  let place = null; // The site pulling the camera in.
  let leaving = 0; // How far the visitor has zoomed out of a focused object so far.

  const zoomLimit = () => controls.maxDistance / controls.minDistance;

  // `amount` is positive to zoom in, at screen point (x, y).
  function zoomBy(amount, x, y) {
    if (focus.active) {
      leaving = amount > 0 || focus.phase === 'returning' ? 0 : leaving - amount;
      if (leaving >= LEAVE_AFTER) {
        leaving = 0;
        focus.back();
      }
      return;
    }
    goal = THREE.MathUtils.clamp(goal * Math.exp(amount), 1, zoomLimit());
    if (Math.hypot(x - cursor.x, y - cursor.y) > REPICK_PX) place = null;
    cursor.set(x, y);
  }

  // The site whose on-screen rectangle is nearest the pointer. The pointer can be inside
  // more than one, so the smaller, which is the more specific, wins a tie.
  function nearestPlace() {
    let nearest = null,
      nearestDistance = Infinity,
      nearestArea = Infinity;
    for (const candidate of places) {
      rect.makeEmpty();
      for (let i = 0; i < 8; i++) {
        const { min, max } = candidate.bounds;
        corner.set(i & 1 ? min.x : max.x, i & 2 ? min.y : max.y, i & 4 ? min.z : max.z);
        corner.project(camera);
        rect.expandByPoint({
          x: ((corner.x + 1) * window.innerWidth) / 2,
          y: ((1 - corner.y) * window.innerHeight) / 2,
        });
      }
      const distance = rect.distanceToPoint(cursor),
        area = (rect.max.x - rect.min.x) * (rect.max.y - rect.min.y);
      if (distance < nearestDistance || (distance === nearestDistance && area < nearestArea)) {
        nearest = candidate;
        nearestDistance = distance;
        nearestArea = area;
      }
    }
    return nearest;
  }

  // The point under the pointer, at the depth of the camera's target.
  function pointUnderCursor(distance) {
    raycaster.setFromCamera(
      {
        x: (cursor.x / window.innerWidth) * 2 - 1,
        y: (-cursor.y / window.innerHeight) * 2 + 1,
      },
      camera,
    );
    const { ray } = raycaster;
    camera.getWorldDirection(forward);
    return ray.at(distance / ray.direction.dot(forward), new THREE.Vector3());
  }

  function fallIn(object) {
    goal = 1;
    place = null;
    leaving = 0;
    canvas.style.cursor = 'default';
    onEnter(object);
    // The way back out leads to the default view, not to the edge of the suction.
    focus.returnTo(home, controls.maxDistance);
  }

  function update(seconds) {
    if (focus.active) return;
    const limit = zoomLimit();
    if (goal >= SUCTION_START) goal = Math.min(limit, goal * Math.exp(SUCTION_PULL * seconds));
    offset.copy(camera.position).sub(controls.target);
    const distance = offset.length(),
      current = controls.maxDistance / distance;
    if (Math.abs(goal - current) < 0.001) return;

    const follow = reducedMotion.matches ? 1 : 1 - Math.exp(-seconds * ZOOM_SPEED);
    let next = current * Math.pow(goal / current, follow);
    if (Math.abs(goal - next) < 0.002) next = goal;

    if (next < current) {
      // Zooming out always leads back to the default view, wherever the zoom went in.
      controls.target.lerp(home, 1 - (next - 1) / (current - 1));
      if (next < SUCTION_START) place = null;
    } else if (next < SUCTION_START) {
      // Scale the view about the point under the pointer, so that point stays put.
      controls.target.lerp(pointUnderCursor(distance), 1 - current / next);
    } else {
      // Caught: slide over so the object is centred by the time the limit is reached.
      place ??= nearestPlace();
      controls.target.lerp(place.center, (next - current) / (limit - current));
    }
    camera.position.copy(controls.target).add(offset.setLength(controls.maxDistance / next));
    camera.updateMatrixWorld(true);
    if (next >= limit) fallIn(place.object);
  }

  function reset() {
    goal = 1;
    place = null;
  }

  // A wheel over the room zooms. A wheel over a monitor's page scrolls that page, but a
  // trackpad pinch (a wheel with ctrlKey set) zooms anywhere, never the browser page.
  window.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey && event.target !== canvas) return;
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode ? 40 : 1);
      zoomBy(-pixels * (event.ctrlKey ? PINCH_STEP : WHEEL_STEP), event.clientX, event.clientY);
    },
    { passive: false },
  );

  // Two fingers on a touch screen.
  const touches = new Map();
  let span = 0;
  function measure() {
    const [a, b] = touches.values();
    return { span: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.size !== 2) return;
    onPinchStart();
    span = measure().span;
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!touches.has(event.pointerId)) return;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.size !== 2) return;
    const now = measure();
    zoomBy(Math.log(now.span / span), now.x, now.y);
    span = now.span;
  });
  for (const type of ['pointerup', 'pointercancel'])
    canvas.addEventListener(type, (event) => touches.delete(event.pointerId));

  // Safari reports a trackpad pinch as gesture events instead of wheel events. On iOS the
  // same events accompany the touches handled above, so those are only stopped here.
  let gestureScale = 1;
  window.addEventListener(
    'gesturestart',
    (event) => {
      event.preventDefault();
      gestureScale = 1;
    },
    { passive: false },
  );
  window.addEventListener(
    'gesturechange',
    (event) => {
      event.preventDefault();
      if (touches.size) return;
      zoomBy(Math.log(event.scale / gestureScale), event.clientX, event.clientY);
      gestureScale = event.scale;
    },
    { passive: false },
  );

  return { update, reset };
}
