// Pure rendering for the lesson books (향 공부, 음악 공부, 프로그램 사용법, 코딩 강의): every function returns an HTML string.
import { esc, runningHead } from "./render.js";
import { STUDIES, studyOf } from "./parts.js";

/** A lesson book's address and name; `vol(key)` for any key in STUDIES. */
export const vol = (key) => ({ key, base: `#/${key}`, label: STUDIES[key].label });
export const SCENT = vol("study");
export const MUSIC = vol("music");
const EMPTY = "첫 글을 준비하고 있어요";
const NO_ROUTINE = "보컬 첫 글과 함께 연습 순서가 생겨요";
const enc = encodeURIComponent;
const lessonHref = (v, id) => `${v.base}/${enc(id)}`;
// A lesson's own book, found from its subject; lessons without a subject belong to 향 공부.
const volOfLesson = (l) => vol(studyOf(l.subject) || "study");
const byNo = (lessons) => [...lessons].sort((a, b) => a.no - b.no);
const cite = (cites) => {
  const marks = (cites || []).map((n) => `[${esc(n)}]`).join("");
  return marks ? `<sup class="cite">${marks}</sup>` : "";
};

/** Escape, then turn **bold** into <b>, `code` into <code>, and [[scent-id|label]] into a dictionary link (plain label if unknown). */
export function inline(text, scentIds) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
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

function lessonList(items, v) {
  return `<ol class="lessons">${byNo(items).map((l) =>
    `<li><a href="${esc(lessonHref(v, l.id))}"><span class="lno">제${esc(l.no)}강</span> ${esc(l.title)}</a></li>`).join("")}</ol>`;
}

function sourceList(sources) {
  return `<ol class="sources">${(sources || []).map((s) =>
    `<li value="${esc(s.n)}">${esc(s.title)} — <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a></li>`).join("")}</ol>`;
}

function indexSheet(v, body, extra = "") {
  return `<div class="sheet study">
  ${runningHead(v.label, "#/", "목차")}
  <h1 class="section">목차</h1>
  ${body || `<p class="empty">${EMPTY}</p>`}
  ${extra}
  <footer class="folio"><a href="#/">책장으로</a><span></span><span></span></footer>
</div>`;
}

function byStage(items, stages, v, tag) {
  return stages
    .map((stage) => {
      const mine = items.filter((l) => l.stage === stage);
      return mine.length ? `<${tag}${tag === "h2" ? ` class="vol-head"` : ""}>${esc(stage)}</${tag}>${lessonList(mine, v)}` : "";
    })
    .filter(Boolean)
    .join("\n  ");
}

/**
 * Table of contents of any lesson book: by stage when the book has one subject,
 * by subject then stage when it has several. `routine` adds the vocal practice link.
 */
export function renderVolumeIndex(lessons, { subjects, stages, vol: v, routine = false }) {
  const routineLink = `<p class="routine-link"><a href="${esc(v.base)}/routine">오늘의 연습 순서</a></p>`;
  if (subjects.length <= 1) return indexSheet(v, byStage(lessons, stages, v, "h2"));
  const body = subjects
    .map((subject) => {
      const mine = lessons.filter((l) => l.subject === subject);
      if (!mine.length) return "";
      return `<h2 class="vol-head">${esc(subject)}</h2>${byStage(mine, stages, v, "h3")}${routine && subject === "보컬" ? routineLink : ""}`;
    })
    .filter(Boolean)
    .join("\n  ");
  const hasVocal = lessons.some((l) => l.subject === "보컬");
  return indexSheet(v, body, routine && !hasVocal ? routineLink : "");
}

export function renderStudyIndex(lessons, stages, v = SCENT) {
  return renderVolumeIndex(lessons, { subjects: STUDIES[v.key].subjects, stages, vol: v });
}

export function renderMusicIndex(lessons, { subjects, stages }) {
  return renderVolumeIndex(lessons, { subjects, stages, vol: MUSIC, routine: true });
}

function keys(combo) {
  return String(combo ?? "").split("+").map((k) => `<kbd>${esc(k.trim())}</kbd>`).join("+");
}

function block(b, scentIds) {
  if (b.type === "analogy") {
    return `<p class="analogy"><span class="as">비유하자면, </span>${inline(b.text, scentIds)}${cite(b.cites)}</p>`;
  }
  if (b.type === "steps") {
    return `<ol class="steps">${(b.items || []).map((t) => `<li>${inline(t, scentIds)}</li>`).join("")}</ol>${cite(b.cites)}`;
  }
  if (b.type === "shortcut") {
    const mac = b.mac ? ` <span class="mac">맥 ${keys(b.mac)}</span>` : "";
    return `<p class="shortcut"><span class="combo">${keys(b.keys)}${mac}</span> ${inline(b.text, scentIds)}${cite(b.cites)}</p>`;
  }
  if (b.type === "code") {
    return `<figure class="code"><pre data-lang="${esc(b.lang)}"><code>${esc(b.text)}</code></pre>${b.caption ? `<figcaption>${inline(b.caption, scentIds)}${cite(b.cites)}</figcaption>` : cite(b.cites)}</figure>`;
  }
  return `<p>${inline(b.text, scentIds)}${cite(b.cites)}</p>`;
}

export function renderLesson(lesson, { prev, next, needs, scentIds, vol: v = SCENT }) {
  const needLine = needs && needs.length
    ? `<p class="needs">먼저 읽으면 좋은 글: ${needs.map((l) =>
      `<a href="${esc(lessonHref(volOfLesson(l), l.id))}">${esc(l.title)}</a>`).join(", ")}</p>`
    : "";
  const version = lesson.version ? `<p class="needs">이 글이 기준으로 삼은 버전: ${esc(lesson.version)}</p>` : "";
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
  ${runningHead(v.label, v.base, `${lesson.subject && STUDIES[v.key].subjects.length > 1 ? `${lesson.subject} ` : ""}제${lesson.no}강, ${lesson.stage}`)}
  <h1 class="section">${esc(lesson.title)}</h1>
  ${needLine}
  ${version}
  ${sections}
  ${listen}
  <h3>출처</h3>
  ${sourceList(lesson.sources)}
  <p class="provenance"><small>쓴 날: ${esc(lesson.written)}<br>확인한 날: ${esc(lesson.checked)}</small></p>
  <footer class="folio">
    ${prev ? `<a href="${esc(lessonHref(v, prev.id))}" rel="prev">이전 글</a>` : "<span></span>"}
    <a href="${esc(v.base)}">목차</a>
    ${next ? `<a href="${esc(lessonHref(v, next.id))}" rel="next">다음 글</a>` : "<span></span>"}
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
    <h2>${esc(st.slot)}: ${esc(st.title)}</h2>
    <p>${inline(st.how, scentIds)}${cite(st.cites)}</p>
    <p class="amount">${esc(st.amount)}</p>
    ${from ? `<p class="from">배운 글: <a href="${esc(lessonHref(MUSIC, from.id))}">${esc(from.title)}</a></p>` : ""}
  </section>`;
    }).join("\n  ")
    : `<p class="empty">${NO_ROUTINE}</p>`;
  return `<div class="sheet study lesson routine">
  ${runningHead(MUSIC.label, MUSIC.base, "보컬")}
  <h1 class="section">오늘의 연습 순서</h1>
  ${String(r.minutes || "").trim() ? `<p class="needs">전체 ${esc(r.minutes)}</p>` : ""}
  ${cautions}
  ${body}
  ${(r.sources || []).length ? `<h3>출처</h3>\n  ${sourceList(r.sources)}` : ""}
  ${r.checked ? `<p class="provenance"><small>확인한 날: ${esc(r.checked)}</small></p>` : ""}
  <footer class="folio"><a href="#/music">음악 공부 목차</a><span></span><span></span></footer>
</div>`;
}
