// Bundles the extension into a single file. Without this the VSIX ships every
// compiled module plus the runtime dependency tree, and the host resolves them
// one require at a time on activation.
import * as esbuild from "esbuild";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/** @type {import("esbuild").BuildOptions} */
const options = {
    entryPoints: ["src/extension.ts"],
    bundle: true,
    outfile: "dist/extension.js",
    external: ["vscode"],
    format: "cjs",
    platform: "node",
    target: "node16",
    sourcemap: !production,
    minify: production,
    logLevel: "info",
    // The JSON catalogs are imported directly, so esbuild inlines them.
    loader: { ".json": "json" },
};

if (watch) {
    const context = await esbuild.context(options);
    await context.watch();
} else {
    await esbuild.build(options);
}
