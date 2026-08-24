"use client";

/**
 * 서비스 · 이용권 상품 (매장 가격표)
 * ==================================
 * 매장이 실제로 파는 것과 금액을 한 곳에서 관리한다.
 * 이용권 등록 화면의 판매 구성, 방문 기록의 프로그램 목록이 모두 여기를 본다.
 *
 * 가격표에 적혀 있지 않은 것(유효기간·할인율·환불규정)은 만들지 않는다.
 * 매장이 정하지 않은 규칙을 시스템이 먼저 만들어 두면, 나중에 실제 규칙이
 * 생겼을 때 서로 어긋난다.
 */

import { useState } from "react";
import { useStore } from "@/lib/data/store";
import { ServiceProduct } from "@/lib/types";
import { formatWon } from "@/lib/utils/format";
import { Badge, Button, FieldLabel, Modal, inputCls } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { CheckIcon, PlusIcon } from "@/components/ui/icons";

interface Draft {
  id?: string;
  name: string;
  serviceName: string;
  sessionCount: string;
  price: string;
  active: boolean;
}

const emptyDraft = (serviceName: string): Draft => ({
  name: "",
  serviceName,
  sessionCount: "10",
  price: "",
  active: true,
});

export default function ProductTable() {
  const { products, addProduct, updateProduct, removeProduct, memberships } =
    useStore();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ServiceProduct | null>(null);
  const [error, setError] = useState("");

  const sorted = [...products].sort((a, b) => a.sortOrder - b.sortOrder);
  const defaultService = sorted[0]?.serviceName ?? "대왕쑥뜸";

  /** 이 상품 이름으로 실제 팔린 이용권 수 — 지우기 전에 알려 준다 */
  const soldCount = (p: ServiceProduct) =>
    memberships.filter((m) => m.programName === p.name).length;

  const save = () => {
    if (!draft) return;
    const name = draft.name.trim();
    const serviceName = draft.serviceName.trim();
    const sessions = Number(draft.sessionCount.replace(/\D/g, ""));
    const price = Number(draft.price.replace(/\D/g, ""));
    if (!name) return setError("상품명을 입력하세요.");
    if (!serviceName) return setError("서비스명을 입력하세요.");
    if (!sessions || sessions < 1) return setError("횟수를 1 이상으로 입력하세요.");
    if (!price) return setError("판매가를 입력하세요.");

    if (draft.id) {
      updateProduct(draft.id, {
        name,
        serviceName,
        sessionCount: sessions,
        price,
        active: draft.active,
      });
      toast(`${name} 상품을 수정했습니다`);
    } else {
      addProduct({
        name,
        serviceName,
        sessionCount: sessions,
        price,
        active: draft.active,
      });
      toast(`${name} 상품을 추가했습니다`);
    }
    setDraft(null);
    setError("");
  };

  return (
    <div>
      <div className="space-y-2">
        {sorted.length === 0 && (
          <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-6 text-center text-sm text-ink-sub">
            등록된 상품이 없습니다. 매장 가격표대로 추가해 주세요.
          </p>
        )}
        {sorted.map((p) => {
          const perVisit = Math.round(p.price / p.sessionCount);
          return (
            <div
              key={p.id}
              className="rounded-card bg-card-soft px-4 py-3 ring-1 ring-stone-line"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-extrabold text-ink">{p.name}</span>
                {p.source === "price_sheet" && (
                  <Badge tone="gold">매장 가격표</Badge>
                )}
                {!p.active && <Badge tone="gray">판매 중지</Badge>}
                <span className="nowrap-num ml-auto text-[1.0625rem] font-extrabold tabular text-ink">
                  {formatWon(p.price)}
                </span>
              </div>
              <p className="nowrap-num mt-1 text-[0.8125rem] text-ink-sub tabular">
                {p.serviceName} · {p.sessionCount}회
                {p.sessionCount > 1 ? ` · 1회당 ${formatWon(perVisit)}` : ""}
              </p>
              <div className="-mb-1 mt-1.5 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setDraft({
                      id: p.id,
                      name: p.name,
                      serviceName: p.serviceName,
                      sessionCount: String(p.sessionCount),
                      price: String(p.price),
                      active: p.active,
                    });
                  }}
                  className="touch-target inline-flex shrink-0 items-center rounded-full px-4 text-sm font-bold text-ink-sub ring-1 ring-stone-line transition-colors hover:bg-aqua-50 hover:text-aqua-800"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRemove(p)}
                  className="touch-target inline-flex shrink-0 items-center rounded-full px-4 text-sm font-bold text-ink-faint transition-colors hover:text-danger-text"
                >
                  삭제
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        variant="secondary"
        className="mt-3 w-full sm:w-auto"
        onClick={() => {
          setError("");
          setDraft(emptyDraft(defaultService));
        }}
      >
        <PlusIcon className="h-4 w-4" />
        상품 추가
      </Button>

      {/* 추가 · 수정 */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "상품 수정" : "상품 추가"}
      >
        {draft && (
          <div className="space-y-4">
            <div>
              <FieldLabel>상품명 *</FieldLabel>
              <input
                className={inputCls}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="예: 대왕쑥뜸 10회권"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>서비스명 *</FieldLabel>
                <input
                  className={inputCls}
                  value={draft.serviceName}
                  onChange={(e) =>
                    setDraft({ ...draft, serviceName: e.target.value })
                  }
                  placeholder="예: 대왕쑥뜸"
                />
                <p className="mt-1.5 text-[0.8125rem] text-ink-sub">
                  방문 기록의 이용 프로그램 목록에 이 이름이 나옵니다.
                </p>
              </div>
              <div>
                <FieldLabel>횟수 *</FieldLabel>
                <input
                  className={inputCls}
                  value={draft.sessionCount}
                  inputMode="numeric"
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      sessionCount: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  placeholder="10"
                />
              </div>
            </div>
            <div>
              <FieldLabel>판매가 *</FieldLabel>
              <input
                className={inputCls}
                value={draft.price}
                inputMode="numeric"
                onChange={(e) =>
                  setDraft({ ...draft, price: e.target.value.replace(/\D/g, "") })
                }
                placeholder="400000"
              />
              {Number(draft.price) > 0 && (
                <p className="nowrap-num mt-1.5 text-[0.8125rem] font-bold text-aqua-800 tabular">
                  {formatWon(Number(draft.price))}
                </p>
              )}
            </div>
            {/* 체크박스 대신 누르는 단추 — 손끝이 닿는 크기를 지킨다 */}
            <button
              type="button"
              aria-pressed={draft.active}
              onClick={() => setDraft({ ...draft, active: !draft.active })}
              className={`touch-target flex w-full items-center gap-2.5 rounded-btn px-3.5 py-3 text-left ring-1 transition-colors ${
                draft.active
                  ? "bg-aqua-50 ring-aqua-200 dark:bg-aqua-500/10"
                  : "bg-card-soft ring-stone-line"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ${
                  draft.active
                    ? "bg-sel text-sel-ink ring-transparent"
                    : "bg-card ring-stone-line"
                }`}
              >
                {draft.active && <CheckIcon className="h-4 w-4" />}
              </span>
              <span className="text-[0.9375rem] font-bold text-ink-soft">
                지금 판매 중
              </span>
            </button>
            {error && (
              <p role="alert" className="rounded-btn bg-red-50 px-3 py-2 text-sm font-bold text-danger-text dark:bg-red-400/10">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>
                취소
              </Button>
              <Button onClick={save}>저장</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 삭제 확인 */}
      <Modal
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        title="상품 삭제"
      >
        {confirmRemove && (
          <>
            <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
              <b>{confirmRemove.name}</b> 을(를) 가격표에서 지웁니다. 이미 팔린
              이용권 {soldCount(confirmRemove)}건은 그대로 남고, 앞으로 등록
              화면에만 나오지 않습니다. 잠시 쉬는 상품이라면 삭제 대신{" "}
              <b>판매 중지</b>로 두는 편이 낫습니다.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmRemove(null)}>
                취소
              </Button>
              <Button
                variant="danger-ghost"
                onClick={() => {
                  removeProduct(confirmRemove.id);
                  toast(`${confirmRemove.name} 상품을 삭제했습니다`, "info");
                  setConfirmRemove(null);
                }}
              >
                삭제
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
