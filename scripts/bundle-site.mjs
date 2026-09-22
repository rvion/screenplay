// bundles the page as two classic scripts, so index.html also runs from file://
// (chrome refuses a module script loaded from file://, and an importmap needs modules).
//   site/three.js : three + the addons the viewer uses, as window.ABRI_THREE (changes only with the three version)
//   site/abri.js  : the page, every "three" import read from window.ABRI_THREE
//   node scripts/bundle-site.mjs [--watch]
import * as esbuild from "esbuild";

// the only three modules the page may import: a new import fails the build until listed here
const THREE_MODULES = [
  "three",
  "three/addons/controls/OrbitControls.js",
  "three/addons/environments/RoomEnvironment.js",
];

const vendor = {
  stdin: {
    contents: THREE_MODULES.map((m, i) => `import * as m${i} from ${JSON.stringify(m)};`).join("\n")
      + `\nwindow.ABRI_THREE = {${THREE_MODULES.map((m, i) => `${JSON.stringify(m)}: m${i}`).join(", ")}};\n`,
    resolveDir: process.cwd(),
    loader: "js",
  },
  bundle: true, format: "iife", minify: true, target: "es2020", legalComments: "none",
  outfile: "site/three.js", logLevel: "warning",
};

const three_global = {
  name: "three-global",
  setup(build) {
    build.onResolve({ filter: /^three(\/.*)?$/ }, (args) => {
      if (!THREE_MODULES.includes(args.path)) return { errors: [{ text: `${args.path} is not in THREE_MODULES (scripts/bundle-site.mjs)` }] };
      return { path: args.path, namespace: "three-global" };
    });
    build.onLoad({ filter: /.*/, namespace: "three-global" }, (args) => ({
      contents: `module.exports = window.ABRI_THREE[${JSON.stringify(args.path)}];`,
      loader: "js",
    }));
  },
};

const page = {
  entryPoints: ["site/src/abri_main.ts"],
  bundle: true, format: "iife", target: "es2020", legalComments: "none",
  outfile: "site/abri.js", plugins: [three_global], logLevel: "warning",
};

if (process.argv.includes("--watch")) {
  await esbuild.build(vendor);
  const ctx = await esbuild.context(page);
  await ctx.watch();
  console.log("watching site/src → site/abri.js");
} else {
  await Promise.all([esbuild.build(vendor), esbuild.build(page)]);
}
