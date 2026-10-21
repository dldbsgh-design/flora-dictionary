# 꽃·향 사전 사이트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A paper-dictionary-style static site with two parts (꽃, 향). It starts with about 60 flowers and 40 scent materials, every entry sourced and every photo credited, and runs on GitHub Pages.

**Architecture:** No build step. `index.html` loads ES modules from `js/`. Hash routing renders pages from `data/*.json`. Rendering is pure functions that return HTML strings, so Node's built-in test runner can test them without a DOM. Photos are downloaded once by a Node script into `images/`, along with their Wikimedia Commons credit metadata.

**Tech Stack:** HTML, CSS, vanilla JS (ES modules), Node 24 (`node --test`, `fetch`). No npm dependencies.

**Spec:** `docs/superpowers/specs/2026-10-21-flora-dictionary-design.md`

## Global Constraints

- Free only. Everything must work on GitHub Pages: static files and relative paths, with no server code.
- No npm dependencies. Node scripts may use only built-ins.
- All UI text is in Korean.
- **꽃말:** a meaning counts as "확인함" only when it has ≥2 sources on distinct hostnames. If it has fewer, show it as "확인 필요". A flower with no meaning shows no 꽃말 line at all.
- **Photos:** Wikimedia Commons only, with a free license (CC0, PD, CC BY, CC BY-SA). Each card shows the credit "사진: {author} / {license}".
- Every entry has `sources` (≥1 URL) and `checked` (an ISO date).
- At least 3 entries per page. This plan uses `PER_PAGE = 4`.
- Look: paper background `#EFEBE2`, ink `#2A2723`, serif headings, Latin names in italics, thin-bordered tags, vertical index tabs on the right edge (on phones they move to a horizontal strip at the top).
- Parts are data-driven (`PARTS` registry), so a later part (액세서리, 공예) is one registry entry plus a JSON file.

## Review Focus

1. **Korean sort order and 초성 index with non-Hangul first characters.** A name starting with a Latin letter or a digit sorts after Hangul and goes under the tab "기타". It must never crash or vanish.
2. **Entry with no photo.** Synthetic scent materials have none. The card shows a plain paper plate with the name's first syllable and no credit line.
3. **Broken relation.** A `pairs`, `scents` or `flowers` id that doesn't exist. The validator fails, and at runtime the link is skipped.
4. **Empty filter result.** A mood with only flowers and no scents, or nothing at all. The page shows "아직 이 단어에 맞는 항목이 없어요" with no blank page and no NaN page numbers.
5. **Hash points past the last page or to an unknown id.** Clamp to the last page. An unknown id renders a "찾을 수 없어요" page with a link back to the cover.

---

## File Structure

```
index.html                  shell: <main id="app">, loads js/app.js
css/paper.css               all styles
js/parts.js                 PARTS registry (flowers, scents)
js/logic.js                 pure: chosung, sortKo, paginate, groupBy, byMood, findEntry
js/render.js                pure: renderCover, renderPage, renderEntry, renderDetail, renderMood, renderNotFound
js/app.js                   fetch data, hash router, writes innerHTML
data/vocab.json             colors, seasons, moods, families, notes, origins
data/flowers.json           [Flower]
data/scents.json            [Scent]
images/flowers/<id>.jpg     ≤ 320px wide thumbnails
images/scents/<id>.jpg
scripts/validate.mjs        data rules → exit 1 on any error
scripts/fetch-photo.mjs     Commons file title → thumbnail + credit JSON on stdout
scripts/serve.mjs           local static server for preview (port 8080)
tests/*.test.mjs            node --test
README.md                   for the user: what this is, how to publish (Korean)
```

**Data shapes (used by every task):**

```js
// Flower
{ id: "nigella-damascena", name: "니겔라 다마스케나", latin: "Nigella damascena",
  aka: ["흑종초", "Love-in-a-mist"], family: "미나리아재비과", origin: "남유럽, 서아시아",
  note: "…한두 줄…", colors: ["하늘색"], seasons: ["여름"], moods: ["몽환"],
  meanings: [{ text: "꿈길의 애정", region: "일본", sources: ["https://a…", "https://b…"] }],
  pairs: ["scabiosa"], scents: [], 
  photo: { file: "images/flowers/nigella-damascena.jpg", author: "…", license: "CC BY-SA 3.0",
           licenseUrl: "https://…", source: "https://commons.wikimedia.org/wiki/File:…" } | null,
  sources: ["https://en.wikipedia.org/wiki/Nigella_damascena"], checked: "2026-10-21" }

// Scent
{ id: "vetiver", name: "베티버", nameEn: "Vetiver", material: "베티버 뿌리 (Chrysopogon zizanioides)",
  family: "우디", notes: ["베이스"], description: "…", moods: ["고요함"], kind: "천연" | "합성",
  pairs: ["bergamot"], flowers: [], photo: {…} | null, sources: [...], checked: "2026-10-21" }
```

---

### Task 1: Scaffold, vocabulary, validator

**Files:**
- Create: `data/vocab.json`, `data/flowers.json` (`[]`), `data/scents.json` (`[]`), `scripts/validate.mjs`, `tests/validate.test.mjs`, `.gitignore` (`node_modules/`, `.superpowers/`)

**Interfaces:**
- Produces: `validate({ flowers, scents, vocab }) -> string[]` (error messages; empty = valid), exported from `scripts/validate.mjs`. Running `node scripts/validate.mjs` loads `data/` and exits 1 when errors exist, printing each.
- Produces: `meaningVerified(meaning) -> boolean`, true iff `sources` contains ≥2 distinct hostnames.

`vocab.json` keys: `colors` (흰색, 크림, 노랑, 주황, 빨강, 분홍, 연분홍, 자주, 보라, 하늘색, 파랑, 초록, 갈색, 검정에 가까운), `seasons` (봄, 여름, 가을, 겨울), `moods` (~24 words incl. 고요함, 위로, 몽환, 섬세함, 우수, 그리움, 맑음, 순수, 명랑, 장난스러움, 새벽, 따뜻함, 차가움, 단단함, 관능, 신비, 향수, 축하, 고독, 생명력, 우아함, 소박함, 강렬함, 투명함), `families` (시트러스, 플로럴, 그린, 우디, 스파이시, 앰버, 머스크, 아쿠아틱, 구르망, 허브, 레더), `notes` (탑, 미들, 베이스), `kinds` (천연, 합성).

- [ ] **Step 1: Write failing tests** in `tests/validate.test.mjs`:
  - `validate empty data → []`
  - `duplicate id across flowers → error mentioning the id`
  - `flower color not in vocab.colors → error`
  - `pairs referencing missing id → error "unknown pair"`
  - `flower.scents id missing in scents → error`; also `scent.flowers` not mirrored by `flower.scents` → error "not mirrored"
  - `photo present but author or license empty → error`
  - `missing sources or checked not YYYY-MM-DD → error`
  - `meaningVerified({sources:["https://a.com/x","https://a.com/y"]}) === false`; `…["https://a.com","https://b.org"] === true`
- [ ] **Step 2:** `node --test tests/` → FAIL (module not found)
- [ ] **Step 3:** Implement `validate` and `meaningVerified` in `scripts/validate.mjs`. `pairs` need not be symmetric. Only flower↔scent links must mirror.
- [ ] **Step 4:** `node --test tests/` → PASS. `node scripts/validate.mjs` → exit 0
- [ ] **Step 5:** `git add -A; git commit -m "feat: data vocabulary and validator"`

### Task 2: Pure logic

**Files:** Create `js/logic.js`, `tests/logic.test.mjs`

**Interfaces (all exported from `js/logic.js`):**
- `chosung(name: string) -> string`: the first character's initial consonant (ㄱ…ㅎ, with doubled consonants folded: ㄲ→ㄱ, ㄸ→ㄷ, ㅃ→ㅂ, ㅆ→ㅅ, ㅉ→ㅈ). Non-Hangul → `"기타"`.
- `sortKo(entries) -> entries`: a copy sorted by `name` with `Intl.Collator('ko')`. Non-Hangul names come after Hangul.
- `paginate(entries, perPage) -> Entry[][]`. Empty input → `[]`.
- `groupBy(entries, key: 'chosung'|'colors'|'seasons'|'family'|'notes', order: string[]) -> {label, entries}[]`: multi-valued keys put an entry in each group. Groups follow `order` and empty groups are dropped.
- `byMood(mood, flowers, scents) -> {flowers, scents}`
- `findEntry(id, list) -> Entry | null`
- `clampPage(n, pageCount) -> number`: in the range 1..max(pageCount,1). NaN → 1.

- [ ] **Step 1: Write failing tests:**
  - `chosung("니겔라")==="ㄴ"`, `chosung("깽깽이풀")==="ㄱ"`, `chosung("Rose")==="기타"`, `chosung("")==="기타"`
  - `sortKo` orders `["장미","Iris","가우라","니겔라"]` → `가우라, 니겔라, 장미, Iris`
  - `paginate(7 items, 4)` → page lengths `[4,3]`; `paginate([],4)` → `[]`
  - `groupBy` by colors: an entry with `["노랑","흰색"]` appears in both groups; order follows vocab; no empty groups
  - `clampPage(99,3)===3`, `clampPage(NaN,3)===1`, `clampPage(1,0)===1`
  - `byMood("몽환", …)` returns only matching items from both lists
- [ ] **Step 2:** Run → FAIL
- [ ] **Step 3:** Implement in `js/logic.js`
- [ ] **Step 4:** `node --test tests/` → PASS
- [ ] **Step 5:** Commit `feat: sorting, index grouping, paging logic`

### Task 3: Photo fetch script

**Files:** Create `scripts/fetch-photo.mjs`, `tests/fetch-photo.test.mjs`, `tests/fixtures/commons-imageinfo.json` (a real response saved once from the API below)

**Interfaces:**
- `parseImageInfo(apiJson) -> { thumbUrl, author, license, licenseUrl, source }`. `author` is `extmetadata.Artist.value` with HTML tags stripped and whitespace collapsed. `license` is `LicenseShortName`. It throws if `LicenseShortName` is not one of CC0, Public domain, PD-*, CC BY*, CC BY-SA*.
- CLI: `node scripts/fetch-photo.mjs <flowers|scents> <id> "File:Title.jpg"`. It calls `https://commons.wikimedia.org/w/api.php?action=query&titles=<title>&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=320&format=json` with a `User-Agent: flora-dictionary/1.0 (personal study site)` header. It saves the thumbnail to `images/<part>/<id>.jpg` and prints the `photo` JSON object, ready to paste into data.

- [ ] **Step 1: Failing tests:** the fixture parses to a non-empty author with no `<`, and a license matching `/CC|Public domain|PD/`. A fixture copy whose license is changed to "All rights reserved" must throw.
- [ ] **Step 2:** Run → FAIL
- [ ] **Step 3:** Implement
- [ ] **Step 4:** Tests PASS. Then run it once for `Nigella damascena` and check that the file exists and is under 60 KB.
- [ ] **Step 5:** Commit `feat: Commons photo fetcher with license guard`

### Task 4: Rendering, router, paper styles

**Files:** Create `js/parts.js`, `js/render.js`, `js/app.js`, `index.html`, `css/paper.css`, `scripts/serve.mjs`, `tests/render.test.mjs`

**Interfaces:**
- `PARTS` in `js/parts.js`: `{ flowers: {label:"꽃", data:"data/flowers.json", tabs:[["가나다","chosung"],["색","colors"],["계절","seasons"]], tagKeys:["colors","seasons","moods"]}, scents: {label:"향", data:"data/scents.json", tabs:[["가나다","chosung"],["계열","family"],["노트","notes"]], tagKeys:["family","notes","moods"]} }`
- Routes, all hash-based: `#/` cover · `#/<part>` = page 1 by 가나다 · `#/<part>/p/<n>` · `#/<part>/by/<key>/<label>/<n>` · `#/<part>/e/<id>` detail · `#/mood/<word>` · anything else → not found.
- Each render function returns a string. Every user string goes through `esc()`, which escapes `& < > " '`.
- `renderEntry(entry, part)` shows: the photo `<img loading="lazy">` or a plate showing the first syllable when `photo` is null; the name; the Latin name in `<i>`; `aka` joined with " · "; the 꽃말 line (flowers only, when meanings exist), with each unverified meaning followed by `<span class="unverified">확인 필요</span>`; the one-line `note`/`description`; the tags; and the credit `사진: {author} / {license}` linked to `photo.source`.
- `renderPage({part, title, range, entries, page, pageCount, tabs, activeTab})` shows the header (`FLORA · 꽃 사전` / `ESSENCE · 향 사전` plus the range, e.g. "ㄴ — ㅅ"), the entries, the footer (← 이전 장, `p. N`, 다음 장 →, with the links disabled at the ends), and the right-edge tabs.
- `renderDetail` adds the full meanings with region and source links, `pairs`, the cross links (꽃 ↔ 향), `sources` and `checked`.
- The cover has two big "volumes" (꽃, 향), a mood word list, and a small "더 많은 파트는 곧" line.

- [ ] **Step 1: Failing tests** (`tests/render.test.mjs`, with fixture entries inline):
  - An entry with one unverified meaning contains "확인 필요"; one with two distinct-host sources doesn't.
  - A flower with `meanings: []` has no "꽃말" text.
  - `photo:null` → no `<img`, no "사진:", and the plate contains the first syllable.
  - The name `<script>` is escaped in the output.
  - On page 1 of 1, both prev and next carry `aria-disabled="true"`.
  - `renderMood` with no matches contains "아직 이 단어에 맞는 항목이 없어요".
  - `renderNotFound()` contains `href="#/"`.
- [ ] **Step 2:** Run → FAIL
- [ ] **Step 3:** Implement `render.js`, `parts.js` and `app.js`. Use `clampPage` for page numbers and `findEntry` for detail routes. Then write `index.html`, `paper.css` and `serve.mjs` (Node `http`, serves the repo root, correct MIME for .js/.json/.css/.jpg).
  - **Styles:** paper `#EFEBE2`, ink `#2A2723`, rule lines `#B9B2A6`, serif stack `"Noto Serif KR", "Nanum Myeongjo", Georgia, serif` (Google Fonts link for Noto Serif KR). Card photo 72px square on desktop and 64px on phones. Tabs are vertical on the right at ≥ 720px and a horizontal scroll strip at the top below that.
- [ ] **Step 4:** `node --test tests/` → PASS. Start `node scripts/serve.mjs`, open the preview, and check by screenshot that the cover and a flowers page render at desktop and 375px widths.
- [ ] **Step 5:** Commit `feat: paper dictionary pages, index tabs, router`

### Task 5: Seed entries from the Notion trial

**Files:** Modify `data/flowers.json`, `data/scents.json`. Create `images/flowers/*.jpg`.

- [ ] **Step 1:** Add the 5 trial flowers (헬레보루스 니게르, 니겔라 다마스케나, 스카비오사, 블루스타, 빌리버튼), re-checked under the spec §9 rules. Each one gets family, origin, sources, photo via `fetch-photo.mjs` and `checked: today`. Re-research their meanings. Any meaning without 2 distinct-host sources keeps a single source and renders as 확인 필요.
- [ ] **Step 2:** `node scripts/validate.mjs` → exit 0. `node --test tests/` → PASS.
- [ ] **Step 3:** Preview: 2 pages exist (4 + 1), credits show, and the 확인 필요 badge appears where expected.
- [ ] **Step 4:** Commit `content: seed five flowers from Notion trial`

### Task 6: Flowers batch 1 (to ~60)

Add about 55 flowers, roughly 2 famous to 1 lesser known. **Famous:** e.g. 장미, 튤립, 백합, 국화, 해바라기, 수국, 라벤더, 작약, 카네이션, 프리지아, 안개꽃, 거베라, 데이지, 코스모스, 동백, 매화, 벚꽃, 진달래, 개나리, 목련, 무궁화, 라넌큘러스, 아네모네, 아이리스, 은방울꽃, 물망초, 제비꽃, 스위트피, 히아신스, 수선화, 양귀비, 리시안셔스, 델피니움, 금잔화, 연꽃, 수련, 달리아. **Lesser known:** e.g. 깽깽이풀, 노루귀, 얼레지, 금낭화, 매발톱, 에린지움, 아스틸베, 헬레니움, 투베로즈, 프리틸라리아, 니코티아나, 스타티스, 아스트란티아, 왁스플라워. The builder adjusts the list. Every item must be a real taxon with a Wikipedia article.

- [ ] **Step 1:** Research in 3 parallel batches of about 18, each run by a subagent that gets the data shapes, the vocab and the §9 rules. Each batch returns JSON entries plus the Commons file titles used.
- [ ] **Step 2:** Fetch photos with `fetch-photo.mjs`. Any entry whose only candidate photo fails the license guard gets `photo: null`.
- [ ] **Step 3:** Fill `pairs` by spec §5.1 (colour harmony, same season, used together in bouquets), at least 1 per flower.
- [ ] **Step 4:** `node scripts/validate.mjs` → exit 0. Tests pass.
- [ ] **Step 5:** A fresh reviewer spot-checks 15 random entries against their sources: the Latin name, the family, the season, and whether each verified meaning's 2 sources really say it. Fix every finding. Re-run validate.
- [ ] **Step 6:** Commit `content: flowers batch 1`

### Task 7: Scents batch 1 (~40) and cross links

Cover every family in vocab. Include e.g. 베르가못, 레몬, 유자, 오렌지 블로섬(네롤리), 장미(로즈 앱솔루트), 재스민, 일랑일랑, 투베로즈, 아이리스(오리스), 바이올렛 잎, 라벤더, 로즈마리, 클라리 세이지, 갈바넘, 무화과 잎, 녹차, 베티버, 샌달우드, 시더우드, 파촐리, 오크모스, 앰버(라브다넘), 벤조인, 바닐라, 통카빈, 프랑킨센스, 미르, 핑크 페퍼, 카다멈, 시나몬, 정향, 머스크(합성), 암브록산(합성), 칼론(합성), 이소 E 슈퍼(합성), 쿠마린, 하이드록시시트로넬랄(합성), 가죽(버치 타르), 소금/해조(아쿠아틱), 꿀(앱솔루트).

- [ ] **Step 1:** Research in 2 parallel batches, using each material's encyclopedia or perfumery reference for its notes, family and description wording. Synthetic materials get `photo: null`.
- [ ] **Step 2:** Link flowers ↔ scents both ways, wherever the flower is the material's source (장미, 재스민, 라벤더, 투베로즈, 아이리스, 바이올렛, 오렌지 블로섬 …).
- [ ] **Step 3:** Validate, run tests, have a fresh reviewer spot-check 10, fix, commit `content: scents batch 1 and cross links`.

### Task 8: Publish guide, Notion link, monthly review

**Files:** Create `README.md` (Korean)

- [ ] **Step 1:** Write `README.md` covering: what the site is, how the data and photo credits work, how to preview locally (`node scripts/serve.mjs`), and the step-by-step publish steps for the user:
  1. Create a GitHub account.
  2. Create an empty public repo `flora-dictionary`.
  3. Tell Claude the repo URL. Claude runs `git remote add origin …` and `git push -u origin main`, and the browser login window appears once.
  4. In Settings → Pages, pick `main` / root.
  5. Note the site address.
- [ ] **Step 2:** After the user has published: add the site link to the Notion home "모든 페이지 → 문서" column, and update the spec copy in Notion if anything changed.
- [ ] **Step 3:** Ask the user's permission, then create the monthly scheduled re-check task (spec §9). It re-verifies the 10 entries with the oldest `checked` dates, updates them, runs validate, and pushes.
- [ ] **Step 4:** Commit `docs: publish guide`
