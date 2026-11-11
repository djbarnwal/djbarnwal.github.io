import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { ROOM } from './desk-layout.js';

const LOOK_TARGET = new THREE.Vector3(-2.2, 2.77, 0);
const HOME_DISTANCE = 13.4;
const HOME_VIEW = new THREE.Spherical(HOME_DISTANCE, 1.46, 0.04);

// At the ends of the orbit, the view opens toward the windows or the mirror.
const ORBIT_LIMITS = { minAzimuth: -0.45, maxAzimuth: 0.2, minPolar: 1.37, maxPolar: 1.63 };

const DESKTOP_FOV = 36;
const MIN_VISIBLE_WIDTH = 15.9;
const WALL_CLEARANCE = 0.22;

// How far the camera may zoom in from the default view, which is the furthest out it goes.
const MAX_ZOOM = 2.3;

export function createDeskCamera(canvas) {
  const camera = new THREE.PerspectiveCamera(
    DESKTOP_FOV, window.innerWidth / window.innerHeight, 0.1, 145,
  );

  // OrbitControls only stores the target and limits. Its own input handling is
  // disconnected: desk-pointer.js orbits only on a deliberate drag over empty space.
  const controls = new OrbitControls(camera, canvas);
  controls.disconnect();
  canvas.style.touchAction = 'none';
  controls.enabled = false;
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.minAzimuthAngle = ORBIT_LIMITS.minAzimuth;
  controls.maxAzimuthAngle = ORBIT_LIMITS.maxAzimuth;
  controls.minPolarAngle = ORBIT_LIMITS.minPolar;
  controls.maxPolarAngle = ORBIT_LIMITS.maxPolar;

  // Widen the lens for portrait screens so the desk fits inside the same room.
  function fit() {
    const halfAngle = Math.max(
      THREE.MathUtils.degToRad(DESKTOP_FOV / 2),
      Math.atan(MIN_VISIBLE_WIDTH / (2 * HOME_DISTANCE * camera.aspect)),
    );
    camera.fov = 2 * THREE.MathUtils.radToDeg(halfAngle);
    camera.updateProjectionMatrix();
    controls.minDistance = HOME_DISTANCE / MAX_ZOOM;
    controls.maxDistance = HOME_DISTANCE;
  }

  // Zoom can move the orbit target. Leave room for the full drag at its new radius.
  function fitOrbitTarget(target, radius) {
    const { minAzimuth, maxAzimuth, minPolar, maxPolar } = ORBIT_LIMITS;
    const { clamp } = THREE.MathUtils;
    target.x = clamp(
      target.x,
      ROOM.left + WALL_CLEARANCE - radius * Math.sin(minAzimuth),
      ROOM.right - WALL_CLEARANCE - radius * Math.sin(maxAzimuth),
    );
    target.y = clamp(
      target.y,
      WALL_CLEARANCE - radius * Math.cos(maxPolar),
      ROOM.height - WALL_CLEARANCE - radius * Math.cos(minPolar),
    );
    target.z = clamp(target.z, ROOM.back + WALL_CLEARANCE, ROOM.front - WALL_CLEARANCE - radius);
  }

  function reset() {
    fit();
    camera.position.setFromSpherical(HOME_VIEW).add(LOOK_TARGET);
    controls.target.copy(LOOK_TARGET);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.update();
  }

  reset();
  return { camera, controls, reset, fit, fitOrbitTarget, home: LOOK_TARGET };
}
