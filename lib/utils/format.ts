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
