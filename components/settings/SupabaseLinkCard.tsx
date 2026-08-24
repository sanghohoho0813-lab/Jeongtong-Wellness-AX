"use client";

/**
 * 매장 계정 연결 (설정 화면)
 *
 * 여기서 연결해야 비로소 여러 기기가 같은 자료를 보고, 고객 화면
 * (MY WELLNESS)이 열린다. 연결하지 않으면 지금까지처럼 이 기기 안에서만
 * 움직인다 — 그 상태도 정상이며, 시연이나 연습에는 오히려 그쪽이 맞다.
 *
 * 첫 연결 방향을 사람이 고르게 하는 이유
 * --------------------------------------
 * 이 기기 것을 올릴지, 서버 것을 받을지는 자동으로 정하면 안 된다.
 * 잘못 정하면 한쪽 자료가 통째로 덮인다. 그래서 양쪽에 각각 몇 명이
 * 들어 있는지 숫자로 보여 주고 고르게 한다.
 */

import { useState } from "react";
import { useStore } from "@/lib/data/store";
import { useStaffLink } from "@/lib/supabase/StaffLink";
import { Badge, Button, Card, FieldLabel, SectionTitle, inputCls } from "@/components/ui";
import { BuildingIcon, RefreshIcon } from "@/components/ui/icons";
import { formatDateTimeKr } from "@/lib/utils/date";

export default function SupabaseLinkCard() {
  const { customers } = useStore();
  const {
    phase,
    identity,
    error,
    lastSyncedAt,
    remoteCustomerCount,
    signIn,
    signOut,
    resolveFirstSync,
    syncNow,
  } = useStaffLink();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const doSignIn = async () => {
    if (!email.trim() || !pw) return setMsg("이메일과 비밀번호를 넣어 주세요.");
    setBusy(true);
    setMsg("");
    try {
      await signIn(email, pw);
      setPw("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card id="set-link">
      <SectionTitle icon={<BuildingIcon className="h-4 w-4" />}>
        매장 계정 연결
      </SectionTitle>

      {phase === "off" && (
        <p className="-mt-2 text-sm leading-relaxed text-ink-sub">
          이 빌드에는 서버 연결 설정이 들어 있지 않습니다. 지금은 이 기기
          안에서만 기록이 저장됩니다.
        </p>
      )}

      {phase === "signed_out" && (
        <>
          <p className="-mt-2 mb-4 text-sm leading-relaxed text-ink-sub">
            연결하면 여러 기기에서 같은 기록을 보고, 고객이 자기 화면
            (MY WELLNESS)에서 이용 내역을 확인할 수 있습니다. 연결하지
            않으면 지금처럼 이 기기 안에서만 저장됩니다.
          </p>
          <div className="space-y-3">
            <div>
              <FieldLabel>매장 계정 이메일</FieldLabel>
              <input
                className={inputCls}
                type="email"
                autoComplete="username"
                aria-label="매장 계정 이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>비밀번호</FieldLabel>
              <input
                className={inputCls}
                type="password"
                autoComplete="current-password"
                aria-label="비밀번호"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
            </div>
            {msg && (
              <p role="alert" className="text-sm font-bold text-danger-text">
                {msg}
              </p>
            )}
            <Button className="w-full sm:w-auto" disabled={busy} onClick={() => void doSignIn()}>
              {busy ? "확인 중…" : "연결하기"}
            </Button>
          </div>
        </>
      )}

      {phase === "no_staff" && (
        <>
          <p className="-mt-2 text-sm leading-relaxed text-ink-sub">
            로그인은 되었지만 이 계정이 어느 직원인지 이어져 있지 않습니다.
            관리자가 <b className="text-ink">staff</b> 표의{" "}
            <b className="text-ink">auth_user_id</b> 에 이 계정을 이어 주어야
            합니다.
          </p>
          <Button variant="ghost" className="mt-3" onClick={() => void signOut()}>
            로그아웃
          </Button>
        </>
      )}

      {phase === "choosing" && (
        <>
          <p className="-mt-2 mb-4 text-sm leading-relaxed text-ink-sub">
            <b className="text-ink">{identity?.staffName}</b>님으로 연결되었습니다.
            처음 연결하는 것이라 어느 쪽 기록을 살릴지 골라 주세요.{" "}
            <b className="text-ink">고른 쪽이 반대쪽을 덮어씁니다.</b>
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void resolveFirstSync("push")}
              className="rounded-card bg-card-soft px-4 py-4 text-left ring-1 ring-stone-line transition-colors hover:bg-aqua-50/60"
            >
              <span className="block font-extrabold text-ink">
                이 기기 기록을 올린다
              </span>
              <span className="nowrap-num mt-1 block text-[0.8125rem] tabular text-ink-sub">
                이 기기 고객 {customers.length}명
              </span>
            </button>
            <button
              type="button"
              onClick={() => void resolveFirstSync("pull")}
              className="rounded-card bg-card-soft px-4 py-4 text-left ring-1 ring-stone-line transition-colors hover:bg-aqua-50/60"
            >
              <span className="block font-extrabold text-ink">
                서버 기록을 받아온다
              </span>
              <span className="nowrap-num mt-1 block text-[0.8125rem] tabular text-ink-sub">
                서버 고객 {remoteCustomerCount}명
              </span>
            </button>
          </div>
          <Button variant="ghost" className="mt-3" onClick={() => void signOut()}>
            나중에 하기
          </Button>
        </>
      )}

      {phase === "syncing" && (
        <p className="-mt-2 text-sm font-bold text-aqua-700">맞추는 중입니다…</p>
      )}

      {phase === "linked" && (
        <>
          <p className="-mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-sub">
            <Badge tone="positive" dot>
              연결됨
            </Badge>
            <span>
              {identity?.staffName} · 고객 {customers.length}명
            </span>
          </p>
          <p className="nowrap-num mt-2 text-[0.8125rem] tabular text-ink-faint">
            마지막 반영{" "}
            {lastSyncedAt
              ? formatDateTimeKr(lastSyncedAt.slice(0, 10), lastSyncedAt.slice(11, 16))
              : "—"}
          </p>
          {error && (
            <p role="alert" className="mt-2 text-sm font-bold text-danger-text">
              {error}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void syncNow()}>
              <RefreshIcon className="h-4 w-4" />
              지금 맞추기
            </Button>
            {/*
              고객 화면을 새 탭으로 연다. 같은 탭에서 열면 직원 화면으로
              돌아오기가 번거롭고, 시연 중에는 두 화면을 오가야 한다.
            */}
            <a href="/my" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">고객 화면 열어보기</Button>
            </a>
            <Button variant="ghost" onClick={() => void signOut()}>
              연결 끊기
            </Button>
          </div>
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-sub">
            기록을 고치면 잠시 뒤 자동으로 반영됩니다. 연결을 끊어도 이 기기의
            기록은 그대로 남습니다.
          </p>
        </>
      )}

      {phase === "error" && (
        <>
          <p role="alert" className="-mt-2 text-sm font-bold text-danger-text">
            {error}
          </p>
          <Button variant="ghost" className="mt-3" onClick={() => void signOut()}>
            연결 끊고 다시 시도
          </Button>
        </>
      )}
    </Card>
  );
}
