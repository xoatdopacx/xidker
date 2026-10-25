/**
 * GPU wake simulation: a height field that ping-pongs between two half-float render targets.
 * Red = water height, green = vertical velocity, blue = foam. It runs at a fixed number of steps per second,
 * so the waves travel at the same speed on 60 Hz and 120 Hz screens.
 */
import {
  ClampToEdgeWrapping,
  Color,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector4,
  WebGLRenderTarget,
} from "three";
import { FULLSCREEN_VERTEX, WAKE_FRAGMENT } from "./shaders.js";

/** The forcing values passed to advance() are tuned for this many steps per second. */
const REFERENCE_RATE = 120;
/** Beats per second of the hull's push; with the wave speed this sets the spacing of the crests in the V. */
const PULSE_HZ = 3.5;

export class WakeSimulation {
  /**
   * @param {import("three").WebGLRenderer} renderer
   * @param {object} options
   * @param {{x: number, z: number, size: number}} options.area  world square covered (x/z of its near-left corner)
   * @param {number} options.resolution  grid cells per side
   * @param {number} options.rate  steps per second
   * @param {number} options.waveSpeed  wave speed in world units per second
   * @param {number} options.halfLife  seconds for the waves to lose half their height
   * @param {number} options.foamHalfLife  seconds for the foam to fade by half
   * @param {{length: number, width: number}} options.hull  half length and half width of the lantern's hull
   */
  constructor(renderer, { area, resolution, rate, waveSpeed, halfLife, foamHalfLife, hull }) {
    this.renderer = renderer;
    this.area = area;
    this.rate = rate;
    this.cell = area.size / resolution;
    this.accumulator = 0;
    this.time = 0;
    this.steps = 0;
    this.last = null;
    this.scale = REFERENCE_RATE / rate;

    const options = {
      type: HalfFloatType,
      format: RGBAFormat,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      depthBuffer: false,
      generateMipmaps: false,
    };
    this.targets = [new WebGLRenderTarget(resolution, resolution, options), new WebGLRenderTarget(resolution, resolution, options)];
    this.current = 0;

    const cellsPerStep = waveSpeed / this.cell / rate;
    this.material = new ShaderMaterial({
      uniforms: {
        uState: { value: null },
        uTexel: { value: new Vector2(1 / resolution, 1 / resolution) },
        uWaveSpeed2: { value: Math.min(0.5, cellsPerStep * cellsPerStep) },
        uDamping: { value: Math.pow(0.5, 1 / (halfLife * rate)) },
        uFoamDecay: { value: Math.pow(0.5, 1 / (foamHalfLife * rate)) },
        uHull: { value: new Vector4() },
        uHullDir: { value: new Vector2(0, -1) },
        uHullSize: { value: new Vector2(hull.length / area.size, hull.width / area.size) },
        uHullPush: { value: 0 },
        uHullPulse: { value: 0 },
        uHullBob: { value: 0 },
        uTurbulence: { value: 0 },
        uChurnScale: { value: area.size / 1.2 },
        uFoamGain: { value: 0 },
        // Height difference between neighbouring cells where crests start to break into foam.
        uFoamSteep: { value: 0.25 * (this.cell / 0.1875) },
        uSeed: { value: 1 },
      },
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: WAKE_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });
    this.scene = new Scene();
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.material);
    this.scene.add(this.quad);
    this.reset();
  }

  /** The latest state; it changes after every step, so read it again after advance(). */
  get texture() {
    return this.targets[this.current].texture;
  }

  /** Clears all waves and foam. Also needed after a lost WebGL context comes back. */
  reset() {
    const { renderer } = this;
    const previousTarget = renderer.getRenderTarget();
    const previousColor = renderer.getClearColor(new Color());
    const previousAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    for (const target of this.targets) {
      renderer.setRenderTarget(target);
      renderer.clear(true, false, false);
    }
    renderer.setClearColor(previousColor, previousAlpha);
    renderer.setRenderTarget(previousTarget);
    this.accumulator = 0;
    this.last = null;
  }

  /**
   * Runs the steps that fit in dt while the hull moves to (x, z) in world units.
   * @param {number} dt seconds
   * @param {number} x
   * @param {number} z
   * @param {{push: number, turbulence: number, foam: number, bob: number}} drive  forcing per step at 120 steps a second
   */
  advance(dt, x, z, drive) {
    this.accumulator = Math.min(this.accumulator + dt, 4 / this.rate);
    const count = Math.floor(this.accumulator * this.rate);
    if (count === 0) return;
    this.accumulator -= count / this.rate;

    const { renderer, area, material, scale } = this;
    const u = material.uniforms;
    const toU = (x - area.x) / area.size;
    const toV = (z - area.z) / area.size;
    const fromU = this.last ? this.last.u : toU;
    const fromV = this.last ? this.last.v : toV;
    const du = toU - fromU;
    const dv = toV - fromV;
    const length = Math.hypot(du, dv);
    if (length > 1e-7) u.uHullDir.value.set(du / length, dv / length);

    u.uHullPush.value = drive.push * scale;
    u.uTurbulence.value = drive.turbulence * scale;
    u.uFoamGain.value = drive.foam * scale;

    const previousTarget = renderer.getRenderTarget();
    for (let i = 0; i < count; i++) {
      const a = i / count;
      const b = (i + 1) / count;
      u.uHull.value.set(fromU + du * a, fromV + dv * a, fromU + du * b, fromV + dv * b);
      this.time += 1 / this.rate;
      u.uHullBob.value = drive.bob * scale * Math.sin(this.time * Math.PI * 1.4);
      u.uHullPulse.value = Math.sin(this.time * Math.PI * 2 * PULSE_HZ);
      u.uSeed.value = Math.imul(++this.steps, 2654435761) >>> 0;
      u.uState.value = this.targets[this.current].texture;
      renderer.setRenderTarget(this.targets[1 - this.current]);
      renderer.render(this.scene, this.camera);
      this.current = 1 - this.current;
    }
    renderer.setRenderTarget(previousTarget);
    this.last = { u: toU, v: toV };
  }

  dispose() {
    for (const target of this.targets) target.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}
