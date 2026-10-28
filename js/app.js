// Browser entry: loads data, parses the hash, writes the rendered page.
import { PARTS, STUDIES } from "./parts.js";
import { chosung, initial, sortBy, sortKo, paginate, groupBy, byMood, findEntry, clampPage } from "./logic.js";
import { renderCover, renderPage, renderDetail, renderMood, renderNotFound } from "./render.js";
import { renderVolumeIndex, renderLesson, renderRoutine, neighbors, vol } from "./study.js";

const PER_PAGE = 4;
const GANADA = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ", "기타"];
const ABC = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "기타"];
const enc = encodeURIComponent;
const SITE = "포트폴리오";
const COVER_CLOTH = "#273552";
const pageNo = (x) => Math.trunc(Number(x)) || 1;
let pageTitle = SITE;
let pageColor = COVER_CLOTH;

const app = document.getElementById("app");
const store = { vocab: {}, lessons: [], routine: null };
Object.keys(PARTS).forEach((k) => { store[k] = []; });

async function getJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

function orderFor(key) {
  const v = store.vocab;
  return {
    chosung: GANADA, initial: ABC, colors: v.colors, seasons: v.seasons, family: v.families, notes: v.notes,
    topics: v.itTopics, level: v.itLevels,
  }[key] || [];
}

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return null; }
}

function rangeOf(entries) {
  if (!entries.length) return "";
  const first = entries[0].name;
  const last = entries[entries.length - 1].name;
  return first === last ? first : `${first} ~ ${last}`;
}

function firstKey(part) {
  return PARTS[part].tabs[0][1];
}

function groupHref(part, key, label) {
  return key === firstKey(part) && label == null ? `#/${part}` : `#/${part}/by/${key}/${enc(label)}/1`;
}

function modesFor(part, entries, activeKey) {
  return PARTS[part].tabs.flatMap(([label, key]) => {
    if (key === firstKey(part)) return [{ label, href: `#/${part}`, active: key === activeKey }];
    const groups = groupBy(entries, key, orderFor(key));
    return groups.length ? [{ label, href: groupHref(part, key, groups[0].label), active: key === activeKey }] : [];
  });
}

function letterOf(part, entry) {
  return firstKey(part) === "initial" ? initial(entry.name) : chosung(entry.name);
}

function listPage(part, { key, label, n }) {
  const all = sortBy(store[part], PARTS[part].collate);
  const groups = groupBy(all, key, orderFor(key));
  let entries = all;
  if (label != null) {
    const group = groups.find((g) => g.label === label);
    if (!group) return renderNotFound();
    entries = group.entries;
  }
  const pages = paginate(entries, PER_PAGE);
  const page = clampPage(pageNo(n), pages.length);
  const shown = pages[page - 1] || [];
  const activeTab = label != null ? label : shown.length ? letterOf(part, shown[0]) : null;
  pageTitle = `${PARTS[part].label}${activeTab ? ` ${activeTab}` : ""}, ${page}쪽 · ${SITE}`;
  return renderPage({
    part,
    title: label != null ? label : "",
    range: rangeOf(shown),
    entries: shown,
    page,
    pageCount: Math.max(pages.length, 1),
    tabs: groups.map((g) => ({ label: g.label, href: groupHref(part, key, g.label) })),
    activeTab,
    modes: modesFor(part, all, key),
    base: label != null ? `#/${part}/by/${key}/${enc(label)}/` : `#/${part}/p/`,
  });
}

const lessonsOf = (key) => store.lessons.filter((l) => STUDIES[key].subjects.includes(l.subject));

function studyPage(key, segs) {
  const book = STUDIES[key];
  const v = vol(key);
  const mine = lessonsOf(key);
  const scentIds = new Set(store.scents.map((s) => s.id));
  if (segs.length === 1) {
    pageTitle = `${book.label} · ${SITE}`;
    return renderVolumeIndex(mine, { subjects: book.subjects, stages: store.vocab.stages || [], vol: v, routine: !!book.routine });
  }
  if (book.routine && segs.length === 2 && segs[1] === "routine") {
    pageTitle = `오늘의 연습 순서 · ${book.label} · ${SITE}`;
    return renderRoutine(store.routine, { slots: store.vocab.slots || [], scentIds, lessons: mine });
  }
  const id = segs.length === 2 ? safeDecode(segs[1]) : null;
  const lesson = id == null ? null : mine.find((l) => l.id === id);
  if (!lesson) return renderNotFound();
  const { prev, next } = neighbors(mine.filter((l) => l.subject === lesson.subject), id);
  const needs = (lesson.needs || []).map((n) => store.lessons.find((l) => l.id === n)).filter(Boolean);
  pageTitle = `${lesson.title} · ${book.label} · ${SITE}`;
  return renderLesson(lesson, { prev, next, needs, scentIds, vol: v });
}

function books() {
  const words = Object.entries(PARTS).map(([k, p]) => ({
    href: `#/${k}`, label: p.label, color: p.color, count: `${store[k].length}`, empty: store[k].length === 0,
  }));
  const studies = Object.entries(STUDIES).map(([k, s]) => {
    const n = lessonsOf(k).length;
    return { href: `#/${k}`, label: s.label, color: s.color, count: `${n}강`, empty: n === 0 && !s.routine };
  });
  return [...words, ...studies];
}

export function route(hash) {
  pageTitle = `찾을 수 없어요 · ${SITE}`;
  pageColor = COVER_CLOTH;
  const segs = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (segs.length === 0) {
    pageTitle = SITE;
    return renderCover(store.vocab.moods, books());
  }
  const [head, kind, a, b, c] = segs;

  if (head === "mood" && segs.length === 2) {
    const word = safeDecode(kind);
    if (word == null) return renderNotFound();
    pageTitle = `${word} · ${SITE}`;
    return renderMood(word, byMood(word, sortKo(store.flowers), sortKo(store.scents)));
  }
  if (STUDIES[head]) {
    pageColor = STUDIES[head].color;
    return studyPage(head, segs);
  }
  if (!PARTS[head]) return renderNotFound();
  const part = head;
  pageColor = PARTS[part].color;

  if (segs.length === 1) return listPage(part, { key: firstKey(part), n: 1 });
  if (kind === "p" && segs.length === 2) return listPage(part, { key: firstKey(part), n: 1 });
  if (kind === "p" && segs.length === 3) return listPage(part, { key: firstKey(part), n: a });
  if (kind === "by" && (segs.length === 4 || segs.length === 5)) {
    const keys = PARTS[part].tabs.map(([, k]) => k);
    const label = safeDecode(b);
    if (!keys.includes(a) || label == null) return renderNotFound();
    return listPage(part, { key: a, label, n: c });
  }
  if (kind === "e" && segs.length === 3) {
    const id = safeDecode(a);
    const entry = id == null ? null : findEntry(id, store[part]);
    if (!entry) return renderNotFound();
    pageTitle = `${entry.name} · ${SITE}`;
    return renderDetail(entry, part, store);
  }
  return renderNotFound();
}

function show() {
  app.innerHTML = route(location.hash);
  app.classList.toggle("on-cover", location.hash.replace(/^#\/?/, "") === "");
  document.documentElement.style.setProperty("--vol", pageColor);
  document.title = pageTitle;
  window.scrollTo(0, 0);
  document.querySelector(".tab.on")?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

// Swipe sideways on a page to turn it, like a paper book.
function enableSwipe() {
  let x0 = null;
  let y0 = null;
  app.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1 || e.target.closest(".tabs, pre")) { x0 = null; return; }
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
  }, { passive: true });
  app.addEventListener("touchend", (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) / 2) return;
    const link = app.querySelector(dx < 0 ? 'a[rel="next"]' : 'a[rel="prev"]');
    if (link) location.hash = link.getAttribute("href");
  });
}

// Offline: the service worker keeps every page and photo once fetched; photos are fetched ahead here.
function enableOffline() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("sw.js").then(() => navigator.serviceWorker.ready).then((reg) => {
    const photos = Object.keys(PARTS).flatMap((k) => store[k].map((e) => e.photo && e.photo.file).filter(Boolean));
    reg.active?.postMessage({ type: "keep", urls: photos });
  }).catch((err) => console.error(err));
}

async function start() {
  try {
    const keys = Object.keys(PARTS);
    const optional = (path, fallback) => getJSON(path).catch((err) => { console.error(err); return fallback; });
    const lessonFiles = [...new Set(Object.values(STUDIES).map((s) => s.data))];
    const lessons = Promise.all(lessonFiles.map((f) => optional(f, [])));
    const routine = optional("data/routine.json", null);
    const [vocab, ...lists] = await Promise.all([
      getJSON("data/vocab.json"),
      ...keys.map((k) => (PARTS[k].optional ? optional(PARTS[k].data, []) : getJSON(PARTS[k].data))),
    ]);
    store.vocab = vocab;
    keys.forEach((k, i) => { store[k] = Array.isArray(lists[i]) ? lists[i] : []; });
    store.lessons = (await lessons).flatMap((l) => (Array.isArray(l) ? l : []));
    store.routine = await routine;
  } catch (err) {
    app.innerHTML = `<div class="sheet"><p class="empty">사전을 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.</p></div>`;
    console.error(err);
    return;
  }
  window.addEventListener("hashchange", show);
  show();
  enableSwipe();
  enableOffline();
}

start();
