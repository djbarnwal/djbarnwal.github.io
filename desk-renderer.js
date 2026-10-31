import * as THREE from 'three';
import { RoomEnvironment } from './vendor/addons/environments/RoomEnvironment.js';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { SSAOPass } from './vendor/addons/postprocessing/SSAOPass.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { ShaderPass } from './vendor/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from './vendor/addons/postprocessing/BokehPass.js';
import { FXAAShader } from './vendor/addons/shaders/FXAAShader.js';
import { deskLensShader } from './desk-optics.js';

// Below this viewport width, render at a lower resolution and skip ambient occlusion.
const SMALL_SCREEN_WIDTH = 700;

// Bloom: only bulbs, lamp shades and the brightest screen text are bright enough to glow.
const BLOOM = { strength: 0.62, radius: 0.55, threshold: 0.86 };

// Depth of field while a monitor, the poster or the pegboard is in focus. Aperture sets how fast
// things blur away from the focused object; maxBlur caps the blur in screen units.
const DEPTH_OF_FIELD = { aperture: 0.0016, maxBlur: 0.015 };

const BACKGROUND = '#675f56';

export function createDeskRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  const maxPixelRatio = window.innerWidth < SMALL_SCREEN_WIDTH ? 1.35 : 1.7;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.96;
  return renderer;
}

export function createDeskScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);
  scene.fog = new THREE.Fog(BACKGROUND, 28, 65);

  // A faint studio reflection so metal and glass have something to reflect.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new RoomEnvironment();
  scene.environment = pmrem.fromScene(studio, 0.06).texture;
  scene.environmentIntensity = 0.15;
  studio.dispose();
  pmrem.dispose();
  return scene;
}

// Render pipeline: scene → ambient occlusion → bloom → depth of field → colour output
// → lens effect → anti-aliasing.
export function createDeskComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const ambientOcclusion = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight, 16);
  ambientOcclusion.kernelRadius = 0.18;
  ambientOcclusion.minDistance = 0.0004;
  ambientOcclusion.maxDistance = 0.018;
  ambientOcclusion.enabled = window.innerWidth >= SMALL_SCREEN_WIDTH;
  composer.addPass(ambientOcclusion);
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    BLOOM.strength,
    BLOOM.radius,
    BLOOM.threshold,
  );
  composer.addPass(bloom);
  // Off until something is in focus; it costs an extra depth render each frame.
  const depthOfField = new BokehPass(scene, camera, {
    focus: 10,
    aperture: 0,
    maxblur: DEPTH_OF_FIELD.maxBlur,
  });
  depthOfField.enabled = false;
  composer.addPass(depthOfField);
  composer.addPass(new OutputPass());
  const lens = new ShaderPass(deskLensShader);
  composer.addPass(lens);
  const fxaa = new ShaderPass(FXAAShader);
  composer.addPass(fxaa);

  function setSize(width, height) {
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    const pixelRatio = renderer.getPixelRatio();
    fxaa.material.uniforms.resolution.value.set(
      1 / (width * pixelRatio),
      1 / (height * pixelRatio),
    );
    lens.uniforms.resolution.value.set(1 / (width * pixelRatio), 1 / (height * pixelRatio));
    ambientOcclusion.enabled = width >= SMALL_SCREEN_WIDTH;
  }

  // `amount` fades the blur in and out (0 to 1); `distance` is how far away the sharp object is.
  function setDepthOfField(amount, distance) {
    depthOfField.enabled = amount > 0.002;
    depthOfField.uniforms.aperture.value = DEPTH_OF_FIELD.aperture * amount;
    depthOfField.uniforms.focus.value = distance;
  }

  return { composer, setSize, setDepthOfField };
}
