import { test } from "node:test";
import assert from "node:assert/strict";
import { inline, renderStudyIndex, renderLesson, neighbors } from "../js/study.js";

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
