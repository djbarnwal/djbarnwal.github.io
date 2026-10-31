import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

const HOME_POSITION = new THREE.Vector3(4.7, 6.3, 14.3);
const LOOK_TARGET = new THREE.Vector3(-0.35, 2.6, 0);

// How far the visitor may look around, in radians.
const ORBIT_LIMITS = { minAzimuth: -0.42, maxAzimuth: 0.6, minPolar: 0.95, maxPolar: 1.49 };

// The whole desk must fit: at least this much world height, and this much width.
const MIN_VISIBLE_HEIGHT = 7.35;
const MIN_VISIBLE_WIDTH = 11.5;

export function createDeskCamera(canvas) {
  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 80);

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

  const viewDirection = HOME_POSITION.clone().sub(LOOK_TARGET).normalize();

  // Back the camera away along the home direction until the desk fits the viewport.
  function fitCamera() {
    const span = Math.max(
      MIN_VISIBLE_HEIGHT,
      MIN_VISIBLE_WIDTH / (window.innerWidth / window.innerHeight),
    );
    const distance = span / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.position.copy(LOOK_TARGET).addScaledVector(viewDirection, distance);
    controls.minDistance = distance * 0.62;
    controls.maxDistance = distance * 1.45;
  }

  function reset() {
    fitCamera();
    controls.target.copy(LOOK_TARGET);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.update();
  }

  reset();
  return { camera, controls, reset };
}
