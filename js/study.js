// Pure rendering for the study volumes (향 공부, 음악 공부): every function returns an HTML string.
import { esc } from "./render.js";

export const SCENT = { base: "#/study", masthead: "STUDY · 향 공부" };
export const MUSIC = { base: "#/music", masthead: "MUSIC · 음악 공부" };
const EMPTY = "첫 글을 준비하고 있어요";
const NO_ROUTINE = "보컬 첫 글과 함께 연습 순서가 생겨요";
const enc = encodeURIComponent;
const lessonHref = (vol, id) => `${vol.base}/${enc(id)}`;
const byNo = (lessons) => [...lessons].sort((a, b) => a.no - b.no);
const cite = (cites) => {
  const marks = (cites || []).map((n) => `[${esc(n)}]`).join("");
  return marks ? `<sup class="cite">${marks}</sup>` : "";
};

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

function lessonList(items, vol) {
  return `<ol class="lessons">${byNo(items).map((l) =>
    `<li><a href="${esc(lessonHref(vol, l.id))}">제${esc(l.no)}강 ${esc(l.title)}</a></li>`).join("")}</ol>`;
}

function sourceList(sources) {
  return `<ol class="sources">${(sources || []).map((s) =>
    `<li value="${esc(s.n)}">${esc(s.title)} — <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a></li>`).join("")}</ol>`;
}

export function renderStudyIndex(lessons, stages, vol = SCENT) {
  const body = stages
    .map((stage) => {
      const items = lessons.filter((l) => l.stage === stage);
      return items.length ? `<h2 class="vol-head">${esc(stage)}</h2>\n  ${lessonList(items, vol)}` : "";
    })
    .filter(Boolean)
    .join("\n");
  return `<div class="sheet study">
  <header class="running"><a class="masthead" href="#/">${esc(vol.masthead)}</a><span class="range">목차</span></header>
  <h1 class="section">목차</h1>
  ${body || `<p class="empty">${EMPTY}</p>`}
  <footer class="folio"><a href="#/">← 표지</a><span></span><span></span></footer>
</div>`;
}

export function renderMusicIndex(lessons, { subjects, stages }) {
  const routineLink = `<p class="routine-link"><a href="#/music/routine">오늘의 연습 순서 →</a></p>`;
  const body = subjects
    .map((subject) => {
      const mine = lessons.filter((l) => l.subject === subject);
      if (!mine.length) return "";
      const byStage = stages
        .map((stage) => {
          const items = mine.filter((l) => l.stage === stage);
          return items.length ? `<h3>${esc(stage)}</h3>${lessonList(items, MUSIC)}` : "";
        })
        .join("");
      return `<h2 class="vol-head">${esc(subject)}</h2>${byStage}${subject === "보컬" ? routineLink : ""}`;
    })
    .filter(Boolean)
    .join("\n  ");
  const hasVocal = lessons.some((l) => l.subject === "보컬");
  return `<div class="sheet study">
  <header class="running"><a class="masthead" href="#/">${esc(MUSIC.masthead)}</a><span class="range">목차</span></header>
  <h1 class="section">목차</h1>
  ${body || `<p class="empty">${EMPTY}</p>`}
  ${hasVocal ? "" : routineLink}
  <footer class="folio"><a href="#/">← 표지</a><span></span><span></span></footer>
</div>`;
}

function block(b, scentIds) {
  return b.type === "analogy"
    ? `<p class="analogy"><span class="as">비유하자면, </span>${inline(b.text, scentIds)}${cite(b.cites)}</p>`
    : `<p>${inline(b.text, scentIds)}${cite(b.cites)}</p>`;
}

export function renderLesson(lesson, { prev, next, needs, scentIds, vol = SCENT }) {
  const needLine = needs && needs.length
    ? `<p class="needs">먼저 읽으면 좋은 글: ${needs.map((l) =>
      `<a href="${esc(lessonHref(l.subject && l.subject !== "향" ? MUSIC : SCENT, l.id))}">${esc(l.title)}</a>`).join(" · ")}</p>`
    : "";
  const sections = (lesson.sections || []).map((s, i) =>
    `<section>
    <h2>${i + 1}. ${esc(s.heading)}</h2>
    ${(s.blocks || []).map((b) => block(b, scentIds)).join("\n    ")}
  </section>`).join("\n  ");
  const listen = (lesson.listen || []).length
    ? `<h3>들어 볼 예시</h3><ul class="listen">${lesson.listen.map((item) =>
      `<li><a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.title)}</a>${item.note ? ` — ${esc(item.note)}` : ""}</li>`).join("")}</ul>`
    : "";
  return `<div class="sheet study lesson">
  <header class="running">
    <a class="masthead" href="${esc(vol.base)}">${esc(vol.masthead)}</a>
    <span class="range">제${esc(lesson.no)}강 · ${esc(lesson.stage)}</span>
  </header>
  <h1 class="section">${esc(lesson.title)}</h1>
  ${needLine}
  ${sections}
  ${listen}
  <h3>출처</h3>
  ${sourceList(lesson.sources)}
  <p class="provenance"><small>쓴 날: ${esc(lesson.written)}<br>확인한 날: ${esc(lesson.checked)}</small></p>
  <footer class="folio">
    ${prev ? `<a href="${esc(lessonHref(vol, prev.id))}" rel="prev">← 이전 글</a>` : "<span></span>"}
    <a href="${esc(vol.base)}">목차</a>
    ${next ? `<a href="${esc(lessonHref(vol, next.id))}" rel="next">다음 글 →</a>` : "<span></span>"}
  </footer>
</div>`;
}

export function renderRoutine(routine, { slots, scentIds, lessons }) {
  const r = routine || { checked: "", minutes: "", cautions: [], steps: [], sources: [] };
  const steps = [...(r.steps || [])].sort((a, b) => slots.indexOf(a.slot) - slots.indexOf(b.slot));
  const cautions = (r.cautions || []).length
    ? `<div class="cautions"><h2>목을 지키는 약속</h2>${r.cautions.map((c) =>
      `<p>${inline(c.text, scentIds)}${cite(c.cites)}</p>`).join("")}</div>`
    : "";
  const body = steps.length
    ? steps.map((st) => {
      const from = (lessons || []).find((l) => l.id === st.from);
      return `<section class="step">
    <h2>${esc(st.slot)} · ${esc(st.title)}</h2>
    <p>${inline(st.how, scentIds)}${cite(st.cites)}</p>
    <p class="amount">${esc(st.amount)}</p>
    ${from ? `<p class="from">배운 글: <a href="${esc(lessonHref(MUSIC, from.id))}">${esc(from.title)}</a></p>` : ""}
  </section>`;
    }).join("\n  ")
    : `<p class="empty">${NO_ROUTINE}</p>`;
  return `<div class="sheet study lesson routine">
  <header class="running"><a class="masthead" href="#/music">${esc(MUSIC.masthead)}</a><span class="range">보컬</span></header>
  <h1 class="section">오늘의 연습 순서</h1>
  ${String(r.minutes || "").trim() ? `<p class="needs">전체 ${esc(r.minutes)}</p>` : ""}
  ${cautions}
  ${body}
  ${(r.sources || []).length ? `<h3>출처</h3>\n  ${sourceList(r.sources)}` : ""}
  ${r.checked ? `<p class="provenance"><small>확인한 날: ${esc(r.checked)}</small></p>` : ""}
  <footer class="folio"><a href="#/music">← 음악 공부 목차</a><span></span><span></span></footer>
</div>`;
}
