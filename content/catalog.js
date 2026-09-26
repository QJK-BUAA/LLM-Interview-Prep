import chapter00 from "./chapter-00.js";
import chapter01 from "./chapter-01.js";
import chapter02 from "./chapter-02.js";
import chapter03 from "./chapter-03.js";
import chapter04 from "./chapter-04.js";
import chapter05 from "./chapter-05.js";
import chapter06 from "./chapter-06.js";
import chapter07 from "./chapter-07.js";
import chapter08 from "./chapter-08.js";
import chapter09 from "./chapter-09.js";
import chapter10 from "./chapter-10.js";
import chapter11 from "./chapter-11.js";
import chapter12 from "./chapter-12.js";
import chapter13 from "./chapter-13.js";
import chapter14 from "./chapter-14.js";
import chapter15 from "./chapter-15.js";

export const CHAPTERS = Object.freeze([
  chapter00,
  chapter01,
  chapter02,
  chapter03,
  chapter04,
  chapter05,
  chapter06,
  chapter07,
  chapter08,
  chapter09,
  chapter10,
  chapter11,
  chapter12,
  chapter13,
  chapter14,
  chapter15,
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
