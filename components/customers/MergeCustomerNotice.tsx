"use client";

/**
 * 같은 분으로 보이는 고객이 또 있을 때 — 한 줄 안내 + 합치기
 *
 * 이름이 같거나 번호가 같은 고객이 명부에 또 있으면 고객 화면 맨 위에 한
 * 줄로 알린다. 동명이인일 수도 있으므로 저절로 합치지 않고, 두 분의 등록일 ·
 * 방문 수 · 연락처를 나란히 보여 준 뒤 사람이 고르게 한다.
 * 합친 뒤에도 7초 동안 되돌릴 수 있다.
 */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/data/store";
import type { Customer } from "@/lib/types";
import { displayName, displayPhone } from "@/lib/utils/format";
import { formatDateKr } from "@/lib/utils/date";
import { findLikelySame, mergePreview } from "@/lib/data/merge-customers";
import { Button, FormActions, Modal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

export default function MergeCustomerNotice({ customer }: { customer: Customer }) {
  const {
    customers,
    visits,
    memberships,
    privacyMode,
    canSeePhone,
    mergeCustomers,
    undoMergeCustomers,
  } = useStore();
  const toast = useToast();
  const router = useRouter();
  const others = useMemo(() => findLikelySame(customer, customers), [customer, customers]);
  const [open, setOpen] = useState(false);
  const [otherId, setOtherId] = useState<string>("");
  const [keepId, setKeepId] = useState<string>(customer.id);

  if (others.length === 0) return null;

  const other = others.find((o) => o.id === otherId) ?? others[0];
  const visitCount = (id: string) => visits.filter((v) => v.customerId === id).length;
  const pair = [customer, other];
  const keep = pair.find((p) => p.id === keepId) ?? customer;
  const drop = pair.find((p) => p.id !== keep.id)!;
  const moving = mergePreview(drop.id, visits, memberships, drop);
  const name = (c: Customer) => displayName(c.name, privacyMode);

  const start = () => {
    const o = others[0];
    setOtherId(o.id);
    // 기록이 많은 쪽을 남기는 것이 기본. 같으면 먼저 등록된 원래 분을 남긴다
    const diff = visitCount(o.id) - visitCount(customer.id);
    const older = (o.registeredAt || "9999") < (customer.registeredAt || "9999");
    setKeepId(diff > 0 || (diff === 0 && older) ? o.id : customer.id);
    setOpen(true);
  };

  const run = () => {
    const undo = mergeCustomers(keep.id, drop.id);
    setOpen(false);
    if (!undo) return;
    if (drop.id === customer.id) router.replace(`/customers/${keep.id}`);
    toast(`${name(keep)} 고객으로 합쳤습니다`, "success", {
      label: "되돌리기",
      onAction: () => undoMergeCustomers(undo),
    });
  };

  return (
    <>
      <div
        role="status"
        data-merge-notice
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card bg-warn/10 px-4 py-3 ring-1 ring-warn/40"
      >
        <p className="min-w-0 flex-1 text-[0.9375rem] font-bold leading-snug text-warn-text">
          {others[0].name.trim() === customer.name.trim() ? "같은 이름" : "같은 연락처"}의
          고객이 {others.length > 1 ? `${others.length}분` : "한 분"} 더 있습니다.
          같은 분이면 합쳐야 방문 기록이 한곳에 모입니다.
        </p>
        <Button variant="secondary" onClick={start} className="shrink-0">
          확인하고 합치기
        </Button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="같은 고객 합치기" wide>
        <div className="space-y-4">
          {others.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {others.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setOtherId(o.id);
                    setKeepId(customer.id);
                  }}
                  className={`touch-target rounded-full px-4 py-1.5 text-sm font-bold ring-1 ${
                    o.id === other.id
                      ? "bg-sel text-sel-ink ring-transparent"
                      : "bg-card-soft text-ink-sub ring-stone-line"
                  }`}
                >
                  등록 {formatDateKr(o.registeredAt)} · 방문 {visitCount(o.id)}회
                </button>
              ))}
            </div>
          )}

          <p className="text-[0.9375rem] font-bold text-ink">남길 분을 고르세요</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {pair.map((p) => {
              const on = p.id === keep.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  data-keep-choice={on ? "on" : "off"}
                  onClick={() => setKeepId(p.id)}
                  className={`rounded-card p-4 text-left ring-2 transition-colors ${
                    on ? "bg-aqua-50 ring-aqua-500" : "bg-card-soft ring-stone-line hover:bg-aqua-50"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="break-words text-lg font-extrabold text-ink">{name(p)}</span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold ${
                        on ? "bg-aqua-700 text-white" : "bg-card text-ink-sub ring-1 ring-stone-line"
                      }`}
                    >
                      {on ? "남김" : "합쳐 넣음"}
                    </span>
                  </span>
                  <span className="mt-2 block text-[0.9375rem] leading-relaxed text-ink-sub">
                    등록 {formatDateKr(p.registeredAt)}
                    <br />
                    방문 {visitCount(p.id)}회 · 이용권{" "}
                    {memberships.filter((m) => m.customerId === p.id).length}개
                    <br />
                    연락처 {p.phone?.trim() ? displayPhone(p.phone, canSeePhone) : "없음"}
                    {p.id === customer.id ? " · 지금 보는 분" : ""}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="rounded-btn bg-card-soft px-3.5 py-3 text-[0.9375rem] leading-relaxed text-ink-soft ring-1 ring-stone-line">
            {name(drop)} 고객의 방문 {moving.visits}건 · 이용권 {moving.memberships}개 · 케어 선호{" "}
            {moving.preferences}개를 {name(keep)} 고객에게 옮기고, 명부에서는 한 줄로
            줄입니다. 비어 있는 연락처 · 메모는 채우고, 둘 다 적힌 글은 이어 붙입니다.
          </p>

          <FormActions>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button onClick={run} className="min-w-32 flex-1 sm:flex-none">
              합치기
            </Button>
          </FormActions>
        </div>
      </Modal>
    </>
  );
}
