import chapter00 from "./chapter-00.js";
import chapter01 from "./chapter-01.js";
import chapter02 from "./chapter-02.js";
import chapter03 from "./chapter-03.js";
import chapter04 from "./chapter-04.js";

export const CHAPTERS = Object.freeze([
  chapter00,
  chapter01,
  chapter02,
  chapter03,
  chapter04,
]);

export function getChapter(idOrSlug) {
  return CHAPTERS.find(
    (chapter) => chapter.id === idOrSlug || chapter.slug === idOrSlug,
  );
}

export function getParts() {
  return CHAPTERS.reduce((parts, chapter) => {
    const existing = parts.find((part) => part.name === chapter.part);
    if (existing) {
      existing.chapters.push(chapter);
    } else {
      parts.push({ name: chapter.part, chapters: [chapter] });
    }
    return parts;
  }, []);
}
