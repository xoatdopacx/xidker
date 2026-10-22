import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Classic scripts and stylesheets can load in an opaque-origin sandbox even
// when a static host does not send CORS headers. Development still uses Vite ESM.
function sandboxSafeBuild(): Plugin {
  return {
    name: "jack-sandbox-safe-html",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return html
          .replace(/<script\b[^>]*\bsrc=[^>]*>/g, (tag) =>
            tag
              .replace(/\s+type="module"/, "")
              .replace(/\s+crossorigin(?:="[^"]*")?/, "")
              .replace("<script ", "<script defer "),
          )
          .replace(/<link\b[^>]*\brel="stylesheet"[^>]*>/g, (tag) =>
            tag.replace(/\s+crossorigin(?:="[^"]*")?/, ""),
          );
      },
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), sandboxSafeBuild()],
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
      },
    },
  },
});
