"use client";

/**
 * 직원 한 명에게 로그인 계정 잇기
 * ================================
 *
 * 계정 자체는 여기서 만들지 않는다. 사용자 생성은 service_role 키가
 * 필요한 일이고, 그 키는 브라우저에 두지 않는다는 원칙이 먼저다.
 * 계정은 Supabase 대시보드에서 초대(Invite user)로 만들고, 여기서는
 * **이미 있는 이메일을 이 직원에 잇기만** 한다.
 *
 * 이 화면이 하는 일이 곧 권한 부여다. 계정을 이어야 그 사람이 로그인해서
 * 자기 몫의 화면을 볼 수 있고, 역할(대표/관리자/직원)이 그 사람의 권한이
 * 된다. 그래서 이 줄은 관리자에게만 보인다.
 */

import { useState } from "react";
import { staffClient, humanError } from "@/lib/supabase/client";
import { useStaffLink } from "@/lib/supabase/StaffLink";
import { toUuid } from "@/lib/supabase/ids";
import { Button, inputCls } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

export default function StaffAccountRow({
  staffId,
  staffName,
}: {
  staffId: string;
  staffName: string;
}) {
  const { phase } = useStaffLink();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // 서버에 연결돼 있을 때만 의미가 있다 (연결 전에는 이어 줄 계정이 없다)
  if (phase !== "linked" && phase !== "choosing") return null;

  const call = async (fn: "link_staff_account" | "unlink_staff_account") => {
    const sb = staffClient();
    if (!sb) return;
    setBusy(true);
    setMsg("");
    try {
      const { data, error } = await sb.rpc(
        fn,
        fn === "link_staff_account"
          ? { p_staff_id: toUuid(staffId), p_email: email.trim() }
          : { p_staff_id: toUuid(staffId) },
      );
      if (error) throw error;
      toast(`${staffName} · ${data ?? "처리했습니다."}`);
      setOpen(false);
      setEmail("");
    } catch (e) {
      setMsg(humanError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-line shrink-0 text-sm font-bold text-aqua-700"
      >
        계정 연결
      </button>
    );
  }

  return (
    <div className="w-full rounded-card bg-card-soft px-3.5 py-3 ring-1 ring-stone-line">
      <p className="text-[0.8125rem] leading-relaxed text-ink-sub">
        <b>{staffName}</b> 님이 로그인에 쓸 이메일을 넣어 주세요. 그 이메일로
        만들어진 계정이 이미 있어야 합니다.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} !w-auto min-w-52 flex-1`}
          type="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          aria-label={`${staffName} 로그인 이메일`}
          placeholder="name@jeongtong.kr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button size="sm" disabled={busy || !email.trim()} onClick={() => void call("link_staff_account")}>
          {busy ? "확인 중…" : "연결"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => void call("unlink_staff_account")}
        >
          연결 해제
        </Button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setMsg("");
          }}
          className="tap-line text-sm font-bold text-ink-sub"
        >
          닫기
        </button>
      </div>
      {msg && (
        <p role="alert" className="mt-2 text-sm font-bold text-danger-text">
          {msg}
        </p>
      )}
    </div>
  );
}
