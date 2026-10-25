/**
 * Generated ripple map for the small waves on the water. It is drawn once on the GPU (and again after a
 * lost WebGL context comes back), so the template ships no water textures.
 *
 * Channels: red/green = slope across x/z, blue = height (also used to break up the foam).
 */
import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RepeatWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector4,
  WebGLRenderTarget,
} from "three";
import { FULLSCREEN_VERTEX, RIPPLE_FRAGMENT } from "./shaders.js";

/** Small seeded random generator, so every visit gets the same ripples. */
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRipples(renderer, { size = 512, count = 40, seed = 7, windAngle = 0 } = {}) {
  const random = seededRandom(seed);
  const waves = [];
  let slopeEnergy = 0;
  let heightEnergy = 0;
  while (waves.length < count) {
    // Mostly along the wind, a few across it; whole cycles per tile keep the map seamless.
    const cycles = 2 + Math.pow(random(), 1.4) * 22;
    const angle = windAngle + (random() - 0.5) * 2.2;
    const kx = Math.round(Math.cos(angle) * cycles);
    const ky = Math.round(Math.sin(angle) * cycles);
    const k = Math.hypot(kx, ky);
    if (k < 1) continue;
    const amplitude = 1 / Math.pow(k, 1.5);
    waves.push(new Vector4(kx, ky, amplitude, random() * Math.PI * 2));
    slopeEnergy += (amplitude * 2 * Math.PI * k) ** 2 / 2;
    heightEnergy += amplitude ** 2 / 2;
  }

  const target = new WebGLRenderTarget(size, size, {
    type: UnsignedByteType,
    wrapS: RepeatWrapping,
    wrapT: RepeatWrapping,
    minFilter: LinearMipmapLinearFilter,
    magFilter: LinearFilter,
    generateMipmaps: true,
    depthBuffer: false,
    anisotropy: Math.min(4, renderer.capabilities.getMaxAnisotropy()),
  });

  const material = new ShaderMaterial({
    defines: { WAVE_COUNT: count },
    uniforms: {
      uWaves: { value: waves },
      // Three standard deviations fill the 0..1 range of the texture.
      uSlopeScale: { value: 1 / (3 * Math.sqrt(slopeEnergy)) },
      uHeightScale: { value: 1 / (3 * Math.sqrt(heightEnergy)) },
    },
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader: RIPPLE_FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new Mesh(new PlaneGeometry(2, 2), material);
  scene.add(quad);

  function render() {
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(previous);
  }

  render();

  return {
    texture: target.texture,
    render,
    dispose() {
      target.dispose();
      material.dispose();
      quad.geometry.dispose();
    },
  };
}
