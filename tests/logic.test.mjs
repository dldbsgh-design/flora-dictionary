import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chosung, sortKo, paginate, groupBy, byMood, findEntry, clampPage,
} from "../js/logic.js";

test("chosung: first consonant, doubled folded, non-Hangul is 기타", () => {
  assert.equal(chosung("니겔라"), "ㄴ");
  assert.equal(chosung("깽깽이풀"), "ㄱ");
  assert.equal(chosung("뚜껑"), "ㄷ");
  assert.equal(chosung("빨강"), "ㅂ");
  assert.equal(chosung("쑥"), "ㅅ");
  assert.equal(chosung("짱"), "ㅈ");
  assert.equal(chosung("하늘"), "ㅎ");
  assert.equal(chosung("Rose"), "기타");
  assert.equal(chosung(""), "기타");
});

test("sortKo: Hangul first in collation order, non-Hangul last, input untouched", () => {
  const input = ["장미", "Iris", "가우라", "니겔라"].map((name) => ({ name }));
  const out = sortKo(input);
  assert.deepEqual(out.map((e) => e.name), ["가우라", "니겔라", "장미", "Iris"]);
  assert.deepEqual(input.map((e) => e.name), ["장미", "Iris", "가우라", "니겔라"]);
});

test("paginate: chunks, and empty input gives no pages", () => {
  const items = Array.from({ length: 7 }, (_, i) => ({ id: i }));
  assert.deepEqual(paginate(items, 4).map((p) => p.length), [4, 3]);
  assert.deepEqual(paginate([], 4), []);
});

test("groupBy colors: multi-valued, follows order, drops empty groups", () => {
  const entries = [
    { name: "a", colors: ["노랑", "흰색"] },
    { name: "b", colors: ["흰색"] },
  ];
  const out = groupBy(entries, "colors", ["흰색", "크림", "노랑"]);
  assert.deepEqual(out.map((g) => g.label), ["흰색", "노랑"]);
  assert.deepEqual(out[0].entries.map((e) => e.name), ["a", "b"]);
  assert.deepEqual(out[1].entries.map((e) => e.name), ["a"]);
});

test("groupBy family (string) and notes (array) on scents", () => {
  const scents = [
    { name: "x", family: "우디", notes: ["탑", "베이스"] },
    { name: "y", family: "플로럴", notes: ["미들"] },
  ];
  const fam = groupBy(scents, "family", ["플로럴", "우디"]);
  assert.deepEqual(fam.map((g) => g.label), ["플로럴", "우디"]);
  const notes = groupBy(scents, "notes", ["탑", "미들", "베이스"]);
  assert.deepEqual(notes.map((g) => [g.label, g.entries.length]), [["탑", 1], ["미들", 1], ["베이스", 1]]);
});

test("groupBy chosung: 기타 last in given order", () => {
  const entries = [{ name: "Rose" }, { name: "가우라" }, { name: "나리" }];
  const out = groupBy(entries, "chosung", ["ㄱ", "ㄴ", "기타"]);
  assert.deepEqual(out.map((g) => g.label), ["ㄱ", "ㄴ", "기타"]);
  assert.equal(out[2].entries[0].name, "Rose");
});

test("clampPage", () => {
  assert.equal(clampPage(99, 3), 3);
  assert.equal(clampPage(NaN, 3), 1);
  assert.equal(clampPage(1, 0), 1);
  assert.equal(clampPage(0, 3), 1);
  assert.equal(clampPage(-5, 3), 1);
  assert.equal(clampPage(2, 3), 2);
});

test("byMood filters both lists", () => {
  const flowers = [{ id: "f1", moods: ["몽환"] }, { id: "f2", moods: ["위로"] }];
  const scents = [{ id: "s1", moods: ["몽환", "위로"] }, { id: "s2", moods: ["고요함"] }];
  const out = byMood("몽환", flowers, scents);
  assert.deepEqual(out.flowers.map((e) => e.id), ["f1"]);
  assert.deepEqual(out.scents.map((e) => e.id), ["s1"]);
  assert.deepEqual(byMood("없음", flowers, scents), { flowers: [], scents: [] });
});

test("findEntry: by id or null", () => {
  const list = [{ id: "a" }, { id: "b" }];
  assert.equal(findEntry("b", list), list[1]);
  assert.equal(findEntry("zzz", list), null);
});
