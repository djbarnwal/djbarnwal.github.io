import * as THREE from 'three';

// A soft vignette and a static film grain give the warm room a photographic finish.
// The lamp glow itself comes from the bloom pass in desk-renderer.js.
export const deskLensShader = {
  uniforms: { tDiffuse: { value: null }, resolution: { value: new THREE.Vector2(1, 1) } },
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `uniform sampler2D tDiffuse;uniform vec2 resolution;varying vec2 vUv;
  void main(){vec3 color=texture2D(tDiffuse,vUv).rgb;
   vec2 q=vUv-.5;float vignette=1.-smoothstep(.24,.77,length(q))*.15;float grain=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.005;gl_FragColor=vec4(color*vignette+grain,1.);}`,
};
