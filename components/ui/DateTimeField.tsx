"use client";

/**
 * 다음 관리 예정일 입력 — 타자 없이 클릭·스크롤만으로 선택.
 * 빠른 선택(내일/1주 뒤 …) → 달력 → 오전·오후 + 시:분 순서로 좁혀 간다.
 * 값은 date("YYYY-MM-DD") 와 time("HH:mm", 24h) 두 필드로 분리해 저장한다.
 *
 *  - DateTimePanel : 항상 펼쳐진 선택 패널 (모달 안 등)
 *  - DateTimeField : 현재 값 버튼 + 눌러서 펼치는 패널 (폼/카드 안)
 */

import { useMemo, useState } from "react";
import {
  daysFromToday,
  formatDateTimeKr,
  formatMonthKr,
  monthKey,
  monthMatrix,
  shiftMonth,
  todayISO,
} from "@/lib/utils/date";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from "@/components/ui/icons";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MINUTES = ["00", "10", "20", "30", "40", "50"];
const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const QUICK = [
  { label: "내일", days: 1 },
  { label: "3일 뒤", days: 3 },
  { label: "1주 뒤", days: 7 },
  { label: "2주 뒤", days: 14 },
  { label: "4주 뒤", days: 28 },
];

function chipCls(active: boolean): string {
  return `touch-target shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${
    active
      ? "bg-sel text-sel-ink shadow-sm"
      : "bg-card text-ink-sub ring-1 ring-stone-line hover:bg-aqua-50 hover:text-aqua-800"
  }`;
}

/** "HH:mm" 분해 — 없으면 null */
function splitTime(time?: string): { h: number; m: number } | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return { h, m: Number.isNaN(m) ? 0 : m };
}

function joinTime(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface DateTimeValueProps {
  date: string;
  time?: string;
  onChange: (date: string, time?: string) => void;
  /** AI 추천 관리일 — 있으면 빠른 선택 맨 앞에 노출 */
  recommended?: { date: string; label?: string };
  withTime?: boolean;
}

/** 선택 패널 — 빠른 선택 / 달력 / 오전·오후·시·분 */
export function DateTimePanel({
  date,
  time,
  onChange,
  recommended,
  withTime = true,
  onDone,
}: DateTimeValueProps & { onDone?: () => void }) {
  const [view, setView] = useState(() => monthKey(date || todayISO()));
  const cells = useMemo(() => monthMatrix(view), [view]);
  const today = todayISO();
  const parsed = splitTime(time);
  const meridiem: "am" | "pm" | null = parsed
    ? parsed.h < 12
      ? "am"
      : "pm"
    : null;
  const hour12 = parsed ? (parsed.h % 12 === 0 ? 12 : parsed.h % 12) : null;

  const pickDate = (d: string) => {
    onChange(d, time);
    setView(monthKey(d));
  };

  const pickHour = (h12: number) => {
    const am = meridiem !== "pm"; // 오전/오후 미선택이면 오전 기준
    const h24 = am ? (h12 === 12 ? 0 : h12) : h12 === 12 ? 12 : h12 + 12;
    onChange(date || today, joinTime(h24, parsed?.m ?? 0));
  };

  const pickMinute = (m: string) => {
    const base = parsed ?? { h: 10, m: 0 };
    onChange(date || today, joinTime(base.h, Number(m)));
  };

  const pickMeridiem = (v: "am" | "pm") => {
    const base = parsed ?? { h: v === "am" ? 10 : 14, m: 0 };
    const h12 = base.h % 12 === 0 ? 12 : base.h % 12;
    const h24 = v === "am" ? (h12 === 12 ? 0 : h12) : h12 === 12 ? 12 : h12 + 12;
    onChange(date || today, joinTime(h24, base.m));
  };

  return (
    <div className="rounded-card border border-stone-line bg-card-soft p-3">
      {/* 1) 빠른 선택 */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {recommended?.date && (
          <button
            type="button"
            onClick={() => pickDate(recommended.date)}
            className={`touch-target shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${
              date === recommended.date
                ? "bg-gradient-to-r from-aqua-650 to-deep-700 text-white shadow-sm"
                : "bg-aqua-50 text-aqua-800 ring-1 ring-aqua-100 hover:bg-aqua-100"
            }`}
          >
            {recommended.label ?? "AI 추천일"}
          </button>
        )}
        {QUICK.map((q) => {
          const d = daysFromToday(q.days);
          return (
            <button
              key={q.label}
              type="button"
              onClick={() => pickDate(d)}
              className={chipCls(date === d)}
            >
              {q.label}
            </button>
          );
        })}
      </div>

      {/* 2) 달력 */}
      <div className="mt-1 rounded-btn bg-card p-2.5 ring-1 ring-stone-line">
        <div className="mb-1.5 flex items-center justify-between">
          <button
            type="button"
            aria-label="이전 달"
            onClick={() => setView((v) => shiftMonth(v, -1))}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-sub transition-colors hover:bg-aqua-50 hover:text-aqua-800"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <span className="nowrap-num text-[0.9375rem] font-extrabold text-ink">
            {formatMonthKr(view)}
          </span>
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => setView((v) => shiftMonth(v, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-sub transition-colors hover:bg-aqua-50 hover:text-aqua-800"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((w, i) => (
            <span
              key={w}
              className={`py-1 text-center text-[0.6875rem] font-bold ${
                i === 0
                  ? "text-danger-text"
                  : i === 6
                    ? "text-sky-600"
                    : "text-ink-faint"
              }`}
            >
              {w}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={`e-${i}`} />;
            const selected = d === date;
            const isToday = d === today;
            const past = d < today;
            return (
              <button
                key={d}
                type="button"
                aria-label={d}
                onClick={() => pickDate(d)}
                className={`nowrap-num flex h-9 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                  selected
                    ? "bg-gradient-to-br from-aqua-650 to-deep-700 text-white shadow-sm"
                    : isToday
                      ? "bg-aqua-50 text-aqua-800 ring-1 ring-aqua-100"
                      : past
                        ? "text-ink-faint hover:bg-stone-bg"
                        : "text-ink-soft hover:bg-aqua-50 hover:text-aqua-800"
                }`}
              >
                {Number(d.slice(8))}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3) 오전 / 오후 + 시 + 분 */}
      {withTime && (
        <div className="mt-2.5 space-y-2 rounded-btn bg-card p-2.5 ring-1 ring-stone-line">
          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-xs font-bold text-ink-faint">
              시간
            </span>
            <div
              className="flex flex-1 gap-2"
              role="group"
              aria-label="오전 오후"
            >
              {(["am", "pm"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => pickMeridiem(v)}
                  className={`touch-target flex-1 rounded-btn px-3 py-2 text-sm font-bold transition-colors ${
                    meridiem === v
                      ? "bg-sel text-sel-ink shadow-sm"
                      : "bg-card-soft text-ink-soft ring-1 ring-stone-line hover:bg-aqua-50"
                  }`}
                >
                  {v === "am" ? "오전" : "오후"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-xs font-bold text-ink-faint">
              시
            </span>
            <div className="no-scrollbar -mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 py-0.5">
              {HOURS_12.map((h) => (
                <button
                  key={h}
                  type="button"
                  aria-label={`${h}시`}
                  onClick={() => pickHour(h)}
                  className={`nowrap-num ${chipCls(hour12 === h)} !px-3`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-xs font-bold text-ink-faint">
              분
            </span>
            <div className="no-scrollbar -mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 py-0.5">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-label={`${Number(m)}분`}
                  onClick={() => pickMinute(m)}
                  className={`nowrap-num ${chipCls(
                    parsed ? String(parsed.m).padStart(2, "0") === m : false,
                  )} !px-3`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4) 정리 */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChange("", undefined)}
          className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold text-ink-sub transition-colors hover:bg-stone-bg hover:text-danger-text"
        >
          <XIcon className="h-3.5 w-3.5" />
          지우기
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="touch-target rounded-btn bg-sel px-4 py-2 text-sm font-bold text-sel-ink shadow-sm transition-colors"
          >
            완료
          </button>
        )}
      </div>
    </div>
  );
}

/** 값 버튼 + 펼침 패널 — 폼·카드 안에서 사용 */
export function DateTimeField({
  date,
  time,
  onChange,
  recommended,
  withTime = true,
  disabled = false,
  ariaLabel = "다음 관리일",
  defaultOpen = false,
}: DateTimeValueProps & {
  disabled?: boolean;
  ariaLabel?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2.5 rounded-btn border px-3.5 py-2.5 text-left transition-colors ${
          disabled
            ? "cursor-not-allowed border-stone-line bg-stone-bg text-ink-faint"
            : open
              ? "border-aqua-500 bg-card ring-2 ring-aqua-100"
              : "border-stone-line bg-card hover:border-aqua-500"
        }`}
      >
        <CalendarIcon
          className={`h-5 w-5 shrink-0 ${date ? "text-aqua-700" : "text-ink-faint"}`}
        />
        <span
          className={`min-w-0 flex-1 truncate text-[0.9375rem] font-bold ${
            date ? "text-ink" : "text-ink-faint"
          }`}
        >
          {date ? formatDateTimeKr(date, time) : "날짜 선택"}
        </span>
        {!disabled && (
          <span className="shrink-0 text-xs font-bold text-aqua-700">
            {open ? "닫기" : date ? "변경" : "선택"}
          </span>
        )}
      </button>

      {open && !disabled && (
        <div
          className="mt-2"
          // 모달 안에서 열렸을 때 ESC 가 모달까지 닫아 버리지 않도록,
          // 패널이 열려 있으면 여기서 먼저 처리하고 전파를 멈춘다.
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <DateTimePanel
            date={date}
            time={time}
            onChange={onChange}
            recommended={recommended}
            withTime={withTime}
            onDone={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
