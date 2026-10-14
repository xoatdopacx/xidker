import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("../src/index.css");

function rgb(color) {
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = [...hex].map((c) => c + c).join("");
    return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  }
  const match = /^hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)$/.exec(color);
  assert.ok(match, `Unsupported color: ${color}`);
  const [, hue, saturation, lightness] = match.map(Number);
  const s = saturation / 100;
  const l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => {
    const k = (n + hue / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  });
}

function luminance(color) {
  const linear = rgb(color).map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return linear.reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}

test("green and red button text meet WCAG AA in normal, hover and active states", () => {
  for (const selector of [".pbtn", ".pbtn.red"]) {
    const rule = css.match(new RegExp(`${selector.replaceAll(".", "\\.")}\\{([^}]+)\\}`))?.[1];
    assert.ok(rule, `Missing ${selector}`);
    const foreground = rule.match(/(?:^|;)color:([^;]+)/)?.[1];
    const background = rule.match(/(?:^|;)background:([^;]+)/)?.[1];
    assert.ok(foreground && background);
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    const ratio = (values[0] + 0.05) / (values[1] + 0.05);
    assert.ok(ratio >= 4.5, `${selector} contrast is ${ratio.toFixed(2)}:1`);
    console.log(`${selector}: ${ratio.toFixed(2)}:1`);
  }
  // These shared states must not override the tested text/background colors.
  for (const state of ["hover", "active"]) {
    const rule = css.match(new RegExp(`\\.pbtn:${state}\\{([^}]+)\\}`))?.[1];
    assert.ok(rule);
    assert.doesNotMatch(rule, /(?:^|;)(?:color|background(?:-color)?):/);
  }
});

test("viewport allows browser zoom without an explicit ceiling", () => {
  const viewport = read("../index.html").match(/<meta name="viewport" content="([^"]+)"/)?.[1];
  assert.equal(viewport, "width=device-width, initial-scale=1.0");
});

test("English error fallback declares its own language independently of document locale", () => {
  const fallback = read("../src/components/error-boundary.tsx")
    .split("function DefaultFallback")[1].split("export class ErrorBoundary")[0];
  assert.match(fallback, /<div lang="en"/);
  assert.match(fallback, /Something went wrong/);
  assert.match(fallback, /Try again/);
});
