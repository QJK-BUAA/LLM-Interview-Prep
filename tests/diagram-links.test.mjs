import test from "node:test";
import assert from "node:assert/strict";
import { renderDiagram } from "../app/renderer.js";

test("branching and feedback diagrams show actual edges, not an invented linear chain", () => {
  const html = renderDiagram({
    kind: "flow", nodes: ["故障", "数据", "系统", "验证"],
    links: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 0]],
  });
  for (const [from, to] of [[0, 1], [0, 2], [1, 3], [2, 3], [3, 0]]) {
    assert.match(html, new RegExp(`data-from="${from}" data-to="${to}"`));
  }
  assert.doesNotMatch(html, /data-from="1" data-to="2"/);
  assert.match(html, /故障/);
  assert.match(html, /验证/);
});

test("disconnected nodes remain visible without fabricating an edge", () => {
  const html = renderDiagram({ kind: "flow", nodes: ["甲", "乙", "独立节点"], links: [[0, 1]] });
  assert.match(html, /独立节点/);
  assert.doesNotMatch(html, /data-from="1" data-to="2"/);
});
