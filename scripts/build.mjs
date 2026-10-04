import { cp, mkdir, rm } from "node:fs/promises";
import { build } from "esbuild";

const outputDirectory = "dist";

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await build({
  entryPoints: {
    background: "src/extension/background.ts",
    content: "src/extension/content.ts",
    "youtube-main": "src/extension/youtubeMain.ts",
    panel: "src/panel/index.ts"
  },
  outdir: outputDirectory,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome114",
  sourcemap: true,
  logLevel: "info"
});

await Promise.all([
  cp("public/manifest.json", `${outputDirectory}/manifest.json`),
  cp("src/panel/panel.html", `${outputDirectory}/panel.html`),
  cp("src/panel/panel.css", `${outputDirectory}/panel.css`)
]);

