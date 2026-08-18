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
