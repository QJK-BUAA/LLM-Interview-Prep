import { readFileSync } from "node:fs";
import vm from "node:vm";
import { CHAPTERS } from "../content/catalog.js";
import { renderChapter } from "../app/renderer.js";

const sandbox = {};
vm.runInNewContext(
  readFileSync(new URL("../vendor/katex/katex.min.js", import.meta.url), "utf8"),
  sandbox,
);
const decode = value => value.replace(/&(amp|lt|gt|quot|#39);/g, (_, entity) => ({
  amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'",
})[entity]);

let total = 0;
const failures = [];
for (const chapter of CHAPTERS) {
  const html = renderChapter(chapter, { mode: "learn" });
  const formulas = [...html.matchAll(/data-display="(true|false)" data-math="([^"]*)"/g)];
  for (const [, display, escaped] of formulas) {
    const source = decode(escaped);
    try {
      sandbox.katex.renderToString(source, {
        displayMode: display === "true", throwOnError: true, strict: "ignore",
      });
    } catch (error) {
      failures.push(`${chapter.id}: ${source}\n${error.message}`);
    }
  }
  total += formulas.length;
  console.log(`${chapter.id}: ${formulas.length} formula occurrences parsed`);
}
if (failures.length) {
  console.error(failures.join("\n\n"));
  process.exitCode = 1;
} else {
  console.log(`${total} formula occurrences (including repeated formulas and answers); 0 parse failures.`);
}
