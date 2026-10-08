import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CHAPTERS } from "../content/catalog.js";
import { visibleSections } from "../app/renderer.js";

const prefix = process.env.ROADMAP_AUDIT_PREFIX || "narrative";
if (!/^[a-z0-9-]+$/.test(prefix)) throw new Error("Invalid audit prefix");
const session = process.env.ROADMAP_BROWSER_SESSION || `roadmap-${prefix}-layout`;
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
const expectedForMode = mode => CHAPTERS.map(chapter => {
  const sections = visibleSections(chapter, mode);
  return {
    id: chapter.id, sections: sections.length,
    derivations: sections.filter(s => s.type === "derivation").length,
    edges: sections.filter(s => s.type === "diagram" && s.diagram.kind === "flow").reduce((sum, s) => sum + s.diagram.links.length, 0),
    quizzes: sections.filter(s => s.type === "quiz").reduce((sum, s) => sum + s.questions.length, 0),
  };
});
mkdirSync(new URL("../artifacts/", import.meta.url), { recursive: true });
const report = { timestamp: new Date().toISOString(), viewports: [] };
for (const [width, height] of [[1440, 1000], [1024, 900], [390, 844]]) {
  run(["set", "viewport", String(width), String(height)]);
  for (const mode of ["learn", "interview"]) {
  const expected = expectedForMode(mode);
  run(["open", `${baseUrl}?audit=${width}#00`]);
  run(["wait", ".chapter"]);
  run(["click", `[data-mode="${mode}"]`]);
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
      const openDerivations = document.querySelectorAll('.derivation-disclosure[open]').length;
      const formulaIndexOpen = document.querySelector('.formula-index')?.open;
      const teachingOrder = [...document.querySelector('.lesson-sections').children]
        .slice(0, 5).map(el => el.dataset.sectionId || el.className);
      const opener = document.querySelector('#intuition .section-body > p');
      const openerHasMath = Boolean(opener?.querySelector('[data-math]'));
      const defaultVisibleFormulas = [...document.querySelectorAll('.math-rendered')].filter(el=>el.checkVisibility()).length;
      const visibleTakeaways = [...document.querySelectorAll('.topic-takeaway')].filter(el=>el.checkVisibility()).length;
      const defaultOverflow = [...document.querySelectorAll('.chapter p, .chapter .section-body, .reading-guide, .chapter h2')]
        .filter(el=>el.checkVisibility() && !el.closest('.code-block, .table-scroll, .math-display, .katex'))
        .filter(el=>el.scrollWidth>el.clientWidth+2).map(el=>({id:el.id,className:el.className,extra:el.scrollWidth-el.clientWidth}));
      for (const details of document.querySelectorAll('.chapter details')) details.open = true;
      await frame();
      await document.fonts.ready;
      const chapter = document.querySelector('.chapter');
      const reader = document.querySelector('#reading-pane');
      const rr = reader.getBoundingClientRect();
      const page = document.documentElement;
      const badBounds = [...chapter.querySelectorAll('.lesson-section, .section-header, .chapter-header, .reading-guide')]
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
      const row = { id:record.id, rendered:chapter.dataset.chapterId, sections, edges, quizzes, openDerivations,
        formulaIndexOpen, teachingOrder, openerHasMath, defaultVisibleFormulas, visibleTakeaways, defaultOverflow,
        readingGuideCount:chapter.querySelectorAll('.reading-guide').length,
        formulaCount:chapter.querySelectorAll('.math-rendered').length, fallback,
        pageOverflow:page.scrollWidth>page.clientWidth, readerOverflow:reader.scrollWidth>reader.clientWidth+1,
        badBounds, badOverflow, headerOverlap };
      row.passed = row.rendered===record.id && sections===record.sections &&
        openDerivations===${mode === "interview" ? "record.derivations" : "0"} &&
        visibleTakeaways===record.derivations && row.readingGuideCount===1 && !defaultOverflow.length &&
        edges===record.edges && quizzes===record.quizzes && !fallback && !row.pageOverflow && !row.readerOverflow && !badBounds.length && !badOverflow.length && !headerOverlap &&
        formulaIndexOpen===${mode === "interview"} && !openerHasMath &&
        teachingOrder.join(',')==='intuition,chapter-objectives,example,roadmap,formula-index';
      results.push(row);
    }
    return {viewport:[innerWidth,innerHeight], courseLabel:document.querySelector('#course-count').textContent,
      nav:[...document.querySelectorAll('[data-chapter-link]')].map(a=>a.dataset.chapterLink),
      totalProgress:document.querySelector('#overall-progress').max, results};
  })()`);
  result.mode = mode;
  report.viewports.push(result);
  console.log(`${width}x${height} ${mode}: ${result.results.filter(r => r.passed).length}/${CHAPTERS.length} chapter layouts pass (default + expanded)`);
  }
  run(["open", `${baseUrl}?capture=${width}#00`]);
  run(["wait", ".chapter"]);
  run(["click", '[data-mode="learn"]']);
  evaluate("(async()=>{await document.fonts.ready; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return {chapter:document.querySelector('.chapter').dataset.chapterId};})()");
  run(["screenshot", fileURLToPath(new URL(`../artifacts/${prefix}-opening-${width}x${height}.png`, import.meta.url))]);
}
const consoleData = JSON.parse(run(["console", "--json"]));
const networkData = JSON.parse(run(["network", "requests", "--json"]));
report.console = consoleData;
report.network = (networkData.data?.requests ?? []).map(({ url, status, resourceType }) => ({ url, status, resourceType }));
report.layoutPassed = report.viewports.every(v => v.results.every(r => r.passed) &&
  v.nav.join(",") === CHAPTERS.map(r => r.id).join(",") &&
  v.totalProgress === CHAPTERS.reduce((sum, chapter) => sum + chapter.sections.length, 0));
writeFileSync(new URL(`../artifacts/${prefix}-layout-audit.json`, import.meta.url), JSON.stringify(report, null, 2) + "\n");
if (!report.layoutPassed) {
  console.error(JSON.stringify(report.viewports.map(v=>({viewport:v.viewport, failures:v.results.filter(r=>!r.passed)})), null, 2));
  process.exitCode = 1;
}
run(["close"]);
