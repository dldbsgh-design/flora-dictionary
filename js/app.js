// Browser entry: loads data, parses the hash, writes the rendered page.
import { PARTS } from "./parts.js";
import { chosung, sortKo, paginate, groupBy, byMood, findEntry, clampPage } from "./logic.js";
import { renderCover, renderPage, renderDetail, renderMood, renderNotFound } from "./render.js";
import { renderStudyIndex, renderMusicIndex, renderLesson, renderRoutine, neighbors, SCENT, MUSIC } from "./study.js";

const PER_PAGE = 4;
const GANADA = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ", "기타"];
const enc = encodeURIComponent;
const SITE = "꽃과 향의 사전";
const pageNo = (x) => Math.trunc(Number(x)) || 1;
let pageTitle = SITE;

const app = document.getElementById("app");
const store = { vocab: {}, flowers: [], scents: [], lessons: [], routine: null };

async function getJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

function orderFor(key) {
  const v = store.vocab;
  return { chosung: GANADA, colors: v.colors, seasons: v.seasons, family: v.families, notes: v.notes }[key] || [];
}

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return null; }
}

function rangeOf(entries) {
  if (!entries.length) return "—";
  return `${chosung(entries[0].name)} — ${chosung(entries[entries.length - 1].name)}`;
}

function groupHref(part, key, label) {
  return key === "chosung" && label == null ? `#/${part}` : `#/${part}/by/${key}/${enc(label)}/1`;
}

function modesFor(part, entries, activeKey) {
  return PARTS[part].tabs.flatMap(([label, key]) => {
    if (key === "chosung") return [{ label, href: `#/${part}`, active: key === activeKey }];
    const groups = groupBy(entries, key, orderFor(key));
    return groups.length ? [{ label, href: groupHref(part, key, groups[0].label), active: key === activeKey }] : [];
  });
}

function listPage(part, { key, label, n }) {
  const all = sortKo(store[part]);
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
  const activeTab = label != null ? label : shown.length ? chosung(shown[0].name) : null;
  pageTitle = `${PARTS[part].label}${activeTab ? ` · ${activeTab}` : ""} — p.${page} · ${SITE}`;
  return renderPage({
    part,
    title: label != null ? label : PARTS[part].label,
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

const VOLUMES = {
  study: { vol: SCENT, label: "향 공부", owns: (l) => l.subject === "향" },
  music: { vol: MUSIC, label: "음악 공부", owns: (l) => l.subject !== "향" },
};

function studyPage(head, segs) {
  const { vol, label, owns } = VOLUMES[head];
  const mine = store.lessons.filter(owns);
  const scentIds = new Set(store.scents.map((s) => s.id));
  if (segs.length === 1) {
    pageTitle = `${label} · ${SITE}`;
    return head === "music"
      ? renderMusicIndex(mine, { subjects: (store.vocab.subjects || []).filter((x) => x !== "향"), stages: store.vocab.stages || [] })
      : renderStudyIndex(mine, store.vocab.stages || [], vol);
  }
  if (head === "music" && segs.length === 2 && segs[1] === "routine") {
    pageTitle = `오늘의 연습 순서 · ${label} · ${SITE}`;
    return renderRoutine(store.routine, { slots: store.vocab.slots || [], scentIds, lessons: mine });
  }
  const id = segs.length === 2 ? safeDecode(segs[1]) : null;
  const lesson = id == null ? null : mine.find((l) => l.id === id);
  if (!lesson) return renderNotFound();
  const { prev, next } = neighbors(mine.filter((l) => l.subject === lesson.subject), id);
  const needs = (lesson.needs || []).map((n) => store.lessons.find((l) => l.id === n)).filter(Boolean);
  pageTitle = `${lesson.title} · ${label} · ${SITE}`;
  return renderLesson(lesson, { prev, next, needs, scentIds, vol });
}

export function route(hash) {
  pageTitle = `찾을 수 없어요 · ${SITE}`;
  const segs = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (segs.length === 0) {
    pageTitle = SITE;
    return renderCover(store.vocab.moods);
  }
  const [head, kind, a, b, c] = segs;

  if (head === "mood" && segs.length === 2) {
    const word = safeDecode(kind);
    if (word == null) return renderNotFound();
    pageTitle = `${word} · ${SITE}`;
    return renderMood(word, byMood(word, sortKo(store.flowers), sortKo(store.scents)));
  }
  if (VOLUMES[head]) return studyPage(head, segs);
  if (!PARTS[head]) return renderNotFound();
  const part = head;

  if (segs.length === 1) return listPage(part, { key: "chosung", n: 1 });
  if (kind === "p" && segs.length === 2) return listPage(part, { key: "chosung", n: 1 });
  if (kind === "p" && segs.length === 3) return listPage(part, { key: "chosung", n: a });
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
  document.title = pageTitle;
  window.scrollTo(0, 0);
  document.querySelector(".tab.on")?.scrollIntoView({ inline: "center", block: "nearest" });
}

async function start() {
  try {
    const keys = Object.keys(PARTS);
    const optional = (path, fallback) => getJSON(path).catch((err) => { console.error(err); return fallback; });
    const lessons = optional("data/lessons.json", []);
    const routine = optional("data/routine.json", null);
    const [vocab, ...lists] = await Promise.all([
      getJSON("data/vocab.json"), ...keys.map((k) => getJSON(PARTS[k].data)),
    ]);
    store.vocab = vocab;
    keys.forEach((k, i) => { store[k] = lists[i]; });
    const loaded = await lessons;
    store.lessons = Array.isArray(loaded) ? loaded : [];
    store.routine = await routine;
  } catch (err) {
    app.innerHTML = `<div class="sheet"><p class="empty">사전을 불러오지 못했어요. 새로고침해 주세요.</p></div>`;
    console.error(err);
    return;
  }
  window.addEventListener("hashchange", show);
  show();
}

start();
