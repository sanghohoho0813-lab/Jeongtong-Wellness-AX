"use client";

/**
 * 찾자마자 기록 — 빠른 실행에서 바로 여는 방문 기록 창
 *
 * 고객 상세에서 열 때는 이미 그 고객 화면에 있으니 누구인지 헷갈릴 일이 없다.
 * 하지만 검색 결과에서 곧장 열면 화면 어디에도 이름이 없어, 엉뚱한 분에게
 * 기록할 위험이 있다. 그래서 여기서는 **누구의 기록인지를 먼저 못박는다.**
 */

import VisitForm from "@/components/visits/VisitForm";
import { Modal } from "@/components/ui";
import { useStore } from "@/lib/data/store";
import { displayName, displayPhone } from "@/lib/utils/format";
import { formatRelative } from "@/lib/utils/date";

export default function QuickVisitModal({
  customerId,
  onClose,
}: {
  customerId?: string;
  onClose: () => void;
}) {
  const { derivedById, canSeePhone, privacyMode } = useStore();
  const derived = customerId ? derivedById.get(customerId) : undefined;

  return (
    <Modal
      open={!!customerId && !!derived}
      onClose={onClose}
      title={
        derived
          ? `${displayName(derived.customer.name, privacyMode)} 님 방문 기록`
          : "방문 기록"
      }
      wide
    >
      {derived && (
        <>
          {/* 누구의 기록인지 한 번 더 — 검색에서 바로 열었을 때의 안전장치 */}
          <div className="mb-4 flex items-center gap-3 rounded-card bg-card-soft px-3.5 py-3 ring-1 ring-black/[0.04]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aqua-500 to-deep-800 font-extrabold text-white">
              {displayName(derived.customer.name, privacyMode).slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-extrabold text-ink">
                {displayName(derived.customer.name, privacyMode)}
              </p>
              <p className="tabular line-clamp-2 text-[0.875rem] leading-snug text-ink-sub">
                {displayPhone(derived.customer.phone, canSeePhone)} · 방문{" "}
                {derived.visitCount}회
                {derived.lastVisitDate
                  ? ` · 최근 ${formatRelative(derived.lastVisitDate)}`
                  : ""}
              </p>
            </div>
          </div>

          <VisitForm
            customerId={derived.customer.id}
            onSaved={onClose}
            onCancel={onClose}
          />
        </>
      )}
    </Modal>
  );
}
