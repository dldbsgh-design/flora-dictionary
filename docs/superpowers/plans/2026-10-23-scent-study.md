# 향 공부 (Scent Study) Volume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third volume, "향 공부", to the published flower/scent dictionary. It holds long, fully sourced Korean lessons on perfumery, from beginner to perfumer level. One new lesson is added each week by a scheduled task.

**Architecture:** Lessons live in one static file, `data/lessons.json`. A new pure-render module, `js/study.js`, turns lessons into HTML strings in the same style as `js/render.js`. `js/app.js` gains two routes (`#/study`, `#/study/<id>`) and loads the lessons file. `scripts/validate.mjs` gains `validateLessons`, which enforces the citation rules. A weekly scheduled task writes, reviews and publishes the next lesson. The monthly re-check task is extended to re-verify lessons too.

**Tech Stack:** Vanilla ES modules, no npm, Node 24 `node --test`, GitHub Pages (main / root), and the scheduled-tasks MCP.

**Spec:** `docs/superpowers/specs/2026-10-23-scent-study-design.md`. The site it extends: `docs/superpowers/specs/2026-10-21-flora-dictionary-design.md`.

## Global Constraints

- **Cost and hosting:** free only. Static files on GitHub Pages. No build step and no dependencies.
- **Language and writing:**
  - All reader-facing text is Korean.
  - Lesson prose is Claude's own words. Never copy long passages from a source.
- **Citations:**
  - Every factual statement must come from a cited source.
  - Anything a source doesn't confirm is not written.
  - Core definitions and numbers need sources on ≥2 distinct hostnames. With only one, either leave it out or write "자료마다 다르다".
  - When sources disagree, say so. Do not pick a side.
- **Analogies:**
  - Only restate a sourced fact. Never add a new one.
  - Always marked with "비유하자면".
  - Smell itself is described only with wording from a source.
  - Claude's own analogies are used only for structure or process.
  - Use them only where needed.
- **Sources allowed:**
  - Free online pages that can be re-opened later. English is OK.
  - No books and no paywalled material.
  - Community reviews may only show "how people describe it". They are never evidence for a fact.
- **Real perfume names:** only for history or structure. No recommendations, ratings or buying advice.
- **Not in a lesson:**
  - homework or exercises
  - quizzes or progress tracking
  - unrelated material
- **Lesson length:** long explanations are wanted. A lesson must be understandable without smelling anything. Explain each new term at first use.
- **Ingredients not in the dictionary:** leave them unlinked. Weekly runs never add dictionary entries.
- **Stage order:** `입문 → 기초 → 중급 → 심화 → 전문`. The topic order follows spec §7, and later lessons may depend only on earlier ones.
- **Weekly run:** if review fails, publish nothing that week and report why. It must not collide with the monthly re-check, which runs on the 1st at 10:00.
- **Mobile:** must be readable at 375px width, with no horizontal page scroll.

## Review Focus

1. **HTML in lesson text:** a lesson's text containing `<`, `&` or quotes must render escaped. Only `**bold**` and `[[scent-id|label]]` produce markup.
2. **Unknown scent link:** a link to a scent id that isn't in the dictionary renders as the plain label, not a broken link. The validator also reports it.
3. **Bad lesson address:** an unknown lesson id in the URL shows the existing not-found page. The first lesson has no "이전 글" and the last has no "다음 글".
4. **No lessons yet:** before the first lesson exists, the table of contents shows a friendly empty line instead of a blank sheet.
5. **Long text on a phone:** long source URLs and long Korean paragraphs wrap at 375px without widening the page.

---

## Data shape (shared by all tasks)

`data/lessons.json` is an array of lesson objects:

```json
{
  "id": "what-is-perfume",
  "no": 1,
  "stage": "입문",
  "title": "향수는 무엇으로 이루어지나",
  "needs": [],
  "sections": [
    { "heading": "향료와 용매",
      "blocks": [
        { "type": "p", "text": "**향료**는 … [[bergamot|베르가못]] …", "cites": [1, 2], "key": true },
        { "type": "analogy", "text": "…", "cites": [1] }
      ] }
  ],
  "sources": [ { "n": 1, "url": "https://…", "title": "…" } ],
  "written": "2026-10-23",
  "checked": "2026-10-23"
}
```

- **`type`**
  - `"p"` is a paragraph.
  - `"analogy"` renders with the prefix "비유하자면, ".
- **`key: true`** marks a core definition or number. Its cites must span ≥2 distinct hostnames.
- **`cites`** are source `n` values.
- **Inline markup**
  - `**…**` → `<b>`
  - `[[scent-id|label]]` → a link to `#/scents/e/<scent-id>`
- **`vocab.json`** gains `"stages": ["입문", "기초", "중급", "심화", "전문"]`.

---

### Task 1: Lesson data file and validator

**Files:**
- Create: `data/lessons.json` (contents: `[]`)
- Modify: `data/vocab.json` (add `stages`)
- Modify: `scripts/validate.mjs`
- Test: `tests/validate.test.mjs`

**Interfaces:**
- Produces:
  - `validateLessons(lessons: Lesson[], { scentIds: Set<string>, stages: string[] }) -> string[]` (error messages), exported from `scripts/validate.mjs`.
  - `validate({ flowers, scents, vocab, lessons = [] })` now also returns lesson errors.
  - `main()` loads `data/lessons.json`.
- Consumes: `meaningVerified({ sources })` from `js/logic.js`, reused for the ≥2-distinct-hosts check.

- [ ] **Step 1: Write failing tests in `tests/validate.test.mjs`**

Use a `lesson(over)` fixture: one section, one `p` block with `cites: [1]`, and source 1 at `https://a.com/x`. Write these tests:
- `valid lesson has no errors` → `[]`
- `stage not in vocab` → an error containing `stage`
- `duplicate id` and `duplicate no` → one error each
- `id must be a lowercase slug`: the id `"Bad Id"` → an error
- `block without cites` → an error containing `cites`
- `cite to missing source`: `cites: [9]` → an error containing `9`
- `key block needs two hosts`: `key: true` with both cites on `a.com` → an error. With `a.com` and `b.org` → no error.
- `unknown scent link`: the text `[[nope|라벨]]` → an error containing `nope`
- `needs must point to an earlier lesson`: a `needs` id that is missing, or that has a larger `no` → an error
- `unused source`: a source never cited → an error
- `source url must be http(s)`: `ftp://x` → an error
- `written/checked must be YYYY-MM-DD` → errors
- `validate() includes lesson errors when lessons given`, and `validate()` without `lessons` still passes the existing fixtures

- [ ] **Step 2: Run the tests to verify they fail**

Run `node --test`. Expected: the new tests FAIL with "validateLessons is not a function".

- [ ] **Step 3: Implement `validateLessons` and wire it in**

- Parse links with `/\[\[([^|\]]+)\|[^\]]+\]\]/g`.
- Use the same HTTP check as the existing `checkUrls`. While here, fix the regex to `/^https?:\/\//`: the current `/^https?:///` accepts "http:foo". Add an assertion in `tests/validate.test.mjs` that `http:foo` is rejected for an entry source.
- Add `stages` to `data/vocab.json`. Make `data/lessons.json` `[]`.

- [ ] **Step 4: Run the tests and the validator**

Run `node --test` and `node scripts/validate.mjs`. Expected: all tests PASS and the validator prints `data OK`.

- [ ] **Step 5: Commit**

```bash
git add data/lessons.json data/vocab.json scripts/validate.mjs tests/validate.test.mjs
git commit -m "feat: lesson data file and validator"
```

---

### Task 2: Study rendering module and styles

**Files:**
- Create: `js/study.js`
- Modify: `css/paper.css` (append a `/* study */` block)
- Test: `tests/study.test.mjs`

**Interfaces:**
- Consumes: `esc` from `js/render.js`.
- Produces (all pure and returning HTML strings):
  - `inline(text: string, scentIds: Set<string>) -> string`. It escapes first, then applies `**…**` → `<b>…</b>`. `[[id|label]]` becomes `<a href="#/scents/e/<id>">label</a>` when the id is in `scentIds`, and the bare label otherwise.
  - `renderStudyIndex(lessons: Lesson[], stages: string[]) -> string`. It shows the table of contents: one `<h2 class="vol-head">` per stage that has lessons, in `stages` order. Under each is a list of `제{no}강 {title}` linking to `#/study/<id>`, sorted by `no`.
  - `renderLesson(lesson, { prev: Lesson|null, next: Lesson|null, needs: Lesson[], scentIds: Set<string> }) -> string`
  - `neighbors(lessons: Lesson[], id: string) -> { lesson, prev, next } | null`. It sorts by `no`, and returns null for an unknown id.

Exact copy:
- **Index**
  - masthead: `STUDY · 향 공부` (links to `#/`)
  - range: `목차`
  - h1: `목차`
  - empty: `첫 글을 준비하고 있어요`
- **Lesson header**
  - masthead: `STUDY · 향 공부` (links to `#/study`)
  - range: `제{no}강 · {stage}`
  - h1: the title
  - needs line, if any: `먼저 읽으면 좋은 글: ` followed by links joined with ` · `
- **Lesson body**
  - Section headings: `<h2>` with the text `{i}. {heading}`, numbered from 1.
  - `analogy` blocks: `<p class="analogy"><span class="as">비유하자면, </span>…</p>`
  - Each block ends with `<sup class="cite">[1][2]</sup>`. These are plain text, not links, because hash routing owns `#`.
  - Sources: `<h3>출처</h3>` with `<ol class="sources">`. Each `<li>` holds the title and a link to the URL, `target="_blank" rel="noopener"`.
  - Then `<p class="provenance"><small>쓴 날: {written}<br>확인한 날: {checked}</small></p>`.
- **Lesson footer:** `← 이전 글` (only if prev) · `목차` (to `#/study`) · `다음 글 →` (only if next). Use the existing `.folio` structure.

- [ ] **Step 1: Write failing tests in `tests/study.test.mjs`**

- `inline escapes html and only converts ** and [[ ]]`: the input `<b>&` → `&lt;b&gt;&amp;`. `**용어**` → `<b>용어</b>`.
- `inline links known scent, plain label for unknown`: `[[calone|칼론]]` with `calone` in the set → `href="#/scents/e/calone"`. `[[nope|라벨]]` → `라벨` with no `<a`.
- `analogy block is prefixed 비유하자면`
- `cites render as [n] superscripts`
- `sections are numbered 1., 2.`
- `first lesson has no 이전 글, last has no 다음 글`
- `needs line lists earlier lessons`
- `index groups by stage order and sorts by no`
- `index with no lessons shows 첫 글을 준비하고 있어요`
- `neighbors returns null for unknown id`

- [ ] **Step 2: Run the tests to verify they fail**

Run `node --test`. Expected: FAIL, because the module `js/study.js` is not found.

- [ ] **Step 3: Implement `js/study.js`**

Follow the style of `render.js`: a top-of-file comment, pure functions, and `esc` on every interpolated value.

- [ ] **Step 4: Add the study styles to `css/paper.css`**

- `.lesson`: body text max-width about 36em, line-height 1.9, the serif font.
- `.lesson h2`: the existing heading tone.
- `.analogy .as`: muted italic.
- `.cite`: small and muted.
- `.sources li`: `overflow-wrap: anywhere`.
- Reuse the existing tokens (`--ink`, `--muted`, `--paper`). Check it inside the existing `@media (max-width: 719px)` block.

- [ ] **Step 5: Run the tests to verify they pass**

Run `node --test`. Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add js/study.js css/paper.css tests/study.test.mjs
git commit -m "feat: study volume rendering"
```

---

### Task 3: Routes, cover volume and loading

**Files:**
- Modify: `js/app.js` (load `data/lessons.json` into `store.lessons`, plus the two routes)
- Modify: `js/render.js` (`renderCover`: add a third volume)
- Test: `tests/render.test.mjs`

**Interfaces:**
- Consumes: `renderStudyIndex`, `renderLesson`, `neighbors` from Task 2, and `store.vocab.stages`.
- Produces:
  - route `#/study` → `renderStudyIndex`
  - route `#/study/<id>` → `renderLesson`, or `renderNotFound()` when `neighbors` returns null
  - `scentIds = new Set(store.scents.map(s => s.id))`

Exact copy:
- **Cover:** a third `<a class="volume" href="#/study">`, with `제3권` / `향 공부` / `STUDY`.
- **Page titles**
  - index: `향 공부 · 꽃과 향의 사전`
  - lesson: `{title} · 향 공부 · 꽃과 향의 사전`

- [ ] **Step 1: Write a failing test in `tests/render.test.mjs`**

`cover lists 제3권 향 공부 linking to #/study`

- [ ] **Step 2: Run the test to verify it fails**

Run `node --test`. Expected: FAIL.

- [ ] **Step 3: Implement the cover volume and the routes**

- `"study"` is handled before the `PARTS[head]` check, because it is not a dictionary part. Leave `js/parts.js` unchanged.
- `start()` fetches `data/lessons.json` alongside the others. A failure there should not block the dictionary: catch it and use `[]`.
- If the three volumes overflow at 375px, adjust `.volumes` and `.volume` in `css/paper.css`.

- [ ] **Step 4: Run the tests, then check in the browser**

Run `node --test`. Expected: PASS.

Then start the preview ("flora-dictionary" in `.claude/launch.json`) and check:
- The cover shows 3 volumes.
- `#/study` shows `첫 글을 준비하고 있어요`.
- `#/study/nope` shows `찾을 수 없어요`.
- At 375px there is no horizontal scroll.

- [ ] **Step 5: Commit**

```bash
git add js/app.js js/render.js css/paper.css tests/render.test.mjs
git commit -m "feat: study routes and cover volume"
```

---

### Task 4: Weekly lesson workflow and the first lesson

**Files:**
- Create: the scheduled task `flora-dictionary-weekly-lesson`, via `mcp__scheduled-tasks__create_scheduled_task`
  - cron `0 14 * * 1`: Mondays at 14:00, so it never overlaps the 10:00 monthly run
  - title `향 공부 주간 글`
- Modify: `data/lessons.json` (lesson 1)

**Interfaces:**
- Consumes:
  - the data shape above
  - `node scripts/validate.mjs`
  - `node --test`
  - the repo facts and shell notes from `C:\Users\이윤호\.claude\scheduled-tasks\flora-dictionary-monthly-recheck\SKILL.md`. Copy its Project section.

The task prompt must contain:
- the Global Constraints above, verbatim
- the topic list from spec §7

Each run does this:
1. `git pull`.
2. Pick the next topic: the first spec §7 topic not yet covered by a lesson. It may be split or merged, keeping stage order.
3. Research with WebSearch and WebFetch. Use only allowed sources. Check every `key` block against two hosts.
4. Write the lesson into `data/lessons.json` with the next `no`, and `written` = `checked` = today.
5. Dispatch a separate reviewer subagent. It re-opens every cited source and checks every block, including each analogy, against the rules. It returns pass, or a list of failing blocks.
6. Fix or delete the failing blocks and re-review. If it still fails after 2 rounds, `git checkout data/lessons.json`, publish nothing, and report.
7. `node scripts/validate.mjs` and `node --test` must pass.
8. Commit `content: lesson {no} {id}` with the attribution line, then `git push origin main`.
9. Report in Korean: the title, the stage, a 3-line summary of what it covers, the number of sources, and anything left out for lack of sources.

- [ ] **Step 1: Create the scheduled task with that prompt**

- [ ] **Step 2: Write lesson 1, "향수는 무엇으로 이루어지나" (입문), following steps 2–7 above**

It must pass the separate reviewer and `node scripts/validate.mjs`.

- [ ] **Step 3: Check in the browser**

- `#/study` lists `제1강 향수는 무엇으로 이루어지나` under 입문.
- The lesson page shows the numbered sections, the citations, the sources and the dates.
- Any `[[…]]` links open the dictionary entry.
- It reads cleanly at 375px.

- [ ] **Step 4: Commit**

```bash
git add data/lessons.json
git commit -m "content: lesson 1 what-is-perfume"
```

---

### Task 5: Monthly re-check, README, Notion, publish

**Files:**
- Modify: the scheduled task `flora-dictionary-monthly-recheck`, via `mcp__scheduled-tasks__update_scheduled_task`
- Modify: `README.md` (in Korean: what `data/lessons.json` is, and that lessons are added weekly)
- Modify: the Notion page "향 노트 기초" (4000a424355c81eabd9bd0153f20d1bb)

**Interfaces:**
- Consumes: the lesson `checked` field and the validator from Task 1.

- [ ] **Step 1: Update the monthly re-check prompt**

Pick from the dictionary entries and the lessons together, by oldest `checked`, still 10 items in total. For a lesson:
- Re-open every source.
- Confirm each block is still supported.
- Re-apply the analogy rule.
- Set `checked`.

Leave everything else in the prompt unchanged.

- [ ] **Step 2: Update `README.md`, then run `node scripts/validate.mjs` and `node --test`**

Expected: `data OK`, and all tests PASS.

- [ ] **Step 3: Update Notion**

On "향 노트 기초", set 작은 목표 to `향 공부 입문 글을 읽고 공책에 내 방식으로 정리하기`. Add a link line `[📖 향 공부 열기](https://dldbsgh-design.github.io/flora-dictionary/#/study)` to the page body.

- [ ] **Step 4: Commit, then push after the owner confirms**

```bash
git add README.md
git commit -m "docs: study volume in README"
git push origin main
```

After the push, check that the live site shows 제3권 and lesson 1.
