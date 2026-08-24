export function formatKrw(amount: number): string {
  if (amount >= 100000000) {
    const eok = amount / 100000000;
    return `${eok % 1 === 0 ? eok : eok.toFixed(1)}억원`;
  }
  if (amount >= 10000) {
    const man = Math.round(amount / 10000);
    return `${man.toLocaleString("ko-KR")}만원`;
  }
  return `${amount.toLocaleString("ko-KR")}원`;
}

/**
 * 금액을 원 단위 그대로 — 가격표·이용권 금액처럼 정확해야 하는 자리에 쓴다.
 *
 * formatKrw 는 45,000원을 "5만원"으로 반올림한다. 지표 요약에는 그 편이
 * 읽기 좋지만, 가격표에서는 실제로 받는 돈과 화면이 달라진다.
 */
export function formatWon(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}

export function formatCount(n: number, unit = "명"): string {
  return `${n.toLocaleString("ko-KR")}${unit}`;
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11)
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  return phone;
}

/**
 * 입력 중 연락처 자동 하이픈 — 타자 중에도 010-1234-5678 형태로 유지한다.
 * 숫자만 남기고 11자리를 넘기지 않는다.
 */
export function formatPhoneInput(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** 휴대전화 형식 여부 (010/011 등 3-3~4-4 자리) */
export function isValidPhone(value: string): boolean {
  const d = value.replace(/\D/g, "");
  return d.length === 10 || d.length === 11;
}

/** 비교용 숫자만 남긴 연락처 (중복 확인) */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * 연락처 마스킹 — 직원 계정에는 전화번호를 노출하지 않는다.
 * 010-****-1234 형태로 뒷자리만 남겨 고객 식별은 가능하게 한다.
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11)
    return `${digits.slice(0, 3)}-****-${digits.slice(7)}`;
  if (digits.length >= 4) return `***-****-${digits.slice(-4)}`;
  return "***-****-****";
}

/** 권한에 따라 연락처를 그대로 보여주거나 마스킹한다 */
export function displayPhone(phone: string, canSeePhone: boolean): string {
  return canSeePhone ? formatPhone(phone) : maskPhone(phone);
}

/**
 * 고객 이름 가리기 — 화면 공유 모드에서 쓴다.
 *
 * 성과 마지막 글자는 남긴다. 완전히 가리면 원장님이 화면을 보며
 * "이분" 이라고 짚을 수가 없어서 도구로 쓸 수 없기 때문이다.
 *   김영희 → 김○희 / 최정철 → 최○철 / 김청하 → 김○하
 *   두 글자면 → 김○ / 한 글자면 → ○
 */
export function maskName(name: string): string {
  const n = name.trim();
  if (n.length <= 1) return "○";
  if (n.length === 2) return `${n[0]}○`;
  return `${n[0]}${"○".repeat(n.length - 2)}${n[n.length - 1]}`;
}

/**
 * 화면에 보일 고객 이름.
 * 화면 공유 모드가 켜져 있으면 가려서 보여준다 (저장된 값은 그대로다).
 */
export function displayName(name: string, privacyMode: boolean): string {
  return privacyMode ? maskName(name) : name;
}

/**
 * 한글 조사 자동 선택
 * ===================
 * 프로그램 이름처럼 매장이 직접 입력한 말이 문장에 들어가면
 * "베이직 케어은" 같은 어색한 표현이 나온다.
 * 마지막 글자의 받침 유무로 올바른 조사를 고른다.
 *
 * 한글 음절 = 0xAC00 + (초성×588) + (중성×28) + 종성
 * → (코드 - 0xAC00) % 28 이 0이 아니면 받침이 있다.
 */
export type Particle = "은는" | "이가" | "을를" | "과와" | "으로로";

const PARTICLE_PAIR: Record<Particle, [string, string]> = {
  은는: ["은", "는"],
  이가: ["이", "가"],
  을를: ["을", "를"],
  과와: ["과", "와"],
  으로로: ["으로", "로"],
};

/** 마지막 글자에 받침이 있는지 (한글이 아니면 false) */
export function hasFinalConsonant(word: string): boolean {
  const last = word.trim().at(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

/** 단어에 맞는 조사를 돌려준다 */
export function particleFor(word: string, kind: Particle): string {
  const [withFinal, withoutFinal] = PARTICLE_PAIR[kind];
  const final = hasFinalConsonant(word);
  // '으로/로'만 예외: ㄹ 받침은 '로'를 쓴다 (예: 서울로)
  if (kind === "으로로" && final && word.trim().at(-1)) {
    const code = word.trim().at(-1)!.charCodeAt(0);
    if ((code - 0xac00) % 28 === 8) return "로";
  }
  return final ? withFinal : withoutFinal;
}

/** 단어와 조사를 붙여 돌려준다 — "베이직 케어는" */
export function withParticle(word: string, kind: Particle): string {
  return `${word}${particleFor(word, kind)}`;
}
