// Pure rendering: every function returns an HTML string. No DOM access.
import { meaningVerified, findEntry } from "./logic.js";
import { PARTS } from "./parts.js";

const SITE = "포트폴리오";
const EMPTY_MOOD = "아직 이 단어에 맞는 항목이 없어요";
const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

const list = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);
const enc = encodeURIComponent;
const entryHref = (part, id) => `#/${part}/e/${enc(id)}`;
const labelOf = (part) => (PARTS[part] ? PARTS[part].label : part);

/** Dictionary-style sense numbers: ① ② … then (21) (22) … */
export function numbered(items) {
  return items.map((html, i) => `<i class="no">${CIRCLED[i] || `(${i + 1})`}</i>${html}`).join(" ");
}

function figure(entry, part) {
  if (part === "italian") return "";
  if (!entry.photo) {
    return `<div class="figure"><div class="plate" aria-hidden="true">${esc([...String(entry.name)][0] || "")}</div></div>`;
  }
  return `<div class="figure"><img class="photo" src="${esc(entry.photo.file)}" alt="${esc(entry.name)}" loading="lazy" width="64" height="64"></div>`;
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

function bracket(entry, part) {
  const words = (PARTS[part].marks || []).flatMap((k) => list(entry[k]));
  return words.length ? `<span class="br">【${words.map(esc).join(", ")}】</span> ` : "";
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
  if (part === "flowers") return entry.latin;
  if (part === "scents") return entry.nameEn;
  return [entry.ipa ? `[${entry.ipa}]` : "", entry.say].filter(Boolean).join(" ");
}

function akaLine(entry, part) {
  const items = part === "flowers" ? list(entry.aka)
    : part === "scents" ? list(entry.material)
      : entry.plural ? [`복수형 ${entry.plural}`] : [];
  return items.length ? `<p class="aka">${items.map(esc).join(", ")}</p>` : "";
}

function example(ex) {
  return `<i lang="it">${esc(ex.it)}</i> ${esc(ex.ko)}`;
}

function gloss(entry, part) {
  if (part === "italian") {
    return `<p class="gloss">${bracket(entry, part)}${numbered(list(entry.meanings).map(esc))}</p>`;
  }
  const blurb = part === "flowers" ? entry.note : entry.description;
  const mark = bracket(entry, part);
  return mark || blurb ? `<p class="gloss">${mark}${esc(blurb)}</p>` : "";
}

export function renderEntry(entry, part, { showMeanings = true } = {}) {
  const meanings = part === "flowers" && showMeanings ? dedupeMeanings(list(entry.meanings)) : [];
  const meaningLine = meanings.length
    ? `<p class="meaning"><b>꽃말</b> ${numbered(meanings.map(meaningText))}</p>`
    : "";
  const ex = part === "italian" && showMeanings && list(entry.examples)[0];
  const sub = subtitle(entry, part);
  return `<article class="entry${part === "italian" ? " word" : ""}">
  <div class="body">
    <h2 class="name"><a href="${esc(entryHref(part, entry.id))}"${part === "italian" ? ` lang="it"` : ""}>${esc(entry.name)}</a>${sub ? ` <i class="latin">${esc(sub)}</i>` : ""}</h2>
    ${akaLine(entry, part)}
    ${gloss(entry, part)}
    ${meaningLine}
    ${ex ? `<p class="example">${example(ex)}</p>` : ""}
    ${tags(entry, part)}
    ${credit(entry.photo)}
  </div>
  ${figure(entry, part)}
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

/** Running head: the book's name on the left (links to `href`), the page's span on the right. */
export function runningHead(label, href, range) {
  return `<header class="running">
    <a class="masthead" href="${esc(href)}">${esc(label)}</a>
    <span class="range">${esc(range)}</span>
  </header>`;
}

export function renderPage({ part, title, range, entries, page, pageCount, tabs, activeTab, modes, base }) {
  const b = base || `#/${part}/p/`;
  return `<div class="sheet">
  ${runningHead(labelOf(part), "#/", range)}
  ${renderModes(modes)}
  ${title ? `<h1 class="section">${esc(title)}</h1>` : ""}
  <div class="entries">${entries.length
    ? entries.map((e) => renderEntry(e, part)).join("\n")
    : `<p class="empty">아직 실린 항목이 없어요</p>`}</div>
  <footer class="folio">
    ${pageLink("이전 장", page - 1, page > 1, b, "prev")}
    <span class="pno">${esc(page)}</span>
    ${pageLink("다음 장", page + 1, page < pageCount, b, "next")}
  </footer>
</div>
${renderTabs(tabs, activeTab)}`;
}

function linkList(heading, ids, part, pool) {
  const found = list(ids).map((id) => findEntry(id, pool || [])).filter(Boolean);
  if (!found.length) return "";
  return `<h3>${heading}</h3><p class="links">${found.map((e) =>
    `<a href="${esc(entryHref(part, e.id))}">${esc(e.name)}</a>`).join(", ")}</p>`;
}

function sourceList(urls) {
  return list(urls).map((u) =>
    `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(hostOf(u))}</a>`).join(", ");
}

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

function factList(facts) {
  const shown = facts.filter(([, v]) => v);
  return shown.length ? `<dl class="facts">${shown.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : "";
}

function detailBody(entry, part, data) {
  if (part === "italian") {
    const examples = list(entry.examples);
    return `${factList([["품사", entry.pos], ["성", entry.gender], ["복수형", entry.plural], ["단계", entry.level]])}
  ${entry.note ? `<p class="note">${esc(entry.note)}</p>` : ""}
  ${examples.length ? `<h3>예문</h3><ul class="examples">${examples.map((ex) => `<li>${example(ex)}</li>`).join("")}</ul>` : ""}
  ${linkList("함께 보면 좋은 단어", entry.related, part, data.italian)}
  ${linkList("꽃 사전에서", entry.flowers, "flowers", data.flowers)}
  ${linkList("향 사전에서", entry.scents, "scents", data.scents)}`;
  }
  const own = part === "flowers" ? data.flowers : data.scents;
  const other = part === "flowers" ? "scents" : "flowers";
  const meanings = part === "flowers" ? list(entry.meanings) : [];
  const facts = part === "flowers"
    ? [["과", entry.family], ["원산지", entry.origin]]
    : [["원료", entry.material], ["계열", entry.family], ["구분", entry.kind]];
  return `${factList(facts)}
  ${meanings.length ? `<h3>꽃말</h3><ul class="meanings">${meanings.map((m) =>
    `<li>${meaningText(m)}${m.region ? ` <span class="region">${esc(m.region)}</span>` : ""}<br><small>${sourceList(m.sources)}</small></li>`).join("")}</ul>` : ""}
  ${linkList("어울리는 짝", entry.pairs, part, own)}
  ${linkList(part === "flowers" ? "이 꽃의 향" : "이 향의 꽃", entry[other], other, data[other])}`;
}

export function renderDetail(entry, part, data) {
  return `<div class="sheet detail">
  ${runningHead(labelOf(part), `#/${part}`, entry.name)}
  ${renderEntry(entry, part, { showMeanings: false })}
  ${detailBody(entry, part, data)}
  <p class="provenance"><small>출처: ${sourceList(entry.sources)}<br>확인한 날: ${esc(entry.checked)}</small></p>
  <footer class="folio"><a href="#/${esc(part)}">목록으로</a><span></span><a href="#/">책장으로</a></footer>
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
  ${runningHead(SITE, "#/", "분위기")}
  <h1 class="section">${esc(word)}</h1>
  ${body}
  <footer class="folio"><a href="#/">책장으로</a><span></span><span></span></footer>
</div>`;
}

// Spine heights cycle through a fixed, uneven list so the shelf looks hand-filled but never reshuffles.
const HEIGHTS = [92, 86, 100, 96, 89, 94, 84, 98];

/** books: [{ href, label, count, color, empty }] in shelf order. */
export function renderCover(moods, books = []) {
  const spines = books.map((bk, i) => `<a class="spine${bk.empty ? " empty" : ""}" href="${esc(bk.href)}" style="--cloth:${esc(bk.color)};--h:${HEIGHTS[i % HEIGHTS.length]}%">`
    + `<span class="spine-title">${esc(bk.label)}</span><span class="spine-count">${esc(bk.empty ? "준비 중" : bk.count)}</span></a>`).join("");
  const words = list(moods).map((m) => `<a href="#/mood/${esc(enc(m))}">${esc(m)}</a>`).join("");
  return `<div class="sheet cover">
  <h1 class="title">포트폴리오</h1>
  <p class="lede">한 권씩 꺼내 보는 나의 사전</p>
  <nav class="shelf" aria-label="책장">${spines}</nav>
  <h2 class="vol-head">분위기로 찾기</h2>
  <p class="moods">${words}</p>
</div>`;
}

export function renderNotFound() {
  return `<div class="sheet notfound">
  ${runningHead(SITE, "#/", "")}
  <h1 class="section">찾을 수 없어요</h1>
  <p class="empty">주소가 가리키는 장이 이 사전에 없어요.</p>
  <p><a href="#/">책장으로 돌아가기</a></p>
</div>`;
}
