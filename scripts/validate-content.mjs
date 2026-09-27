import { CHAPTERS } from "../content/catalog.js";
import { SOURCE_DOCUMENTS, validateSourceManifest } from "../content/source-manifest.js";
import {
  REQUIRED_SECTION_TYPES,
  validateChapter,
} from "../content/schema.js";

function parseRange(argv) {
  const index = argv.indexOf("--range");
  if (index === -1) return null;
  const value = argv[index + 1];
  if (!/^\d{2}-\d{2}$/.test(value ?? "")) {
    throw new Error("--range must look like 00-04");
  }
  const [start, end] = value.split("-");
  if (start > end || Number(end) > 29) throw new Error("--range must be ordered within 00-29");
  return { start, end };
}

function countChineseCharacters(value) {
  return (value.match(/[\u3400-\u9fff]/g) ?? []).length;
}

function validateCatalog(chapters, { partial }) {
  const errors = [];
  const ids = chapters.map((chapter) => chapter.id);
  const slugs = chapters.map((chapter) => chapter.slug);
  const knownIds = new Set(CHAPTERS.map((chapter) => chapter.id));

  if (!partial) {
    const expected = Array.from({ length: 30 }, (_, index) =>
      String(index).padStart(2, "0"),
    );
    if (JSON.stringify(ids) !== JSON.stringify(expected)) {
      errors.push(
        `catalog ids must be 00-29 in order; received ${ids.join(", ")}`,
      );
    }
  }

  if (new Set(ids).size !== ids.length) {
    errors.push("catalog contains duplicate chapter ids");
  }
  if (new Set(slugs).size !== slugs.length) {
    errors.push("catalog contains duplicate chapter slugs");
  }

  for (const chapter of chapters) {
    for (const error of validateChapter(chapter)) {
      errors.push(`${chapter.id}: ${error}`);
    }

    const serialized = JSON.stringify(chapter);
    if (chapter.objectives.length < 3 || chapter.objectives.length > 5) {
      errors.push(`${chapter.id}: requires 3–5 learning objectives`);
    }
    if (!chapter.sections.some(section => section.type === "code" && /~~~[\w-]*\n[\s\S]+?~~~/.test(section.body))) {
      errors.push(`${chapter.id}: missing substantive fenced code`);
    }
    if (chapter.sections.length !== REQUIRED_SECTION_TYPES.length ||
        new Set(chapter.sections.map(section => section.type)).size !== REQUIRED_SECTION_TYPES.length) {
      errors.push(`${chapter.id}: requires exactly nine distinct teaching sections`);
    }
    if (/\b(?:TBD|TODO)\b/i.test(serialized)) {
      errors.push(`${chapter.id}: contains a placeholder marker`);
    }
    const chineseCharacters = countChineseCharacters(serialized);
    if (chineseCharacters < 1800) {
      errors.push(
        `${chapter.id}: requires 1800 Chinese characters, found ${chineseCharacters}`,
      );
    }

    for (const prerequisite of chapter.prerequisites) {
      if (!knownIds.has(prerequisite)) {
        errors.push(
          `${chapter.id}: unresolved prerequisite chapter ${prerequisite}`,
        );
      } else if (Number(prerequisite) >= Number(chapter.id)) {
        errors.push(`${chapter.id}: prerequisite ${prerequisite} must occur earlier`);
      }
    }
  }

  if (!partial) {
    errors.push(...validateSourceManifest(chapters));
    const allText = chapters.flatMap(chapter => chapter.sections.map(section => section.body)).join("\n").normalize("NFKC").toLowerCase();
    for (const term of ["OPD", "OPSD", "SAPO", "VAPO", "CISPO", "GSPO", "DeepSeek", "Kimi", "GLM-5", "TITO", "Agentic RL", "SeeUPO", "EMPO", "IGPO", "GiGPO", "ELPO", "ProxMO"]) {
      if (!allText.includes(term.normalize("NFKC").toLowerCase())) {
        errors.push(`${term.toUpperCase()} coverage: FAIL`);
      }
    }
  }

  return errors;
}

let range;
try {
  range = parseRange(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const selected = range
  ? CHAPTERS.filter(
      (chapter) => chapter.id >= range.start && chapter.id <= range.end,
    )
  : CHAPTERS;

const errors = validateCatalog(selected, { partial: Boolean(range) });
if (selected.length === 0) errors.push("no chapters selected");
if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

const sectionCount = selected.reduce(
  (sum, chapter) =>
    sum +
    chapter.sections.filter((section) =>
      REQUIRED_SECTION_TYPES.includes(section.type),
    ).length,
  0,
);

if (range) {
  console.log(
    `${selected.length} chapters validated (range ${range.start}-${range.end})`,
  );
} else {
  console.log(`${selected.length} chapters validated`);
  console.log(`${sectionCount} required teaching sections present`);
  console.log("0 duplicate ids");
  console.log("0 unresolved prerequisites");
  console.log("OPD coverage: PASS");
  console.log("OPSD coverage: PASS");
  console.log(`${SOURCE_DOCUMENTS.length} frozen source documents mapped to lesson bodies`);
}
