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

const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"];

/** 요일 한 글자 (일~토) */
export function weekdayKr(iso: string): string {
  return WEEKDAY_KR[new Date(iso.slice(0, 10) + "T00:00:00").getDay()];
}

/** "2026. 09. 02 (수)" */
export function formatDateWithDay(iso?: string): string {
  if (!iso) return "-";
  return `${formatDateKr(iso)} (${weekdayKr(iso)})`;
}

/** "HH:mm"(24h) → "오후 2:30" */
export function formatTimeKr(time?: string): string {
  if (!time) return "";
  const [hRaw, mRaw] = time.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw ?? 0);
  if (Number.isNaN(h)) return "";
  const meridiem = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${meridiem} ${h12}:${String(m).padStart(2, "0")}`;
}

/** 날짜 + 시간 표기 — 시간이 없으면 날짜만 */
export function formatDateTimeKr(iso?: string, time?: string): string {
  if (!iso) return "-";
  const t = formatTimeKr(time);
  return t ? `${formatDateWithDay(iso)} ${t}` : formatDateWithDay(iso);
}

/** 해당 월(YYYY-MM)의 달력 셀 — 앞뒤 빈칸 포함 (일요일 시작) */
export function monthMatrix(key: string): Array<string | null> {
  const [y, m] = key.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: Array<string | null> = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** YYYY-MM 기준 n개월 이동 */
export function shiftMonth(key: string, offset: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" + "HH:mm" → ISO datetime (시간이 없으면 정오로 저장) */
export function toIsoDateTime(date: string, time?: string): string {
  const t = time && /^\d{1,2}:\d{2}$/.test(time) ? time : "12:00";
  return `${date}T${t.padStart(5, "0")}:00`;
}

/** ISO datetime → { date, time } 분해 */
export function splitIsoDateTime(iso: string): { date: string; time: string } {
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) || "12:00" };
}

/** 지금 시각의 "HH:mm" */
export function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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

/**
 * 서로 다른 표기의 시각을 안전하게 비교하기
 * =========================================
 * 이 앱에는 두 가지 표기가 섞여 있다.
 *   방문 일시   "2026-08-19T14:30:00"        — 지역(매장) 시각
 *   처리 시각   "2026-08-19T05:30:00.000Z"   — UTC
 *
 * 둘을 문자열로 그대로 비교하면 어긋난다. 한국(UTC+9)에서 저녁 8시에 처리한
 * 과제와 그날 낮 12시 방문을 비교하면, 문자열로는 방문이 "나중"으로 보인다.
 * 실제로는 8시간 전인데도 그렇다. 그래서 항상 절대 시각으로 바꿔 비교한다.
 */

/** 어떤 표기든 절대 시각(ms)으로 읽는다. 읽을 수 없으면 NaN */
export function toTimestamp(iso: string): number {
  return new Date(iso).getTime();
}

/** 어떤 표기든 지역 기준 YYYY-MM-DD 로 바꾼다 (UTC 표기의 날짜 밀림 방지) */
export function localDateOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : toDateStr(d);
}

/** a 가 b 보다 나중인가 — 표기가 달라도 올바르게 판단한다 */
export function isAfter(a: string, b: string): boolean {
  const ta = toTimestamp(a);
  const tb = toTimestamp(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return false;
  return ta > tb;
}
