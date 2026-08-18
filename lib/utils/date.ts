const DAY_MS = 24 * 60 * 60 * 1000;

export function todayISO(): string {
  return toDateStr(new Date());
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 오늘 기준 n일 전/후의 YYYY-MM-DD */
export function daysFromToday(offset: number): string {
  return toDateStr(new Date(Date.now() + offset * DAY_MS));
}

/** ISO 날짜(또는 datetime) 문자열 → 오늘과의 일수 차이 (과거면 양수) */
export function daysAgo(iso: string): number {
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  const today = new Date(todayISO() + "T00:00:00");
  return Math.round((today.getTime() - d.getTime()) / DAY_MS);
}

/** 두 ISO 날짜 사이 일수 (a - b) */
export function diffDays(a: string, b: string): number {
  const da = new Date(a.slice(0, 10) + "T00:00:00");
  const db = new Date(b.slice(0, 10) + "T00:00:00");
  return Math.round((da.getTime() - db.getTime()) / DAY_MS);
}

export function formatDateKr(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDateShort(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 상대 표기: 오늘, 어제, n일 전, n일 후 */
export function formatRelative(iso?: string): string {
  if (!iso) return "-";
  const n = daysAgo(iso);
  if (n === 0) return "오늘";
  if (n === 1) return "어제";
  if (n > 1) return `${n}일 전`;
  if (n === -1) return "내일";
  return `${-n}일 후`;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

export function formatMonthKr(key: string): string {
  const [y, m] = key.split("-");
  return `${y}년 ${Number(m)}월`;
}

/** 최근 n개월의 YYYY-MM 목록 (오래된 것부터) */
export function recentMonthKeys(n: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}
