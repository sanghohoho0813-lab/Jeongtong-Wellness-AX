"use client";

/**
 * 사용자 전환 — 요구사항 8절(대표/관리자 vs 직원)의 로컬 구현.
 * 향후 Supabase Auth 연동 시 이 선택이 로그인 사용자로 대체된다.
 */

import { useState } from "react";
import { useStore } from "@/lib/data/store";
import { StaffRole } from "@/lib/types";
import { Badge, Modal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { CheckIcon } from "@/components/ui/icons";

const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "대표/관리자",
  manager: "관리자",
  staff: "직원",
};

export function UserSwitchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { staff, currentStaff, setCurrentStaff, settings } = useStore();
  const toast = useToast();

  return (
    <Modal open={open} onClose={onClose} title="사용자 전환">
      <p className="mb-3 text-sm text-ink-sub">
        직원 계정은 고객관리·방문기록 중심으로 사용하며, 매출과 운영 관리
        정보는 대표/관리자에게만 표시됩니다.
      </p>
      <ul className="space-y-2">
        {staff
          .filter((s) => s.active)
          .map((s) => {
            const current = s.id === currentStaff?.id;
            return (
              <li key={s.id}>
                <button
                  onClick={() => {
                    setCurrentStaff(s.id);
                    toast(`${s.name} (${ROLE_LABELS[s.role]}) 계정으로 전환했습니다`);
                    onClose();
                  }}
                  className={`touch-target flex w-full items-center gap-3 rounded-card px-3.5 py-3 text-left transition-all ${
                    current
                      ? "bg-aqua-50 ring-2 ring-aqua-500"
                      : "bg-card-soft ring-1 ring-black/[0.05] hover:bg-aqua-50 dark:ring-white/10"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white ${
                      s.role === "owner"
                        ? "bg-gradient-to-br from-aqua-500 to-deep-700"
                        : "bg-gradient-to-br from-sky-500 to-sky-700"
                    }`}
                  >
                    {s.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-extrabold text-ink">
                        {s.name}
                      </span>
                      <Badge tone={s.role === "owner" ? "gold" : s.role === "manager" ? "aqua" : "sky"} dot>
                        {ROLE_LABELS[s.role]}
                      </Badge>
                    </span>
                    <span className="block truncate text-xs text-ink-sub">
                      {settings.branchName}
                    </span>
                  </span>
                  {current && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-aqua-500 text-white">
                      <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.4} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
      </ul>
    </Modal>
  );
}

export function roleLabel(role: StaffRole): string {
  return ROLE_LABELS[role];
}

/** 프로필 카드 (사이드바/더보기 공용) — 클릭 시 사용자 전환 */
export function ProfileButton({ compact = false }: { compact?: boolean }) {
  const { currentStaff, settings } = useStore();
  const [open, setOpen] = useState(false);
  if (!currentStaff) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex w-full items-center gap-3 rounded-card border border-black/[0.04] bg-stone-bg p-3.5 text-left transition-colors hover:bg-aqua-50 dark:border-white/[0.06] ${compact ? "" : ""}`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white ${
            currentStaff.role === "owner"
              ? "bg-gradient-to-br from-aqua-500 to-deep-700"
              : "bg-gradient-to-br from-sky-500 to-sky-700"
          }`}
        >
          {currentStaff.name.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-extrabold text-ink">
            {currentStaff.name}
          </span>
          <span className="block truncate text-xs font-medium text-ink-sub">
            {settings.branchName} · {ROLE_LABELS[currentStaff.role]}
          </span>
        </span>
        <span className="shrink-0 text-xs font-bold text-aqua-700">전환</span>
      </button>
      <UserSwitchModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
