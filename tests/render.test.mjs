import { test } from "node:test";
import assert from "node:assert/strict";
import {
  esc, renderEntry, renderPage, renderMood, renderNotFound,
} from "../js/render.js";

function flower(over = {}) {
  return {
    id: "nigella-damascena", name: "니겔라 다마스케나", latin: "Nigella damascena",
    aka: ["흑종초", "Love-in-a-mist"], family: "미나리아재비과", origin: "남유럽",
    note: "가는 잎 사이로 핀다.", colors: ["하늘색"], seasons: ["여름"], moods: ["몽환"],
    meanings: [], pairs: [], scents: [],
    photo: {
      file: "images/flowers/nigella-damascena.jpg", author: "Wildfeuer",
      license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
      source: "https://commons.wikimedia.org/wiki/File:Nigella_damascena.jpg",
    },
    sources: ["https://en.wikipedia.org/wiki/Nigella_damascena"], checked: "2026-10-21",
    ...over,
  };
}

test("esc escapes & < > \" '", () => {
  assert.equal(esc(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
});

test("unverified meaning shows 확인 필요; two distinct hosts does not", () => {
  const one = flower({ meanings: [{ text: "꿈길의 애정", region: "일본", sources: ["https://a.com/x"] }] });
  assert.match(renderEntry(one, "flowers"), /확인 필요/);
  const two = flower({
    meanings: [{ text: "꿈길의 애정", region: "일본", sources: ["https://a.com/x", "https://b.org/y"] }],
  });
  const html = renderEntry(two, "flowers");
  assert.match(html, /꿈길의 애정/);
  assert.doesNotMatch(html, /확인 필요/);
});

test("flower with no meanings has no 꽃말 line", () => {
  assert.doesNotMatch(renderEntry(flower({ meanings: [] }), "flowers"), /꽃말/);
});

test("photo:null renders a plate with the first syllable, no img, no credit", () => {
  const html = renderEntry(flower({ photo: null }), "flowers");
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /사진:/);
  assert.match(html, /class="plate"[^>]*>니</);
});

test("photo renders a lazy img and a credit linked to the source", () => {
  const html = renderEntry(flower(), "flowers");
  assert.match(html, /<img[^>]*loading="lazy"/);
  assert.match(html, /href="https:\/\/commons\.wikimedia\.org\/wiki\/File:Nigella_damascena\.jpg"[^>]*>사진: Wildfeuer \/ CC BY-SA 3\.0</);
});

test("a <script> name is escaped", () => {
  const html = renderEntry(flower({ name: "<script>alert(1)</script>", photo: null }), "flowers");
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("page 1 of 1 disables both prev and next", () => {
  const html = renderPage({
    part: "flowers", title: "가나다", range: "ㄴ — ㄴ", entries: [flower()],
    page: 1, pageCount: 1, tabs: [{ label: "ㄴ", href: "#/flowers/by/chosung/%E3%84%B4/1" }], activeTab: "ㄴ",
  });
  assert.match(html, /FLORA · 꽃 사전/);
  assert.match(html, /p\. 1/);
  const disabled = html.match(/aria-disabled="true"/g) || [];
  assert.equal(disabled.length, 2);
  assert.match(html, /← 이전 장/);
  assert.match(html, /다음 장 →/);
});

test("middle page links prev and next", () => {
  const html = renderPage({
    part: "flowers", title: "가나다", range: "ㄱ — ㅎ", entries: [flower()],
    page: 2, pageCount: 3, tabs: [], activeTab: null,
  });
  assert.doesNotMatch(html, /aria-disabled="true"/);
  assert.match(html, /href="#\/flowers\/p\/1"/);
  assert.match(html, /href="#\/flowers\/p\/3"/);
});

test("renderMood with no matches shows the empty message", () => {
  const html = renderMood("고독", { flowers: [], scents: [] });
  assert.match(html, /아직 이 단어에 맞는 항목이 없어요/);
});

test("renderNotFound links back to the cover", () => {
  assert.match(renderNotFound(), /href="#\/"/);
});
