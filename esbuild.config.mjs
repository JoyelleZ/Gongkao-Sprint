import esbuild from "esbuild";
import { builtinModules } from "node:module";
import process from "process";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  banner: {
    js: "/* Gongkao Sprint */",
  },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtinModules,
  ],
  format: "cjs",
  target: "es2022",
  loader: {
    ".jpg": "dataurl",
    ".png": "dataurl",
  },
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: prod,
});

if (prod) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
