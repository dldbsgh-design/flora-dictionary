# 음악 공부 (Music Study) Volume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth volume, "음악 공부", to the dictionary site. It has three subjects, 작곡, 작사 and 보컬, each growing by one sourced lesson a week, plus one daily vocal practice sheet (연습 순서). The existing 향 공부 volume keeps working unchanged.

**Architecture:**
- Music lessons share `data/lessons.json` with the scent lessons. A new required `subject` field (`향`, `작곡`, `작사`, `보컬`) separates them.
- Numbering `no` is per subject.
- The practice sheet lives in `data/routine.json`.
- `js/study.js` is generalised so one renderer serves both volumes, with a base path and masthead passed in. It gains a music index, a routine page and a "들어 볼 예시" list.
- `scripts/validate.mjs` gains the subject, listen and routine rules.
- Three weekly scheduled tasks write one lesson each. The vocal task also updates the routine. The monthly re-check is widened.

**Tech Stack:** Vanilla ES modules, no npm, Node 24 `node --test`, GitHub Pages (main / root), and the scheduled-tasks MCP.

**Spec:** `docs/superpowers/specs/2026-10-25-music-study-design.md`. It inherits from `docs/superpowers/specs/2026-10-23-scent-study-design.md` and `docs/superpowers/plans/2026-10-23-scent-study.md`, whose rules and data shape still apply.

## Global Constraints

- **Inherited rules:** every Global Constraint of `docs/superpowers/plans/2026-10-23-scent-study.md` still holds, including citations, analogies, no homework, nothing off-topic, Korean text, free sources and the 375px phone check. Its "smell" rules read as "sound" here.
- **Single-source points:** a core point confirmed by only one reliable site may be written only as an attributed statement ("○○에 따르면 …"), never as a flat assertion. Subdomains of one site count as one site.
- **Vocal safety:**
  - Vocal lessons and the routine carry sourced throat-protection cautions, such as stopping on pain or hoarseness and not forcing high or loud.
  - Every routine exercise comes from a cited source. Where sources differ, say so.
  - No medical diagnosis. Only a sourced "see a professional if it persists".
- **Routine shape:**
  - The routine is a fixed set of slots: `준비 운동, 호흡, 발성, 음정, 마무리`.
  - A better exercise replaces the one in its slot. Exercises are never appended endlessly.
  - The total practice time stays within a sourced range, which is stated on the page.
  - The page shows only the current routine.
- **Listening links:** only legal public sources: public-domain recordings, free-licence audio (e.g. Wikimedia Commons), official channels or sites. They are examples only and never evidence for a fact.
- **App lessons:**
  - GarageBand on iPad, noting iPhone differences, sourced from Apple Support.
  - BandLab in a Windows browser, sourced from BandLab's official help.
  - Moving work between the two apps is taught.
  - BandLab's AI composition features are never taught.
- **Lyrics:** never quote long lyrics from real songs. A short quote only when needed, attributed.
- **Not in scope:**
  - making songs, lyrics or AI music for the user
  - uploading audio
  - recommending paid apps or gear
  - quizzes or progress tracking
- **Pace:** one lesson per subject per week. The user can ask for "○○ 다음 글" at any time.
- **Schedules:** they must not collide with 향 공부 (Monday 14:00) or the monthly re-check (1st, 10:00).
- **Monthly re-check:** 10 dictionary entries plus 10 lessons, all subjects together, oldest first, checked separately. The routine is checked every month.
- **Existing addresses:** the existing `#/study` and `#/study/<id>` addresses and lesson 1 must keep working.

## Review Focus

1. **Scent and music separation:** the scent index and the scent lesson's prev/next must never show music lessons, and the music volume must never show scent lessons. Per-subject `no` means that `no: 1` exists four times.
2. **Before any vocal exercise exists:** before the first vocal lesson, `#/music/routine` must show a friendly line, not a blank or broken page. The cautions block still shows if present.
3. **Broken data files:** if `routine.json` is missing or invalid, every other page still works.
4. **Bad addresses:**
   - `#/music/<scent-lesson-id>` and `#/study/<music-lesson-id>` show not-found.
   - The existing `#/study/what-is-perfume` still opens.
5. **Long content on a phone:** a long routine step or a long listening-link title wraps at 375px.

---

## Data shapes (shared by all tasks)

**Lesson additions:** the existing lesson shape from the 2026-10-23 plan, plus these fields:

```json
{ "subject": "작곡",
  "listen": [ { "title": "…", "url": "https://…", "note": "어디를 들어 보면 좋은지" } ] }
```

- `subject` is required, and must be one of `vocab.subjects` = `["향", "작곡", "작사", "보컬"]`.
- `no` is unique within a subject.
- `needs` may point to any existing lesson. If it points to the same subject, that lesson must have a smaller `no`.
- `listen` is optional. Each item needs an http(s) `url` and a non-empty `title`.

**`data/routine.json`**

```json
{
  "checked": "2026-10-25",
  "minutes": "10–15분",
  "cautions": [ { "text": "…", "cites": [1] } ],
  "steps": [ { "slot": "준비 운동", "title": "…", "how": "…", "amount": "…", "cites": [1], "from": "lesson-id" } ],
  "sources": [ { "n": 1, "url": "https://…", "title": "…" } ]
}
```

- `slot` must be in `vocab.slots` = `["준비 운동", "호흡", "발성", "음정", "마무리"]`. At most one step per slot.
- `from` must be the id of an existing 보컬 lesson.
- The `[[id|label]]` and `**` markup rules apply to `text` and `how`.
- `minutes` is free text, but must be non-empty whenever `steps` is non-empty.
- The initial file is `{ "checked": "<today>", "minutes": "", "cautions": [], "steps": [], "sources": [] }`.

---

### Task 1: Subjects, listening links and routine in the validator

**Files:**
- Modify:
  - `scripts/validate.mjs`
  - `data/vocab.json` (add `subjects` and `slots`)
  - `data/lessons.json` (add `"subject": "향"` to lesson 1)
- Create: `data/routine.json` (the initial file above)
- Test: `tests/validate.test.mjs`

**Interfaces:**
- Produces:
  - `validateLessons(lessons, { scentIds, stages, subjects })` (now subject-aware)
  - `validateRoutine(routine, { slots, vocalIds: Set<string>, scentIds }) -> string[]`
  - `validate({ flowers, scents, vocab, lessons = [], routine = null })` includes both
  - `main()` loads `data/routine.json`
- Consumes: the existing `checkLesson` helpers: `badMarkup`, `siteOf`, `checkUrls`.

- [ ] **Step 1: Write failing tests**

Update the existing `lesson()` fixture to carry `subject: "향"`, and pass `subjects` in `lessonOpts`. Add these tests:
- `lesson subject must be in vocab.subjects`: `"미술"` → an error containing `subject`
- `no may repeat across subjects but not within one`: 향 no 1 and 작곡 no 1 → `[]`. Two 작곡 no 1 → an error containing `duplicate`.
- `needs to same subject must be earlier, other subject is fine`
- `listen items need http(s) url and title`: `ftp://x` and an empty title → errors
- `valid empty routine has no errors`: the initial file → `[]`
- `routine slot must be in vocab.slots and appear once`
- `routine step needs cites that exist and a from that is a vocal lesson`: `from` pointing to a 향 lesson → an error
- `routine with steps needs minutes`
- `routine markup and source urls are checked`: an unclosed `**` → an error containing `markup`, and `ftp://x` → an error
- `routine unused source → error`

- [ ] **Step 2: Run `node --test`**

Expected: the new tests FAIL. `validateRoutine` is not a function, and the subject rule is missing.

- [ ] **Step 3: Implement**

- Group `no` checks and earlier-`needs` checks by `subject`.
- Reuse the cite, markup and source code from `checkLesson`. Extract a shared `checkCited(at, items, urlOf, errs)` if that removes duplication.
- `validate()` derives `vocalIds` from lessons whose `subject === "보컬"`.
- `routine = null` skips the routine checks, so the old callers still pass.

- [ ] **Step 4: Run the tests and the validator**

Run `node --test` and `node scripts/validate.mjs`. Expected: all tests PASS and the validator prints `data OK`.

- [ ] **Step 5: Commit**

```bash
git add scripts/validate.mjs data/vocab.json data/lessons.json data/routine.json tests/validate.test.mjs
git commit -m "feat: lesson subjects, listening links and routine validation"
```

---

### Task 2: One renderer for both volumes, music index and routine page

**Files:**
- Modify: `js/study.js`
- Modify: `css/paper.css` (study block: the `.listen` list and `.routine` steps, both with wrapping)
- Test: `tests/study.test.mjs`

**Interfaces:**
- Consumes: `inline`, `esc`, and the existing tests.
- Produces:
  - `renderStudyIndex(lessons, stages, vol = SCENT)` and `renderLesson(lesson, { prev, next, needs, scentIds, vol = SCENT })`. `vol` is `{ base: "#/study", masthead: "STUDY · 향 공부" }`. Exported constants:
    - `SCENT = { base: "#/study", masthead: "STUDY · 향 공부" }`
    - `MUSIC = { base: "#/music", masthead: "MUSIC · 음악 공부" }`

    All lesson links, the needs line, the footer and the header link use `vol.base`. With the defaults, the existing tests pass unchanged.
  - `renderMusicIndex(lessons, { subjects: ["작곡", "작사", "보컬"], stages }) -> string`:
    - range `목차`, h1 `목차`
    - one `<h2 class="vol-head">` per subject that has lessons, with stage sub-heads `<h3>` and `제{no}강 {title}` links to `#/music/<id>`
    - under the 보컬 head, always a link `오늘의 연습 순서 →` to `#/music/routine`
    - if no music lessons exist, the empty line `첫 글을 준비하고 있어요`, plus the routine link
  - `renderRoutine(routine, { slots, scentIds, lessons }) -> string`, where `slots` is the vocab slot order:
    - h1 `오늘의 연습 순서`
    - if `minutes` is set, a line `전체 {minutes}`
    - a cautions box `<div class="cautions"><h2>목을 지키는 약속</h2>…</div>`, shown when there are cautions
    - one `<section>` per step in vocab slot order, each with:
      - heading `{slot} · {title}`
      - `how`
      - `<p class="amount">{amount}</p>`
      - a cite sup
      - `배운 글: <a href="#/music/{from}">{lesson title}</a>`
    - if there are no steps: `보컬 첫 글과 함께 연습 순서가 생겨요`
    - then sources, `확인한 날: {checked}`, and a footer `← 음악 공부 목차` linking to `#/music`
  - In `renderLesson`, a non-empty `listen` renders `<h3>들어 볼 예시</h3><ul class="listen">` before 출처. Each item is a link to `url` (`target="_blank" rel="noopener"`), with the title and, if present, ` — {note}`.

- [ ] **Step 1: Write failing tests**

- `music vol links use #/music`
- `scent vol default still links #/study`
- `listen list renders before 출처 with escaped titles`
- `music index groups by subject then stage and always links the routine`
- `music index empty shows 첫 글을 준비하고 있어요 and the routine link`
- `routine renders slots in vocab order with cautions first`
- `routine with no steps shows 보컬 첫 글과 함께 연습 순서가 생겨요`
- `routine text is escaped`

- [ ] **Step 2: Run `node --test`**

Expected: the new tests FAIL.

- [ ] **Step 3: Implement the generalised renderer, `renderMusicIndex` and `renderRoutine` in `js/study.js`**

- [ ] **Step 4: Run `node --test`**

Expected: all tests PASS, including the earlier ones.

- [ ] **Step 5: Commit**

```bash
git add js/study.js css/paper.css tests/study.test.mjs
git commit -m "feat: music study rendering and practice sheet"
```

---

### Task 3: Routes, cover and loading

**Files:**
- Modify:
  - `js/app.js`
  - `js/render.js` (cover)
  - `css/paper.css` (if four volumes need it)
- Test: `tests/render.test.mjs`

**Interfaces:**
- Consumes: Task 2's exports and `store.vocab.subjects`, `slots` and `stages`.
- Produces these routes:
  - `#/study`: scent lessons only, `vol = SCENT`
  - `#/study/<id>`: only if that lesson's subject is `향`
  - `#/music` → `renderMusicIndex`
  - `#/music/routine` → `renderRoutine`
  - `#/music/<id>`: a non-향 lesson, `vol = MUSIC`. Prev and next stay within the same subject.
- `store.routine` is loaded from `data/routine.json` with `.catch(() => null)`. Start the fetch together with the others, not after them. A null routine renders as the empty routine.
- Page titles:
  - `음악 공부 · 꽃과 향의 사전`
  - `오늘의 연습 순서 · 음악 공부 · 꽃과 향의 사전`
  - `{title} · 음악 공부 · 꽃과 향의 사전`

Exact copy for the cover: a fourth `<a class="volume" href="#/music">`, with `제4권` / `음악 공부` / `MUSIC`.

- [ ] **Step 1: Write a failing test**

`cover lists 제4권 음악 공부 linking to #/music`

- [ ] **Step 2: Run `node --test`**

Expected: FAIL.

- [ ] **Step 3: Implement the routes and the cover**

Filter lessons by subject before calling `neighbors`. Apply the existing study title style to `[href="#/music"]` too.

- [ ] **Step 4: Run `node --test`, then check in the browser**

Start the preview and check:
- The cover shows 4 volumes, with no horizontal scroll at 375px.
- `#/study` lists only 제1강 향수는….
- `#/study/what-is-perfume` opens.
- `#/music` shows the empty line and the routine link.
- `#/music/routine` shows `보컬 첫 글과 함께 연습 순서가 생겨요`.
- `#/music/what-is-perfume` shows `찾을 수 없어요`.

- [ ] **Step 5: Commit**

```bash
git add js/app.js js/render.js css/paper.css tests/render.test.mjs
git commit -m "feat: music study routes and cover volume"
```

---

### Tasks 4–6: First lesson of each subject

Each of these tasks follows the weekly-run content process: research, write, separate reviewer, at most 2 rounds, validate, test, commit. The process is defined in Task 7's prompt text, so draft that prompt first and follow it here. Each task ends with:
- `node scripts/validate.mjs` → `data OK`
- `node --test` → PASS
- a 375px browser check of the new lesson
- a commit `content: {subject} lesson 1 {id}`

- **Task 4: 작곡 1강 (입문).** "소리와 음악의 기본: 음높이, 박자, 리듬". Add listening links only if a legal source fits.
- **Task 5: 작사 1강 (입문).** "가사란 무엇인가". It must contain no long lyric quotes.
- **Task 6: 보컬 1강 (입문)**, plus the first routine.
  - The lesson is "목소리가 나는 원리와 목을 보호하는 법". It must contain the sourced cautions.
  - Fill `routine.json`:
    - `cautions` from this lesson's sources
    - a `steps` entry only for an exercise a cited source actually describes, with its amount and a `minutes` range from a source
    - If no source gives a safe exercise at this stage, leave `steps` empty. Do not invent one.
  - The reviewer checks the routine too.

---

### Task 7: Schedules, monthly re-check, README, Notion, publish

**Files:**
- Create three scheduled tasks via `mcp__scheduled-tasks__create_scheduled_task`, after the push:

  | id | cron | title |
  |---|---|---|
  | `flora-dictionary-weekly-composition` | `0 14 * * 2` | `음악 공부 주간 글 — 작곡` |
  | `flora-dictionary-weekly-lyrics` | `0 14 * * 3` | `음악 공부 주간 글 — 작사` |
  | `flora-dictionary-weekly-vocal` | `0 14 * * 4` | `음악 공부 주간 글 — 보컬` |

- Modify the scheduled task `flora-dictionary-monthly-recheck`.
- Modify `README.md` (in Korean: the 음악 공부 volume, routine.json and the new schedules).
- Modify these Notion pages:
  - 대표 BGM (4000a424355c81868b3ade46ccadec36)
  - 무료 음악 앱 사용법 (4000a424355c8118967cdf98452dbb96)
  - a new task in the 작업 data source (63e4fabe-6518-4355-8225-c4219fbd062a)

**Interfaces:**
- Consumes: the prompt of `C:\Users\이윤호\.claude\scheduled-tasks\flora-dictionary-weekly-lesson\SKILL.md`. Copy it, then change the subject, its topic list (spec §6) and the music rules from the Global Constraints. The vocal prompt adds: update `routine.json` (replace the slot, keep it within the sourced minutes), and the reviewer checks the routine diff.

- [ ] **Step 1: Draft the three weekly prompts** in the plan workspace (before Task 4, as Tasks 4–6 follow them).

- [ ] **Step 2: Update `README.md`**, then run `node scripts/validate.mjs` and `node --test`. Commit with the message `docs: music study volume in README`.

- [ ] **Step 3: Push after the owner confirms**

Merge to main, `git push origin main`, then check that the live site shows 제4권 and the three lessons.

- [ ] **Step 4: Create the three scheduled tasks**, and update the monthly re-check prompt:
- 10 dictionary entries and 10 lessons, all subjects, oldest first, checked separately
- the routine checked every run, with the same rules as the vocal reviewer

- [ ] **Step 5: Update Notion**

- **대표 BGM:**
  - Body: the structure. 물건 음악 has no lyrics and a genre per object (만년필 → 재즈, 비녀 → 국악·밴드). 엔딩 노래 is one new song for the whole character, with lyrics written and sung by the owner.
  - The tools: GarageBand on iPad, BandLab on the PC.
  - A link line `[🎵 음악 공부 열기](https://dldbsgh-design.github.io/flora-dictionary/#/music)`.
- **무료 음악 앱 사용법:** add the same link. Keep the goal unless a lesson found that MP3 export isn't possible in either app. In that case, change it to the format that works and tell the owner.
- **New 배우기 tasks:**
  - Create `작사 기초` with the small goal `음악 공부 작사 입문 글을 읽고 공책에 정리하기`.
  - Create `보컬 기초` with the small goal `오늘의 연습 순서를 따라 하고 내 목소리를 녹음해 듣기`.
  - Set each one's 세계 to the practice world (4000a424355c81debbabe8905f203d3d) and its 뒤 작업 to 대표 BGM.
