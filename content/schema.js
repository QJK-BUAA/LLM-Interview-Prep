export const REQUIRED_SECTION_TYPES = Object.freeze([
  "roadmap",
  "intuition",
  "example",
  "diagram",
  "derivation",
  "code",
  "pitfall",
  "comparison",
  "interview",
  "quiz",
]);

export const SECTION_LABELS = Object.freeze({
  roadmap: "路线",
  intuition: "直觉",
  example: "手算",
  diagram: "机制",
  derivation: "推导",
  code: "代码",
  pitfall: "误区",
  comparison: "对比",
  interview: "面试",
  quiz: "练习",
});

const REQUIRED_TEXT_FIELDS = [
  "id",
  "slug",
  "part",
  "title",
  "subtitle",
  "level",
  "summary",
];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateDiagram(section, errors) {
  const { diagram } = section;
  if (!diagram || typeof diagram !== "object") {
    errors.push("diagram section requires a diagram object");
    return;
  }

  if (!isNonEmptyString(diagram.kind)) {
    errors.push("diagram kind must be a non-empty string");
  }

  if (!Array.isArray(diagram.nodes) || diagram.nodes.length < 2) {
    errors.push("diagram requires at least 2 nodes");
    return;
  }

  if (diagram.nodes.some((node) => !isNonEmptyString(String(node)))) {
    errors.push("diagram nodes must be non-empty");
  }

  if (!Array.isArray(diagram.links)) {
    errors.push("diagram links must be an array");
    return;
  }

  for (const link of diagram.links) {
    const valid =
      Array.isArray(link) &&
      link.length === 2 &&
      link.every(
        (index) =>
          Number.isInteger(index) && index >= 0 && index < diagram.nodes.length,
      );
    if (!valid) {
      errors.push("diagram link points outside its node list");
      break;
    }
  }
}

export function validateChapter(chapter) {
  const errors = [];

  if (!chapter || typeof chapter !== "object") {
    return ["chapter must be an object"];
  }

  for (const field of REQUIRED_TEXT_FIELDS) {
    if (!isNonEmptyString(chapter[field])) {
      errors.push(`${field} must be a non-empty string`);
    }
  }

  if (!/^\d{2}$/.test(chapter.id ?? "")) {
    errors.push("id must contain exactly two digits");
  }

  if (!Number.isFinite(chapter.duration) || chapter.duration <= 0) {
    errors.push("duration must be a positive number");
  }

  for (const field of ["prerequisites", "tags", "objectives", "sources"]) {
    if (!Array.isArray(chapter[field]) || chapter[field].length === 0) {
      if (field === "prerequisites" && chapter.id === "00") continue;
      errors.push(`${field} must be a non-empty array`);
    }
  }

  if (!Array.isArray(chapter.sections)) {
    errors.push("sections must be an array");
    return errors;
  }

  const sectionIds = new Set();
  const types = new Set();
  for (const section of chapter.sections) {
    if (!section || typeof section !== "object") {
      errors.push("every section must be an object");
      continue;
    }
    if (!isNonEmptyString(section.id)) {
      errors.push("section id must be a non-empty string");
    } else if (sectionIds.has(section.id)) {
      errors.push(`duplicate section id: ${section.id}`);
    } else {
      sectionIds.add(section.id);
    }

    if (!isNonEmptyString(section.type)) {
      errors.push(`section ${section.id ?? "unknown"} requires a type`);
    } else {
      types.add(section.type);
    }

    if (!isNonEmptyString(section.title)) {
      errors.push(`section ${section.id ?? "unknown"} requires a title`);
    }
    if (!isNonEmptyString(section.body)) {
      errors.push(`section ${section.id ?? "unknown"} requires body text`);
    }

    if (section.type === "diagram") {
      validateDiagram(section, errors);
    }
    if (
      section.type === "quiz" &&
      (!Array.isArray(section.questions) || section.questions.length < 3)
    ) {
      errors.push("quiz section requires at least 3 questions");
    }
    if (section.type === "quiz" && Array.isArray(section.questions)) {
      if (
        section.questions.some(
          (item) => !isNonEmptyString(item?.q) || !isNonEmptyString(item?.a),
        )
      ) {
        errors.push("quiz questions require non-empty q and a values");
      }
    }
  }

  for (const type of REQUIRED_SECTION_TYPES) {
    if (!types.has(type)) {
      errors.push(`missing required section type: ${type}`);
    }
  }

  const whiteboard = chapter.sections.find(section => section?.id === "whiteboard");
  if (whiteboard?.type !== "quiz" ||
      !Array.isArray(whiteboard.questions) || whiteboard.questions.length < 3 ||
      !whiteboard.questions.every(question =>
        isNonEmptyString(question?.a) && question.a.includes("得分点"))) {
    errors.push("whiteboard requires at least 3 worked questions with 得分点");
  }

  for (const section of chapter.sections) {
    if (section?.type !== "roadmap") continue;
    if (!Array.isArray(section.links) || section.links.length < 3) {
      errors.push("roadmap requires at least 3 learning links");
      continue;
    }
    for (const link of section.links) {
      if (!isNonEmptyString(link?.label) ||
          !sectionIds.has(link?.sectionId) ||
          link.sectionId === section.id ||
          !["必会", "推导", "进阶"].includes(link?.level)) {
        errors.push(`invalid roadmap link: ${link?.sectionId ?? ""}`);
      }
    }
  }

  if (Array.isArray(chapter.sources)) {
    for (const source of chapter.sources) {
      if (!isNonEmptyString(source?.label)) {
        errors.push("source label must be a non-empty string");
      }
      if (!isHttpUrl(source?.url)) {
        errors.push(`invalid source URL: ${source?.url ?? ""}`);
      }
      if (!isNonEmptyString(source?.evidence)) {
        errors.push("source evidence must be a non-empty string");
      }
    }
  }

  return errors;
}
