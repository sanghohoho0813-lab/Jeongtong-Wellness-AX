"use client";

/**
 * 직원 화면의 문
 * ==============
 *
 * 로그인하지 않았으면 직원 화면 안으로 들어오지 못하게 한다.
 *
 * 왜 화면에서 막는가 — 그리고 왜 그것만으로는 부족한가
 * -----------------------------------------------------
 * 이 문은 **편의**다. 로그인 안 한 사람이 텅 빈 화면을 보고 "고장 났나"
 * 하지 않게, 갈 곳으로 보내 주는 역할이다.
 *
 * 실제 방어는 여기가 아니라 서버에 있다. 자료는 전부 Supabase 의 RLS
 * 뒤에 있고, 정책은 auth.uid() 로 판단한다. 이 컴포넌트를 브라우저에서
 * 지워도 서버는 여전히 아무것도 내주지 않는다. 반대로 말하면, 이 문만
 * 만들어 놓고 RLS 를 빼먹으면 아무것도 막은 게 아니다.
 *
 * Demo 는 지나간다
 * ----------------
 * NEXT_PUBLIC_DEMO_MODE=1 이면 문을 열어 둔다. 그때 화면에 있는 것은
 * 이 기기 안에서 만든 가상 자료뿐이라, 지켜야 할 개인정보가 없다.
 * 변수를 넣지 않으면 잠긴다 — 깜빡했을 때 열리는 쪽으로 기울지 않는다.
 */

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useStaffLink } from "@/lib/supabase/StaffLink";
import { useStore } from "@/lib/data/store";
import { demoMode } from "@/lib/auth/mode";
import { Button, Card } from "@/components/ui";

/** 세션을 확인하는 동안 — 아무것도 단정하지 않고 자리만 잡아 둔다 */
function Waiting() {
  return (
    <div className="min-h-dvh bg-stone-bg px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <div className="space-y-3 py-6">
            <div className="h-5 w-40 animate-pulse rounded bg-stone-bg-deep" />
            <div className="h-4 w-full animate-pulse rounded bg-stone-bg-deep" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-stone-bg-deep" />
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function StaffGate({ children }: { children: React.ReactNode }) {
  const { phase, identity, remoteCustomerCount, resolveFirstSync, signOut } =
    useStaffLink();
  const { customers } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  // Demo 이거나 서버 설정이 아예 없으면 지금까지처럼 그냥 연다
  const open = demoMode || phase === "off";

  useEffect(() => {
    if (open) return;
    if (phase === "signed_out") {
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/login?next=${next}`);
    }
  }, [open, phase, router, pathname]);

  if (open) return <>{children}</>;

  if (phase === "checking" || phase === "signed_out") return <Waiting />;

  /*
    로그인은 됐는데 직원으로 등록되지 않은 계정.

    여기서 빈 화면을 보여 주면 "로그인은 되는데 아무것도 안 보인다" 가
    되어 아무도 원인을 모른다. 무엇이 빠졌는지와 누구에게 말해야 하는지를
    적어 둔다.
  */
  if (phase === "no_staff") {
    return (
      <div className="min-h-dvh bg-stone-bg px-4 py-10">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <h1 className="text-[1.25rem] font-extrabold text-ink">
              직원으로 등록되지 않은 계정입니다
            </h1>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-sub">
              로그인은 되었지만, 이 계정에 이어진 직원 정보가 매장에
              없습니다. 매장 관리자에게 <b>설정 → 직원</b>에서 이 이메일을
              직원으로 등록해 달라고 말씀해 주세요.
            </p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => void signOut()}
            >
              다른 계정으로 로그인
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  /*
    처음 연결하는 기기 — 어느 쪽 기록을 살릴지 먼저 고른다.

    이걸 묻지 않고 화면을 열어 주면, 방금 로그인했는데도 화면에는 이
    기기에 남아 있던 연습용 자료가 뜬다. 원장님은 "서버에 있는 우리
    고객" 을 기대하고 들어왔는데 다른 것이 보이는 셈이다. 실제로 이
    상태에서 기록을 이어 가면 연습 자료가 서버로 올라간다.

    한 번 고르면 이 기기는 다시 묻지 않는다.
  */
  if (phase === "choosing") {
    return (
      <div className="min-h-dvh bg-stone-bg px-4 py-10">
        <div className="mx-auto w-full max-w-lg">
          <Card>
            <h1 className="text-[1.25rem] font-extrabold text-ink">
              이 기기를 처음 연결합니다
            </h1>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-sub">
              <b className="text-ink">{identity?.staffName}</b>님으로
              들어왔습니다. 어느 쪽 기록을 살릴지 골라 주세요.{" "}
              <b className="text-ink">고른 쪽이 반대쪽을 덮어씁니다.</b>
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
            </div>
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-sub">
              대부분은 <b>서버 기록을 받아온다</b>가 맞습니다. 매장에서 쓰던
              첫 기기를 지금 처음 연결하는 경우에만 반대쪽을 고르세요.
            </p>
            <Button
              variant="ghost"
              className="mt-3"
              onClick={() => void signOut()}
            >
              다른 계정으로 로그인
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "syncing") return <Waiting />;

  return <>{children}</>;
}
