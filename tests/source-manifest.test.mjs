import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHAPTERS } from "../content/catalog.js";
import { REQUIRED_SECTION_TYPES } from "../content/schema.js";
import { SOURCE_DOCUMENTS, SOURCE_REVISION, validateSourceManifest } from "../content/source-manifest.js";

test("all 37 approved source documents are frozen and covered by actual lesson bodies", () => {
  const inventory = JSON.parse(readFileSync(new URL("../docs/research/source-inventory.json", import.meta.url), "utf8"));
  const design = readFileSync(new URL("../docs/superpowers/specs/2026-09-26-agentic-rl-integration-design.md", import.meta.url), "utf8");
  const approvedPaths = [...design.matchAll(/^\| `((?:docs\/|README)[^`]*\.md)` \|/gm)].map(match => match[1]).sort();
  assert.equal(SOURCE_REVISION, "66ae4423b36270ef50a288fb1bb2e1b31c46c329");
  assert.equal(SOURCE_DOCUMENTS.length, 37);
  assert.equal(new Set(SOURCE_DOCUMENTS.map(d => d.path)).size, 37);
  assert.deepEqual(SOURCE_DOCUMENTS.map(d => d.path).sort(), approvedPaths);
  for (const source of SOURCE_DOCUMENTS) {
    assert.equal(source.sha256, inventory.documents.find(d => d.path === source.path)?.sha256);
    assert.match(source.sha256, /^[a-f0-9]{64}$/);
    assert.ok(source.topics.length > 5);
  }
  assert.deepEqual(validateSourceManifest(CHAPTERS), []);
});

test("the course has 30 dependency-ordered lessons with the full teaching contract", () => {
  assert.deepEqual(CHAPTERS.map(c => c.id), Array.from({ length: 30 }, (_, i) => String(i).padStart(2, "0")));
  for (const [index, chapter] of CHAPTERS.entries()) {
    for (const type of REQUIRED_SECTION_TYPES) {
      assert.ok(chapter.sections.some(section => section.type === type), `${chapter.id}: ${type}`);
    }
    for (const prerequisite of chapter.prerequisites) {
      assert.ok(CHAPTERS.slice(0, index).some(c => c.id === prerequisite), `${chapter.id} prerequisite ${prerequisite}`);
    }
  }
});

test("manifest validation rejects missing lesson content even when source citations remain", () => {
  const withoutBody = CHAPTERS.map(chapter => chapter.id === "19" ? {
    ...chapter, sections: chapter.sections.map(section => ({ ...section, body: "不含来源主题的空壳正文" })),
  } : chapter);
  assert.ok(validateSourceManifest(withoutBody).some(error => error.includes("19/")));
  assert.ok(validateSourceManifest(CHAPTERS.filter(c => c.id !== "00")).some(error => error.includes("missing chapter 00")));
});
