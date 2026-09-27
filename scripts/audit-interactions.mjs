import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const session = "roadmap-interactions-v2";
const base = process.env.ROADMAP_URL || "http://127.0.0.1:8010/";
const run = (args, input) => execFileSync("agent-browser", ["--session", session, ...args], {
  input, encoding: "utf8", timeout: 20000,
  env: { ...process.env, AGENT_BROWSER_DEFAULT_TIMEOUT: "6000" },
});
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
  for (const [width, height] of [[1440, 1000], [900, 900], [390, 844]]) {
    run(["set", "viewport", String(width), String(height)]);
    run(["open", `${base}?interactions=${width}#00`]);
    run(["wait", ".chapter"]);
    // Test fixtures belong to this isolated browser session, never the user's browser.
    evaluate(`localStorage.removeItem('ml-roadmap-state-v2'); localStorage.setItem('ml-roadmap-state-v1', JSON.stringify({version:1, currentChapter:'19',mode:'learn',theme:'light',completed:{'00':['intuition'],'19':['quiz'],'20':['quiz']}})); true`);
    run(["open", `${base}?migration=${width}#00`]);
    const migrated = evaluate("JSON.parse(localStorage.getItem('ml-roadmap-state-v2'))");
    assert.equal(migrated.version, 2);
    assert.deepEqual(migrated.completed, { "00": ["intuition"], "19": ["quiz"] });
    assert.equal(evaluate("document.querySelector('#course-count').textContent"), "30 章课程");

    if (width < 760) clickRef(".app-header", /button "打开课程目录"/);
    const searchSnapshot = run(["snapshot", "-i", "-s", "#course-nav"]);
    const searchRef = searchSnapshot.split("\n").find(l => /searchbox "搜索课程全文"/.test(l))?.match(/ref=(e\d+)/)?.[1];
    assert.ok(searchRef);
    run(["fill", `@${searchRef}`, "EMPO²"]);
    assert.ok(evaluate("[...document.querySelectorAll('[data-chapter-link]')].map(a=>a.dataset.chapterLink)").includes("27"));
    clickRef("#course-list", /link "27 /);
    assert.equal(evaluate("document.querySelector('.chapter').dataset.chapterId"), "27");
    assert.equal(evaluate("document.body.dataset.drawer || ''"), "");

    clickRef(".app-header", /button "面试"/);
    assert.equal(evaluate("document.querySelectorAll('.lesson-section').length"), 4);
    clickRef(".app-header", /button "学习"/);
    assert.equal(evaluate("document.querySelectorAll('.lesson-section').length"), 9);

    if (width < 1180) clickRef(".app-header", /button "打开本章目录"/);
    run(["scroll", "down", "700", "--selector", "#chapter-sidebar"]);
    clickRef(".section-toc", /link "推导 /);
    assert.equal(evaluate("location.hash"), "#27/derivation");
    run(["wait", "--fn", "document.querySelector('#derivation').getBoundingClientRect().top >= 58 && document.querySelector('#derivation').getBoundingClientRect().top < 180"]);
    run(["click", "#derivation summary"]);
    assert.equal(evaluate("document.querySelector('#derivation details').open"), true);
    const targetTop = evaluate("document.querySelector('#derivation').getBoundingClientRect().top");
    assert.ok(targetTop >= 58 && targetTop < 180);
    clickRef("#derivation .section-header", /button ".*完成"/);
    assert.equal(evaluate("document.querySelector('#derivation details').open"), true);
    assert.equal(evaluate("document.querySelector('#derivation button').getAttribute('aria-pressed')"), "true");
    run(["open", `${base}?persistence=${width}#27/derivation`]);
    assert.equal(evaluate("document.querySelector('#derivation button').getAttribute('aria-pressed')"), "true");

    run(["open", `${base}?code=${width}#27/code`]);
    clickRef("#code", /button "复制代码"/);
    assert.equal(evaluate("document.querySelector('#toast').textContent"), "代码已复制");
    run(["open", `${base}?quiz=${width}#27/quiz`]);
    run(["click", ".quiz-answer:first-of-type summary"]);
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
    report.viewports.push({ width, height, passed: true, tested: [
      "v1 migration", "default chapter/count", "search/open chapter 27", "learn/interview",
      "TOC jump", "derivation disclosure", "completion preserving disclosure", "refresh persistence",
      "clipboard write success", "quiz answer", "theme persistence", "drawer close", "invalid route",
    ] });
    console.log(`${width}x${height}: native interaction acceptance passed`);
  }
  report.console = JSON.parse(run(["console", "--json"]));
  assert.equal(report.console.data.messages.filter(m => m.type === "error" || m.level === "error").length, 0);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack;
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  writeFileSync(new URL("../artifacts/browser-interaction-audit.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
  if (report.passed) run(["close"]);
}
