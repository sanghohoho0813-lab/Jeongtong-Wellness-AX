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
