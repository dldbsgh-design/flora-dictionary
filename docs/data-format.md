# 새 책의 데이터 형식 (2026-10-29)

이탈리아어 사전, 프로그램 사용법, 코딩 강의를 채울 때 따르는 형식입니다.
기존 꽃·향·공부 글의 형식은 그대로입니다. 넣은 뒤에는 반드시 `node scripts/validate.mjs`와 `node --test tests/*.test.mjs`를 돌려 확인합니다.

공통 규칙 (README "내용을 믿을 수 있게 하는 방법"과 같음)
- 모든 항목·글에 출처(`sources`)와 마지막 확인 날짜(`checked`, `YYYY-MM-DD`)가 있어야 합니다.
- `id`는 영어 소문자·숫자·하이픈만 씁니다 (예: `permesso-di-soggiorno`, `ps-layers`). 악센트 글자는 빼고 씁니다 (`città` → `citta`).
- 정해진 목록(`data/vocab.json`)에 있는 값만 씁니다. 목록에 없는 값이 필요하면 vocab에 먼저 더합니다.

---

## 1. 이탈리아어 사전 — `data/italian.json`

꽃·향처럼 낱말을 한 장에 4개씩 넘겨 보는 사전입니다. 알파벳(ABC), 주제, 단계로 찾을 수 있습니다.
파일은 낱말의 배열(`[ {...}, {...} ]`)입니다.

```json
{
  "id": "fiore",
  "name": "fiore",
  "say": "피오레",
  "ipa": "ˈfjo.re",
  "pos": "명사",
  "gender": "남성",
  "plural": "fiori",
  "meanings": ["꽃", "가장 좋은 부분"],
  "examples": [{ "it": "Un mazzo di fiori.", "ko": "꽃 한 다발." }],
  "note": "비유로 '가장 좋은 것'이라는 뜻으로도 쓴다.",
  "topics": ["자연과 꽃"],
  "level": "A1",
  "related": ["fiorire"],
  "flowers": ["rosa"],
  "scents": [],
  "sources": ["https://www.treccani.it/vocabolario/fiore/", "https://it.wiktionary.org/wiki/fiore"],
  "checked": "2026-10-29"
}
```

| 칸 | 꼭? | 뜻 |
|---|---|---|
| `id` | 꼭 | 영어 소문자 슬러그 |
| `name` | 꼭 | 표제어 (이탈리아어 그대로, 악센트 포함) |
| `say` | | 한글 발음 |
| `ipa` | | 국제음성기호 (대괄호 없이) |
| `pos` | 꼭 | 품사. `vocab.itPos` 중 하나 (명사, 동사, 형용사, 부사, 대명사, 전치사, 접속사, 관사, 감탄사, 표현) |
| `gender` | | 명사의 성. `vocab.itGenders` (남성, 여성) |
| `plural` | | 복수형 |
| `meanings` | 꼭 | 뜻 목록. 화면에 ① ② 로 번호가 붙습니다 |
| `examples` | | 예문 목록. `it`와 `ko`가 둘 다 있어야 합니다. 목록 화면에는 첫 예문만 나옵니다 |
| `note` | | 쓰임새 메모 (상세 화면에만) |
| `topics` | | 주제. `vocab.itTopics` 중에서 여러 개 |
| `level` | 꼭 | 유럽 언어 단계. `vocab.itLevels` (A1 ~ C2) |
| `related` | | 같은 사전의 다른 낱말 `id` |
| `flowers`, `scents` | | 꽃·향 사전의 항목 `id` (한쪽에만 적어도 됩니다) |
| `sources` | 꼭 | 출처 주소. 뜻은 사전 2곳 이상으로 교차 확인 (Treccani, Garzanti, Wiktionary 등) |
| `checked` | 꼭 | 마지막 확인 날짜 |

정렬은 이탈리아어 알파벳 순서이고, 악센트는 무시합니다 (`àncora`는 A 칸).

---

## 2. 프로그램 사용법 — `data/howto.json`
## 3. 코딩 강의 — `data/coding.json`

둘 다 **향 공부·음악 공부와 같은 공부 글 형식**입니다 (`data/lessons.json`과 같은 칸).
파일만 나눴습니다: 여러 세션이 동시에 다른 파일을 고쳐도 서로 부딪히지 않게 하기 위해서입니다.

과목(`subject`)은 파일마다 정해져 있고, 다른 파일의 과목을 넣으면 검사에서 걸립니다.

| 파일 | 과목 |
|---|---|
| `data/lessons.json` | 향, 작곡, 작사, 보컬 |
| `data/howto.json` | 캐드, 포토샵, 영상 편집, 작곡 프로그램, UI/UX 툴 |
| `data/coding.json` | HTML과 CSS, 자바스크립트, 파이썬 |

과목을 바꾸거나 더하려면 `js/parts.js`의 `STUDIES`(D 파트)와 `vocab.subjects`를 함께 고칩니다.
`id`는 세 파일 전체에서 겹치면 안 됩니다. 강 번호(`no`)는 과목마다 1부터 셉니다.

```json
{
  "id": "ps-layers",
  "no": 1,
  "subject": "포토샵",
  "stage": "입문",
  "title": "레이어란 무엇인가",
  "version": "Photoshop 2025 (26.x)",
  "needs": [],
  "sections": [
    {
      "heading": "새 레이어 만들기",
      "blocks": [
        { "type": "p", "text": "**레이어**는 투명한 종이를 겹쳐 놓은 것과 같아요.", "cites": [1] },
        { "type": "steps", "items": ["**레이어** 패널을 엽니다.", "아래쪽 + 단추를 누릅니다."], "cites": [1] },
        { "type": "shortcut", "keys": "Ctrl+Shift+N", "mac": "Cmd+Shift+N", "text": "새 레이어 만들기", "cites": [1, 2] }
      ]
    }
  ],
  "sources": [
    { "n": 1, "url": "https://helpx.adobe.com/photoshop/using/layer-basics.html", "title": "Adobe 도움말 — 레이어 기본" },
    { "n": 2, "url": "https://example.com/...", "title": "다른 자료" }
  ],
  "written": "2026-10-29",
  "checked": "2026-10-29"
}
```

새로 더한 칸
- `version` (선택): 이 글이 기준으로 삼은 프로그램·언어 버전. 프로그램은 화면이 자주 바뀌니 **프로그램 사용법에는 꼭 적어 주세요.**

글 조각(`blocks`) 종류 — 기존 `p`, `analogy`에 세 가지가 더해졌습니다.

| `type` | 칸 | 화면 |
|---|---|---|
| `p` | `text`, `cites` | 문단 |
| `analogy` | `text`, `cites` | "비유하자면," 문단 (새 사실 금지) |
| `steps` | `items`(문장 목록), `cites` | 1. 2. 3. 번호 붙은 순서 |
| `shortcut` | `keys`(예: `Ctrl+Z`), `mac`(선택, 예: `Cmd+Z`), `text`, `cites` | 키 모양 단축키와 설명 |
| `code` | `lang`(예: `html`, `css`, `js`, `py`), `text`(코드 그대로), `caption`(선택), `cites`(선택) | 회색 상자 안의 코드. 줄바꿈은 `\n` |

글자 꾸밈 (`text`, `items`, `caption` 안에서)
- `**굵게**`
- `` `코드` `` — 짧은 코드나 메뉴 이름 (짝이 맞아야 합니다)
- `[[향-id|보이는 글자]]` — 향 사전으로 가는 링크

출처 규칙은 향 공부와 같습니다: 모든 `p`·`analogy`·`steps`·`shortcut`에 `cites`가 있어야 하고, 핵심 블록(`"key": true`)은 서로 다른 사이트 2곳 이상. `code`는 직접 쓴 예시라 `cites`가 없어도 되지만, 공식 문서의 예시를 옮겼다면 출처를 답니다.
프로그램 사용법은 각 회사 공식 도움말 + 다른 1곳, 코딩은 MDN·web.dev·공식 문서를 우선합니다.

---

## 화면에서 어떻게 보이나

- 책장(첫 화면)에 책이 한 권씩 서 있습니다. 내용이 없으면 점선으로 "준비 중".
- 이탈리아어: `#/italian` (목록), `#/italian/e/fiore` (낱말 하나)
- 프로그램 사용법: `#/howto` (과목별 목차), `#/howto/ps-layers` (글 하나)
- 코딩 강의: `#/coding`, `#/coding/<id>`
