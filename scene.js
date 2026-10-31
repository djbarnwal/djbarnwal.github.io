import * as THREE from 'three';
import { createDeskRenderer, createDeskScene, createDeskComposer } from './desk-renderer.js';
import { createDeskCamera } from './desk-camera.js';
import { createSceneKit } from './scene-kit.js';
import { createDeskDiscoveries } from './desk-discoveries.js';
import { addDeskFurniture } from './desk-furniture.js';
import { addDeskBooks } from './desk-books.js';
import { addDeskPlants } from './desk-plants.js';
import { addDeskWallFrames } from './desk-wall-frames.js';
import { addDeskMonitors } from './desk-monitors.js';
import { addDeskLaptop } from './desk-laptop.js';
import { addDeskToys } from './desk-toys.js';
import { addDeskPegboard } from './desk-pegboard.js';
import { addDeskSketchboard } from './desk-sketchboard.js';
import { addDeskShelfKeepsakes } from './desk-shelf-keepsakes.js';
import { addDeskChair } from './desk-chair.js';
import { addDeskLighting } from './desk-lighting.js';
import { addDeskAstronauts } from './desk-astronauts.js';
import { addDeskDust } from './desk-dust.js';
import { createDeskFocus } from './desk-focus.js';
import { createDeskPointer } from './desk-pointer.js';

// Cap each frame's time step so lights don't jump after a stalled frame.
const MAX_FRAME_SECONDS = 0.05;

// How quickly the background blur fades in and out around a focused object.
const DEPTH_OF_FIELD_SPEED = 3.5;

// Builds the 3D desk and wires it to the page. The callbacks let app.js react to
// what the visitor does: open a page, toggle a light, play with an object, and so on.
export function createDesk({ onOpen, onLight, onError, onFocus, onSurface, onObject = () => {} }) {
  const canvas = document.querySelector('#desk-canvas');
  const renderer = createDeskRenderer(canvas);
  const scene = createDeskScene(renderer);
  const { camera, controls, reset: resetCamera } = createDeskCamera(canvas);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const discoveries = createDeskDiscoveries();
  const kit = createSceneKit({ scene, renderer, discoveries });

  // Build the room.
  addDeskFurniture(kit);
  addDeskBooks(kit);
  addDeskPlants(kit);
  const { photoMaterial } = addDeskWallFrames(kit);
  addDeskMonitors(kit);
  addDeskLaptop(kit);
  const cubes = addDeskToys(kit);
  addDeskPegboard({ ...kit, photoMaterial });
  const doodle = addDeskSketchboard(kit);
  addDeskShelfKeepsakes(kit);
  addDeskChair(kit);
  const lighting = addDeskLighting(kit);
  addDeskAstronauts(kit);
  const dust = addDeskDust(kit);

  const focus = createDeskFocus({
    scene,
    camera,
    controls,
    onChange: onFocus,
    onSurface,
    onBeforeFocus: () => {
      pointer.cancel();
      discoveries.finish();
    },
  });

  function playToy(key) {
    if (focus.active) return false;
    const now = performance.now();
    const cube = cubes[Number(key.split('-')[1])];
    let message;
    if (key.startsWith('cube-') && cube) {
      cube.userData.turn(now, reducedMotion.matches);
      message = 'The puzzle turns one layer.';
    } else if (key === 'doodle') {
      doodle.userData.replay(now, reducedMotion.matches);
      message = 'SpongeBob is drawn again on the glass.';
    } else {
      if (!discoveries.play(key, now, reducedMotion.matches)) return false;
      message = discoveries.message(key);
    }
    onObject('toy', message);
    return true;
  }

  // A click on an object. Clicks are ignored while the camera is zoomed in on something.
  function select(object) {
    if (focus.active) return;
    const action = object.userData.action;
    if (action.type === 'pegboard') focus.openPegboard(object);
    else if (action.type === 'open') onOpen(action.key);
    else if (action.type === 'poster') {
      object.userData.loadDetail?.();
      focus.openPoster(object);
    } else if (action.type === 'toy') playToy(action.key);
    else onLight(action.key);
  }

  const pointer = createDeskPointer({
    canvas,
    camera,
    controls,
    pickables: kit.pickables,
    focus,
    onSelect: select,
  });

  const { composer, setSize, setDepthOfField } = createDeskComposer(renderer, scene, camera);

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    pointer.cancel();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (focus.active) focus.resize();
    else resetCamera();
    camera.updateProjectionMatrix();
    setSize(width, height);
    dust.resize(camera, height * renderer.getPixelRatio());
  }
  window.addEventListener('resize', resize);
  resize();

  // Jump every animation to its resting state.
  function settleAnimations() {
    focus.skip();
    discoveries.finish();
    const later = performance.now() + 10000;
    cubes.forEach((cube) => cube.userData.animate(later));
    doodle.userData.animate(later);
    lighting.update(0, true);
  }
  reducedMotion.addEventListener?.('change', () => {
    if (reducedMotion.matches) settleAnimations();
  });

  // Keep the focused monitor, poster or pegboard sharp and blur the room behind it. The focus
  // distance follows the object every frame, so it stays sharp while the camera travels.
  let blur = 0;
  const focusPoint = new THREE.Vector3();
  const cameraForward = new THREE.Vector3();
  function updateDepthOfField(seconds) {
    const wanted = focus.active && focus.phase !== 'returning' ? 1 : 0;
    const step = reducedMotion.matches ? 1 : 1 - Math.exp(-seconds * DEPTH_OF_FIELD_SPEED);
    blur = THREE.MathUtils.lerp(blur, wanted, step);
    if (blur < 0.002) blur = wanted;
    let distance = 10;
    if (focus.object) {
      const { screenSurface, image } = focus.object.userData;
      const target = screenSurface || image || focus.object;
      target.getWorldPosition(focusPoint);
      camera.getWorldDirection(cameraForward);
      distance = Math.max(0.2, focusPoint.sub(camera.position).dot(cameraForward));
    }
    setDepthOfField(blur, distance);
  }

  let lastFrame = performance.now();
  function render(time) {
    if (document.hidden) return;
    const seconds = Math.min(MAX_FRAME_SECONDS, Math.max(0.001, (time - lastFrame) * 0.001));
    lastFrame = time;
    if (focus.active) focus.update(time);
    lighting.update(seconds, reducedMotion.matches);
    dust.update(seconds, lighting.brightness, reducedMotion.matches);
    discoveries.update(time);
    cubes.forEach((cube) => cube.userData.animate(time));
    doodle.userData.animate(time);
    updateDepthOfField(seconds);
    composer.render();
  }
  renderer.setAnimationLoop(render);

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    discoveries.finish();
    focus.back(true);
    onError();
  });
  canvas.addEventListener('webglcontextrestored', () => location.reload());

  return {
    setLights: (state) => lighting.setState(state, reducedMotion.matches),
    focus,
    scene,
    camera,
    renderer,
    composer,
  };
}
