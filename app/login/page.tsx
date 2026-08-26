"use client";

/**
 * 직원 · 관리자 로그인
 * ====================
 *
 * 이 문 하나가 실제 고객자료 전체를 막는다.
 *
 * 화려하게 만들지 않았다. 아침에 문 열고 들어와 하루에 한 번 지나는
 * 자리라, 여기서 눈이 머무는 시간은 짧을수록 좋다. 이메일 · 비밀번호 ·
 * 단추 하나, 그리고 안 될 때 무엇이 잘못됐는지.
 *
 * 고객 화면과 섞이지 않게
 * -----------------------
 * 고객은 여기로 오면 안 된다. 주소도 다르고(/my) 로그인 방식도 다르다
 * (이메일로 받은 숫자 여섯 자리). 잘못 찾아온 고객이 비밀번호를 만들려고
 * 애쓰지 않도록, 아래에 고객 화면으로 가는 길을 적어 둔다.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { humanError, staffClient, supabaseConfigured } from "@/lib/supabase/client";
import { demoMode } from "@/lib/auth/mode";
import { Button, Card, FieldLabel, inputCls } from "@/components/ui";

function BrandMark() {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-aqua-500 to-deep-900 text-xl font-extrabold text-white shadow-[0_4px_14px_rgba(10,46,44,0.28)]">
        鼎
      </span>
      <span className="min-w-0">
        <span className="block text-[1.0625rem] font-extrabold tracking-tight text-ink">
          정통대왕쑥뜸원
        </span>
        <span className="block text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-aqua-700">
          Wellness Business AX
        </span>
      </span>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  /*
    이미 들어와 있으면 문 앞에 세워 두지 않는다.
    (새 탭에서 /login 을 직접 열었거나, 로그인 후 뒤로가기로 돌아온 경우)

    직원 화면의 Provider 를 여기까지 끌어오지 않는다. 이 화면이 하는 일은
    세션을 만드는 것 하나뿐이고, 그 뒤 직원 화면이 열리면서 서버에서
    "나는 누구인가"를 다시 받아 오기 때문이다.
  */
  useEffect(() => {
    const sb = staffClient();
    if (!sb) return;
    let alive = true;
    void sb.auth.getSession().then(({ data }) => {
      if (alive && data.session) router.replace(next);
    });
    return () => {
      alive = false;
    };
  }, [router, next]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) {
      setMsg("이메일과 비밀번호를 모두 넣어 주세요.");
      return;
    }
    const sb = staffClient();
    if (!sb) {
      setMsg("연결 설정이 되어 있지 않습니다.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const { error } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        // 어느 쪽이 틀렸는지는 알려 주지 않는다 — 계정이 있는지 없는지가 새어 나간다
        setMsg(
          /invalid login|credentials/i.test(error.message)
            ? "이메일 또는 비밀번호가 맞지 않습니다."
            : humanError(error),
        );
        return;
      }
      router.replace(next);
    } catch (err) {
      setMsg(humanError(err));
    } finally {
      setBusy(false);
    }
  };

  if (!supabaseConfigured) {
    return (
      <Card>
        <BrandMark />
        <h1 className="text-[1.25rem] font-extrabold text-ink">
          아직 서버에 연결되지 않았습니다
        </h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-sub">
          이 빌드에는 매장 서버 설정이 들어 있지 않습니다. 설치를 맡은 곳에
          문의해 주세요.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <BrandMark />
      <h1 className="text-[1.375rem] font-extrabold tracking-tight text-ink">
        직원 로그인
      </h1>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-sub">
        매장에서 받은 계정으로 들어옵니다. 어떤 화면을 볼 수 있는지는
        계정에 따라 정해집니다.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        <div>
          <FieldLabel>이메일</FieldLabel>
          <input
            className={inputCls}
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-label="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@jeongtong.kr"
          />
        </div>
        <div>
          <FieldLabel>비밀번호</FieldLabel>
          <input
            className={inputCls}
            type="password"
            autoComplete="current-password"
            aria-label="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {msg && (
          <p
            role="alert"
            className="rounded-card bg-red-50 px-3.5 py-2.5 text-sm font-bold leading-relaxed text-danger-text dark:bg-red-400/10"
          >
            {msg}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "확인하는 중…" : "로그인"}
        </Button>
      </form>

      <p className="mt-5 border-t border-stone-line pt-4 text-[0.8125rem] leading-relaxed text-ink-sub">
        비밀번호가 기억나지 않으면 매장 관리자에게 재설정을 요청해 주세요.
        <br />
        고객이시라면{" "}
        <Link href="/my" className="font-bold text-aqua-700 underline">
          MY WELLNESS
        </Link>{" "}
        로 들어가 주세요. 그쪽은 비밀번호 없이 이메일로 받은 숫자 여섯
        자리로 들어갑니다.
      </p>

      {demoMode && (
        <p className="mt-3 rounded-card bg-gold-soft px-3.5 py-2.5 text-[0.8125rem] font-bold leading-relaxed text-gold-deep">
          지금은 체험(Demo) 모드입니다. 로그인하지 않아도 가상 자료로 화면을
          둘러볼 수 있습니다.
        </p>
      )}
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-stone-bg px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
