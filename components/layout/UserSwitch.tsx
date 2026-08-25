"use client";

/**
 * 내 계정 — 그리고 Demo 에서만 남아 있는 사용자 전환
 * ==================================================
 *
 * 로그인해서 들어왔다면 나는 서버가 정한 그 사람 하나다. 고를 수 없다.
 * 그래서 이 단추를 누르면 전환 목록이 아니라 **내 계정 · 로그아웃** 이 나온다.
 *
 * 전환 목록은 Demo 에서만 남겨 둔다. 가상 자료로 "직원에게는 매출이
 * 안 보인다" 를 보여 주려면 두 역할을 오갈 수 있어야 하기 때문이다.
 * 실제 운영에서 이게 살아 있으면 그건 권한이 아니라 장식이다.
 * (화면에서 감추는 것과 별개로, 저장소의 setCurrentStaff 자체가
 *  로그인 상태에서는 아무 일도 하지 않는다)
 */

import { useState } from "react";
import { useStore } from "@/lib/data/store";
import { useStaffLink } from "@/lib/supabase/StaffLink";
import { demoMode } from "@/lib/auth/mode";
import { StaffRole } from "@/lib/types";
import { Badge, Button, Modal } from "@/components/ui";
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

/**
 * 내 계정 창 — 로그인해서 들어온 경우.
 * 여기서 할 수 있는 일은 "누구로 들어와 있는지 확인" 과 "나가기" 둘뿐이다.
 */
function AccountModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { currentStaff, settings } = useStore();
  const { signOut } = useStaffLink();
  const [busy, setBusy] = useState(false);
  if (!currentStaff) return null;

  return (
    <Modal open={open} onClose={onClose} title="내 계정">
      <div className="flex items-center gap-3 rounded-card bg-card-soft px-4 py-3.5 ring-1 ring-stone-line">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-aqua-500 to-deep-700 text-base font-extrabold text-white">
          {currentStaff.name.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-extrabold text-ink">
              {currentStaff.name}
            </span>
            <Badge
              tone={
                currentStaff.role === "owner"
                  ? "gold"
                  : currentStaff.role === "manager"
                    ? "aqua"
                    : "sky"
              }
              dot
            >
              {ROLE_LABELS[currentStaff.role]}
            </Badge>
          </span>
          <span className="block truncate text-xs text-ink-sub">
            {settings.branchName}
          </span>
        </span>
      </div>

      <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-sub">
        볼 수 있는 화면과 자료는 이 계정에 정해져 있습니다. 화면에서 바꿀 수
        없으며, 바꾸려면 매장 관리자가 <b>설정 → 직원</b>에서 권한을 조정해야
        합니다.
      </p>

      <div className="mt-4 flex justify-end">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await signOut();
              // 문 밖으로 — 게이트가 알아서 로그인 화면으로 보낸다
              window.location.assign("/login");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "나가는 중…" : "로그아웃"}
        </Button>
      </div>
    </Modal>
  );
}

/** 프로필 카드 (사이드바/더보기 공용) */
export function ProfileButton({ compact = false }: { compact?: boolean }) {
  const { currentStaff, settings, authStaff } = useStore();
  const [open, setOpen] = useState(false);
  if (!currentStaff) return null;

  /*
    전환이 가능한 상태인가 — Demo 이고, 로그인으로 정해진 내가 없을 때만.
    둘 다 확인하는 이유는, 실수로 Demo 플래그를 켠 채 실제 계정으로
    로그인했을 때까지 전환이 살아나면 안 되기 때문이다.
  */
  const canSwitch = demoMode && !authStaff;

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
        <span className="shrink-0 text-xs font-bold text-aqua-700">
          {canSwitch ? "전환" : "내 계정"}
        </span>
      </button>
      {canSwitch ? (
        <UserSwitchModal open={open} onClose={() => setOpen(false)} />
      ) : (
        <AccountModal open={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
