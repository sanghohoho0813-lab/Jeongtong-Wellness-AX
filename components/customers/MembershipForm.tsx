"use client";

/**
 * 이용권 등록 · 수정 폼
 * 신규 구매와 재구매를 같은 화면에서 처리한다.
 * 자주 쓰는 구성은 프리셋으로 두어 타자 없이 등록할 수 있게 했다.
 */

import { useRef, useState } from "react";
import { useStore } from "@/lib/data/store";
import { Membership } from "@/lib/types";
import { todayISO } from "@/lib/utils/date";
import { formatWon } from "@/lib/utils/format";
import { Button, FieldLabel, FormActions, inputCls } from "@/components/ui";
import { useFormError } from "@/lib/utils/form";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { useToast } from "@/components/ui/toast";

/** 자주 판매하는 이용권 구성 — 누르면 프로그램·횟수·금액이 한 번에 채워진다 */
/*
 * 판매 구성은 여기 적어 두지 않는다.
 * 예전에는 프로그램명과 금액이 이 파일에 박혀 있어서, 매장이 가격을
 * 바꾸면 개발자가 코드를 고쳐야 했다. 이제는 설정의 '서비스 · 이용권 상품'
 * 한 곳(매장 가격표)을 읽는다.
 */
const COUNT_OPTIONS = [1, 3, 5, 10, 20, 30];

export default function MembershipForm({
  customerId,
  membership,
  onSaved,
  onCancel,
}: {
  customerId: string;
  /** 있으면 수정 모드 */
  membership?: Membership;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { addMembership, updateMembership, customers, products } = useStore();
  /** 매장 가격표 — 판매 중인 것만, 적어 둔 순서대로 */
  const presets = products
    .filter((p) => p.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const toast = useToast();
  const editing = !!membership;

  const [programName, setProgramName] = useState(membership?.programName ?? "");
  const [totalCount, setTotalCount] = useState(membership?.totalCount ?? 10);
  const [remaining, setRemaining] = useState(
    membership?.remainingCount ?? membership?.totalCount ?? 10,
  );
  const [price, setPrice] = useState(
    membership ? String(membership.price) : "",
  );
  const [purchasedAt, setPurchasedAt] = useState(
    membership?.purchasedAt ?? todayISO(),
  );
  const [expiresAt, setExpiresAt] = useState(membership?.expiresAt ?? "");
  const { error, fail, clear } = useFormError();
  const programRef = useRef<HTMLInputElement>(null);

  const customerName =
    customers.find((c) => c.id === customerId)?.name ?? "고객";
  const priceNum = Number(price.replace(/\D/g, "")) || 0;
  const perVisit = totalCount > 0 ? Math.round(priceNum / totalCount) : 0;

  const applyPreset = (p: (typeof presets)[number]) => {
    setProgramName(p.name);
    setTotalCount(p.sessionCount);
    setRemaining(p.sessionCount);
    setPrice(String(p.price));
    clear();
  };

  const submit = () => {
    if (!programName.trim())
      return fail("이용권 이름을 선택하거나 입력하세요.", programRef);
    // 총 횟수는 단추로 고른다 — 데려갈 칸이 없어 문장만 띄운다
    if (totalCount <= 0) return fail("총 횟수를 선택하세요.");
    clear();

    if (membership) {
      updateMembership(membership.id, {
        programName: programName.trim(),
        totalCount,
        remainingCount: Math.min(remaining, totalCount),
        price: priceNum,
        purchasedAt,
        expiresAt: expiresAt || undefined,
      });
      toast(`${customerName} 고객의 이용권을 수정했습니다`);
    } else {
      addMembership({
        customerId,
        programName: programName.trim(),
        totalCount,
        remainingCount: Math.min(remaining, totalCount),
        price: priceNum,
        purchasedAt,
        expiresAt: expiresAt || undefined,
      });
      toast(`${customerName} 고객의 이용권을 등록했습니다`);
    }
    onSaved();
  };

  return (
    <div className="space-y-4">
      {/* 1) 자주 쓰는 구성 */}
      <div>
        <FieldLabel>매장 가격표</FieldLabel>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {presets.map((p) => {
            const on =
              programName === p.name &&
              totalCount === p.sessionCount &&
              priceNum === p.price;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={`touch-target flex items-center justify-between gap-2 rounded-btn px-3.5 py-2.5 text-left text-sm font-bold transition-colors ${
                  on
                    ? "bg-gradient-to-r from-aqua-650 to-deep-700 text-white shadow-sm"
                    : "bg-card-soft text-ink-soft ring-1 ring-stone-line hover:bg-aqua-50 hover:text-aqua-800"
                }`}
              >
                <span className="min-w-0 truncate">{p.name}</span>
                <span
                  className={`nowrap-num shrink-0 text-xs ${on ? "text-white/80" : "text-ink-sub"}`}
                >
                  {formatWon(p.price)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2) 세부 내용 */}
      <div>
        <FieldLabel>이용권 이름 *</FieldLabel>
        <input
          ref={programRef}
          className={inputCls}
          value={programName}
          onChange={(e) => setProgramName(e.target.value)}
          placeholder="예: 대왕쑥뜸 10회권"
        />
      </div>

      <div>
        <FieldLabel>총 횟수 *</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setTotalCount(n);
                if (!editing) setRemaining(n);
                else setRemaining((r) => Math.min(r, n));
              }}
              className={`nowrap-num touch-target rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                totalCount === n
                  ? "bg-sel text-sel-ink shadow-sm"
                  : "bg-card-soft text-ink-sub ring-1 ring-stone-line hover:bg-aqua-50"
              }`}
            >
              {n}회
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>결제 금액 (원)</FieldLabel>
          <input
            className={inputCls}
            value={price ? Number(price).toLocaleString("ko-KR") : ""}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
            placeholder="예: 450000"
            inputMode="numeric"
          />
          {priceNum > 0 && totalCount > 0 && (
            <p className="mt-1.5 nowrap-num text-[0.8125rem] font-bold text-aqua-800">
              1회당 {perVisit.toLocaleString("ko-KR")}원
            </p>
          )}
        </div>
        <div>
          <FieldLabel>남은 횟수</FieldLabel>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRemaining((r) => Math.max(0, r - 1))}
              className="touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-card-soft text-lg font-extrabold text-ink-soft ring-1 ring-stone-line hover:bg-aqua-50"
              aria-label="남은 횟수 줄이기"
            >
              −
            </button>
            <span className="nowrap-num min-w-16 flex-1 text-center text-lg font-extrabold text-ink">
              {remaining} / {totalCount}회
            </span>
            <button
              type="button"
              onClick={() =>
                setRemaining((r) => Math.min(totalCount, r + 1))
              }
              className="touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-card-soft text-lg font-extrabold text-ink-soft ring-1 ring-stone-line hover:bg-aqua-50"
              aria-label="남은 횟수 늘리기"
            >
              +
            </button>
          </div>
          <p className="mt-1.5 text-[0.8125rem] text-ink-sub">
            보통은 총 횟수와 같습니다. 이미 사용한 이용권을 옮겨 적을 때만
            조정하세요.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>구매일</FieldLabel>
          {/* 구매일도 오늘이거나 지난 날이다 — 사용 기한만 앞을 가리킨다 */}
          <DateTimeField
            date={purchasedAt}
            withTime={false}
            ariaLabel="구매일"
            direction="past"
            onChange={(d) => setPurchasedAt(d)}
          />
        </div>
        <div>
          <FieldLabel>사용 기한 (선택)</FieldLabel>
          <DateTimeField
            date={expiresAt}
            withTime={false}
            ariaLabel="사용 기한"
            onChange={(d) => setExpiresAt(d)}
          />
        </div>
      </div>

      <FormActions error={error || undefined}>
        <Button variant="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button onClick={submit} className="min-w-32 flex-1 sm:flex-none">
          {editing ? "수정 저장" : "이용권 등록"}
        </Button>
      </FormActions>
    </div>
  );
}
