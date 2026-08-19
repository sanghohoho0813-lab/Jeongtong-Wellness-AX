/**
 * 한글 초성 검색
 * ==============
 * 고객 이름이 정확히 기억나지 않아도 몇 글자로 찾을 수 있게 한다.
 * "ㅎㄱㄷ" → 홍길동, "ㄱㅇ" → 김영수 처럼 초성만으로 좁혀진다.
 *
 * 별도 라이브러리 없이 유니코드 한글 음절 규칙만으로 계산한다.
 *   음절코드 = 0xAC00 + (초성 × 588) + (중성 × 28) + 종성
 */

const CHOSUNG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

const SYLLABLE_START = 0xac00;
const SYLLABLE_END = 0xd7a3;

/** 겹자음 입력을 대표 자음으로 — 자판에 따라 ㄲ 대신 ㄱ 을 치는 경우를 받아준다 */
const DOUBLE_TO_SINGLE: Record<string, string> = {
  ㄲ: "ㄱ",
  ㄸ: "ㄷ",
  ㅃ: "ㅂ",
  ㅆ: "ㅅ",
  ㅉ: "ㅈ",
};

/** 문자열의 초성만 뽑는다. 한글이 아닌 글자는 그대로 둔다 */
export function initials(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= SYLLABLE_START && code <= SYLLABLE_END) {
      out += CHOSUNG[Math.floor((code - SYLLABLE_START) / 588)];
    } else {
      out += ch;
    }
  }
  return out;
}

/** 입력이 초성만으로 이루어졌는지 (ㄱ~ㅎ 자음만) */
export function isChosungOnly(query: string): boolean {
  const q = query.replace(/\s/g, "");
  if (!q) return false;
  return [...q].every((ch) => CHOSUNG.includes(ch));
}

const normalize = (s: string) =>
  [...s.replace(/\s/g, "")].map((c) => DOUBLE_TO_SINGLE[c] ?? c).join("");

/**
 * 이름이 검색어와 맞는지 판단한다.
 * - 보통 입력이면 이름에 포함되는지
 * - 초성만 입력했으면 이름의 초성에 포함되는지
 */
export function matchesQuery(name: string, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  if (name.includes(q)) return true;
  if (!isChosungOnly(q)) return false;
  return normalize(initials(name)).includes(normalize(q));
}
