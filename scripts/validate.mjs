import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { STUDIES } from "../js/parts.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const HTTP_URL = /^https?:\/\//;

function checkUrls(at, label, urls, errs) {
  for (const u of urls) {
    if (u && !HTTP_URL.test(String(u))) errs.push(`${at}: ${label} must start with http:// or https://: ${u}`);
  }
}

function checkCommon(kind, e, errs) {
  const at = `${kind} "${e.id}"`;
  checkUrls(at, "source", e.sources ?? [], errs);
  for (const m of e.meanings ?? []) checkUrls(at, "meaning source", m.sources ?? [], errs);
  if (e.photo) checkUrls(at, "photo url", [e.photo.source, e.photo.licenseUrl], errs);
  if (!Array.isArray(e.sources) || e.sources.length === 0) {
    errs.push(`${at}: missing sources`);
  }
  if (typeof e.checked !== "string" || !ISO_DATE.test(e.checked)) {
    errs.push(`${at}: checked must be YYYY-MM-DD`);
  }
  if (e.photo) {
    if (!e.photo.author || !String(e.photo.author).trim()) {
      errs.push(`${at}: photo author is empty`);
    }
    if (!e.photo.license || !String(e.photo.license).trim()) {
      errs.push(`${at}: photo license is empty`);
    }
  }
}

function checkVocab(kind, e, field, values, allowed, errs) {
  for (const v of values ?? []) {
    if (!allowed.includes(v)) {
      errs.push(`${kind} "${e.id}": ${field} "${v}" not in vocab.${field}`);
    }
  }
}

function checkIds(kind, list, errs) {
  const seen = new Set();
  for (const e of list) {
    if (seen.has(e.id)) errs.push(`duplicate ${kind} id "${e.id}"`);
    seen.add(e.id);
  }
  return seen;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SCENT_LINK = /\[\[([^|\]]+)\|[^\]]+\]\]/g;
const BLOCK_TYPES = ["p", "analogy", "steps", "shortcut", "code"];
// A well-formed link: label without "**", "|", "[" or "]".
const CLEAN_LINK = /\[\[[^|\[\]]+\|[^|\[\]*]+\]\]/g;

/** Text whose markup is not well formed: stray [[ / ]], or an odd number of "**" or backticks once links are removed. */
function badMarkup(text) {
  const rest = String(text ?? "").replace(CLEAN_LINK, "");
  const odd = (mark) => (rest.split(mark).length - 1) % 2 === 1;
  return rest.includes("[[") || rest.includes("]]") || odd("**") || odd("`");
}

/** Site of a URL for the two-source rule: hostname minus "www.", reduced to its last two labels. */
function siteOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".").slice(-2).join(".");
  } catch {
    return null;
  }
}

/** Map source n -> url, reporting duplicate numbers, missing titles and non-http(s) urls. */
function sourceMap(at, sources, errs) {
  const urlOf = new Map();
  for (const src of sources ?? []) {
    if (urlOf.has(src.n)) errs.push(`${at}: duplicate source n ${src.n}`);
    urlOf.set(src.n, src.url);
    if (!String(src.title ?? "").trim()) errs.push(`${at}: source ${src.n} has no title`);
  }
  checkUrls(at, "source", (sources ?? []).map((src) => src.url), errs);
  return urlOf;
}

/** One cited piece of text: cites exist, markup is well formed, key text spans 2 sites, scent links are known. */
function checkCited(at, where, text, cites, key, { urlOf, used, scentIds }, errs) {
  if (!String(text ?? "").trim()) errs.push(`${at}: empty text in "${where}"`);
  if (!cites || cites.length === 0) errs.push(`${at}: no cites in "${where}"`);
  for (const n of cites ?? []) {
    if (!urlOf.has(n)) errs.push(`${at}: cite ${n} has no source`);
    used.add(n);
  }
  if (badMarkup(text)) errs.push(`${at}: malformed markup in "${where}": ${text}`);
  if (key && new Set((cites ?? []).map((n) => siteOf(urlOf.get(n))).filter(Boolean)).size < 2) {
    errs.push(`${at}: key block in "${where}" needs cites on 2 distinct hosts`);
  }
  for (const [, id] of String(text ?? "").matchAll(SCENT_LINK)) {
    if (!scentIds.has(id)) errs.push(`${at}: unknown scent link "${id}"`);
  }
}

function reportUnused(at, urlOf, used, errs) {
  for (const n of urlOf.keys()) if (!used.has(n)) errs.push(`${at}: source ${n} is never cited`);
}

/** One lesson block. p/analogy: cited text. steps: cited list of items. shortcut: keys + cited text. code: lang + text, cites optional. */
function checkBlock(at, where, b, ctx, errs) {
  if (!BLOCK_TYPES.includes(b.type)) {
    errs.push(`${at}: block type "${b.type}" must be one of ${BLOCK_TYPES.join(", ")}`);
    return;
  }
  if (b.type === "steps") {
    const items = Array.isArray(b.items) ? b.items : [];
    if (!items.length) errs.push(`${at}: steps in "${where}" has no items`);
    for (const t of items) if (!String(t ?? "").trim()) errs.push(`${at}: empty step in "${where}"`);
    checkCited(at, where, items.join(" "), b.cites, b.key, ctx, errs);
    return;
  }
  if (b.type === "shortcut" && !String(b.keys ?? "").trim()) errs.push(`${at}: shortcut in "${where}" has no keys`);
  if (b.type === "code") {
    if (!String(b.lang ?? "").trim()) errs.push(`${at}: code in "${where}" has no lang`);
    if (!String(b.text ?? "").trim()) errs.push(`${at}: empty code in "${where}"`);
    if (b.caption != null && badMarkup(b.caption)) errs.push(`${at}: malformed markup in "${where}": ${b.caption}`);
    for (const n of b.cites ?? []) {
      if (!ctx.urlOf.has(n)) errs.push(`${at}: cite ${n} has no source`);
      ctx.used.add(n);
    }
    return;
  }
  checkCited(at, where, b.text, b.cites, b.key, ctx, errs);
}

function checkLesson(l, { scentIds, stages, subjects, byId }, errs) {
  const at = `lesson "${l.id}"`;
  if (!SLUG.test(String(l.id ?? ""))) errs.push(`${at}: id must be a lowercase slug`);
  if (!Number.isInteger(l.no) || l.no < 1) errs.push(`${at}: no must be a positive integer`);
  if (!subjects.includes(l.subject)) errs.push(`${at}: subject "${l.subject}" not in vocab.subjects`);
  if (!stages.includes(l.stage)) errs.push(`${at}: stage "${l.stage}" not in vocab.stages`);
  if (!String(l.title ?? "").trim()) errs.push(`${at}: title is empty`);
  for (const f of ["written", "checked"]) {
    if (typeof l[f] !== "string" || !ISO_DATE.test(l[f])) errs.push(`${at}: ${f} must be YYYY-MM-DD`);
  }
  for (const id of l.needs ?? []) {
    const dep = byId.get(id);
    if (!dep) errs.push(`${at}: unknown needs "${id}"`);
    else if (dep.subject === l.subject && !(dep.no < l.no)) errs.push(`${at}: needs "${id}" is not an earlier lesson`);
  }
  for (const item of l.listen ?? []) {
    if (!String(item.title ?? "").trim()) errs.push(`${at}: listen item has no title`);
    if (!String(item.url ?? "").trim()) errs.push(`${at}: listen item "${item.title}" has no url`);
  }
  checkUrls(at, "listen url", (l.listen ?? []).map((item) => item.url), errs);
  const urlOf = sourceMap(at, l.sources, errs);
  const used = new Set();
  const ctx = { urlOf, used, scentIds };
  if (!Array.isArray(l.sections) || l.sections.length === 0) errs.push(`${at}: no sections`);
  for (const sec of l.sections ?? []) {
    if (!String(sec.heading ?? "").trim()) errs.push(`${at}: section heading is empty`);
    if (!Array.isArray(sec.blocks) || sec.blocks.length === 0) errs.push(`${at}: section "${sec.heading}" has no blocks`);
    for (const b of sec.blocks ?? []) checkBlock(at, sec.heading, b, ctx, errs);
  }
  reportUnused(at, urlOf, used, errs);
}

export function validateLessons(lessons, { scentIds, stages, subjects }) {
  const errs = [];
  checkIds("lesson", lessons, errs);
  const nos = new Set();
  for (const l of lessons) {
    const key = `${l.subject}#${l.no}`;
    if (nos.has(key)) errs.push(`duplicate lesson no ${l.no} in ${l.subject}`);
    nos.add(key);
  }
  const byId = new Map(lessons.map((l) => [l.id, l]));
  for (const l of lessons) checkLesson(l, { scentIds, stages: stages ?? [], subjects: subjects ?? [], byId }, errs);
  return errs;
}

export function validateRoutine(routine, { slots, vocalIds, scentIds }) {
  const errs = [];
  const at = "routine";
  if (typeof routine.checked !== "string" || !ISO_DATE.test(routine.checked)) errs.push(`${at}: checked must be YYYY-MM-DD`);
  const steps = routine.steps ?? [];
  if (steps.length && !String(routine.minutes ?? "").trim()) errs.push(`${at}: minutes is empty but there are steps`);
  const urlOf = sourceMap(at, routine.sources, errs);
  const used = new Set();
  const ctx = { urlOf, used, scentIds };
  for (const c of routine.cautions ?? []) checkCited(at, "cautions", c.text, c.cites, false, ctx, errs);
  const seen = new Set();
  for (const st of steps) {
    if (!(slots ?? []).includes(st.slot)) errs.push(`${at}: slot "${st.slot}" not in vocab.slots`);
    else if (seen.has(st.slot)) errs.push(`${at}: slot "${st.slot}" appears twice`);
    seen.add(st.slot);
    for (const f of ["title", "amount"]) if (!String(st[f] ?? "").trim()) errs.push(`${at}: step "${st.slot}" has no ${f}`);
    if (!vocalIds.has(st.from)) errs.push(`${at}: step "${st.slot}" from "${st.from}" is not a 보컬 lesson`);
    checkCited(at, st.slot, st.how, st.cites, false, ctx, errs);
  }
  reportUnused(at, urlOf, used, errs);
  return errs;
}

const IT_REQUIRED = ["name", "pos", "level"];

export function validateItalian(words, { vocab, flowerIds, scentIds }) {
  const errs = [];
  const ids = checkIds("word", words, errs);
  for (const w of words) {
    const at = `word "${w.id}"`;
    checkCommon("word", w, errs);
    if (!SLUG.test(String(w.id ?? ""))) errs.push(`${at}: id must be a lowercase slug`);
    for (const f of IT_REQUIRED) if (!String(w[f] ?? "").trim()) errs.push(`${at}: ${f} is empty`);
    checkVocab("word", w, "itPos", w.pos ? [w.pos] : [], vocab.itPos ?? [], errs);
    checkVocab("word", w, "itGenders", w.gender ? [w.gender] : [], vocab.itGenders ?? [], errs);
    checkVocab("word", w, "itLevels", w.level ? [w.level] : [], vocab.itLevels ?? [], errs);
    checkVocab("word", w, "itTopics", w.topics, vocab.itTopics ?? [], errs);
    const meanings = Array.isArray(w.meanings) ? w.meanings : [];
    if (!meanings.length || meanings.some((m) => !String(m ?? "").trim())) errs.push(`${at}: meanings must be a list of non-empty texts`);
    for (const ex of w.examples ?? []) {
      if (!String(ex.it ?? "").trim() || !String(ex.ko ?? "").trim()) errs.push(`${at}: example needs both it and ko`);
    }
    for (const id of w.related ?? []) if (!ids.has(id)) errs.push(`${at}: unknown related word "${id}"`);
    for (const id of w.flowers ?? []) if (!flowerIds.has(id)) errs.push(`${at}: unknown flower "${id}"`);
    for (const id of w.scents ?? []) if (!scentIds.has(id)) errs.push(`${at}: unknown scent "${id}"`);
  }
  return errs;
}

/** Each lesson file may only hold subjects of the books that read it (lessons.json: 향 공부 + 음악 공부). */
function checkFileSubjects(file, lessons, errs) {
  const allowed = Object.values(STUDIES).filter((s) => s.data === file).flatMap((s) => s.subjects);
  for (const l of lessons) {
    if (!allowed.includes(l.subject)) errs.push(`lesson "${l.id}": subject "${l.subject}" does not belong in ${file}`);
  }
}

export function validate({ flowers, scents, vocab, lessons = [], routine = null, italian = [], howto = [], coding = [] }) {
  const errs = [];
  const flowerIds = checkIds("flower", flowers, errs);
  const scentIds = checkIds("scent", scents, errs);
  const flowerById = new Map(flowers.map((f) => [f.id, f]));
  const scentById = new Map(scents.map((s) => [s.id, s]));

  for (const f of flowers) {
    checkCommon("flower", f, errs);
    checkVocab("flower", f, "colors", f.colors, vocab.colors, errs);
    checkVocab("flower", f, "seasons", f.seasons, vocab.seasons, errs);
    checkVocab("flower", f, "moods", f.moods, vocab.moods, errs);
    for (const id of f.pairs ?? []) {
      if (!flowerIds.has(id)) errs.push(`flower "${f.id}": unknown pair "${id}"`);
    }
    for (const id of f.scents ?? []) {
      const s = scentById.get(id);
      if (!s) errs.push(`flower "${f.id}": unknown scent "${id}"`);
      else if (!(s.flowers ?? []).includes(f.id)) {
        errs.push(`flower "${f.id}" -> scent "${id}": not mirrored by scent.flowers`);
      }
    }
  }

  for (const s of scents) {
    checkCommon("scent", s, errs);
    checkVocab("scent", s, "families", s.family ? [s.family] : [], vocab.families, errs);
    checkVocab("scent", s, "notes", s.notes, vocab.notes, errs);
    checkVocab("scent", s, "kinds", s.kind ? [s.kind] : [], vocab.kinds, errs);
    checkVocab("scent", s, "moods", s.moods, vocab.moods, errs);
    for (const id of s.pairs ?? []) {
      if (!scentIds.has(id)) errs.push(`scent "${s.id}": unknown pair "${id}"`);
    }
    for (const id of s.flowers ?? []) {
      const f = flowerById.get(id);
      if (!f) errs.push(`scent "${s.id}": unknown flower "${id}"`);
      else if (!(f.scents ?? []).includes(s.id)) {
        errs.push(`scent "${s.id}" -> flower "${id}": not mirrored by flower.scents`);
      }
    }
  }

  errs.push(...validateItalian(italian, { vocab, flowerIds, scentIds }));
  checkFileSubjects("data/howto.json", howto, errs);
  checkFileSubjects("data/coding.json", coding, errs);
  errs.push(...validateLessons([...lessons, ...howto, ...coding], { scentIds, stages: vocab.stages, subjects: vocab.subjects }));
  if (routine) {
    const vocalIds = new Set(lessons.filter((l) => l.subject === "보컬").map((l) => l.id));
    errs.push(...validateRoutine(routine, { slots: vocab.slots, vocalIds, scentIds }));
  }
  return errs;
}

function main() {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
  const load = (name) => JSON.parse(readFileSync(join(dir, name), "utf8"));
  const loadOptional = (name) => (existsSync(join(dir, name)) ? load(name) : []);
  const errs = validate({
    flowers: load("flowers.json"),
    scents: load("scents.json"),
    vocab: load("vocab.json"),
    lessons: load("lessons.json"),
    routine: load("routine.json"),
    italian: loadOptional("italian.json"),
    howto: loadOptional("howto.json"),
    coding: loadOptional("coding.json"),
  });
  if (errs.length) {
    for (const e of errs) console.error(e);
    process.exit(1);
  }
  console.log("data OK");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
