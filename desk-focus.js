import * as THREE from 'three';

// How much of the poster's print fills the screen when zoomed in. Just under 1, so
// the frame around the print stays out of view.
const POSTER_FILL = 0.96;

// How much of the screen a print shown whole fills, leaving its frame and some wall in
// sight, and the back button clear of the print.
const WHOLE_PRINT_FILL = 0.8;

// How much of the screen the Polaroids fill in the pegboard view, leaving some of the
// board around them in sight.
const PEGBOARD_FILL = 0.72;

// Camera journeys to the monitors, the poster and the pegboard share one reversible
// state machine.
export function createDeskFocus({
  scene,
  camera,
  controls,
  onChange = () => {},
  onSurface = () => {},
  onBeforeFocus = () => {},
  viewport = () => ({
    width: window.innerWidth,
    height: window.innerHeight,
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }),
}) {
  let state = null,
    job = null,
    saved = null;
  const zAxis = new THREE.Vector3(0, 0, 1);
  const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  function notify() {
    onChange(
      state
        ? {
            mode: state.mode,
            key: state.key,
            phase: state.phase,
            caption: state.object.userData.caption || '',
          }
        : { mode: null, phase: 'idle' },
    );
  }
  function animate(duration, update, done) {
    job = { start: performance.now(), duration: viewport().reduced ? 0 : duration, update, done };
    if (!job.duration) skip();
  }
  function skip() {
    if (!job) return;
    const current = job;
    job = null;
    current.update(1);
    camera.updateMatrixWorld(true);
    current.done();
  }
  function step(now) {
    if (job) {
      const current = job,
        t = current.duration
          ? Math.min(1, Math.max(0, (now - current.start) / current.duration))
          : 1;
      current.update(smooth(t));
      camera.updateMatrixWorld(true);
      if (t === 1 && job === current) {
        job = null;
        current.done();
      }
    }
  }
  function begin(mode, key, object) {
    if (state || !object) return false;
    onBeforeFocus();
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = damping;
    saved = {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      target: controls.target.clone(),
      zoom: camera.zoom,
      controlsEnabled: controls.enabled,
    };
    controls.enabled = false;
    state = { mode, key, object, phase: 'entering' };
    return true;
  }
  function monitorPose() {
    const v = viewport(),
      face = state.object.userData.screenSurface;
    scene.updateMatrixWorld(true);
    const center = face.getWorldPosition(new THREE.Vector3()),
      orientation = face.getWorldQuaternion(new THREE.Quaternion()),
      tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const availableHeight = Math.max(0.3, Math.min(0.76, (v.height - 140) / v.height));
    const d = Math.max(
      0.98 / (2 * tangent * availableHeight),
      1.71 / (2 * tangent * (v.width / v.height) * 0.89),
    );
    return {
      position: center.clone().add(zAxis.clone().applyQuaternion(orientation).multiplyScalar(d)),
      quaternion: orientation,
    };
  }
  function projectScreen() {
    if (state?.mode !== 'monitor' || state.phase !== 'ready') return;
    const v = viewport(),
      face = state.object.userData.screenSurface;
    face.updateWorldMatrix(true, false);
    camera.updateMatrixWorld(true);
    const p = [
      [-0.855, 0.49, 0],
      [0.855, -0.49, 0],
    ].map((a) => face.localToWorld(new THREE.Vector3(...a)).project(camera));
    onSurface({
      left: ((p[0].x + 1) * v.width) / 2,
      top: ((1 - p[0].y) * v.height) / 2,
      width: ((p[1].x - p[0].x) * v.width) / 2,
      height: ((p[0].y - p[1].y) * v.height) / 2,
    });
  }
  function ready() {
    if (!state) return;
    state.phase = 'ready';
    projectScreen();
    notify();
  }
  // Face a framed print head-on. By default its print fills the screen, centred on
  // `point` as far as the print's edges allow, so the frame never shows. A `span` below
  // 1 zooms closer, keeping at least that fraction of the print's width or height in
  // view, whichever the screen shape allows. With `whole`, the entire print is in view.
  function posterPose() {
    const v = viewport(),
      { image, focus } = state.object.userData,
      { point = [0.5, 0.5], span = 1, whole = false } = focus;
    scene.updateMatrixWorld(true);
    const { width, height } = image.geometry.parameters,
      aspect = v.width / v.height,
      tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const cover = Math.min(height, width / aspect),
      viewH = whole
        ? Math.max(height, width / aspect) / WHOLE_PRINT_FILL
        : Math.min(cover, Math.max(height, width / aspect) * span) * POSTER_FILL,
      viewW = viewH * aspect;
    const slackX = Math.max(0, (width - viewW) / 2),
      slackY = Math.max(0, (height - viewH) / 2),
      clamp = THREE.MathUtils.clamp,
      x = clamp((point[0] - 0.5) * width, -slackX, slackX),
      y = clamp((0.5 - point[1]) * height, -slackY, slackY);
    return {
      position: image.localToWorld(new THREE.Vector3(x, y, viewH / (2 * tangent))),
      quaternion: image.getWorldQuaternion(new THREE.Quaternion()),
    };
  }
  // Face the pegboard head-on, with the Polaroids centred and filling PEGBOARD_FILL
  // of the screen in whichever direction is tighter.
  function pegboardPose() {
    const v = viewport();
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(state.object),
      size = bounds.getSize(new THREE.Vector3()),
      orientation = state.object.getWorldQuaternion(new THREE.Quaternion()),
      tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const d =
      Math.max(size.y / (2 * tangent), size.x / (2 * tangent * (v.width / v.height))) /
      PEGBOARD_FILL;
    return {
      position: bounds
        .getCenter(new THREE.Vector3())
        .add(zAxis.clone().applyQuaternion(orientation).multiplyScalar(d)),
      quaternion: orientation,
    };
  }
  const poses = { monitor: monitorPose, poster: posterPose, pegboard: pegboardPose };
  function travel(duration, to) {
    const from = camera.position.clone(),
      rotation = camera.quaternion.clone(),
      zoom = camera.zoom;
    animate(
      duration,
      (t) => {
        camera.position.lerpVectors(from, to.position, t);
        camera.quaternion.slerpQuaternions(rotation, to.quaternion, t);
        camera.zoom = THREE.MathUtils.lerp(zoom, 1, t);
        camera.updateProjectionMatrix();
      },
      ready,
    );
  }
  function openMonitor(key) {
    const object = scene.getObjectByName(key + '-monitor');
    if (!begin('monitor', key, object)) return false;
    notify();
    travel(1000, monitorPose());
    return true;
  }
  function switchMonitor(key) {
    if (state?.mode !== 'monitor' || state.phase !== 'ready' || state.key === key) return false;
    const object = scene.getObjectByName(key + '-monitor');
    if (!object) return false;
    state.key = key;
    state.object = object;
    state.phase = 'changing';
    notify();
    travel(800, monitorPose());
    return true;
  }
  function openPoster(object) {
    if (!begin('poster', 'poster', object)) return false;
    notify();
    travel(1100, posterPose());
    return true;
  }
  function openPegboard(object) {
    if (!begin('pegboard', 'pegboard', object)) return false;
    notify();
    travel(1000, pegboardPose());
    return true;
  }
  function finishReturn() {
    camera.position.copy(saved.position);
    camera.quaternion.copy(saved.quaternion);
    camera.zoom = saved.zoom;
    camera.updateProjectionMatrix();
    controls.target.copy(saved.target);
    controls.enabled = saved.controlsEnabled;
    state = null;
    saved = null;
    job = null;
    notify();
  }
  function back(immediate = false) {
    if (!state) return;
    job = null;
    state.phase = 'returning';
    notify();
    const p = camera.position.clone(),
      q = camera.quaternion.clone(),
      zoom = camera.zoom;
    animate(
      immediate ? 0 : 900,
      (t) => {
        camera.position.lerpVectors(p, saved.position, t);
        camera.quaternion.slerpQuaternions(q, saved.quaternion, t);
        camera.zoom = THREE.MathUtils.lerp(zoom, saved.zoom, t);
        camera.updateProjectionMatrix();
      },
      finishReturn,
    );
  }
  function resize() {
    if (!state) return;
    skip();
    if (!state) return;
    const to = poses[state.mode]();
    camera.position.copy(to.position);
    camera.quaternion.copy(to.quaternion);
    camera.updateMatrixWorld(true);
    projectScreen();
  }
  return {
    openMonitor,
    switchMonitor,
    openPoster,
    openPegboard,
    back,
    skip,
    resize,
    update: step,
    get active() {
      return !!state;
    },
    get mode() {
      return state?.mode;
    },
    get object() {
      return state?.object;
    },
    get phase() {
      return state?.phase;
    },
  };
}
