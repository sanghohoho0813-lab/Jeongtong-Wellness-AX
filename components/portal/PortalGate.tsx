"use client";

/**
 * 로그인 · 계정 잇기
 * ==================
 *
 * 고객 화면에 들어가기 전에 지나는 문이다. 두 단계로 되어 있다.
 *
 *   1) 이메일로 6자리 숫자를 받아 넣는다  → 이 사람이 이 이메일 주인임을 확인
 *   2) 매장에서 받은 연결코드를 넣는다    → 매장 기록의 그 고객과 잇는다
 *
 * 왜 2단계가 따로 있는가
 * ----------------------
 * 1)만으로는 "이메일 주인" 까지만 알 뿐, 매장이 3년째 관리해 온 그 고객과
 * 같은 사람인지는 알 수 없다. 이메일을 아무거나 넣어도 계정은 만들어진다.
 * 연결코드는 매장이 직접 건네는 것이고, 그걸 가진 사람만 그 고객의 기록에
 * 닿는다. 그래서 포털은 **고객을 새로 만들지 않는다** — 잇기만 한다.
 *
 * 비밀번호를 만들지 않은 이유
 * ---------------------------
 * 주 고객층이 40~60대다. 비밀번호를 새로 만들고 기억하게 하는 순간
 * 다수가 첫 화면에서 멈춘다. 문자로 오는 숫자 여섯 자리가 가장 적게
 * 막힌다. (문자 발송은 이번 범위 밖이라 우선 이메일로 보낸다)
 */

import { FormEvent, useState } from "react";
import { usePortal } from "@/lib/portal/store";
import { Button, Card, FieldLabel, inputCls } from "@/components/ui";
import { PortalHeader, useDeviceTheme } from "./PortalShell";
import { useHowItWorks } from "@/components/public/HowItWorks";

function Frame({ children }: { children: React.ReactNode }) {
  // 로그인 화면도 폰의 밝기를 따라간다 (문 안쪽만 어두우면 이상하다)
  useDeviceTheme();
  return (
    <div className="min-h-dvh bg-stone-bg">
      <PortalHeader />
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
    </div>
  );
}

/** 화면 가운데 한 줄 안내 (읽는 동안 아무것도 깜빡이지 않게) */
function Waiting() {
  return (
    <Frame>
      <Card>
        <div className="space-y-3 py-6">
          <div className="h-5 w-40 animate-pulse rounded bg-stone-bg-deep" />
          <div className="h-4 w-full animate-pulse rounded bg-stone-bg-deep" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-stone-bg-deep" />
        </div>
      </Card>
    </Frame>
  );
}

function SignIn() {
  const { sendCode, verifyCode, enterSample } = usePortal();
  const { openHowItWorks, howItWorksSheet } = useHowItWorks();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  /*
    여기 있던 「아직 연결 준비 중입니다」 한 장은 없앴다.

    연결 설정이 없는 빌드에서 뜨던 화면인데, 설정이 없다는 것은 곧
    **읽어 올 실제 자료가 어디에도 없다**는 뜻이다. 보호할 것이 없는
    자리에 막다른 길을 세워 두고, 보러 온 분은 이 서비스가 무엇인지
    알 방법 없이 되돌아갔다.

    이제 그 경우는 스토어가 예시로 열어 준다(lib/portal/store.tsx).
    그래서 이 화면은 **연결 설정이 있는데 아직 로그인 안 한 분**만
    만난다. 그분께도 예시로 먼저 둘러볼 길을 둔다 — 로그인 화면은
    "이게 뭔지 모르겠는데 왜 이메일부터 달라고 하지" 에서 가장 많이
    막히는 자리다.
  */

  const askCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setMsg("이메일 주소를 입력해 주세요.");
    setBusy(true);
    setMsg("");
    try {
      await sendCode(email);
      setStep("code");
      setMsg("");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6) return setMsg("메일로 받은 6자리 숫자를 넣어 주세요.");
    setBusy(true);
    setMsg("");
    try {
      await verifyCode(email, code);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "다시 시도해 주세요.");
      setBusy(false);
    }
  };

  return (
    <Frame>
      <Card>
        <h1 className="text-[1.375rem] font-extrabold leading-snug text-ink">
          {step === "email" ? "내 이용정보 보기" : "메일로 보낸 숫자 6자리"}
        </h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-sub">
          {step === "email"
            ? "이메일 주소를 넣으면 숫자 6자리를 보내 드립니다. 비밀번호는 만들지 않으셔도 됩니다."
            : `${email} 으로 보냈습니다. 메일이 보이지 않으면 스팸함도 확인해 주세요.`}
        </p>

        {step === "email" ? (
          <form onSubmit={askCode} className="mt-5 space-y-4">
            <div>
              <FieldLabel>이메일 주소</FieldLabel>
              <input
                className={inputCls}
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-label="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
              />
            </div>
            {msg && (
              <p role="alert" className="text-sm font-bold text-danger-text">
                {msg}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "보내는 중…" : "숫자 6자리 받기"}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="mt-5 space-y-4">
            <div>
              <FieldLabel>받은 숫자 6자리</FieldLabel>
              <input
                className={`${inputCls} nowrap-num text-center text-2xl font-extrabold tracking-[0.4em] tabular`}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="받은 숫자 6자리"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
              />
            </div>
            {msg && (
              <p role="alert" className="text-sm font-bold text-danger-text">
                {msg}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "확인 중…" : "확인"}
            </Button>
            <button
              type="button"
              className="tap-line w-full text-sm font-bold text-ink-sub hover:text-ink"
              onClick={() => {
                setStep("email");
                setCode("");
                setMsg("");
              }}
            >
              이메일 주소를 다시 넣을게요
            </button>
          </form>
        )}
      </Card>

      {/*
        아직 계정이 없는 분을 위한 두 갈래.

        로그인 화면만 덩그러니 두면, 이게 무슨 화면인지 모르는 분은
        이메일을 넣을 이유를 못 찾는다. 먼저 보고 나서 시작할 수 있게 한다.
      */}
      <Card className="mt-4">
        <h2 className="text-[1rem] font-extrabold text-ink">처음이신가요?</h2>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-sub">
          계정이 없어도 어떤 화면인지 먼저 보실 수 있습니다. 예시 자료로
          채워진 화면이라 실제 기록은 아닙니다.
        </p>
        <div className="mt-3.5 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={enterSample}>
            예시로 둘러보기
          </Button>
          <Button variant="ghost" onClick={openHowItWorks}>
            어떻게 이용하게 되나요
          </Button>
        </div>
      </Card>

      <p className="mt-4 px-1 text-[0.8125rem] leading-relaxed text-ink-faint">
        여기서는 내 이용기록과 이용권만 볼 수 있습니다. 몸 상태에 대한 판단이나
        의학적 안내는 제공하지 않습니다.
      </p>
      {howItWorksSheet}
    </Frame>
  );
}

function LinkAccount() {
  const { redeemLinkCode, signOut, email } = usePortal();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) return setMsg("매장에서 받은 연결코드를 넣어 주세요.");
    setBusy(true);
    setMsg("");
    try {
      await redeemLinkCode(code);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "다시 시도해 주세요.");
      setBusy(false);
    }
  };

  return (
    <Frame>
      <Card>
        <h1 className="text-[1.375rem] font-extrabold leading-snug text-ink">
          매장에서 받은 연결코드
        </h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-sub">
          매장에 방문하시거나 전화로 요청하시면 여섯 자리 코드를 알려 드립니다.
          한 번만 넣으시면 다음부터는 바로 열립니다.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <FieldLabel>연결코드</FieldLabel>
            <input
              className={`${inputCls} text-center text-2xl font-extrabold uppercase tracking-[0.3em]`}
              aria-label="연결코드"
              maxLength={6}
              autoCapitalize="characters"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              placeholder="ABC123"
            />
          </div>
          {msg && (
            <p role="alert" className="text-sm font-bold text-danger-text">
              {msg}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "확인 중…" : "연결하기"}
          </Button>
        </form>
      </Card>

      <Card className="mt-4">
        <p className="text-[0.8125rem] leading-relaxed text-ink-sub">
          지금 <b className="text-ink">{email}</b> 으로 로그인되어 있습니다.
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="tap-line mt-1 text-sm font-bold text-ink-sub hover:text-ink"
        >
          다른 이메일로 로그인
        </button>
      </Card>
    </Frame>
  );
}

/**
 * 문지기.
 *
 * 준비가 끝난 뒤에만 children 을 그린다. 로딩 중에 잠깐이라도 내용을
 * 그리면 그사이 빈 값으로 계산된 화면이 스쳐 지나간다.
 */
export default function PortalGate({ children }: { children: React.ReactNode }) {
  const { phase, error, refresh } = usePortal();

  if (phase === "loading") return <Waiting />;
  if (phase === "anon") return <SignIn />;
  if (phase === "unlinked") return <LinkAccount />;

  if (phase === "error") {
    return (
      <Frame>
        <Card>
          <h1 className="text-[1.25rem] font-extrabold text-ink">
            정보를 불러오지 못했습니다
          </h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-sub">
            {error}
          </p>
          <Button className="mt-4 w-full" size="lg" onClick={() => void refresh()}>
            다시 시도
          </Button>
        </Card>
      </Frame>
    );
  }

  return <>{children}</>;
}
