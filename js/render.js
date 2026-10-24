// Pure rendering: every function returns an HTML string. No DOM access.
import { meaningVerified, findEntry } from "./logic.js";
import { PARTS } from "./parts.js";

const MASTHEAD = { flowers: "FLORA · 꽃 사전", scents: "ESSENCE · 향 사전" };
const EMPTY_MOOD = "아직 이 단어에 맞는 항목이 없어요";

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

const list = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);
const enc = encodeURIComponent;
const entryHref = (part, id) => `#/${part}/e/${enc(id)}`;

function figure(entry) {
  if (!entry.photo) {
    return `<div class="plate" aria-hidden="true">${esc([...String(entry.name)][0] || "")}</div>`;
  }
  return `<img class="photo" src="${esc(entry.photo.file)}" alt="${esc(entry.name)}" loading="lazy" width="72" height="72">`;
}

function credit(photo) {
  if (!photo) return "";
  return `<a class="credit" href="${esc(photo.source)}" target="_blank" rel="noopener">사진: ${esc(photo.author)} / ${esc(photo.license)}</a>`;
}

function meaningText(m) {
  const flag = meaningVerified(m) ? "" : ` <span class="unverified">확인 필요</span>`;
  return `${esc(m.text)}${flag}`;
}

// One item per distinct text; a verified copy wins over an unverified one.
function dedupeMeanings(meanings) {
  const byText = new Map();
  for (const m of meanings) {
    const prev = byText.get(m.text);
    if (!prev || (!meaningVerified(prev) && meaningVerified(m))) byText.set(m.text, m);
  }
  return [...byText.values()];
}

function tags(entry, part) {
  const out = [];
  for (const key of PARTS[part].tagKeys) {
    for (const v of list(entry[key])) {
      out.push(key === "moods"
        ? `<a class="tag" href="#/mood/${esc(enc(v))}">${esc(v)}</a>`
        : `<span class="tag">${esc(v)}</span>`);
    }
  }
  return out.length ? `<p class="tags">${out.join("")}</p>` : "";
}

function subtitle(entry, part) {
  return part === "flowers" ? entry.latin : entry.nameEn;
}

function akaLine(entry, part) {
  const items = part === "flowers" ? list(entry.aka) : list(entry.material);
  return items.length ? `<p class="aka">${items.map(esc).join(" · ")}</p>` : "";
}

export function renderEntry(entry, part, { showMeanings = true } = {}) {
  const meanings = part === "flowers" && showMeanings ? dedupeMeanings(list(entry.meanings)) : [];
  const meaningLine = meanings.length
    ? `<p class="meaning"><b>꽃말</b> ${meanings.map(meaningText).join(" · ")}</p>`
    : "";
  const blurb = part === "flowers" ? entry.note : entry.description;
  return `<article class="entry">
  <div class="figure">${figure(entry)}</div>
  <div class="body">
    <h2 class="name"><a href="${esc(entryHref(part, entry.id))}">${esc(entry.name)}</a>${subtitle(entry, part) ? ` <i class="latin">${esc(subtitle(entry, part))}</i>` : ""}</h2>
    ${akaLine(entry, part)}
    ${meaningLine}
    ${blurb ? `<p class="note">${esc(blurb)}</p>` : ""}
    ${tags(entry, part)}
    ${credit(entry.photo)}
  </div>
</article>`;
}

function pageLink(text, n, ok, base, rel) {
  return ok
    ? `<a href="${esc(base + n)}" rel="${rel}">${text}</a>`
    : `<a class="off" aria-disabled="true">${text}</a>`;
}

function renderTabs(tabs, activeTab) {
  if (!tabs || !tabs.length) return "";
  const items = tabs.map((t) => {
    const on = t.label === activeTab;
    return `<a class="tab${on ? " on" : ""}" href="${esc(t.href)}"${on ? ` aria-current="page"` : ""}>${esc(t.label)}</a>`;
  });
  return `<nav class="tabs" aria-label="색인">${items.join("")}</nav>`;
}

function renderModes(modes) {
  if (!modes || !modes.length) return "";
  return `<nav class="modes" aria-label="찾아보기">${modes.map((m) =>
    `<a href="${esc(m.href)}"${m.active ? ` class="on" aria-current="page"` : ""}>${esc(m.label)}</a>`).join("")}</nav>`;
}

export function renderPage({ part, title, range, entries, page, pageCount, tabs, activeTab, modes, base }) {
  const b = base || `#/${part}/p/`;
  return `<div class="sheet">
  <header class="running">
    <a class="masthead" href="#/">${esc(MASTHEAD[part] || PARTS[part].label)}</a>
    <span class="range">${esc(range)}</span>
  </header>
  ${renderModes(modes)}
  ${title ? `<h1 class="section">${esc(title)}</h1>` : ""}
  <div class="entries">${entries.length
    ? entries.map((e) => renderEntry(e, part)).join("\n")
    : `<p class="empty">아직 실린 항목이 없어요</p>`}</div>
  <footer class="folio">
    ${pageLink("← 이전 장", page - 1, page > 1, b, "prev")}
    <span class="pno">p. ${esc(page)}</span>
    ${pageLink("다음 장 →", page + 1, page < pageCount, b, "next")}
  </footer>
</div>
${renderTabs(tabs, activeTab)}`;
}

function linkList(heading, ids, part, pool) {
  const found = list(ids).map((id) => findEntry(id, pool)).filter(Boolean);
  if (!found.length) return "";
  return `<h3>${heading}</h3><p class="links">${found.map((e) =>
    `<a href="${esc(entryHref(part, e.id))}">${esc(e.name)}</a>`).join(" · ")}</p>`;
}

function sourceList(urls) {
  return list(urls).map((u) =>
    `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(hostOf(u))}</a>`).join(" · ");
}

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

export function renderDetail(entry, part, data) {
  const own = part === "flowers" ? data.flowers : data.scents;
  const other = part === "flowers" ? "scents" : "flowers";
  const meanings = part === "flowers" ? list(entry.meanings) : [];
  const facts = part === "flowers"
    ? [["과", entry.family], ["원산지", entry.origin]]
    : [["원료", entry.material], ["계열", entry.family], ["구분", entry.kind]];
  return `<div class="sheet detail">
  <header class="running">
    <a class="masthead" href="#/${esc(part)}">${esc(MASTHEAD[part] || PARTS[part].label)}</a>
    <span class="range">${esc(entry.name)}</span>
  </header>
  ${renderEntry(entry, part, { showMeanings: false })}
  <dl class="facts">${facts.filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
  ${meanings.length ? `<h3>꽃말</h3><ul class="meanings">${meanings.map((m) =>
    `<li>${meaningText(m)}${m.region ? ` <span class="region">${esc(m.region)}</span>` : ""}<br><small>${sourceList(m.sources)}</small></li>`).join("")}</ul>` : ""}
  ${linkList("어울리는 짝", entry.pairs, part, own)}
  ${linkList(part === "flowers" ? "이 꽃의 향" : "이 향의 꽃", entry[other], other, data[other])}
  <p class="provenance"><small>출처: ${sourceList(entry.sources)}<br>확인한 날: ${esc(entry.checked)}</small></p>
  <footer class="folio"><a href="#/${esc(part)}">← 목록으로</a><span></span><a href="#/">표지 →</a></footer>
</div>`;
}

export function renderMood(word, { flowers, scents }) {
  const section = (label, items, part) => items.length
    ? `<h2 class="vol-head">${label}</h2><div class="entries">${items.map((e) => renderEntry(e, part)).join("\n")}</div>`
    : "";
  const body = flowers.length || scents.length
    ? section("꽃", flowers, "flowers") + section("향", scents, "scents")
    : `<p class="empty">${EMPTY_MOOD}</p>`;
  return `<div class="sheet">
  <header class="running"><a class="masthead" href="#/">FLORA · ESSENCE</a><span class="range">분위기</span></header>
  <h1 class="section">${esc(word)}</h1>
  ${body}
  <footer class="folio"><a href="#/">← 표지</a><span></span><span></span></footer>
</div>`;
}

export function renderCover(moods) {
  const words = list(moods).map((m) => `<a href="#/mood/${esc(enc(m))}">${esc(m)}</a>`).join("");
  return `<div class="sheet cover">
  <header class="running"><span class="masthead">FLORA · ESSENCE</span><span class="range">제1판</span></header>
  <h1 class="title">꽃과 향의 사전</h1>
  <p class="lede">이름, 꽃말, 어울리는 향을 종이 사전처럼 넘겨 보세요.</p>
  <div class="volumes">
    <a class="volume" href="#/flowers"><span class="vol-no">제1권</span><span class="vol-title">꽃</span><span class="vol-sub">FLORA</span></a>
    <a class="volume" href="#/scents"><span class="vol-no">제2권</span><span class="vol-title">향</span><span class="vol-sub">ESSENCE</span></a>
    <a class="volume" href="#/study"><span class="vol-no">제3권</span><span class="vol-title">향 공부</span><span class="vol-sub">STUDY</span></a>
    <a class="volume" href="#/music"><span class="vol-no">제4권</span><span class="vol-title">음악 공부</span><span class="vol-sub">MUSIC</span></a>
  </div>
  <h2 class="vol-head">분위기로 찾기</h2>
  <p class="moods">${words}</p>
  <p class="soon">더 많은 파트는 곧</p>
</div>`;
}

export function renderNotFound() {
  return `<div class="sheet notfound">
  <header class="running"><a class="masthead" href="#/">FLORA · ESSENCE</a><span class="range">—</span></header>
  <h1 class="section">찾을 수 없어요</h1>
  <p class="empty">주소가 가리키는 장이 이 사전에 없어요.</p>
  <p><a href="#/">표지로 돌아가기</a></p>
</div>`;
}
