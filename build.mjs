// Production build: obfuscate JS, minify CSS/HTML into dist/ (Vercel serves dist/).
import { readdir, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import JavaScriptObfuscator from "javascript-obfuscator";
import { minify as minifyHtml } from "html-minifier-terser";
import { minify as minifyCss } from "csso";

const SKIP = new Set(["build.mjs"]);
const OUT = "dist";

const OBF = {
  compact: true,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.75,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.4,
  deadCodeInjection: false,
  selfDefending: true,
  disableConsoleOutput: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  sourceMap: false
};

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT);

for (const f of await readdir(".")) {
  if (SKIP.has(f)) continue;
  const src = () => readFile(f, "utf8");
  if (f.endsWith(".js")) {
    await writeFile(`${OUT}/${f}`, JavaScriptObfuscator.obfuscate(await src(), OBF).getObfuscatedCode());
  } else if (f.endsWith(".css")) {
    await writeFile(`${OUT}/${f}`, minifyCss(await src()).css);
  } else if (f.endsWith(".html")) {
    await writeFile(`${OUT}/${f}`, await minifyHtml(await src(), {
      collapseWhitespace: true, removeComments: true, minifyCSS: true, minifyJS: false, removeRedundantAttributes: true
    }));
  } else continue;
  console.log("built", f);
}
