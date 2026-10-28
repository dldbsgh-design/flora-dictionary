// Browser-safe pure logic shared by the site and the build scripts.

function hostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** A meaning is verified (확인함) only with sources on >=2 distinct hostnames. */
export function meaningVerified(meaning) {
  const hosts = new Set(
    ((meaning && meaning.sources) || []).map(hostname).filter(Boolean)
  );
  return hosts.size >= 2;
}

const CHOSUNG = ["ㄱ", "ㄱ", "ㄴ", "ㄷ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅂ", "ㅅ", "ㅅ", "ㅇ", "ㅈ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
const OTHER = "기타";

function isHangul(name) {
  const code = String(name || "").charCodeAt(0);
  return code >= HANGUL_FIRST && code <= HANGUL_LAST;
}

/** Initial consonant of the first syllable (doubled folded); non-Hangul -> "기타". */
export function chosung(name) {
  if (!isHangul(name)) return OTHER;
  return CHOSUNG[Math.floor((name.charCodeAt(0) - HANGUL_FIRST) / 588)];
}

/** Copy sorted by Korean collation on name; non-Hangul names come after Hangul. */
export function sortKo(entries) {
  const collator = new Intl.Collator("ko");
  return [...entries].sort((a, b) => {
    const ha = isHangul(a.name);
    const hb = isHangul(b.name);
    if (ha !== hb) return ha ? -1 : 1;
    return collator.compare(a.name, b.name);
  });
}

/** First letter of a Latin-script word, accents folded, as "A".."Z"; anything else -> "기타". */
export function initial(name) {
  const c = String(name || "").normalize("NFD").charAt(0).toUpperCase();
  return c >= "A" && c <= "Z" ? c : OTHER;
}

/** Copy sorted by name in a locale (e.g. "it"); "ko" (default) keeps sortKo's Hangul-first order. */
export function sortBy(entries, locale = "ko") {
  if (locale === "ko") return sortKo(entries);
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  return [...entries].sort((a, b) => collator.compare(a.name, b.name));
}

export function paginate(entries, perPage) {
  const pages = [];
  for (let i = 0; i < entries.length; i += perPage) {
    pages.push(entries.slice(i, i + perPage));
  }
  return pages;
}

function labelsOf(entry, key) {
  if (key === "chosung") return [chosung(entry.name)];
  if (key === "initial") return [initial(entry.name)];
  const value = entry[key];
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

/** Group entries by key, in `order`; multi-valued keys list an entry in each group. */
export function groupBy(entries, key, order) {
  return order
    .map((label) => ({
      label,
      entries: entries.filter((e) => labelsOf(e, key).includes(label)),
    }))
    .filter((g) => g.entries.length > 0);
}

export function byMood(mood, flowers, scents) {
  const has = (e) => (e.moods || []).includes(mood);
  return { flowers: flowers.filter(has), scents: scents.filter(has) };
}

export function findEntry(id, list) {
  return list.find((e) => e.id === id) || null;
}

/** Clamp to 1..max(pageCount,1); NaN -> 1. */
export function clampPage(n, pageCount) {
  if (Number.isNaN(n)) return 1;
  return Math.min(Math.max(n, 1), Math.max(pageCount, 1));
}
