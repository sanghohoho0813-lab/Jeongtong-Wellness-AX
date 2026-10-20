"use client";

/**
 * 날짜 고르기 시트 — 고객 앱 (D-60)
 * ================================
 *
 * 방문 요청의 「달력에서 고르기」 는 브라우저의 날짜 칸(input type=date)
 * 이었다. 폰마다 생김새가 다르고(아이폰은 휠, 안드로이드는 작은 달력),
 * 영어로 설정된 폰에서는 「mm/dd/yyyy」 가 그대로 보였다. 무엇보다 고른
 * 날이 작은 칸 안의 숫자로만 남아, 위의 날짜 칩과 따로 놀았다.
 *
 * 이제 아래에서 올라오는 큰 달력 한 장이다 (다른 창과 같은 시트 —
 * 손잡이를 쓸어내리면 닫힌다). 칸은 손끝 크기, 지난 날은 고를 수 없고,
 * 일요일 · 토요일은 색으로 구분한다. 누르면 고르고 바로 닫힌다.
 *
 * 매장 휴무일은 화면이 모른다 — 막지 않고, 매장에서 확인해 연락드린다고
 * 적는다 (지어내지 않는다).
 */

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { formatMonthKr, monthKey, monthMatrix, shiftMonth, todayISO } from "@/lib/utils/date";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function DateSheet({
  open,
  value,
  min,
  onPick,
  onClose,
}: {
  open: boolean;
  value: string;
  /** 이보다 앞선 날은 고를 수 없다 (기본: 오늘) */
  min?: string;
  onPick: (date: string) => void;
  onClose: () => void;
}) {
  const today = todayISO();
  const floor = min ?? today;
  const [view, setView] = useState(() => monthKey(value || today));
  /* 열 때마다 고른 날(없으면 이번 달)부터 */
  useEffect(() => {
    if (open) setView(monthKey(value || today));
  }, [open, value, today]);
  const cells = useMemo(() => monthMatrix(view), [view]);
  const atFloor = view <= monthKey(floor);

  return (
    <Modal open={open} onClose={onClose} title="날짜 고르기">
      <div data-date-sheet>
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            aria-label="이전 달"
            disabled={atFloor}
            onClick={() => setView((v) => shiftMonth(v, -1))}
            className="press flex h-11 w-11 items-center justify-center rounded-full text-ink-sub hover:bg-aqua-50 disabled:opacity-30"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <span className="nowrap-num text-[1.125rem] font-extrabold text-ink">
            {formatMonthKr(view)}
          </span>
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => setView((v) => shiftMonth(v, 1))}
            className="press flex h-11 w-11 items-center justify-center rounded-full text-ink-sub hover:bg-aqua-50"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w, i) => (
            <span
              key={w}
              className={`py-1 text-center text-[0.8125rem] font-extrabold ${
                i === 0 ? "text-danger-text" : i === 6 ? "text-aqua-700" : "text-ink-sub"
              }`}
            >
              {w}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={`b${i}`} aria-hidden />;
            const past = d < floor;
            const on = d === value;
            const isToday = d === today;
            const wd = i % 7;
            return (
              <button
                key={d}
                type="button"
                disabled={past}
                aria-pressed={on}
                aria-label={`${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일 (${WEEKDAYS[wd]})${isToday ? " 오늘" : ""}`}
                onClick={() => {
                  onPick(d);
                  onClose();
                }}
                className={`press nowrap-num tabular flex h-11 items-center justify-center rounded-full text-[1rem] font-extrabold transition-colors ${
                  on
                    ? "bg-sel text-sel-ink shadow-sm"
                    : past
                      ? "text-ink-faint/50"
                      : `hover:bg-aqua-50 ${
                          isToday ? "ring-2 ring-aqua-400" : ""
                        } ${wd === 0 ? "text-danger-text" : wd === 6 ? "text-aqua-700" : "text-ink"}`
                }`}
              >
                {Number(d.slice(8, 10))}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-sub">
          지난 날은 고를 수 없습니다. 매장 휴무일은 남겨 주시면 매장에서 확인해
          연락드립니다.
        </p>
      </div>
    </Modal>
  );
}
