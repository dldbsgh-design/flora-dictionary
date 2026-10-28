// The shelf: new books (이탈리아어, 프로그램 사용법, 코딩 강의), new lesson blocks, and the app icon.
import { test } from "node:test";
import assert from "node:assert/strict";
import { initial, sortBy, groupBy } from "../js/logic.js";
import { PARTS, STUDIES, studyOf } from "../js/parts.js";
import { renderLesson, renderVolumeIndex, inline, vol } from "../js/study.js";
import { validate } from "../scripts/validate.mjs";
import { png, pixel } from "../scripts/make-icons.mjs";

test("initial: first Latin letter, accents folded, anything else is 기타", () => {
  assert.equal(initial("fiore"), "F");
  assert.equal(initial("Èra"), "E");
  assert.equal(initial("città"), "C");
  assert.equal(initial("꽃"), "기타");
  assert.equal(initial(""), "기타");
});

test("sortBy it: Italian collation ignoring case and accents", () => {
  const names = sortBy(["zucca", "Àncora", "albero", "Bello"].map((name) => ({ name })), "it").map((e) => e.name);
  assert.deepEqual(names, ["albero", "Àncora", "Bello", "zucca"]);
});

test("groupBy initial groups words by letter", () => {
  const groups = groupBy([{ name: "fiore" }, { name: "foglia" }, { name: "albero" }], "initial", ["A", "F"]);
  assert.deepEqual(groups.map((g) => [g.label, g.entries.length]), [["A", 1], ["F", 2]]);
});

test("every book has a label, a data file and a cloth colour; subjects belong to one book", () => {
  for (const b of [...Object.values(PARTS), ...Object.values(STUDIES)]) {
    assert.ok(b.label && b.data && /^#[0-9A-F]{6}$/i.test(b.color), b.label);
  }
  const all = Object.values(STUDIES).flatMap((s) => s.subjects);
  assert.equal(new Set(all).size, all.length);
  assert.equal(studyOf("포토샵"), "howto");
  assert.equal(studyOf("파이썬"), "coding");
  assert.equal(studyOf("향"), "study");
  assert.equal(studyOf("없는 과목"), null);
});

const howto = (over = {}) => ({
  id: "ps-layers", no: 1, subject: "포토샵", stage: "입문", title: "레이어", needs: [], version: "Photoshop 2025",
  sections: [{
    heading: "레이어 만들기",
    blocks: [
      { type: "steps", items: ["**레이어** 패널을 엽니다.", "새 레이어 단추를 누릅니다."], cites: [1] },
      { type: "shortcut", keys: "Ctrl+Shift+N", mac: "Cmd+Shift+N", text: "새 레이어", cites: [1] },
      { type: "code", lang: "html", text: "<p>안녕</p>", caption: "`p`는 문단", cites: [1] },
    ],
  }],
  sources: [{ n: 1, url: "https://helpx.adobe.com/photoshop/layers.html", title: "Adobe 도움말" }],
  written: "2026-10-29", checked: "2026-10-29", ...over,
});
const scentIds = new Set();

test("steps render as a numbered list, shortcuts as keys, code escaped in <pre>", () => {
  const html = renderLesson(howto(), { prev: null, next: null, needs: [], scentIds, vol: vol("howto") });
  assert.match(html, /<ol class="steps"><li><b>레이어<\/b> 패널을 엽니다\.<\/li><li>새 레이어 단추를 누릅니다\.<\/li><\/ol><sup class="cite">\[1\]<\/sup>/);
  assert.match(html, /<kbd>Ctrl<\/kbd>\+<kbd>Shift<\/kbd>\+<kbd>N<\/kbd> <span class="mac">맥 <kbd>Cmd<\/kbd>/);
  assert.match(html, /<pre data-lang="html"><code>&lt;p&gt;안녕&lt;\/p&gt;<\/code><\/pre>/);
  assert.match(html, /<figcaption><code>p<\/code>는 문단/);
  assert.match(html, /이 글이 기준으로 삼은 버전: Photoshop 2025/);
  assert.match(html, /href="#\/howto">프로그램 사용법<\/a>/);
  assert.match(html, /포토샵 제1강, 입문/);
});

test("inline turns `code` into <code> after escaping", () => {
  assert.equal(inline("`<a>`", scentIds), "<code>&lt;a&gt;</code>");
});

test("a many-subject book's index groups by subject; empty book says 첫 글을 준비하고 있어요", () => {
  const book = { subjects: STUDIES.howto.subjects, stages: ["입문"], vol: vol("howto") };
  const html = renderVolumeIndex([howto()], book);
  assert.match(html, /<h2 class="vol-head">포토샵<\/h2><h3>입문<\/h3>/);
  assert.match(html, /href="#\/howto\/ps-layers"/);
  assert.doesNotMatch(html, /연습 순서/);
  assert.match(renderVolumeIndex([], book), /첫 글을 준비하고 있어요/);
});

const vocab = {
  colors: [], seasons: [], moods: [], families: [], notes: [], kinds: [],
  stages: ["입문"], subjects: ["향", "포토샵", "파이썬"],
  itPos: ["명사"], itGenders: ["남성", "여성"], itLevels: ["A1"], itTopics: ["자연과 꽃"],
};
const word = (over = {}) => ({
  id: "fiore", name: "fiore", pos: "명사", gender: "남성", level: "A1", meanings: ["꽃"],
  examples: [{ it: "Un fiore.", ko: "꽃 한 송이." }], topics: ["자연과 꽃"], related: [],
  sources: ["https://www.treccani.it/vocabolario/fiore/"], checked: "2026-10-29", ...over,
});
const run = (more) => validate({ flowers: [], scents: [], vocab, ...more });

test("a valid italian word and a valid howto lesson → []", () => {
  assert.deepEqual(run({ italian: [word()], howto: [howto()] }), []);
});

test("italian word checks vocab, meanings, examples, links and provenance", () => {
  const errs = run({ italian: [word({ pos: "동사", gender: "중성", level: "Z9", topics: ["없음"], meanings: [], examples: [{ it: "x" }], related: ["nope"], flowers: ["rosa"], sources: [], checked: "어제" })] });
  for (const bit of ["itPos", "itGenders", "itLevels", "itTopics", "meanings", "example", "related", "flower", "sources", "checked"]) {
    assert.ok(errs.some((e) => e.includes(bit)), bit);
  }
  assert.ok(run({ italian: [word({ id: "Città" })] }).some((e) => e.includes("slug")));
  assert.ok(run({ italian: [word(), word()] }).some((e) => e.includes("duplicate")));
});

test("lesson subjects must belong to the file they are in", () => {
  assert.ok(run({ howto: [howto({ subject: "파이썬" })] }).some((e) => e.includes("data/howto.json")));
  assert.ok(run({ coding: [howto({ subject: "포토샵" })] }).some((e) => e.includes("data/coding.json")));
});

test("lesson ids are unique across lessons.json, howto.json and coding.json", () => {
  const scent = { ...howto({ subject: "향" }), id: "ps-layers" };
  assert.ok(run({ lessons: [scent], howto: [howto()] }).some((e) => e.includes("duplicate lesson id")));
});

test("new blocks are checked: empty steps, keyless shortcut, langless code, odd backticks", () => {
  const with1 = (b) => run({ howto: [howto({ sections: [{ heading: "h", blocks: [b] }] })] });
  assert.ok(with1({ type: "steps", items: [], cites: [1] }).some((e) => e.includes("no items")));
  assert.ok(with1({ type: "shortcut", text: "새 레이어", cites: [1] }).some((e) => e.includes("no keys")));
  assert.ok(with1({ type: "code", text: "x", cites: [1] }).some((e) => e.includes("no lang")));
  assert.ok(with1({ type: "p", text: "`a", cites: [1] }).some((e) => e.includes("malformed")));
  assert.deepEqual(with1({ type: "code", lang: "py", text: "print(1)" }).filter((e) => !e.includes("never cited")), []);
});

test("icon: a valid PNG, cloth corners, a spine above the shelf", () => {
  const buf = png(32);
  assert.deepEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(buf.readUInt32BE(16), 32);
  assert.deepEqual(pixel(0, 0, 100), [0x27, 0x35, 0x52]);
  assert.deepEqual(pixel(27, 60, 100), [0xa9, 0x46, 0x5f]);
});
