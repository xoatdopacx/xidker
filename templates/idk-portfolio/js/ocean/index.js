/**
 * idk portfolio — the 3D ocean behind the page (three.js on WebGL2). Written for this template.
 *
 * On screen:
 *  - a wide water mesh, densest near the camera, lifted by a 4-octave simplex swell in the vertex shader;
 *  - small waves from a generated, seamless ripple map read twice at two scales (ripples.js);
 *  - a lantern that skims the water: it follows the pointer, or cruises a figure-eight route while the
 *    pointer rests, and draws a V-shaped wake with foam through a GPU height-field simulation (wake.js);
 *  - a dusk sky with a low sun, reflected by the water through a Fresnel term (shaders.js).
 *
 *   const ocean = createOcean(document.getElementById("ocean-canvas-host"), { altitude: 14 });
 *   ocean.setPointer(clientX, clientY); // steer the lantern toward a point on screen (CSS pixels)
 *   ocean.clearPointer();               // let it return to its own route
 *   ocean.setSpeed(65);                 // lantern speed, 25-100 (the HUD slider)
 *   ocean.setSwell(1.85);               // wave height, 0.8-3
 *   ocean.setAltitude(14);              // camera height, 8-54
 *   ocean.setIntensity(0.52);           // wake strength and lantern brightness, about 0.3-0.8
 *   ocean.setActive(false);             // stop drawing while the ocean is out of sight
 *   ocean.setPixelRatio(1, { lock: true }); // fixed sharpness instead of the automatic one
 *   await ocean.ready;                  // resolves once the shaders are compiled and drawing has started
 *   ocean.dispose();
 *
 * Everything that sets the look is in OCEAN_SETTINGS; pass overrides as the second argument.
 */
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  DoubleSide,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import { createRipples } from "./ripples.js";
import { WakeSimulation } from "./wake.js";
import { GLOW_FRAGMENT, GLOW_VERTEX, SKY_FRAGMENT, SKY_VERTEX, WATER_FRAGMENT, WATER_VERTEX } from "./shaders.js";

export const OCEAN_SETTINGS = {
  /* Colours (sRGB hex). */
  skyZenith: "#03050d",
  skyMid: "#0a1230",
  skyHorizon: "#232a5c",
  skyGlow: "#ff7a33",
  skyRim: "#12406a",
  sunColor: "#ffc89a",
  deepWater: "#01040b",
  scatter: "#063040",
  foamColor: "#d9ecff",
  lanternColor: "#38bdf8",

  /* Sun, in degrees. Azimuth is measured from straight ahead; positive is to the right. */
  sunElevation: -0.6,
  sunAzimuth: 14,

  /* Swell and ripples. */
  swellScale: 0.042, // lower = longer swells
  swellFlow: 0.55, // how fast the swell rolls in
  swellPerUnit: 0.45, // world units of swell per unit of the "Wave Height" slider
  windAngle: 70, // direction the waves travel, degrees (0 = right, 90 = toward the camera)
  rippleStrength: 0.22,
  crestFoam: 0.35, // foam on the highest swell crests; shows up as the waves get taller
  glintKnee: 0.6, // sun glint: brightness where the soft-knee compression starts
  glintCompression: 0.35, // ...and how hard it compresses above it
  fogDensity: 1 / 1500,
  exposure: 1,

  /* Wake simulation. The lantern stays inside this square of water (x/z of its near-left corner, side length). */
  wakeArea: { x: -48, z: -108, size: 96 },
  wakeResolution: 512, // cells per side; 256 on phones and small machines
  wakeRate: 120, // steps per second; 90 on phones and small machines
  wakeWaveSpeed: 6.5, // world units per second; a lantern faster than this draws a V
  wakeHalfLife: 1.6, // seconds for the wake waves to lose half their height
  foamHalfLife: 2.4,
  wakeLift: 1, // world units of height per simulation unit
  wakeShading: 2, // how strongly the wake waves bend the light
  wakeGlow: 3, // how much lighter the water looks on the wake's crests (seen best from above)
  wakePush: 0.006,
  wakeTurbulence: 0.006,
  wakeFoam: 0.14,
  wakeBob: 0.0015, // ripples from a lantern that stands still
  hull: { length: 1.4, width: 0.8 },

  /* Lantern. */
  lanternHeight: 1.6,
  lanternAcceleration: 26, // world units per second squared; lower = wider turns
  idleSeconds: 2.5, // pointer stillness before the lantern returns to its route
  route: { z: -58, halfWidth: 24, depth: 14 },

  /* Camera. Pitch (degrees down from the horizon) follows the altitude. */
  fov: 40,
  fovPortrait: 54,
  altitudeMin: 8,
  altitudeMax: 54,
  pitchMin: 6,
  pitchMax: 32,

  /* Sharpness. The pixel ratio drops when frames take too long and creeps back up when they are fast. */
  maxPixelRatio: 1.5,
  minPixelRatio: 0.6,
};

const DEG = Math.PI / 180;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const approach = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt));

/** Water grid in front of the camera: rows get further apart with distance, out to the horizon. */
function buildSeaGeometry({ rows, cols, near = 3, far = 4000, spread = 1.28, margin = 24 }) {
  const growth = Math.pow(far / near, 1 / rows);
  const positions = new Float32Array((rows + 1) * (cols + 1) * 3);
  let k = 0;
  for (let r = 0; r <= rows; r++) {
    const distance = near * Math.pow(growth, r);
    const half = distance * spread + margin;
    for (let c = 0; c <= cols; c++) {
      positions[k++] = -half + (2 * half * c) / cols;
      positions[k++] = 0;
      positions[k++] = -distance;
    }
  }
  const indices = new Uint32Array(rows * cols * 6);
  k = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + cols + 1;
      indices[k++] = a;
      indices[k++] = b;
      indices[k++] = a + 1;
      indices[k++] = a + 1;
      indices[k++] = b;
      indices[k++] = b + 1;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  // Vertex spacing at a distance d is max(d * x, d * y + z); the shader uses it to fade octaves it cannot show.
  return { geometry, footprint: new Vector3(growth - 1, (2 * spread) / cols, (2 * margin) / cols) };
}

/**
 * @param {HTMLElement} host  element the canvas fills
 * @param {Partial<typeof OCEAN_SETTINGS> & {altitude?: number, speed?: number, swell?: number, intensity?: number,
 *   reducedMotion?: boolean, lowPower?: boolean}} [overrides]
 */
export function createOcean(host, overrides = {}) {
  const settings = { ...OCEAN_SETTINGS, ...overrides };
  const reducedMotion = Boolean(settings.reducedMotion);
  const lowPower =
    settings.lowPower ?? (window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4);
  const timeScale = reducedMotion ? 0.4 : 1;

  // Throws when WebGL2 is not available; the page then keeps its still background.
  const renderer = new WebGLRenderer({ antialias: false, alpha: false, stencil: false, powerPreference: "high-performance" });
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = settings.exposure;
  renderer.setClearColor(0x000000, 1);
  const canvas = renderer.domElement;
  host.appendChild(canvas);

  const color = (hex) => new Color(hex);
  const sunDir = new Vector3(
    Math.sin(settings.sunAzimuth * DEG) * Math.cos(settings.sunElevation * DEG),
    Math.sin(settings.sunElevation * DEG),
    -Math.cos(settings.sunAzimuth * DEG) * Math.cos(settings.sunElevation * DEG),
  );
  const skyUniforms = {
    uSunDir: { value: sunDir },
    uSunColor: { value: color(settings.sunColor) },
    uSkyZenith: { value: color(settings.skyZenith) },
    uSkyMid: { value: color(settings.skyMid) },
    uSkyHorizon: { value: color(settings.skyHorizon) },
    uSkyGlow: { value: color(settings.skyGlow) },
    uSkyRim: { value: color(settings.skyRim) },
  };

  const scene = new Scene();
  const camera = new PerspectiveCamera(settings.fov, 1, 0.1, 6000);
  camera.rotation.order = "YXZ";

  const sky = new Mesh(
    new SphereGeometry(1000, 32, 16),
    new ShaderMaterial({
      uniforms: skyUniforms,
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: BackSide,
      depthTest: false,
      depthWrite: false,
    }),
  );
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  scene.add(sky);

  // The wake needs float render targets; without them the ocean still runs, just without a wake.
  const canSimulate =
    renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float");
  const area = settings.wakeArea;
  const resolution = lowPower ? Math.min(256, settings.wakeResolution) : settings.wakeResolution;
  const wake = canSimulate
    ? new WakeSimulation(renderer, {
        area,
        resolution,
        rate: lowPower ? Math.min(90, settings.wakeRate) : settings.wakeRate,
        waveSpeed: settings.wakeWaveSpeed,
        halfLife: settings.wakeHalfLife,
        foamHalfLife: settings.foamHalfLife,
        hull: settings.hull,
      })
    : null;
  const flatWake = wake ? null : new DataTexture(new Uint8Array(4), 1, 1);
  if (flatWake) flatWake.needsUpdate = true;
  const ripples = createRipples(renderer, { windAngle: settings.windAngle * DEG });

  const grid = buildSeaGeometry(lowPower ? { rows: 300, cols: 160 } : { rows: 400, cols: 220 });
  const cell = area.size / resolution;
  const lanternColor = color(settings.lanternColor);
  const waterUniforms = {
    ...skyUniforms,
    uTime: { value: 0 },
    uSwellAmp: { value: 0 },
    uSwellScale: { value: settings.swellScale },
    uSwellFlow: { value: settings.swellFlow },
    uWind: { value: new Vector2(Math.cos(settings.windAngle * DEG), Math.sin(settings.windAngle * DEG)) },
    uFootprint: { value: grid.footprint },
    uWake: { value: wake ? wake.texture : flatWake },
    uWakeRect: { value: new Vector4(area.x, area.z, area.size, 1 / area.size) },
    uWakeLift: { value: settings.wakeLift },
    uWakeTexel: { value: 1 / resolution },
    uWakeSlope: { value: (settings.wakeLift / (2 * cell)) * settings.wakeShading },
    uWakeCrest: { value: settings.wakeGlow },
    uRipples: { value: ripples.texture },
    uRippleStrength: { value: settings.rippleStrength },
    uDeepColor: { value: color(settings.deepWater) },
    uScatterColor: { value: color(settings.scatter) },
    uFoamColor: { value: color(settings.foamColor) },
    uCrestFoam: { value: settings.crestFoam },
    uLantern: { value: new Vector4(0, settings.route.z, 1, settings.lanternHeight) },
    uLanternColor: { value: lanternColor },
    uFogDensity: { value: settings.fogDensity },
    uGlint: { value: new Vector2(settings.glintKnee, settings.glintCompression) },
  };
  const water = new Mesh(
    grid.geometry,
    new ShaderMaterial({ uniforms: waterUniforms, vertexShader: WATER_VERTEX, fragmentShader: WATER_FRAGMENT, side: DoubleSide }),
  );
  water.frustumCulled = false;
  scene.add(water);

  const glow = new Mesh(
    new PlaneGeometry(1, 1),
    new ShaderMaterial({
      uniforms: { uColor: { value: lanternColor }, uStrength: { value: 1 } },
      vertexShader: GLOW_VERTEX,
      fragmentShader: GLOW_FRAGMENT,
      transparent: true,
      blending: AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    }),
  );
  glow.renderOrder = 2;
  glow.frustumCulled = false;
  glow.scale.setScalar(3.2);
  scene.add(glow);

  /* ---------------------------------------------------------------- state */
  const controls = {
    altitude: clamp(settings.altitude ?? 14, settings.altitudeMin, settings.altitudeMax),
    speed: settings.speed ?? 65,
    swell: settings.swell ?? 1.85,
    intensity: settings.intensity ?? 0.52,
  };
  let altitude = controls.altitude;
  let swellAmp = controls.swell * settings.swellPerUnit;
  let strength = controls.intensity / 0.52;
  let time = 0;

  const bounds = {
    minX: area.x + 8,
    maxX: area.x + area.size - 8,
    minZ: area.z + 8,
    maxZ: area.z + area.size - 10,
  };
  const route = { phase: 0, halfWidth: settings.route.halfWidth, depth: settings.route.depth, z: settings.route.z };
  const lantern = { x: 0, z: route.z, vx: 0, vz: -1, speed: 0, following: false };
  const pointer = { x: 0, y: 0, active: false, time: 0 };
  const goal = { x: 0, z: 0 };
  const ray = new Vector3();

  function routePoint(phase, out) {
    out.x = route.halfWidth * Math.sin(phase);
    out.z = route.z + route.depth * Math.sin(2 * phase + 0.6);
    return out;
  }
  routePoint(0, lantern);

  /** Where the pointer's line of sight meets the water (or the far edge of the lantern's area for the sky). */
  function pointerOnWater(out) {
    ray.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
    if (ray.y < -0.02) {
      const distance = camera.position.y / -ray.y;
      out.x = camera.position.x + ray.x * distance;
      out.z = camera.position.z + ray.z * distance;
    } else {
      const flat = Math.hypot(ray.x, ray.z) || 1;
      out.x = (ray.x / flat) * 400;
      out.z = (ray.z / flat) * 400;
    }
    out.x = clamp(out.x, bounds.minX, bounds.maxX);
    out.z = clamp(out.z, bounds.minZ, bounds.maxZ);
  }

  /** Picks the point of the route closest to the lantern, so it rejoins the route without a detour. */
  function rejoinRoute() {
    let best = route.phase;
    let bestDistance = Infinity;
    const probe = { x: 0, z: 0 };
    for (let i = 0; i < 96; i++) {
      const phase = (i / 96) * Math.PI * 2;
      routePoint(phase, probe);
      const distance = Math.hypot(probe.x - lantern.x, probe.z - lantern.z);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = phase;
      }
    }
    route.phase = best;
  }

  function steer(dt, now) {
    const cruise = controls.speed * 0.3 * (reducedMotion ? 0.5 : 1);
    const following = pointer.active && now - pointer.time < settings.idleSeconds * 1000;
    if (lantern.following && !following) rejoinRoute();
    lantern.following = following;

    let wantX;
    let wantZ;
    if (following) {
      pointerOnWater(goal);
      const dx = goal.x - lantern.x;
      const dz = goal.z - lantern.z;
      const distance = Math.hypot(dx, dz) || 1;
      const speed = Math.min(cruise * 1.4, distance * 2);
      wantX = (dx / distance) * speed;
      wantZ = (dz / distance) * speed;
    } else {
      const tx = route.halfWidth * Math.cos(route.phase);
      const tz = 2 * route.depth * Math.cos(2 * route.phase + 0.6);
      const tangent = Math.hypot(tx, tz) || 1;
      route.phase += (cruise * dt) / tangent;
      routePoint(route.phase, goal);
      wantX = (tx / tangent) * cruise + (goal.x - lantern.x) * 1.8;
      wantZ = (tz / tangent) * cruise + (goal.z - lantern.z) * 1.8;
      const want = Math.hypot(wantX, wantZ);
      if (want > cruise * 1.5) {
        wantX *= (cruise * 1.5) / want;
        wantZ *= (cruise * 1.5) / want;
      }
    }

    let ax = wantX - lantern.vx;
    let az = wantZ - lantern.vz;
    const change = Math.hypot(ax, az);
    const limit = settings.lanternAcceleration * dt;
    if (change > limit) {
      ax *= limit / change;
      az *= limit / change;
    }
    lantern.vx += ax;
    lantern.vz += az;
    lantern.x = clamp(lantern.x + lantern.vx * dt, bounds.minX, bounds.maxX);
    lantern.z = clamp(lantern.z + lantern.vz * dt, bounds.minZ, bounds.maxZ);
    lantern.speed = Math.hypot(lantern.vx, lantern.vz);
  }

  function placeCamera() {
    const t = clamp((altitude - settings.altitudeMin) / (settings.altitudeMax - settings.altitudeMin), 0, 1);
    const pitch = (settings.pitchMin + (settings.pitchMax - settings.pitchMin) * Math.pow(t, 1.15)) * DEG;
    const sway = reducedMotion ? 0 : 1;
    camera.position.set(0, altitude, 0);
    camera.rotation.set(
      -pitch + Math.sin(time * 0.31) * 0.003 * sway,
      Math.sin(time * 0.17) * 0.004 * sway,
      Math.sin(time * 0.45) * 0.004 * sway,
    );
    camera.updateMatrixWorld();
  }

  /* ------------------------------------------------------------- sizing */
  const quality = {
    ratio: Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio),
    locked: false,
    total: 0,
    samples: 0,
    windowStart: 0,
    fastWindows: 0,
    since: 0,
  };

  function resize() {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(quality.ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < 0.8 ? settings.fovPortrait : settings.fov;
    camera.updateProjectionMatrix();
    // Keep the route on screen: narrower on tall phone screens.
    const halfView = Math.tan((camera.fov * DEG) / 2) * camera.aspect;
    route.halfWidth = Math.min(settings.route.halfWidth, 0.62 * Math.abs(route.z) * halfView);
  }

  function setRatio(ratio) {
    quality.ratio = clamp(ratio, settings.minPixelRatio, Math.max(settings.minPixelRatio, window.devicePixelRatio || 1));
    resize();
  }

  /** Lowers the pixel ratio after a slow second, raises it after four smooth ones in a row. */
  function measure(now, interval) {
    if (quality.locked || interval > 250 || now - quality.since < 2000) return;
    quality.total += interval;
    quality.samples += 1;
    if (now - quality.windowStart < 1000) return;
    const average = quality.total / quality.samples;
    quality.total = 0;
    quality.samples = 0;
    quality.windowStart = now;
    const top = Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio);
    if (average > 22 && quality.ratio > settings.minPixelRatio) {
      setRatio(quality.ratio - 0.15);
      quality.fastWindows = 0;
    } else if (average < 18 && quality.ratio < top) {
      quality.fastWindows += 1;
      if (quality.fastWindows >= 4) {
        setRatio(Math.min(top, quality.ratio + 0.1));
        quality.fastWindows = 0;
      }
    } else {
      quality.fastWindows = 0;
    }
  }

  /* --------------------------------------------------------------- frame */
  function update(dt, now) {
    const step = dt * timeScale;
    time += step;
    altitude = approach(altitude, controls.altitude, 3.5, dt);
    swellAmp = approach(swellAmp, controls.swell * settings.swellPerUnit, 2, dt);
    strength = approach(strength, controls.intensity / 0.52, 3, dt);
    placeCamera();
    steer(step, now);

    if (wake) {
      const moving = clamp(lantern.speed / 20, 0, 1.6);
      wake.advance(step, lantern.x, lantern.z, {
        push: settings.wakePush * moving * strength,
        turbulence: settings.wakeTurbulence * moving * strength,
        foam: settings.wakeFoam * clamp(moving, 0.1, 1.4) * strength,
        bob: settings.wakeBob * (1 - clamp(lantern.speed / 4, 0, 1)) * strength,
      });
      waterUniforms.uWake.value = wake.texture;
    }

    const glowStrength = 0.6 + 0.4 * strength;
    waterUniforms.uTime.value = time;
    waterUniforms.uSwellAmp.value = swellAmp;
    waterUniforms.uCrestFoam.value = settings.crestFoam * clamp((swellAmp - 0.75) / 0.5, 0, 1);
    waterUniforms.uLantern.value.set(lantern.x, lantern.z, glowStrength, settings.lanternHeight);
    glow.material.uniforms.uStrength.value = glowStrength;
    glow.position.set(lantern.x, swellAmp * 0.35 + settings.lanternHeight * 0.55, lantern.z);
    glow.quaternion.copy(camera.quaternion);
    sky.position.copy(camera.position);
    renderer.render(scene, camera);
  }

  let frame = 0;
  let last = 0;
  let running = false;
  let active = true;
  let started = false;
  let contextLost = false;
  let disposed = false;

  function loop(now) {
    frame = requestAnimationFrame(loop);
    const interval = last ? now - last : 1000 / 60;
    last = now;
    update(Math.min(interval / 1000, 0.05), now);
    measure(now, interval);
  }

  function start() {
    if (running || !started || !active || contextLost || disposed) return;
    running = true;
    last = 0;
    quality.since = performance.now();
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frame);
  }

  function onContextLost(event) {
    event.preventDefault();
    contextLost = true;
    stop();
  }

  function onContextRestored() {
    contextLost = false;
    ripples.render();
    wake?.reset();
    start();
  }

  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();
  placeCamera();

  const ready = (async () => {
    try {
      if (renderer.extensions.has("KHR_parallel_shader_compile")) {
        // Compiles in the background, so the loading screen keeps animating.
        await renderer.compileAsync(scene, camera);
      } else {
        // Browsers without background compiling: let the loading screen paint first, then compile in one go.
        await new Promise((resolve) => setTimeout(resolve, 60));
        renderer.compile(scene, camera);
      }
    } catch (error) {
      console.warn("Ocean shaders compile on the first frame instead.", error);
    }
    started = true;
    start();
  })();

  return {
    ready,
    setPointer(clientX, clientY) {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      pointer.active = true;
      pointer.time = performance.now();
    },
    clearPointer() {
      pointer.active = false;
    },
    setSpeed(value) {
      controls.speed = clamp(Number(value) || 0, 0, 200);
    },
    setSwell(value) {
      controls.swell = clamp(Number(value) || 0, 0, 6);
    },
    setAltitude(value) {
      controls.altitude = clamp(Number(value) || 0, settings.altitudeMin, settings.altitudeMax);
    },
    setIntensity(value) {
      controls.intensity = clamp(Number(value) || 0, 0, 2);
    },
    setActive(on) {
      active = Boolean(on);
      if (active) start();
      else stop();
    },
    setPixelRatio(ratio, { lock = false } = {}) {
      quality.locked = lock;
      setRatio(ratio);
    },
    /** A snapshot for debugging in the console. */
    get state() {
      return {
        running,
        time,
        altitude,
        pixelRatio: quality.ratio,
        wake: Boolean(wake),
        lantern: { x: lantern.x, z: lantern.z, speed: lantern.speed, following: lantern.following },
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      resizeObserver.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      scene.traverse((object) => {
        object.geometry?.dispose();
        object.material?.dispose();
      });
      wake?.dispose();
      ripples.dispose();
      flatWake?.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
