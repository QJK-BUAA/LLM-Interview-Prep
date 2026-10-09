import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { getChapter } from "../content/catalog.js";
import { visibleSections } from "../app/renderer.js";

const prefix = process.env.ROADMAP_AUDIT_PREFIX || "narrative";
if (!/^[a-z0-9-]+$/.test(prefix)) throw new Error("Invalid audit prefix");
const session = process.env.ROADMAP_BROWSER_SESSION || `roadmap-${prefix}-actions`;
const base = process.env.ROADMAP_URL || "http://127.0.0.1:8010/";
const clickTrace = [];
const run = (args, input) => {
  // Reveal only occluded controls. scrollintoview on an already visible sticky
  // header button can move the mobile document and change the reading position.
  if (args[0] === "click") {
    run(["wait", "--fn", "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))"]);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data: box } = JSON.parse(run(["get", "box", args[1], "--json"]));
      const { data } = JSON.parse(run(["eval", "--json", `(() => {
        const box = ${JSON.stringify(box)};
        const target = [...document.querySelectorAll('a,button,input,summary,dfn')].find(el => {
          const r=el.getBoundingClientRect();
          return Math.abs(r.x-box.x)<0.5 && Math.abs(r.y-box.y)<0.5 &&
            Math.abs(r.width-box.width)<0.5 && Math.abs(r.height-box.height)<0.5;
        });
        const hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
        return JSON.stringify({hash:location.hash,hit:hit?.outerHTML,
          exposed:Boolean(target && hit && (target===hit || target.contains(hit))),
          reader:Boolean(target?.closest('#reading-pane')),desktop:innerWidth>=760,
          open:document.querySelectorAll('.derivation-disclosure[open]').length});
      })()`]));
      const observation = JSON.parse(data.result);
      clickTrace.push({ selector: args[1], box, ...observation });
      if (observation.exposed) break;
      if (attempt === 0) {
        run(["scrollintoview", args[1]]);
        run(["wait", "--fn", "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))"]);
      // scrollintoview can leave main-pane controls behind the app header.
      } else if (observation.reader && box.y < 80) {
        run(["scroll", "up", "200", ...(observation.desktop ? ["--selector", "#reading-pane"] : [])]);
      } else {
        assert.fail(`Click target is occluded: ${args[1]}`);
      }
    }
    assert.equal(clickTrace.at(-1).exposed, true, `Unexposed control ${args[1]}`);
  }
  return execFileSync("agent-browser", ["--session", session, ...args], {
    input, encoding: "utf8", timeout: 20000,
    env: { ...process.env, AGENT_BROWSER_DEFAULT_TIMEOUT: "6000" },
  });
};
function evaluate(code) {
  const result = JSON.parse(run(["eval", "--stdin", "--json"], code));
  if (!result.success) throw new Error(JSON.stringify(result));
  return result.data.result;
}
function clickRef(selector, pattern) {
  const snapshot = run(["snapshot", "-i", "-s", selector]);
  const line = snapshot.split("\n").find(line => pattern.test(line));
  const ref = line?.match(/ref=(e\d+)/)?.[1];
  assert.ok(ref, `Missing control ${pattern} in ${selector}`);
  run(["click", `@${ref}`]);
}
const report = { timestamp: new Date().toISOString(), viewports: [] };
try {
  for (const [width, height] of [[390, 844], [1440, 1000], [1024, 900]]) {
    run(["set", "viewport", String(width), String(height)]);
    run(["open", `${base}?interactions=${width}#00`]);
    run(["wait", ".chapter"]);
    // Test fixtures belong to this isolated browser session, never the user's browser.
    evaluate(`localStorage.removeItem('ml-roadmap-state-v2'); localStorage.setItem('ml-roadmap-state-v1', JSON.stringify({version:1, currentChapter:'19',mode:'learn',theme:'light',completed:{'00':['intuition'],'19':['quiz'],'20':['quiz']}})); true`);
    run(["open", `${base}?migration=${width}#00`]);
    const migrated = evaluate("JSON.parse(localStorage.getItem('ml-roadmap-state-v2'))");
    assert.equal(migrated.version, 2);
    assert.deepEqual(migrated.completed, { "00": ["intuition"], "19": ["quiz"] });
    assert.equal(evaluate("document.querySelector('#course-count').textContent"), "31 章课程");
    assert.equal(evaluate("document.querySelector('.lesson-section').id"), "intuition");
    assert.equal(evaluate("document.querySelector('.formula-index').open"), false);
    assert.equal(evaluate("document.querySelectorAll('.derivation-disclosure[open]').length"), 0);
    assert.equal(evaluate("document.querySelectorAll('.reading-guide').length"), 1);
    run(["click", ".formula-index > summary"]);
    assert.equal(evaluate("document.querySelector('.formula-index').open"), true);
    run(["click", ".formula-index > summary"]);
    assert.equal(evaluate("document.querySelector('.formula-index').open"), false);

    if (width < 760) clickRef(".app-header", /button "打开课程目录"/);
    const searchSnapshot = run(["snapshot", "-i", "-s", "#course-nav"]);
    const searchRef = searchSnapshot.split("\n").find(l => /searchbox "搜索课程全文"/.test(l))?.match(/ref=(e\d+)/)?.[1];
    assert.ok(searchRef);
    run(["fill", `@${searchRef}`, "EMPO²"]);
    assert.ok(evaluate("[...document.querySelectorAll('[data-chapter-link]')].map(a=>a.dataset.chapterLink)").includes("27"));
    assert.ok(evaluate("document.querySelectorAll('[data-search-result]').length") > 0);
    run(["click", ".section-search-results li:first-child a"]);
    assert.equal(evaluate("document.querySelector('.chapter').dataset.chapterId"), "27");
    assert.match(evaluate("location.hash"), /^#27\/.+/);
    assert.equal(evaluate("document.body.dataset.drawer || ''"), "");

    const chapter = getChapter("27");
    const mathCount = chapter.sections.filter(s => s.type === "derivation").length;
    assert.equal(evaluate("document.querySelector('.lesson-section').id"), "intuition");
    assert.equal(evaluate("document.querySelector('.formula-index').open"), false);
    assert.equal(evaluate("document.querySelectorAll('.lesson-section').length"), visibleSections(chapter).length);
    assert.equal(evaluate("document.querySelectorAll('.derivation-disclosure[open]').length"), 0);
    run(["click", ".formula-index > summary"]);
    assert.equal(evaluate("document.querySelector('.formula-index').open"), true);
    clickRef(".formula-index", /button "展开全部推导"/);
    assert.equal(evaluate("document.querySelectorAll('.derivation-disclosure[open]').length"), mathCount);
    clickRef(".formula-index", /button "收起全部推导"/);
    assert.equal(evaluate("document.querySelectorAll('.derivation-disclosure[open]').length"), 0);
    run(["click", '.formula-index [data-section-link="derivation"]']);
    assert.equal(evaluate("document.querySelector('#derivation details').open"), true);
    run(["click", '.formula-index [data-section-link="whiteboard"]']);
    assert.equal(evaluate("location.hash"), "#27/whiteboard");
    assert.equal(evaluate("document.querySelectorAll('#whiteboard .quiz-answer[open]').length"), 0);
    run(["click", "#whiteboard .quiz-item:first-child summary"]);
    assert.equal(evaluate("document.querySelectorAll('#whiteboard .quiz-answer[open]').length"), 1);
    clickRef("#whiteboard .section-header", /button ".*完成"/);
    assert.equal(evaluate("document.querySelector('#whiteboard button').getAttribute('aria-pressed')"), "true");
    run(["open", `${base}?whiteboard=${width}#27/whiteboard`]);
    assert.equal(evaluate("document.querySelector('#whiteboard button').getAttribute('aria-pressed')"), "true");

    run(["open", `${base}?deep-code=${width}#27/code`]);
    assert.ok(evaluate("Boolean(document.querySelector('#code'))"));
    assert.equal(evaluate("document.querySelectorAll('.derivation-disclosure[open]').length"), 0);
    assert.equal(evaluate("document.querySelectorAll('.lesson-section').length"), chapter.sections.length);

    if (width < 1180) clickRef(".app-header", /button "打开本章目录"/);
    run(["scroll", "down", "700", "--selector", "#chapter-sidebar"]);
    clickRef(".section-toc", /link "推导 /);
    assert.equal(evaluate("location.hash"), "#27/derivation");
    run(["wait", "--fn", "document.querySelector('#derivation').getBoundingClientRect().top >= 58 && document.querySelector('#derivation').getBoundingClientRect().top < 180"]);
    run(["click", "#derivation summary"]);
    assert.equal(evaluate("document.querySelector('#derivation details').open"), false);
    run(["click", "#derivation summary"]);
    assert.equal(evaluate("document.querySelector('#derivation details').open"), true);
    // scrollintoview may recenter the summary; TOC alignment was checked above.
    assert.equal(evaluate("location.hash"), "#27/derivation");
    clickRef("#derivation .section-header", /button ".*完成"/);
    assert.equal(evaluate("document.querySelector('#derivation details').open"), true);
    assert.equal(evaluate("document.querySelector('#derivation button').getAttribute('aria-pressed')"), "true");
    run(["open", `${base}?persistence=${width}#27/derivation`]);
    assert.equal(evaluate("document.querySelector('#derivation button').getAttribute('aria-pressed')"), "true");

    run(["open", `${base}?code=${width}#27/code`]);
    clickRef("#code", /button "复制代码"/);
    assert.equal(evaluate("document.querySelector('#toast').textContent"), "代码已复制");
    run(["open", `${base}?quiz=${width}#27/quiz`]);
    run(["click", "#quiz .quiz-item:first-child summary"]);
    assert.equal(evaluate("document.querySelectorAll('.quiz-answer[open]').length"), 1);
    clickRef(".app-header", /button "切换到深色主题"/);
    assert.equal(evaluate("document.documentElement.dataset.theme"), "dark");
    run(["open", `${base}?theme=${width}#27/quiz`]);
    assert.equal(evaluate("document.documentElement.dataset.theme"), "dark");
    clickRef(".app-header", /button "切换到浅色主题"/);

    if (width < 1180) {
      clickRef(".app-header", /button "打开本章目录"/);
      // The drawer retained its independent scroll position; return to its close button.
      run(["scroll", "up", "3000", "--selector", "#chapter-sidebar"]);
      clickRef("#chapter-sidebar", /button "关闭本章目录"/);
      assert.equal(evaluate("document.body.dataset.drawer || ''"), "");
    }
    if (width < 760) {
      clickRef(".app-header", /button "打开课程目录"/);
      clickRef("#course-nav", /button "关闭课程目录"/);
      assert.equal(evaluate("document.body.dataset.drawer || ''"), "");
    }
    run(["open", `${base}?invalid=${width}#99/missing`]);
    assert.equal(evaluate("location.hash"), "#00");
    // Exercise every new topic through the actual formula index.
    for (const [id, section] of [
      ["06", "math-learning-rate-schedule"], ["08", "math-truncated-sampling"],
      ["10", "math-position-extension"], ["11", "math-speculative-decoding"],
    ]) {
      run(["open", `${base}?new-topic=${width}#${id}`]);
      run(["click", ".formula-index > summary"]);
      run(["click", `.formula-index [data-section-link="${section}"]`]);
      assert.equal(evaluate("location.hash"), `#${id}/${section}`);
      assert.equal(evaluate(`document.querySelector('#${section} details').open`), true);
      assert.ok(evaluate(`document.querySelectorAll('#${section} .math-rendered').length`) > 0);
      if (id === "10") {
        run(["screenshot", fileURLToPath(new URL(
          `../artifacts/${prefix}-position-${width}x${height}.png`, import.meta.url))]);
      }
    }
    run(["open", `${base}?glossary=${width}#03/math-confidence`]);
    const term = 'dfn[data-definition^="Bootstrap："]';
    run(["scrollintoview", term]);
    run(["hover", term]);
    assert.equal(evaluate(`getComputedStyle(document.querySelector('${term}'),'::after').display`), "block");
    run(["click", term]);
    assert.equal(evaluate(`document.activeElement===document.querySelector('${term}')`), true);
    run(["press", "Shift+Tab"]);
    run(["press", "Tab"]);
    assert.equal(evaluate(`document.activeElement===document.querySelector('${term}')`), true);
    assert.equal(evaluate(`getComputedStyle(document.activeElement,'::after').display`), "block");
    const tooltip = evaluate(`(() => {
      const style = getComputedStyle(document.activeElement,'::after');
      const left = parseFloat(style.left), top = parseFloat(style.top);
      const width = parseFloat(style.width), height = parseFloat(style.height);
      const pane = document.querySelector('#reading-pane').getBoundingClientRect();
      return {left,top,width,height,passed: style.position==='fixed' &&
        left>=Math.max(0,pane.left) && left+width<=Math.min(innerWidth,pane.right) &&
        top>=document.querySelector('.app-header').getBoundingClientRect().bottom &&
        top+height<=innerHeight};
    })()`);
    assert.equal(tooltip.passed, true, `Clipped definition: ${JSON.stringify(tooltip)}`);
    run(["screenshot", fileURLToPath(new URL(
      `../artifacts/${prefix}-glossary-${width}x${height}.png`, import.meta.url))]);

    // First-pass guide links and keyboard disclosure on revised lessons.
    for (const id of ["01", "02", "30", "24"]) {
      run(["open", `${base}?reading-guide=${width}#${id}`]);
      const topic = id === "24" ? "math-paired-inference" : "derivation";
      run(["click", `.reading-guide [data-section-link="${topic}"]`]);
      assert.equal(evaluate("location.hash"), `#${id}/${topic}`);
      assert.equal(evaluate(`document.querySelector('#${topic} details').open`), true);
      assert.ok(evaluate(`document.querySelector('#${topic} .topic-takeaway').checkVisibility()`));
      const y = evaluate(`document.querySelector('#${topic}').getBoundingClientRect().top`);
      assert.ok(y >= 58 && y < 180, `${id}: section anchor at ${y}`);
      run(["screenshot", fileURLToPath(new URL(
        `../artifacts/${prefix}-${id}-folded-${width}x${height}.png`, import.meta.url))]);
      run(["click", `#${topic} summary`]);
      assert.equal(evaluate(`document.querySelector('#${topic} details').open`), false);
      run(["press", "Enter"]);
      assert.equal(evaluate(`document.querySelector('#${topic} details').open`), true);
      run(["screenshot", fileURLToPath(new URL(
        `../artifacts/${prefix}-${id}-expanded-${width}x${height}.png`, import.meta.url))]);
    }
    report.viewports.push({ width, height, passed: true, tested: [
      "v1 migration", "default chapter/count", "search directly to chapter 27 section",
      "single reading form", "formula index folded by default and toggleable",
      "collapse/expand all", "formula index reopens destination",
      "whiteboard answer and completion persistence", "code deep link preserves fold state",
      "TOC jump", "derivation disclosure", "completion preserving disclosure", "refresh persistence",
      "clipboard write success", "quiz answer", "theme persistence", "drawer close", "invalid route",
      "four new topics via native index", "glossary hover/click/keyboard focus and bounds",
      "01/02/30/24 guide links", "takeaway remains visible",
      "keyboard opens and closes derivations", "folded and expanded lesson screenshots",
    ] });
    console.log(`${width}x${height}: native interaction acceptance passed`);
  }
  report.console = JSON.parse(run(["console", "--json"]));
  assert.equal(report.console.data.messages.filter(m => m.type === "error" || m.level === "error").length, 0);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack;
  report.recentClicks = clickTrace.slice(-6);
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  writeFileSync(new URL(`../artifacts/${prefix}-interaction-audit.json`, import.meta.url), JSON.stringify(report, null, 2) + "\n");
  run(["close"]);
}
