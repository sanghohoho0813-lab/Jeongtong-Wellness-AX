"use client";

/**
 * 화면 전환 스위치
 * ================
 *
 * 전에는 이랬다.
 *
 *   고객용 화면 머리글 아래  "매장 직원이신가요?  내부 AX 화면 ›"   (밑줄 링크)
 *   MY WELLNESS 본문 끝    "매장 직원이신가요?  내부 화면으로"      (밑줄 링크)
 *   내부 AX 사이드바        메뉴 목록 안 '고객 화면' 한 줄
 *
 * 세 군데가 생김새도 문구도 자리도 제각각이었고, 셋 다 **작은 글씨의
 * 밑줄 링크**였다. 하루에도 몇 번 오가는 동작인데 생김새는 각주였다.
 *
 * 게다가 고객용 화면의 그 줄은 **모든 고객에게** 늘 보였다. 이 화면을
 * 보는 사람의 대부분은 고객이고, 고객에게 '내부 AX 화면' 은 눌러도
 * 로그인 벽만 만나는 막다른 길이다. 첫 화면 두 번째 줄에 막다른 길을
 * 놓아 둔 셈이다.
 *
 * 그래서 하나로 합치고, 보는 사람에 따라 다르게 그린다.
 *
 *   이 기기에서 직원으로 들어온 적이 있다
 *     → 두 칸짜리 세그먼트 스위치. 지금 있는 쪽이 눌린 상태로 보이고,
 *       반대쪽을 누르면 바로 넘어간다. 오갈 수 있다는 사실 자체가 보인다.
 *
 *   그렇지 않다 (= 대부분의 고객)
 *     → 위쪽에는 아무것도 두지 않는다. 바닥글에 '매장 직원 로그인'
 *       버튼 하나만 둔다 — 찾으면 있고, 앞을 가리지는 않는다.
 *
 * 판단 근거는 lib/auth/surface.ts 에 있고, 그 값은 권한을 조금도 주지
 * 않는다. 반대쪽 문은 여전히 StaffGate · PortalGate · RLS 가 지킨다.
 */

import Link from "next/link";
import { useStaffDevice } from "@/lib/auth/surface";
import { BuildingIcon, UsersIcon } from "@/components/ui/icons";

/**
 * 지금 서 있는 쪽.
 *
 * "public" 은 고객용 화면(/welcome) — 두 쪽 어디도 아니다. 그래서 그때는
 * 어느 칸도 눌린 상태로 그리지 않는다. 고객용 화면에 서서 'MY WELLNESS'가
 * 이미 켜진 것처럼 보이면, 눌렀을 때 다른 곳으로 가는 이유를 알 수 없다.
 */
export type Surface = "staff" | "portal" | "public";

const SIDE = {
  staff: { href: "/", label: "내부 AX", icon: BuildingIcon },
  /*
    '고객 화면' 이라고 부르다가 제품 이름으로 바꿨다.

    사이드바 메뉴의 /welcome 도 고객이 보는 화면이라, 둘 다 '고객 화면'
    이면 어느 쪽으로 가는지 알 수 없다. 이쪽은 로그인한 고객이 자기
    기록을 보는 곳이고 이름이 이미 있다 — MY WELLNESS.
  */
  portal: { href: "/my", label: "MY WELLNESS", icon: UsersIcon },
} as const;

/** 칸으로 그려지는 두 쪽. "public" 은 어느 칸도 아니라 여기 없다 */
const ORDER = ["staff", "portal"] as const;

/**
 * 두 칸 세그먼트 스위치.
 *
 * tone 은 얹히는 바탕에 따라 고른다 — 딥그린 머리글 위(dark)와
 * 미색 본문 위(light) 는 같은 색으로 그릴 수 없다.
 */
export function SurfaceSwitch({
  current,
  tone = "light",
  className = "",
}: {
  current: Surface;
  tone?: "dark" | "light";
  className?: string;
}) {
  const staffDevice = useStaffDevice();
  if (!staffDevice) return null;

  const dark = tone === "dark";
  return (
    <div
      role="group"
      aria-label="화면 전환"
      className={`inline-flex shrink-0 items-center rounded-full p-1 ${
        dark ? "bg-white/10 ring-1 ring-white/20" : "bg-stone-bg-deep ring-1 ring-stone-line"
      } ${className}`}
    >
      {ORDER.map((side) => {
        const s = SIDE[side];
        const Icon = s.icon;
        const on = side === current;
        return (
          <Link
            key={side}
            href={s.href}
            aria-current={on ? "page" : undefined}
            /*
              지금 있는 쪽도 링크로 둔다. 눌러도 제자리라 아무 일이
              없고, 대신 둘의 크기가 같아서 '두 칸 중 하나' 로 읽힌다.
              한쪽만 링크로 만들면 그냥 버튼 하나로 보인다.
            */
            className={`inline-flex min-h-[2.375rem] items-center gap-1.5 rounded-full px-3 text-[0.875rem] font-extrabold transition-colors ${
              on
                ? dark
                  ? "bg-white text-deep-900 shadow-sm"
                  : "bg-card text-ink shadow-sm ring-1 ring-stone-line"
                : dark
                  ? "text-white/70 hover:text-white"
                  : "text-ink-sub hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * 딥그린 머리글 바로 아래 붙는 띠.
 *
 * 스위치가 그려지지 않는 사람에게는 **띠 자체가 없어야 한다.** 빈 띠만
 * 남으면 화면 위쪽에 정체 모를 검은 줄 하나가 생긴다. 그래서 조건을
 * 여기서 한 번 더 본다.
 */
export function SurfaceStrip({ current }: { current: Surface }) {
  const staffDevice = useStaffDevice();
  if (!staffDevice) return null;

  return (
    <div className="border-b border-white/10 bg-deep-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        {/*
          문구를 두 번 고쳤다.

          처음엔 "이 기기는 매장 직원 기기로 연결되어 있습니다" 였는데,
          시연 빌드에서는 사실이 아니다(연결한 적이 없어도 양쪽이 열려
          있다). 어느 경우에나 참인 말로 바꾼다.

          그리고 390px 폰에서는 이 줄이 "이 기기는 매장 직원…" 으로
          잘렸다. 잘린 안내문은 안내가 아니므로, 좁은 화면에서는 아예
          내리고 스위치에 자리를 다 준다 — 스위치 두 칸만 봐도 무엇을
          하는 것인지 알 수 있다.
        */}
        <p className="hidden min-w-0 truncate text-[0.8125rem] font-bold text-white/70 sm:block">
          직원 화면과 고객 화면을 오갈 수 있습니다
        </p>
        <SurfaceSwitch current={current} tone="dark" />
      </div>
    </div>
  );
}

/**
 * 직원 통로 — 스위치가 보이지 않는 사람에게만.
 *
 * 이 기기에서 직원으로 들어온 적이 없으면 위쪽 스위치는 그려지지
 * 않는다. 그렇다고 길을 아주 없애면 원장님이 새 기기에서 매번 주소를
 * 쳐야 하므로, 바닥글에 제대로 된 버튼 하나로 둔다.
 */
export function StaffEntryButton({ className = "" }: { className?: string }) {
  const staffDevice = useStaffDevice();
  if (staffDevice) return null;

  return (
    <Link
      href="/login"
      className={`touch-target inline-flex items-center gap-2 rounded-full px-4 text-[0.9375rem] font-bold text-ink-sub ring-1 ring-stone-line transition-colors hover:bg-stone-bg-deep hover:text-ink ${className}`}
    >
      <BuildingIcon className="h-4 w-4 shrink-0" />
      매장 직원 로그인
    </Link>
  );
}
