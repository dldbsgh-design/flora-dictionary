import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "../scripts/validate.mjs";
import { meaningVerified } from "../js/logic.js";

const vocab = {
  colors: ["흰색", "하늘색"],
  seasons: ["봄", "여름"],
  moods: ["고요함", "몽환"],
  families: ["시트러스", "우디"],
  notes: ["탑", "미들", "베이스"],
  kinds: ["천연", "합성"],
};

const flower = (over = {}) => ({
  id: "f1", name: "꽃", latin: "Flos", aka: [], family: "과", origin: "어딘가",
  note: "메모", colors: ["흰색"], seasons: ["봄"], moods: ["고요함"],
  meanings: [], pairs: [], scents: [], photo: null,
  sources: ["https://a.com"], checked: "2026-10-21", ...over,
});

const scent = (over = {}) => ({
  id: "s1", name: "향", nameEn: "Scent", material: "재료",
  family: "우디", notes: ["베이스"], description: "설명", moods: ["고요함"],
  kind: "천연", pairs: [], flowers: [], photo: null,
  sources: ["https://a.com"], checked: "2026-10-21", ...over,
});

const run = (flowers = [], scents = []) => validate({ flowers, scents, vocab });

test("validate empty data → []", () => {
  assert.deepEqual(run(), []);
});

test("valid linked flower and scent → []", () => {
  assert.deepEqual(
    run([flower({ scents: ["s1"] })], [scent({ flowers: ["f1"] })]),
    []
  );
});

test("duplicate id across flowers → error mentioning the id", () => {
  const errs = run([flower({ id: "dup" }), flower({ id: "dup" })]);
  assert.ok(errs.some((e) => e.includes("dup")));
});

test("flower color not in vocab.colors → error", () => {
  const errs = run([flower({ colors: ["무지개"] })]);
  assert.ok(errs.some((e) => e.includes("무지개")));
});

test("pairs referencing missing id → error 'unknown pair'", () => {
  const errs = run([flower({ pairs: ["nope"] })]);
  assert.ok(errs.some((e) => e.includes("unknown pair")));
});

test("flower.scents id missing in scents → error", () => {
  const errs = run([flower({ scents: ["ghost"] })]);
  assert.ok(errs.some((e) => e.includes("ghost")));
});

test("scent.flowers not mirrored by flower.scents → error 'not mirrored'", () => {
  const errs = run([flower()], [scent({ flowers: ["f1"] })]);
  assert.ok(errs.some((e) => e.includes("not mirrored")));
});

test("flower.scents not mirrored by scent.flowers → error 'not mirrored'", () => {
  const errs = run([flower({ scents: ["s1"] })], [scent()]);
  assert.ok(errs.some((e) => e.includes("not mirrored")));
});

test("pairs need not be symmetric", () => {
  const errs = run([flower({ id: "a", pairs: ["b"] }), flower({ id: "b" })]);
  assert.deepEqual(errs, []);
});

test("photo present but author or license empty → error", () => {
  const photo = { file: "x.jpg", author: "", license: "CC0", licenseUrl: "u", source: "s" };
  assert.ok(run([flower({ photo })]).some((e) => e.includes("author")));
  const photo2 = { ...photo, author: "me", license: "" };
  assert.ok(run([flower({ photo: photo2 })]).some((e) => e.includes("license")));
});

test("missing sources → error", () => {
  assert.ok(run([flower({ sources: [] })]).some((e) => e.includes("sources")));
  assert.ok(run([], [scent({ sources: undefined })]).some((e) => e.includes("sources")));
});

test("checked not YYYY-MM-DD → error", () => {
  assert.ok(run([flower({ checked: "21/10/2026" })]).some((e) => e.includes("checked")));
  assert.ok(run([flower({ checked: undefined })]).some((e) => e.includes("checked")));
});

test("scent vocab violations → errors", () => {
  assert.ok(run([], [scent({ family: "없음" })]).some((e) => e.includes("없음")));
  assert.ok(run([], [scent({ kind: "마법" })]).some((e) => e.includes("마법")));
  assert.ok(run([], [scent({ notes: ["꼬리"] })]).some((e) => e.includes("꼬리")));
});

test("meaningVerified needs ≥2 distinct hostnames", () => {
  assert.equal(meaningVerified({ sources: ["https://a.com/x", "https://a.com/y"] }), false);
  assert.equal(meaningVerified({ sources: ["https://a.com", "https://b.org"] }), true);
  assert.equal(meaningVerified({ sources: [] }), false);
  assert.equal(meaningVerified({}), false);
});

test("non-http(s) URLs in sources, meanings and photo are errors", () => {
  const bad = "javascript:alert(1)";
  const photo = (over) => ({ file: "x.jpg", author: "a", license: "CC", licenseUrl: "", source: "https://c.org", ...over });
  assert.ok(run([flower({ sources: [bad] })]).some((e) => e.includes(bad)));
  assert.ok(run([flower({ meanings: [{ text: "t", region: "r", sources: [bad] }] })]).some((e) => e.includes(bad)));
  assert.ok(run([flower({ photo: photo({ source: bad }) })]).some((e) => e.includes(bad)));
  assert.ok(run([flower({ photo: photo({ licenseUrl: bad }) })]).some((e) => e.includes(bad)));
  assert.deepEqual(run([flower({ photo: photo({}) })]), []);
});
