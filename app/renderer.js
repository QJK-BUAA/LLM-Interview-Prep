import { annotateGlossary, GLOSSARY } from "./glossary.js";

const INTERVIEW_SECTION_TYPES = new Set([
  "pitfall",
  "comparison",
  "interview",
  "quiz",
]);

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeClassName(value) {
  return String(value).replace(/[^A-Za-z0-9_-]/g, "") || "text";
}

function renderMathPlaceholder(source, display) {
  const tag = display ? "div" : "span";
  const mode = display ? "math-display" : "math-inline";
  return (
    `<${tag} class="math-placeholder ${mode}" ` +
    `data-display="${display}" data-math="${escapeHtml(source.trim())}">` +
    `${escapeHtml(source.trim())}</${tag}>`
  );
}

function tokenizeProtectedContent(source) {
  const tokens = [];

  function store(html) {
    const token = `\uE000${tokens.length}\uE001`;
    tokens.push(html);
    return token;
  }

  let value = String(source).replace(
    /~~~([A-Za-z0-9_-]*)[ \t]*\n([\s\S]*?)\n?~~~/g,
    (_match, language, code) =>
      store(
        `<pre class="code-block"><button class="code-copy" type="button" ` +
          `data-action="copy-code" aria-label="复制代码" title="复制代码">` +
          `<span aria-hidden="true">⧉</span><span>复制</span></button>` +
          `<code class="language-${safeClassName(language)}">${escapeHtml(
            code,
          )}</code></pre>`,
      ),
  );

  value = value.replace(/\$\$([\s\S]*?)\$\$/g, (_match, math) =>
    store(renderMathPlaceholder(math, true)),
  );
  value = value.replace(/\$([^$\n]+?)\$/g, (_match, math) =>
    store(renderMathPlaceholder(math, false)),
  );
  value = value.replace(/`([^`\n]+?)`/g, (_match, code) =>
    store(`<code class="inline-code">${escapeHtml(code)}</code>`),
  );

  return { value, tokens };
}

function restoreTokens(value, tokens) {
  return value.replace(/\uE000(\d+)\uE001/g, (_match, index) => tokens[index]);
}

function renderInline(source, options, tokens) {
  const seenTerms = options.seenTerms ?? new Set();
  let html = options.glossary
    ? annotateGlossary(source, seenTerms)
    : escapeHtml(source);

  html = html.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[\s(])\*([^*\n]+?)\*(?=$|[\s).,，。])/g, "$1<em>$2</em>");
  return restoreTokens(html, tokens);
}

function renderInlineMarkdown(source, options) {
  const { value, tokens } = tokenizeProtectedContent(source);
  return renderInline(value, options, tokens);
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableDelimiter(line) {
  const cells = parseTableRow(line);
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")))
  );
}

function tableAlignment(cell) {
  const compact = cell.replace(/\s/g, "");
  if (compact.startsWith(":") && compact.endsWith(":")) return "center";
  if (compact.endsWith(":")) return "right";
  return "left";
}

function renderTable(lines, options, tokens) {
  const header = parseTableRow(lines[0]);
  const delimiter = parseTableRow(lines[1]);
  const rows = lines.slice(2).map(parseTableRow);
  const alignments = delimiter.map(tableAlignment);

  const headHtml = header
    .map(
      (cell, index) =>
        `<th scope="col" class="align-${alignments[index] ?? "left"}">` +
        `${renderInline(cell, options, tokens)}</th>`,
    )
    .join("");
  const bodyHtml = rows
    .map(
      (row) =>
        `<tr>${header
          .map(
            (_cell, index) =>
              `<td class="align-${alignments[index] ?? "left"}">` +
              `${renderInline(row[index] ?? "", options, tokens)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");

  return (
    `<div class="table-scroll" tabindex="0">` +
    `<table><thead><tr>${headHtml}</tr></thead>` +
    `<tbody>${bodyHtml}</tbody></table></div>`
  );
}

export function renderMarkdown(source, options = {}) {
  const { value, tokens } = tokenizeProtectedContent(source);
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (
      line.trim().startsWith("|") &&
      index + 1 < lines.length &&
      isTableDelimiter(lines[index + 1])
    ) {
      const tableLines = [line, lines[index + 1]];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }
      blocks.push(renderTable(tableLines, options, tokens));
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 2, 6);
      blocks.push(
        `<h${level}>${renderInline(heading[2], options, tokens)}</h${level}>`,
      );
      index += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(
        `<ul>${items
          .map((item) => `<li>${renderInline(item, options, tokens)}</li>`)
          .join("")}</ul>`,
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        `<ol>${items
          .map((item) => `<li>${renderInline(item, options, tokens)}</li>`)
          .join("")}</ol>`,
      );
      continue;
    }

    if (line.includes("\uE000") && line.trim().match(/^\uE000\d+\uE001$/)) {
      blocks.push(restoreTokens(line.trim(), tokens));
      index += 1;
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,4})\s+/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index]) &&
      !(
        lines[index].trim().startsWith("|") &&
        index + 1 < lines.length &&
        isTableDelimiter(lines[index + 1])
      ) &&
      !lines[index].trim().match(/^\uE000\d+\uE001$/)
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      `<p>${renderInline(paragraph.join("\n"), options, tokens).replaceAll(
        "\n",
        "<br>",
      )}</p>`,
    );
  }

  return blocks.join("\n");
}

function diagramAriaLabel(diagram) {
  const links = diagram.links
    .map(([from, to]) => `${diagram.nodes[from]} 到 ${diagram.nodes[to]}`)
    .join("；");
  return links || diagram.nodes.join("；");
}

export function renderDiagram(diagram) {
  const kind = ["flow", "matrix", "comparison"].includes(diagram?.kind)
    ? diagram.kind
    : "flow";
  const nodes = Array.isArray(diagram?.nodes) ? diagram.nodes : [];
  const links = Array.isArray(diagram?.links) ? diagram.links : [];
  const normalized = { kind, nodes, links };

  if (kind === "matrix") {
    return (
      `<figure class="diagram diagram--matrix" ` +
      `aria-label="${escapeHtml(diagramAriaLabel(normalized))}">` +
      `<div class="matrix-grid">${nodes
        .map((node) => `<span class="matrix-cell">${escapeHtml(node)}</span>`)
        .join("")}</div></figure>`
    );
  }

  if (kind === "comparison") {
    return (
      `<figure class="diagram diagram--comparison" ` +
      `aria-label="${escapeHtml(diagramAriaLabel(normalized))}">` +
      nodes
        .map(
          (node, index) =>
            `<div class="comparison-node" data-node-index="${index}">` +
            `${escapeHtml(node)}</div>`,
        )
        .join("") +
      `</figure>`
    );
  }

  return (
    `<figure class="diagram diagram--flow" ` +
    `aria-label="${escapeHtml(diagramAriaLabel(normalized))}">` +
    `<div class="flow-track">${nodes
      .map(
        (node, index) =>
          `${index > 0 ? '<span class="flow-arrow" aria-hidden="true">→</span>' : ""}` +
          `<div class="flow-node" data-node-index="${index}">${escapeHtml(
            node,
          )}</div>`,
      )
      .join("")}</div></figure>`
  );
}

export function visibleSections(chapter, mode) {
  if (!Array.isArray(chapter?.sections)) return [];
  if (mode !== "interview") return [...chapter.sections];
  return chapter.sections.filter((section) =>
    INTERVIEW_SECTION_TYPES.has(section.type),
  );
}

function renderQuiz(section, options) {
  const questions = section.questions ?? [];
  return (
    renderMarkdown(section.body, options) +
    `<ol class="quiz-list">${questions
      .map(
        (question, index) =>
          `<li class="quiz-item"><p class="quiz-question">` +
          `<span class="quiz-number">${index + 1}</span>` +
          `${renderInlineMarkdown(question.q, options)}</p>` +
          `<details class="quiz-answer"><summary>查看答案</summary>` +
          `${renderMarkdown(question.a, options)}</details></li>`,
      )
      .join("")}</ol>`
  );
}

function renderSection(section, chapterId, completed, options) {
  const isCompleted = completed.has(section.id);
  let content = renderMarkdown(section.body, options);

  if (section.type === "diagram") {
    content += renderDiagram(section.diagram);
  } else if (section.type === "derivation") {
    content =
      `<details class="derivation-disclosure">` +
      `<summary>展开公式推导</summary>${content}</details>`;
  } else if (section.type === "quiz") {
    content = renderQuiz(section, options);
  }

  return (
    `<section class="lesson-section section--${safeClassName(section.type)} ` +
    `${isCompleted ? "is-complete" : ""}" id="${escapeHtml(section.id)}" ` +
    `data-section-id="${escapeHtml(section.id)}">` +
    `<header class="section-header"><div>` +
    `<span class="section-kicker">${escapeHtml(section.type)}</span>` +
    `<h2>${escapeHtml(section.title)}</h2></div>` +
    `<button class="section-complete" type="button" ` +
    `data-action="toggle-section" data-chapter-id="${escapeHtml(chapterId)}" ` +
    `data-section-id="${escapeHtml(section.id)}" aria-pressed="${isCompleted}" ` +
    `title="${isCompleted ? "标记为未完成" : "标记为已完成"}">` +
    `<span aria-hidden="true">✓</span>` +
    `<span>${isCompleted ? "已完成" : "完成"}</span></button></header>` +
    `<div class="section-body">${content}</div></section>`
  );
}

export function renderChapter(chapter, state = {}) {
  const mode = state.mode === "interview" ? "interview" : "learn";
  const completed = new Set(state.completed?.[chapter.id] ?? []);
  const sections = visibleSections(chapter, mode);
  const seenTerms = new Set();
  const markdownOptions = { glossary: true, seenTerms };
  const progress = Math.round((completed.size / chapter.sections.length) * 100);

  return (
    `<article class="chapter" data-chapter-id="${escapeHtml(chapter.id)}">` +
    `<header class="chapter-header">` +
    `<div class="chapter-meta"><span>${escapeHtml(chapter.part)}</span>` +
    `<span>${escapeHtml(chapter.level)}</span>` +
    `<span>${escapeHtml(chapter.duration)} 分钟</span></div>` +
    `<p class="chapter-number">CHAPTER ${escapeHtml(chapter.id)}</p>` +
    `<h1>${escapeHtml(chapter.title)}</h1>` +
    `<p class="chapter-subtitle">${escapeHtml(chapter.subtitle)}</p>` +
    `<p class="chapter-summary">${renderInline(
      chapter.summary,
      markdownOptions,
      [],
    )}</p>` +
    `<div class="chapter-progress" aria-label="本章进度 ${progress}%">` +
    `<span style="width:${progress}%"></span></div>` +
    `</header>` +
    `<section class="chapter-objectives" aria-labelledby="objectives-title">` +
    `<h2 id="objectives-title">学完能做什么</h2>` +
    `<ul>${chapter.objectives
      .map((objective) => `<li>${escapeHtml(objective)}</li>`)
      .join("")}</ul></section>` +
    `<div class="lesson-sections">${sections
      .map((section) =>
        renderSection(section, chapter.id, completed, markdownOptions),
      )
      .join("")}</div>` +
    `<footer class="chapter-sources"><h2>来源与证据</h2><ol>${chapter.sources
      .map(
        (source) =>
          `<li><a href="${escapeHtml(source.url)}" target="_blank" ` +
          `rel="noreferrer">${escapeHtml(source.label)}</a>` +
          `<span>${escapeHtml(source.evidence)}</span></li>`,
      )
      .join("")}</ol></footer></article>`
  );
}

export function hydrateMath(root, katex = globalThis.katex) {
  if (!root?.querySelectorAll) return;

  for (const element of root.querySelectorAll("[data-math]")) {
    const source = element.getAttribute("data-math") ?? "";
    const displayMode = element.getAttribute("data-display") === "true";

    try {
      if (!katex?.renderToString) throw new Error("KaTeX unavailable");
      element.innerHTML = katex.renderToString(source, {
        displayMode,
        throwOnError: true,
        strict: "ignore",
      });
      element.classList.remove("math-placeholder");
      element.classList.add("math-rendered");
    } catch {
      const fallback = element.ownerDocument.createElement("code");
      fallback.className = "math-fallback";
      fallback.textContent = source;
      element.replaceWith(fallback);
    }
  }
}

export { GLOSSARY };
