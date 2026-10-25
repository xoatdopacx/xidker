/**
 * IDK PORTFOLIO — 3D GPGPU OCEAN & MOTION ENGINE
 * Studio: idk workshop (hello@idkworkshop.com)
 */
import Lenis from "lenis";
import { createOcean } from "./ocean/index.js";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const SETTINGS = {
  preloaderMs: 1400, // counter from 000% to 100%
  preloaderMaxWaitMs: 4000, // longest wait for the ocean's shaders after the counter is done
  revealMs: 1000, // hero reveal duration
  revealStaggerMs: 100,
  scrollAltitudeLift: 18, // extra camera height in the middle of the page
};

const OCEAN_PRESETS = {
  calm: { speed: 40, wave: 1.1, zoom: 10, intensity: 0.35 },
  voyage: { speed: 65, wave: 1.85, zoom: 14, intensity: 0.52 },
  storm: { speed: 95, wave: 2.75, zoom: 22, intensity: 0.78 },
};

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class IdkPortfolioApp {
  constructor() {
    this.ocean = null;
    this.lenis = null;
    this.baseZoomFactor = 14;
    this.initOcean3D();
    this.initPreloader();
    this.initCursor();
    this.initSmoothScroll();
    this.initHudControls();
    this.initScrollAnimations();
    this.initFaq();
  }

  initPreloader() {
    const preloader = document.getElementById("idk-preloader");
    const counterEl = document.getElementById("preloader-counter");
    const barEl = document.getElementById("preloader-bar");
    if (!preloader || !counterEl || !barEl) return;

    // The counter runs while the ocean compiles its shaders behind the preloader.
    const oceanReady = Promise.race([this.ocean ? this.ocean.ready : Promise.resolve(), wait(SETTINGS.preloaderMaxWaitMs)]);
    const duration = REDUCED_MOTION ? 200 : SETTINGS.preloaderMs;
    let start = null;
    const tick = (now) => {
      if (start === null) start = now; // timed from the first frame, on the frame clock
      const t = Math.min(1, (now - start) / duration);
      const v = Math.round(easeInOutCubic(t) * 100);
      counterEl.textContent = String(v).padStart(3, "0") + "%";
      barEl.style.width = v + "%";
      if (t < 1) {
        requestAnimationFrame(tick);
        return;
      }
      oceanReady.then(() => {
        // Skip the intro if the CSS fallback has already lifted the loading screen (a very slow load).
        const liftedAlready = getComputedStyle(preloader).visibility === "hidden";
        preloader.classList.add("is-done");
        if (!liftedAlready) this.animateHeroIntro();
      });
    };
    requestAnimationFrame(tick);
  }

  animateHeroIntro() {
    if (REDUCED_MOTION) return;
    document.querySelectorAll(".js-hero-reveal").forEach((el, i) => {
      el.animate(
        [
          { opacity: 0, transform: "translateY(40px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: SETTINGS.revealMs,
          delay: i * SETTINGS.revealStaggerMs,
          easing: "cubic-bezier(0.215, 0.61, 0.355, 1)",
          fill: "backwards",
        }
      );
    });
  }

  initCursor() {
    const dot = document.getElementById("idk-cursor-dot");
    const ring = document.getElementById("idk-cursor-ring");

    // The lantern on the water follows a mouse or pen; on touch screens it keeps cruising its own route.
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "touch") this.ocean?.setPointer(e.clientX, e.clientY);
      },
      { passive: true }
    );
    document.documentElement.addEventListener("pointerleave", () => {
      this.ocean?.clearPointer();
      document.body.classList.remove("cursor-on");
    });

    if (!dot || !ring || !FINE_POINTER) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType === "touch") return;
        if (!document.body.classList.contains("cursor-on")) {
          // Start the ring where the mouse is instead of sliding in from the middle of the screen.
          ringX = e.clientX;
          ringY = e.clientY;
          document.body.classList.add("cursor-on");
        }
        mouseX = e.clientX;
        mouseY = e.clientY;
        dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
      },
      { passive: true }
    );

    const tickCursor = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(tickCursor);
    };
    requestAnimationFrame(tickCursor);

    document.querySelectorAll("a, button, input, .work-card, .cap-card").forEach((el) => {
      el.addEventListener("pointerenter", () => document.body.classList.add("cursor-hover"));
      el.addEventListener("pointerleave", () => document.body.classList.remove("cursor-hover"));
    });
  }

  initSmoothScroll() {
    if (REDUCED_MOTION) return;
    try {
      // anchors: menu links glide to their section instead of jumping.
      this.lenis = new Lenis({ autoRaf: true, anchors: true });
    } catch (err) {
      console.warn("Fallback to native scroll:", err);
    }
  }

  initOcean3D() {
    const host = document.getElementById("ocean-canvas-host");
    if (!host) return;

    try {
      this.ocean = createOcean(host, { altitude: this.baseZoomFactor, reducedMotion: REDUCED_MOTION });
      window.__idkOcean = this.ocean;
    } catch (err) {
      console.warn("The 3D ocean could not start (WebGL2 is needed); showing the still sea instead.", err);
      document.documentElement.classList.add("ocean-off");
      return;
    }

    // Draw only while the hero or the story cards are on screen.
    const watched = [".hero-section", ".ocean-story-section"]
      .map((selector) => document.querySelector(selector))
      .filter(Boolean);
    if (!("IntersectionObserver" in window) || watched.length === 0) return;
    const visible = new Set();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      this.ocean.setActive(visible.size > 0);
    });
    watched.forEach((el) => observer.observe(el));
  }

  initHudControls() {
    const speedInput = document.getElementById("hud-speed");
    const waveInput = document.getElementById("hud-wave");
    const zoomInput = document.getElementById("hud-zoom");
    const presetBtns = document.querySelectorAll("[data-ocean-preset]");

    const applyParams = () => {
      const speed = parseFloat(speedInput?.value || "65");
      const wave = parseFloat(waveInput?.value || "1.85");
      const zoom = parseFloat(zoomInput?.value || "14");

      this.baseZoomFactor = zoom;
      if (!this.ocean) return;
      this.ocean.setSpeed(speed);
      this.ocean.setSwell(wave);
      this.updateAltitude();
    };

    [speedInput, waveInput, zoomInput].forEach((inp) => {
      if (inp) inp.addEventListener("input", applyParams);
    });

    presetBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        presetBtns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const key = btn.getAttribute("data-ocean-preset");
        const p = OCEAN_PRESETS[key];
        if (!p) return;
        if (speedInput) speedInput.value = String(p.speed);
        if (waveInput) waveInput.value = String(p.wave);
        if (zoomInput) zoomInput.value = String(p.zoom);
        this.ocean?.setIntensity(p.intensity);
        applyParams();
      });
    });

    applyParams();
  }

  initScrollAnimations() {
    window.addEventListener("scroll", () => this.updateAltitude(), { passive: true });
    window.addEventListener("resize", () => this.updateAltitude(), { passive: true });
    this.updateAltitude();
  }

  /** The camera climbs toward the middle of the page and comes back down at the end. */
  updateAltitude() {
    if (!this.ocean) return;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    this.ocean.setAltitude(this.baseZoomFactor + Math.sin(progress * Math.PI) * SETTINGS.scrollAltitudeLift);
  }

  initFaq() {
    const items = document.querySelectorAll(".faq-item");
    const fit = (item) => {
      const panel = item.querySelector(".faq-panel");
      if (panel) panel.style.maxHeight = item.classList.contains("is-open") ? panel.scrollHeight + "px" : "0px";
    };

    items.forEach((item) => {
      const btn = item.querySelector(".faq-trigger");
      const panel = item.querySelector(".faq-panel");
      if (!btn || !panel) return;
      btn.setAttribute("aria-expanded", String(item.classList.contains("is-open")));
      fit(item);

      btn.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        items.forEach((other) => {
          other.classList.remove("is-open");
          other.querySelector(".faq-trigger")?.setAttribute("aria-expanded", "false");
          fit(other);
        });
        if (!isOpen) {
          item.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
          fit(item);
        }
      });
    });

    // Open answers keep fitting their text when the window changes size.
    window.addEventListener("resize", () => items.forEach((item) => item.classList.contains("is-open") && fit(item)), {
      passive: true,
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.__idkApp = new IdkPortfolioApp();
});
