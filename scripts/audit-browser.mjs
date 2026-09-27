import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { CHAPTERS } from "../content/catalog.js";

const session = process.env.ROADMAP_BROWSER_SESSION || "roadmap-v2";
const baseUrl = process.env.ROADMAP_URL || "http://127.0.0.1:8010/";
const run = (args, input) => execFileSync("agent-browser", ["--session", session, ...args], {
  encoding: "utf8", input, timeout: 30000,
  env: { ...process.env, AGENT_BROWSER_DEFAULT_TIMEOUT: "8000" },
});
const evaluate = (script) => {
  const raw = JSON.parse(run(["eval", "--stdin", "--json"], script));
  if (!raw.success) throw new Error(JSON.stringify(raw));
  return typeof raw.data.result === "string" ? JSON.parse(raw.data.result) : raw.data.result;
};
const expected = CHAPTERS.map(chapter => ({
  id: chapter.id, sections: chapter.sections.length,
  edges: chapter.sections.filter(s => s.type === "diagram" && s.diagram.kind === "flow").reduce((sum, s) => sum + s.diagram.links.length, 0),
  quizzes: chapter.sections.filter(s => s.type === "quiz").reduce((sum, s) => sum + s.questions.length, 0),
}));
mkdirSync(new URL("../artifacts/", import.meta.url), { recursive: true });
const report = { timestamp: new Date().toISOString(), viewports: [] };
for (const [width, height] of [[1440, 1000], [900, 900], [390, 844]]) {
  run(["set", "viewport", String(width), String(height)]);
  run(["open", `${baseUrl}?audit=${width}#00`]);
  run(["wait", ".chapter"]);
  run(["click", '[data-mode="learn"]']);
  const result = evaluate(`(async () => {
    const expected = ${JSON.stringify(expected)};
    const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const results = [];
    for (const record of expected) {
      if (location.hash !== '#' + record.id) {
        await new Promise(resolve => {
          addEventListener('hashchange', resolve, { once: true });
          location.hash = record.id;
        });
      }
      await frame();
      for (const details of document.querySelectorAll('.chapter details')) details.open = true;
      await frame();
      await document.fonts.ready;
      const chapter = document.querySelector('.chapter');
      const reader = document.querySelector('#reading-pane');
      const rr = reader.getBoundingClientRect();
      const page = document.documentElement;
      const badBounds = [...chapter.querySelectorAll('.lesson-section, .section-header, .chapter-header')]
        .filter(el => {const r=el.getBoundingClientRect();return r.left < rr.left - 1 || r.right > rr.right + 1;})
        .map(el => el.id || el.className);
      const badOverflow = [...chapter.querySelectorAll('p, .section-body, .lesson-section, h1, h2, .quiz-text')]
        .filter(el => !el.closest('.code-block, .table-scroll, .math-display, .katex'))
        .filter(el => el.scrollWidth > el.clientWidth + 2)
        .map(el => ({tag:el.tagName, id:el.id, className:el.className, extra:el.scrollWidth-el.clientWidth}));
      const headers = [...document.querySelector('.app-header').children]
        .filter(el => getComputedStyle(el).display !== 'none')
        .map(el => el.getBoundingClientRect());
      const headerOverlap = headers.some((a, i) => headers.slice(i+1).some(b => a.width && b.width && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top));
      const fallback = chapter.querySelectorAll('.math-fallback, .math-placeholder, .katex-error').length;
      const sections = chapter.querySelectorAll('.lesson-section').length;
      const edges = chapter.querySelectorAll('.flow-edge').length;
      const quizzes = chapter.querySelectorAll('.quiz-answer').length;
      const row = { id:record.id, rendered:chapter.dataset.chapterId, sections, edges, quizzes,
        formulaCount:chapter.querySelectorAll('.math-rendered').length, fallback,
        pageOverflow:page.scrollWidth>page.clientWidth, readerOverflow:reader.scrollWidth>reader.clientWidth+1,
        badBounds, badOverflow, headerOverlap };
      row.passed = row.rendered===record.id && sections===record.sections && edges===record.edges && quizzes===record.quizzes && !fallback && !row.pageOverflow && !row.readerOverflow && !badBounds.length && !badOverflow.length && !headerOverlap;
      results.push(row);
    }
    return {viewport:[innerWidth,innerHeight], courseLabel:document.querySelector('#course-count').textContent,
      nav:[...document.querySelectorAll('[data-chapter-link]')].map(a=>a.dataset.chapterLink),
      totalProgress:document.querySelector('#overall-progress').max, results};
  })()`);
  report.viewports.push(result);
  console.log(`${width}x${height}: ${result.results.filter(r => r.passed).length}/30 chapter layouts pass`);
  run(["open", `${baseUrl}?capture=${width}#25`]);
  run(["wait", ".chapter"]);
  evaluate("(async()=>{await document.fonts.ready; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return {chapter:document.querySelector('.chapter').dataset.chapterId};})()");
  run(["screenshot", `artifacts/integration-${width}x${height}.png`]);
}
const consoleData = JSON.parse(run(["console", "--json"]));
const networkData = JSON.parse(run(["network", "requests", "--json"]));
report.console = consoleData;
report.network = (networkData.data?.requests ?? []).map(({ url, status, resourceType }) => ({ url, status, resourceType }));
report.layoutPassed = report.viewports.every(v => v.results.every(r => r.passed) &&
  v.nav.join(",") === expected.map(r => r.id).join(",") && v.totalProgress === 270);
writeFileSync(new URL("../artifacts/browser-layout-audit.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
if (!report.layoutPassed) {
  console.error(JSON.stringify(report.viewports.map(v=>({viewport:v.viewport, failures:v.results.filter(r=>!r.passed)})), null, 2));
  process.exitCode = 1;
}
