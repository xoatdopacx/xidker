// Puts out/pack.json into the Michelle template and copies the page to the live demo.
// Usage: node splice.mjs
import fs from "node:fs";

const pack = fs.readFileSync(new URL("./out/pack.json", import.meta.url), "utf8");
JSON.parse(pack);
if (pack.includes("</")) throw new Error("The pack must not contain '</' (it sits inside a script tag)");

const root = new URL("../../", import.meta.url);
const template = new URL("templates/michelle/index.html", root);
const demo = new URL("artifacts/web-landing/public/demo/michelle/index.html", root);
const html = fs.readFileSync(template, "utf8");
const tag = /(<script type="application\/json" id="bust-data">)[\s\S]*?(<\/script>)/;
if (!tag.test(html)) throw new Error('No <script id="bust-data"> in the template');

fs.writeFileSync(template, html.replace(tag, (_, open, close) => open + pack + close));
fs.copyFileSync(template, demo);
console.log("Updated templates/michelle/index.html and the live demo copy.");
