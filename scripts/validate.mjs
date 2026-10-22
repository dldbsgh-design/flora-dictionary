import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { meaningVerified } from "../js/logic.js";

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
const BLOCK_TYPES = ["p", "analogy"];

function checkLesson(l, { scentIds, stages, byId }, errs) {
  const at = `lesson "${l.id}"`;
  if (!SLUG.test(String(l.id ?? ""))) errs.push(`${at}: id must be a lowercase slug`);
  if (!Number.isInteger(l.no) || l.no < 1) errs.push(`${at}: no must be a positive integer`);
  if (!stages.includes(l.stage)) errs.push(`${at}: stage "${l.stage}" not in vocab.stages`);
  if (!String(l.title ?? "").trim()) errs.push(`${at}: title is empty`);
  for (const f of ["written", "checked"]) {
    if (typeof l[f] !== "string" || !ISO_DATE.test(l[f])) errs.push(`${at}: ${f} must be YYYY-MM-DD`);
  }
  for (const id of l.needs ?? []) {
    const dep = byId.get(id);
    if (!dep) errs.push(`${at}: unknown needs "${id}"`);
    else if (!(dep.no < l.no)) errs.push(`${at}: needs "${id}" is not an earlier lesson`);
  }
  const sources = l.sources ?? [];
  const urlOf = new Map();
  for (const src of sources) {
    if (urlOf.has(src.n)) errs.push(`${at}: duplicate source n ${src.n}`);
    urlOf.set(src.n, src.url);
    if (!String(src.title ?? "").trim()) errs.push(`${at}: source ${src.n} has no title`);
  }
  checkUrls(at, "source", sources.map((src) => src.url), errs);
  const used = new Set();
  if (!Array.isArray(l.sections) || l.sections.length === 0) errs.push(`${at}: no sections`);
  for (const sec of l.sections ?? []) {
    if (!String(sec.heading ?? "").trim()) errs.push(`${at}: section heading is empty`);
    if (!Array.isArray(sec.blocks) || sec.blocks.length === 0) errs.push(`${at}: section "${sec.heading}" has no blocks`);
    for (const b of sec.blocks ?? []) {
      if (!BLOCK_TYPES.includes(b.type)) errs.push(`${at}: block type "${b.type}" must be p or analogy`);
      if (!String(b.text ?? "").trim()) errs.push(`${at}: block text is empty`);
      const cites = b.cites ?? [];
      if (cites.length === 0) errs.push(`${at}: block without cites in "${sec.heading}"`);
      for (const n of cites) {
        if (!urlOf.has(n)) errs.push(`${at}: cite ${n} has no source`);
        used.add(n);
      }
      if (b.key && !meaningVerified({ sources: cites.map((n) => urlOf.get(n)).filter(Boolean) })) {
        errs.push(`${at}: key block in "${sec.heading}" needs cites on 2 distinct hosts`);
      }
      for (const [, id] of String(b.text ?? "").matchAll(SCENT_LINK)) {
        if (!scentIds.has(id)) errs.push(`${at}: unknown scent link "${id}"`);
      }
    }
  }
  for (const n of urlOf.keys()) if (!used.has(n)) errs.push(`${at}: source ${n} is never cited`);
}

export function validateLessons(lessons, { scentIds, stages }) {
  const errs = [];
  checkIds("lesson", lessons, errs);
  const nos = new Set();
  for (const l of lessons) {
    if (nos.has(l.no)) errs.push(`duplicate lesson no ${l.no}`);
    nos.add(l.no);
  }
  const byId = new Map(lessons.map((l) => [l.id, l]));
  for (const l of lessons) checkLesson(l, { scentIds, stages: stages ?? [], byId }, errs);
  return errs;
}

export function validate({ flowers, scents, vocab, lessons = [] }) {
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

  errs.push(...validateLessons(lessons, { scentIds, stages: vocab.stages }));
  return errs;
}

function main() {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
  const load = (name) => JSON.parse(readFileSync(join(dir, name), "utf8"));
  const errs = validate({
    flowers: load("flowers.json"),
    scents: load("scents.json"),
    vocab: load("vocab.json"),
    lessons: load("lessons.json"),
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
