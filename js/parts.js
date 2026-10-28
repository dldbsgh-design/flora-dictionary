// Registry of the books on the shelf. Two kinds:
//   PARTS   — word books (entries sorted and paged): one entry here + one JSON array of entries.
//   STUDIES — lesson books (long-form lessons by subject): one entry here + lessons in `data`.
// `color` is the book's cloth colour; it tints the thumb index and marks inside the book.
// `marks` go in the 【 】 bracket before the gloss; `tagKeys` are listed under it (moods link to their page).
// `optional` books may have no data file yet; they stand on the shelf as "준비 중".
export const PARTS = {
  flowers: {
    label: "꽃",
    data: "data/flowers.json",
    color: "#A9465F",
    tabs: [["가나다", "chosung"], ["색", "colors"], ["계절", "seasons"]],
    marks: ["seasons", "colors"],
    tagKeys: ["moods"],
  },
  scents: {
    label: "향",
    data: "data/scents.json",
    color: "#8F6514",
    tabs: [["가나다", "chosung"], ["계열", "family"], ["노트", "notes"]],
    marks: ["family", "notes"],
    tagKeys: ["moods"],
  },
  italian: {
    label: "이탈리아어",
    data: "data/italian.json",
    optional: true,
    collate: "it",
    color: "#2E6E52",
    tabs: [["ABC", "initial"], ["주제", "topics"], ["단계", "level"]],
    marks: ["pos", "gender", "level"],
    tagKeys: ["topics"],
  },
};

export const STUDIES = {
  study: { label: "향 공부", data: "data/lessons.json", subjects: ["향"], color: "#3B6684" },
  music: { label: "음악 공부", data: "data/lessons.json", subjects: ["작곡", "작사", "보컬"], color: "#56497F", routine: true },
  howto: {
    label: "프로그램 사용법", data: "data/howto.json", optional: true, color: "#7D5236",
    subjects: ["캐드", "포토샵", "영상 편집", "작곡 프로그램", "UI/UX 툴"],
  },
  coding: {
    label: "코딩 강의", data: "data/coding.json", optional: true, color: "#3F4B58",
    subjects: ["HTML과 CSS", "자바스크립트", "파이썬"],
  },
};

/** The study book that owns a lesson subject, as its key ("study", "music", …); null if none. */
export function studyOf(subject) {
  return Object.keys(STUDIES).find((k) => STUDIES[k].subjects.includes(subject)) || null;
}
