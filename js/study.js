// Pure rendering for the 향 공부 volume: every function returns an HTML string.
import { esc } from "./render.js";

const MASTHEAD = "STUDY · 향 공부";
const EMPTY = "첫 글을 준비하고 있어요";
const enc = encodeURIComponent;
const lessonHref = (id) => `#/study/${enc(id)}`;
const byNo = (lessons) => [...lessons].sort((a, b) => a.no - b.no);

/** Escape, then turn **bold** into <b> and [[scent-id|label]] into a dictionary link (plain label if unknown). */
export function inline(text, scentIds) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_, id, label) =>
      scentIds.has(id) ? `<a href="#/scents/e/${esc(enc(id))}">${label}</a>` : label);
}

/** The lesson with `id` and its neighbours by `no`; null when no lesson has that id. */
export function neighbors(lessons, id) {
  const sorted = byNo(lessons);
  const i = sorted.findIndex((l) => l.id === id);
  if (i < 0) return null;
  return { lesson: sorted[i], prev: sorted[i - 1] || null, next: sorted[i + 1] || null };
}

export function renderStudyIndex(lessons, stages) {
  const sorted = byNo(lessons);
  const body = stages
    .map((stage) => {
      const items = sorted.filter((l) => l.stage === stage);
      if (!items.length) return "";
      return `<h2 class="vol-head">${esc(stage)}</h2>
  <ol class="lessons">${items.map((l) =>
    `<li><a href="${esc(lessonHref(l.id))}">제${esc(l.no)}강 ${esc(l.title)}</a></li>`).join("")}</ol>`;
    })
    .filter(Boolean)
    .join("\n");
  return `<div class="sheet study">
  <header class="running"><a class="masthead" href="#/">${MASTHEAD}</a><span class="range">목차</span></header>
  <h1 class="section">목차</h1>
  ${body || `<p class="empty">${EMPTY}</p>`}
  <footer class="folio"><a href="#/">← 표지</a><span></span><span></span></footer>
</div>`;
}

function block(b, scentIds) {
  const cites = (b.cites || []).map((n) => `[${esc(n)}]`).join("");
  const sup = cites ? `<sup class="cite">${cites}</sup>` : "";
  return b.type === "analogy"
    ? `<p class="analogy"><span class="as">비유하자면, </span>${inline(b.text, scentIds)}${sup}</p>`
    : `<p>${inline(b.text, scentIds)}${sup}</p>`;
}

export function renderLesson(lesson, { prev, next, needs, scentIds }) {
  const needLine = needs && needs.length
    ? `<p class="needs">먼저 읽으면 좋은 글: ${needs.map((l) =>
      `<a href="${esc(lessonHref(l.id))}">${esc(l.title)}</a>`).join(" · ")}</p>`
    : "";
  const sections = (lesson.sections || []).map((s, i) =>
    `<section>
    <h2>${i + 1}. ${esc(s.heading)}</h2>
    ${(s.blocks || []).map((b) => block(b, scentIds)).join("\n    ")}
  </section>`).join("\n  ");
  const sources = (lesson.sources || []).map((s) =>
    `<li value="${esc(s.n)}">${esc(s.title)} — <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a></li>`).join("");
  return `<div class="sheet study lesson">
  <header class="running">
    <a class="masthead" href="#/study">${MASTHEAD}</a>
    <span class="range">제${esc(lesson.no)}강 · ${esc(lesson.stage)}</span>
  </header>
  <h1 class="section">${esc(lesson.title)}</h1>
  ${needLine}
  ${sections}
  <h3>출처</h3>
  <ol class="sources">${sources}</ol>
  <p class="provenance"><small>쓴 날: ${esc(lesson.written)}<br>확인한 날: ${esc(lesson.checked)}</small></p>
  <footer class="folio">
    ${prev ? `<a href="${esc(lessonHref(prev.id))}" rel="prev">← 이전 글</a>` : "<span></span>"}
    <a href="#/study">목차</a>
    ${next ? `<a href="${esc(lessonHref(next.id))}" rel="next">다음 글 →</a>` : "<span></span>"}
  </footer>
</div>`;
}
