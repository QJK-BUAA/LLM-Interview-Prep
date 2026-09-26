import { CHAPTERS, getChapter, getParts } from "../content/catalog.js";
import {
  escapeHtml,
  hydrateMath,
  renderChapter,
  visibleSections,
} from "./renderer.js";
import {
  getProgress,
  loadState,
  saveState,
  setCurrentChapter,
  setMode,
  setTheme,
  toggleSection,
} from "./store.js";

const SECTION_LABELS = Object.freeze({
  intuition: "直觉",
  example: "例子",
  diagram: "机制",
  derivation: "推导",
  code: "代码",
  pitfall: "误区",
  comparison: "对比",
  interview: "面试",
  quiz: "自测",
});

const searchDocuments = CHAPTERS.map((chapter) => {
  const questionText = chapter.sections
    .flatMap((section) => section.questions ?? [])
    .flatMap((question) => [question.q, question.a]);
  const fields = [
    chapter.id,
    chapter.slug,
    chapter.part,
    chapter.title,
    chapter.subtitle,
    chapter.summary,
    ...chapter.tags,
    ...chapter.objectives,
    ...chapter.sections.flatMap((section) => [section.title, section.body]),
    ...questionText,
    ...chapter.sources.flatMap((source) => [
      source.label,
      source.evidence,
    ]),
  ];

  return {
    chapter,
    text: normalizeSearchText(fields.join(" ")),
  };
});

function normalizeSearchText(value) {
  return String(value).normalize("NFKC").toLocaleLowerCase("zh-CN");
}

export function searchChapters(query) {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...CHAPTERS];

  return searchDocuments
    .filter(({ text }) => terms.every((term) => text.includes(term)))
    .map(({ chapter }) => chapter);
}

export function parseRoute(hash) {
  let value;
  try {
    value = decodeURIComponent(String(hash).replace(/^#/, ""));
  } catch {
    return null;
  }

  const parts = value.split("/").filter(Boolean);
  if (parts[0] === "chapter") parts.shift();
  if (parts.length < 1 || parts.length > 2) return null;

  const chapter = getChapter(parts[0]);
  if (!chapter) return null;

  const sectionId = parts[1] || null;
  if (
    sectionId &&
    !chapter.sections.some((section) => section.id === sectionId)
  ) {
    return null;
  }

  return { chapterId: chapter.id, sectionId };
}

function routeHash(chapterId, sectionId = null) {
  return `#${encodeURIComponent(chapterId)}${
    sectionId ? `/${encodeURIComponent(sectionId)}` : ""
  }`;
}

function chapterSearchLabel(chapter) {
  return `${chapter.tags.slice(0, 3).join(" · ")} · ${chapter.duration} 分钟`;
}

function initialize() {
  const elements = {
    chapterRoot: document.querySelector("#chapter-root"),
    readingPane: document.querySelector("#reading-pane"),
    courseList: document.querySelector("#course-list"),
    searchInput: document.querySelector("#course-search-input"),
    searchClear: document.querySelector('[data-action="clear-search"]'),
    searchStatus: document.querySelector("#search-status"),
    chapterContext: document.querySelector("#chapter-context"),
    chapterSidebarTitle: document.querySelector("#chapter-sidebar-title"),
    overallProgress: document.querySelector("#overall-progress"),
    overallProgressLabel: document.querySelector("#overall-progress-label"),
    themeToggle: document.querySelector("#theme-toggle"),
    themeColor: document.querySelector('meta[name="theme-color"]'),
    toast: document.querySelector("#toast"),
  };

  if (Object.values(elements).some((element) => !element)) {
    throw new Error("应用壳缺少必需节点");
  }

  let state = loadState();
  let renderedChapterId = null;
  let renderedMode = null;
  let currentSectionId = null;
  let openDrawer = null;
  let drawerTrigger = null;
  let toastTimer = null;
  let copyTimer = null;
  let scrollFrame = null;
  const scrollPositions = new Map();

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  function isReadingPaneScrollable() {
    return window.matchMedia("(min-width: 760px)").matches;
  }

  function readScrollPosition() {
    return isReadingPaneScrollable()
      ? elements.readingPane.scrollTop
      : window.scrollY;
  }

  function writeScrollPosition(value) {
    if (isReadingPaneScrollable()) {
      elements.readingPane.scrollTo({ top: value, behavior: "auto" });
    } else {
      window.scrollTo({ top: value, behavior: "auto" });
    }
  }

  function persist(nextState) {
    state = saveState(nextState);
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const nextTheme = state.theme === "dark" ? "浅色" : "深色";
    elements.themeToggle.setAttribute("aria-label", `切换到${nextTheme}主题`);
    elements.themeToggle.title = `切换到${nextTheme}主题`;
    elements.themeColor.content =
      state.theme === "dark" ? "#181a1d" : "#ffffff";
  }

  function applyModeControls() {
    for (const button of document.querySelectorAll("[data-mode]")) {
      const active = button.dataset.mode === state.mode;
      button.setAttribute("aria-pressed", String(active));
    }
  }

  function renderOverallProgress() {
    const progress = getProgress(state);
    elements.overallProgress.max = progress.total;
    elements.overallProgress.value = progress.completed;
    elements.overallProgress.textContent = `${progress.percentage}%`;
    elements.overallProgressLabel.value =
      `${progress.completed} / ${progress.total}`;
    elements.overallProgress.parentElement?.setAttribute(
      "aria-label",
      `总体学习进度 ${progress.percentage}%`,
    );
  }

  function renderCourseNavigation() {
    const query = elements.searchInput.value.trim();
    const matches = searchChapters(query);
    const matchingIds = new Set(matches.map((chapter) => chapter.id));
    const groups = getParts()
      .map((part) => ({
        ...part,
        chapters: part.chapters.filter((chapter) =>
          matchingIds.has(chapter.id),
        ),
      }))
      .filter((part) => part.chapters.length > 0);

    elements.searchClear.hidden = query.length === 0;
    elements.searchStatus.textContent = query
      ? matches.length > 0
        ? `找到 ${matches.length} 章`
        : `没有找到“${query}”`
      : "按学习顺序排列";

    if (groups.length === 0) {
      elements.courseList.innerHTML =
        `<div class="empty-search">` +
        `<p>换一个更短的关键词试试。</p>` +
        `<button type="button" data-action="clear-search">清除搜索</button>` +
        `</div>`;
      return;
    }

    elements.courseList.innerHTML = groups
      .map(
        (part) =>
          `<section class="course-part">` +
          `<h3>${escapeHtml(part.name)}</h3>` +
          `<ol>${part.chapters
            .map((chapter) => {
              const progress = getProgress(state, chapter.id);
              const active = chapter.id === state.currentChapter;
              const status =
                progress.percentage === 100
                  ? `<span class="chapter-status is-done" aria-label="已完成">✓</span>`
                  : progress.completed > 0
                    ? `<span class="chapter-status">${progress.percentage}%</span>`
                    : `<span class="chapter-status" aria-hidden="true"></span>`;

              return (
                `<li><a class="chapter-link ${active ? "is-active" : ""}" ` +
                `href="${routeHash(chapter.id)}" data-chapter-link="${escapeHtml(
                  chapter.id,
                )}" ${active ? 'aria-current="page"' : ""}>` +
                `<span class="chapter-id">${escapeHtml(chapter.id)}</span>` +
                `<span class="chapter-link-copy"><strong>${escapeHtml(
                  chapter.title,
                )}</strong><small>${escapeHtml(
                  chapterSearchLabel(chapter),
                )}</small></span>${status}</a></li>`
              );
            })
            .join("")}</ol></section>`,
      )
      .join("");
  }

  function renderChapterContext(chapter) {
    const sections = visibleSections(chapter, state.mode);
    const completed = new Set(state.completed[chapter.id] ?? []);
    const progress = getProgress(state, chapter.id);
    const prerequisites =
      chapter.prerequisites.length > 0
        ? `<section class="context-block"><h3>先修知识</h3><ul class="prerequisite-list">` +
          chapter.prerequisites
            .map((id) => {
              const prerequisite = getChapter(id);
              return prerequisite
                ? `<li><a href="${routeHash(prerequisite.id)}">` +
                    `${escapeHtml(prerequisite.id)} ${escapeHtml(
                      prerequisite.title,
                    )}</a></li>`
                : "";
            })
            .join("") +
          `</ul></section>`
        : `<p class="no-prerequisite">无需前置章节</p>`;

    elements.chapterSidebarTitle.textContent = `${chapter.id} ${chapter.title}`;
    elements.chapterContext.innerHTML =
      `<div class="context-progress">` +
      `<div><span>本章进度</span><strong>${progress.percentage}%</strong></div>` +
      `<progress max="${progress.total}" value="${progress.completed}">` +
      `${progress.percentage}%</progress></div>` +
      prerequisites +
      `<section class="context-block"><h3>学习目标</h3><ul>${chapter.objectives
        .map((objective) => `<li>${escapeHtml(objective)}</li>`)
        .join("")}</ul></section>` +
      `<nav class="section-toc" aria-label="章节小节"><h3>` +
      `${state.mode === "interview" ? "面试复习目录" : "本章目录"}</h3><ol>` +
      sections
        .map(
          (section) =>
            `<li><a class="toc-link ${
              section.id === currentSectionId ? "is-current" : ""
            } ${completed.has(section.id) ? "is-complete" : ""}" ` +
            `href="${routeHash(chapter.id, section.id)}" ` +
            `data-section-link="${escapeHtml(section.id)}">` +
            `<span class="toc-type">${escapeHtml(
              SECTION_LABELS[section.type] ?? section.type,
            )}</span>` +
            `<span>${escapeHtml(section.title)}</span>` +
            `<span class="toc-check" aria-hidden="true">${
              completed.has(section.id) ? "✓" : ""
            }</span></a></li>`,
        )
        .join("") +
      `</ol></nav>`;
  }

  function showRenderError(chapter, error) {
    console.error(`无法渲染第 ${chapter.id} 章`, error);
    elements.chapterRoot.innerHTML =
      `<section class="error-state" role="alert">` +
      `<p class="eyebrow">章节载入失败</p>` +
      `<h1>${escapeHtml(chapter.id)} ${escapeHtml(chapter.title)}</h1>` +
      `<p>本章未能完成渲染。可以重试；其他章节仍可从课程目录打开。</p>` +
      `<button type="button" data-action="retry-render">重试</button>` +
      `</section>`;
  }

  function scrollToSection(sectionId, fallbackPosition = 0) {
    requestAnimationFrame(() => {
      if (sectionId) {
        const target = elements.chapterRoot.querySelector(
          `#${CSS.escape(sectionId)}`,
        );
        if (target) {
          target.scrollIntoView({ behavior: "auto", block: "start" });
          return;
        }
      }
      writeScrollPosition(fallbackPosition);
    });
  }

  function renderCurrentChapter({
    sectionId = null,
    restorePosition = 0,
    focusReader = false,
  } = {}) {
    const chapter = getChapter(state.currentChapter) ?? CHAPTERS[0];
    currentSectionId = sectionId;

    try {
      elements.chapterRoot.innerHTML = renderChapter(chapter, state);
      hydrateMath(elements.chapterRoot);
    } catch (error) {
      showRenderError(chapter, error);
    }

    renderedChapterId = chapter.id;
    renderedMode = state.mode;
    document.title = `${chapter.id} ${chapter.title} | ML Roadmap`;
    renderChapterContext(chapter);
    renderCourseNavigation();
    renderOverallProgress();
    applyModeControls();
    scrollToSection(sectionId, restorePosition);

    if (focusReader) {
      requestAnimationFrame(() => elements.readingPane.focus());
    }
  }

  function replaceRoute(chapterId, sectionId = null) {
    history.replaceState(null, "", routeHash(chapterId, sectionId));
  }

  function applyRoute({ focusReader = false } = {}) {
    let route = parseRoute(location.hash);
    if (!route) {
      route = { chapterId: "00", sectionId: null };
      replaceRoute(route.chapterId);
    } else {
      const canonical = routeHash(route.chapterId, route.sectionId);
      if (location.hash !== canonical) {
        history.replaceState(null, "", canonical);
      }
    }

    const chapterChanged = route.chapterId !== renderedChapterId;
    const modeChanged = state.mode !== renderedMode;
    if (renderedChapterId && chapterChanged) {
      scrollPositions.set(renderedChapterId, readScrollPosition());
    }

    persist(setCurrentChapter(state, route.chapterId));

    if (chapterChanged || modeChanged || !renderedChapterId) {
      const fallbackPosition = route.sectionId
        ? 0
        : (scrollPositions.get(route.chapterId) ?? 0);
      renderCurrentChapter({
        sectionId: route.sectionId,
        restorePosition: fallbackPosition,
        focusReader,
      });
    } else {
      currentSectionId = route.sectionId;
      renderChapterContext(getChapter(route.chapterId));
      scrollToSection(
        route.sectionId,
        route.sectionId ? readScrollPosition() : 0,
      );
      if (focusReader) {
        requestAnimationFrame(() => elements.readingPane.focus());
      }
    }

    closeDrawers({ restoreFocus: false });
  }

  function setDrawer(name, trigger = null) {
    openDrawer = name;
    drawerTrigger = trigger;
    document.body.dataset.drawer = name ?? "";

    for (const button of document.querySelectorAll(
      '[data-action="open-courses"], [data-action="open-toc"]',
    )) {
      const controls =
        button.dataset.action === "open-courses" ? "courses" : "toc";
      button.setAttribute("aria-expanded", String(name === controls));
    }

    if (name) {
      const target =
        name === "courses"
          ? document.querySelector("#course-nav")
          : document.querySelector("#chapter-sidebar");
      requestAnimationFrame(() => {
        target?.querySelector("input, button, a")?.focus();
      });
    }
  }

  function closeDrawers({ restoreFocus = true } = {}) {
    const previousTrigger = drawerTrigger;
    setDrawer(null);
    if (restoreFocus) previousTrigger?.focus();
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2400);
  }

  function updateCopyButton(button, label) {
    const text = button.querySelector("span:last-child");
    if (text) text.textContent = label;
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      if (text) text.textContent = "复制";
    }, 1800);
  }

  async function copyCode(button) {
    const code = button.closest("pre")?.querySelector("code");
    if (!code) return;

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(code.textContent ?? "");
      updateCopyButton(button, "已复制");
      showToast("代码已复制");
      return;
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection?.removeAllRanges();
      selection?.addRange(range);

      let copied = false;
      try {
        copied = Boolean(document.execCommand?.("copy"));
      } catch {
        copied = false;
      }

      if (copied) {
        selection?.removeAllRanges();
        updateCopyButton(button, "已复制");
        showToast("代码已复制");
      } else {
        updateCopyButton(button, "已选中");
        showToast("代码已选中，请按 Command/Ctrl + C");
      }
    }
  }

  function updateTocHighlight() {
    scrollFrame = null;
    const sections = [
      ...elements.chapterRoot.querySelectorAll(".lesson-section"),
    ];
    if (sections.length === 0) return;

    const anchorLine = isReadingPaneScrollable() ? 130 : 110;
    let nearest = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= anchorLine) {
        nearest = section;
      } else {
        break;
      }
    }

    for (const link of elements.chapterContext.querySelectorAll(".toc-link")) {
      link.classList.toggle(
        "is-current",
        link.dataset.sectionLink === nearest.id,
      );
    }
  }

  function scheduleTocHighlight() {
    if (scrollFrame !== null) return;
    scrollFrame = requestAnimationFrame(updateTocHighlight);
  }

  function restoreInitialRoutePosition() {
    const expectedHash = location.hash;
    const restore = () => {
      if (location.hash !== expectedHash) return;
      const route = parseRoute(expectedHash);
      if (!route || route.chapterId !== renderedChapterId) return;
      scrollToSection(route.sectionId, 0);
    };

    requestAnimationFrame(() => requestAnimationFrame(restore));
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => requestAnimationFrame(restore));
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action], [data-chapter-link], [data-section-link]");
    if (!target) return;

    if (target.matches("[data-chapter-link]")) {
      closeDrawers({ restoreFocus: false });
      if (target.hash === location.hash) {
        event.preventDefault();
        writeScrollPosition(0);
      }
      return;
    }

    if (target.matches("[data-section-link]")) {
      closeDrawers({ restoreFocus: false });
      if (target.hash === location.hash) {
        event.preventDefault();
        scrollToSection(target.dataset.sectionLink);
      }
      return;
    }

    const { action } = target.dataset;
    if (action === "open-courses") {
      setDrawer(openDrawer === "courses" ? null : "courses", target);
    } else if (action === "open-toc") {
      setDrawer(openDrawer === "toc" ? null : "toc", target);
    } else if (action === "close-drawers") {
      closeDrawers();
    } else if (action === "clear-search") {
      elements.searchInput.value = "";
      renderCourseNavigation();
      elements.searchInput.focus();
    } else if (action === "set-mode") {
      const nextMode = target.dataset.mode;
      if (nextMode === state.mode) return;

      const position = readScrollPosition();
      persist(setMode(state, nextMode));
      const chapter = getChapter(state.currentChapter);
      const sectionVisible = visibleSections(chapter, state.mode).some(
        (section) => section.id === currentSectionId,
      );
      if (currentSectionId && !sectionVisible) {
        currentSectionId = null;
        replaceRoute(chapter.id);
      }
      renderCurrentChapter({
        sectionId: currentSectionId,
        restorePosition: position,
      });
    } else if (action === "toggle-theme") {
      persist(setTheme(state, state.theme === "dark" ? "light" : "dark"));
      applyTheme();
    } else if (action === "toggle-section") {
      const position = readScrollPosition();
      persist(
        toggleSection(
          state,
          target.dataset.chapterId,
          target.dataset.sectionId,
        ),
      );
      renderCurrentChapter({
        sectionId: null,
        restorePosition: position,
      });
    } else if (action === "copy-code") {
      void copyCode(target);
    } else if (action === "retry-render") {
      renderCurrentChapter({
        sectionId: currentSectionId,
        restorePosition: readScrollPosition(),
      });
    }
  });

  elements.searchInput.addEventListener("input", renderCourseNavigation);
  elements.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.searchInput.value) {
      elements.searchInput.value = "";
      renderCourseNavigation();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openDrawer) closeDrawers();
  });
  window.addEventListener("hashchange", () =>
    applyRoute({ focusReader: true }),
  );
  window.addEventListener("pageshow", restoreInitialRoutePosition, {
    once: true,
  });
  window.addEventListener("scroll", scheduleTocHighlight, { passive: true });
  elements.readingPane.addEventListener("scroll", scheduleTocHighlight, {
    passive: true,
  });
  window.addEventListener("resize", () => {
    closeDrawers({ restoreFocus: false });
    scheduleTocHighlight();
  });

  applyTheme();
  applyModeControls();
  if (!location.hash) replaceRoute("00");
  applyRoute();
}

if (typeof document !== "undefined") {
  try {
    initialize();
  } catch (error) {
    console.error("ML Roadmap 启动失败", error);
    const root = document.querySelector("#chapter-root");
    if (root) {
      root.innerHTML =
        `<section class="error-state" role="alert">` +
        `<h1>应用无法启动</h1>` +
        `<p>请刷新页面；若问题持续存在，请检查浏览器控制台。</p>` +
        `</section>`;
    }
  }
}
