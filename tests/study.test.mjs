import { test } from "node:test";
import assert from "node:assert/strict";
import { inline, renderStudyIndex, renderLesson, neighbors, renderMusicIndex, renderRoutine, SCENT, MUSIC } from "../js/study.js";

const stages = ["입문", "기초", "중급", "심화", "전문"];
const scentIds = new Set(["calone"]);

const lesson = (over = {}) => ({
  id: "l1", no: 1, stage: "입문", title: "향수는 무엇으로 이루어지나", needs: [],
  sections: [
    { heading: "향료", blocks: [{ type: "p", text: "본문", cites: [1, 2] }] },
    { heading: "용매", blocks: [{ type: "analogy", text: "공연의 첫 소절", cites: [1] }] },
  ],
  sources: [{ n: 1, url: "https://a.com/x", title: "자료 A" }, { n: 2, url: "https://b.org/y", title: "자료 B" }],
  written: "2026-10-23", checked: "2026-10-24", ...over,
});
const opts = (over = {}) => ({ prev: null, next: null, needs: [], scentIds, ...over });

test("inline escapes html and only converts ** and [[ ]]", () => {
  assert.equal(inline("<b>&", scentIds), "&lt;b&gt;&amp;");
  assert.equal(inline("**용어**", scentIds), "<b>용어</b>");
});

test("inline links known scent, plain label for unknown", () => {
  assert.match(inline("[[calone|칼론]]", scentIds), /<a href="#\/scents\/e\/calone">칼론<\/a>/);
  const plain = inline("[[nope|라벨]]", scentIds);
  assert.equal(plain, "라벨");
});

test("analogy block is prefixed 비유하자면", () => {
  assert.match(renderLesson(lesson(), opts()), /<p class="analogy"><span class="as">비유하자면, <\/span>공연의 첫 소절/);
});

test("cites render as [n] superscripts", () => {
  assert.match(renderLesson(lesson(), opts()), /<sup class="cite">\[1\]\[2\]<\/sup>/);
});

test("sections are numbered 1., 2.", () => {
  const html = renderLesson(lesson(), opts());
  assert.match(html, /<h2>1\. 향료<\/h2>/);
  assert.match(html, /<h2>2\. 용매<\/h2>/);
});

test("lesson shows header, sources and dates", () => {
  const html = renderLesson(lesson(), opts());
  assert.match(html, /제1강 · 입문/);
  assert.match(html, /<h3>출처<\/h3>/);
  assert.match(html, /href="https:\/\/a\.com\/x" target="_blank" rel="noopener"/);
  assert.match(html, /쓴 날: 2026-10-23/);
  assert.match(html, /확인한 날: 2026-10-24/);
});

test("first lesson has no 이전 글, last has no 다음 글", () => {
  const l2 = lesson({ id: "l2", no: 2, title: "노트" });
  const first = renderLesson(lesson(), opts({ next: l2 }));
  assert.doesNotMatch(first, /이전 글/);
  assert.match(first, /href="#\/study\/l2"[^>]*>다음 글 →/);
  const last = renderLesson(l2, opts({ prev: lesson() }));
  assert.doesNotMatch(last, /다음 글/);
  assert.match(last, /← 이전 글/);
  assert.match(last, /href="#\/study">목차/);
});

test("needs line lists earlier lessons", () => {
  const html = renderLesson(lesson({ id: "l2", no: 2 }), opts({ needs: [lesson()] }));
  assert.match(html, /먼저 읽으면 좋은 글: <a href="#\/study\/l1">향수는 무엇으로 이루어지나<\/a>/);
});

test("lesson text is escaped", () => {
  const evil = lesson({ title: "<script>", sections: [{ heading: "<i>", blocks: [{ type: "p", text: "a<b", cites: [1] }] }] });
  const html = renderLesson(evil, opts());
  assert.doesNotMatch(html, /<script>|<i>/);
  assert.match(html, /a&lt;b/);
});

test("index groups by stage order and sorts by no", () => {
  const ls = [lesson({ id: "c", no: 3, stage: "기초", title: "셋" }), lesson({ id: "b", no: 2, title: "둘" }), lesson({ id: "a", no: 1, title: "하나" })];
  const html = renderStudyIndex(ls, stages);
  assert.ok(html.indexOf("입문") < html.indexOf("기초"));
  assert.ok(html.indexOf("제1강 하나") < html.indexOf("제2강 둘"));
  assert.match(html, /href="#\/study\/c"/);
  assert.doesNotMatch(html, /중급/);
});

test("index with no lessons shows 첫 글을 준비하고 있어요", () => {
  assert.match(renderStudyIndex([], stages), /첫 글을 준비하고 있어요/);
});

test("neighbors returns prev/next by no, null for unknown id", () => {
  const ls = [lesson({ id: "b", no: 2 }), lesson({ id: "a", no: 1 }), lesson({ id: "c", no: 3 })];
  const n = neighbors(ls, "b");
  assert.equal(n.lesson.id, "b");
  assert.equal(n.prev.id, "a");
  assert.equal(n.next.id, "c");
  assert.equal(neighbors(ls, "a").prev, null);
  assert.equal(neighbors(ls, "nope"), null);
});

test("music vol links use #/music", () => {
  const l2 = lesson({ id: "c2", no: 2, subject: "작곡" });
  const html = renderLesson(lesson({ subject: "작곡" }), opts({ next: l2, vol: MUSIC }));
  assert.match(html, /href="#\/music">MUSIC · 음악 공부/);
  assert.match(html, /href="#\/music\/c2"/);
  assert.match(html, /href="#\/music">목차/);
  assert.doesNotMatch(html, /#\/study/);
});

test("scent vol default still links #/study", () => {
  assert.equal(SCENT.base, "#/study");
  assert.match(renderLesson(lesson(), opts()), /href="#\/study">STUDY · 향 공부/);
});

test("listen list renders before 출처 with escaped titles", () => {
  const html = renderLesson(lesson({ listen: [{ title: "<재즈>", url: "https://c.org/a", note: "처음 30초" }] }), opts());
  assert.match(html, /<h3>들어 볼 예시<\/h3><ul class="listen"><li><a href="https:\/\/c\.org\/a" target="_blank" rel="noopener">&lt;재즈&gt;<\/a> — 처음 30초<\/li><\/ul>/);
  assert.ok(html.indexOf("들어 볼 예시") < html.indexOf("<h3>출처"));
  assert.doesNotMatch(renderLesson(lesson(), opts()), /들어 볼 예시/);
});

const msubjects = ["작곡", "작사", "보컬"];
test("music index groups by subject then stage and always links the routine", () => {
  const ls = [lesson({ id: "v1", subject: "보컬", title: "목소리" }), lesson({ id: "c1", subject: "작곡", title: "소리" }), lesson({ id: "c2", no: 2, subject: "작곡", stage: "기초", title: "구조" })];
  const html = renderMusicIndex(ls, { subjects: msubjects, stages });
  assert.ok(html.indexOf("작곡") < html.indexOf("보컬"));
  assert.doesNotMatch(html, /<h2 class="vol-head">작사/);
  assert.ok(html.indexOf("<h3>입문") < html.indexOf("<h3>기초"));
  assert.match(html, /href="#\/music\/c1">제1강 소리/);
  assert.match(html, /href="#\/music\/routine">오늘의 연습 순서 →/);
});

test("music index empty shows 첫 글을 준비하고 있어요 and the routine link", () => {
  const html = renderMusicIndex([], { subjects: msubjects, stages });
  assert.match(html, /첫 글을 준비하고 있어요/);
  assert.match(html, /href="#\/music\/routine"/);
});

const slots = ["준비 운동", "호흡", "발성", "음정", "마무리"];
const routine = (over = {}) => ({
  checked: "2026-10-25", minutes: "10–15분",
  cautions: [{ text: "아프면 멈춰요", cites: [1] }],
  steps: [
    { slot: "발성", title: "허밍", how: "입을 닫고", amount: "1분", cites: [1], from: "v1" },
    { slot: "호흡", title: "숨 고르기", how: "천천히", amount: "3번", cites: [1], from: "v1" },
  ],
  sources: [{ n: 1, url: "https://a.com/x", title: "자료" }], ...over,
});
const ropts = { slots, scentIds, lessons: [lesson({ id: "v1", subject: "보컬", title: "목소리가 나는 원리" })] };

test("routine renders slots in vocab order with cautions first", () => {
  const html = renderRoutine(routine(), ropts);
  assert.match(html, /<h1 class="section">오늘의 연습 순서<\/h1>/);
  assert.match(html, /전체 10–15분/);
  assert.ok(html.indexOf("목을 지키는 약속") < html.indexOf("호흡 · 숨 고르기"));
  assert.ok(html.indexOf("호흡 · 숨 고르기") < html.indexOf("발성 · 허밍"));
  assert.match(html, /<p class="amount">3번<\/p>/);
  assert.match(html, /배운 글: <a href="#\/music\/v1">목소리가 나는 원리<\/a>/);
  assert.match(html, /확인한 날: 2026-10-25/);
  assert.match(html, /href="#\/music">← 음악 공부 목차/);
});

test("routine with no steps shows 보컬 첫 글과 함께 연습 순서가 생겨요", () => {
  const html = renderRoutine({ checked: "2026-10-25", minutes: "", cautions: [], steps: [], sources: [] }, ropts);
  assert.match(html, /보컬 첫 글과 함께 연습 순서가 생겨요/);
  assert.doesNotMatch(html, /목을 지키는 약속/);
  assert.doesNotMatch(html, /전체/);
});

test("routine text is escaped", () => {
  const html = renderRoutine(routine({ cautions: [{ text: "<b>x</b>", cites: [1] }], steps: [{ slot: "호흡", title: "<i>", how: "a<b", amount: "<s>", cites: [1], from: "v1" }] }), ropts);
  assert.doesNotMatch(html, /<i>|<s>|<b>x/);
  assert.match(html, /a&lt;b/);
});

test("needs links point to each needed lesson's own volume", () => {
  const scent = lesson({ id: "what-is-perfume", title: "향수" });
  const music = renderLesson(lesson({ id: "c1", subject: "작곡" }), opts({ vol: MUSIC, needs: [scent] }));
  assert.match(music, /먼저 읽으면 좋은 글: <a href="#\/study\/what-is-perfume">향수<\/a>/);
  const vocal = lesson({ id: "v1", subject: "보컬", title: "목소리" });
  const scentPage = renderLesson(lesson({ id: "s2", no: 2 }), opts({ needs: [vocal] }));
  assert.match(scentPage, /<a href="#\/music\/v1">목소리<\/a>/);
});
