"use client";

/**
 * 첫 실행 환영 안내
 * ==================
 *
 * 왜 생겼나
 * ---------
 * 사용 방법(투어)은 있었다. 그런데 **스스로 나타나지 않았다.** 입구가
 * 사용 방법 화면 · 명령 팔레트(Ctrl+K) · 폰 더보기 셋뿐이라, 이 앱을
 * 처음 켠 60대 대표님이 그걸 찾아 들어갈 길이 없었다. "만져 보면
 * 되는데 그것조차 어렵다" 는 말은 대개 기능이 없어서가 아니라
 * **첫 화면이 아무것도 권하지 않아서** 나온다.
 *
 * 그래서 처음 켠 기기에서 딱 한 번, 이 창이 먼저 인사한다. 하는 말은
 * 셋뿐이다 — 따라 하며 배울 수 있다, 글자를 키울 수 있다, 나중에
 * 봐도 된다. 어느 쪽을 눌러도 다시 나오지 않는다. 붙드는 안내는
 * 안내가 아니라 장애물이다.
 *
 * 왜 시연 빌드에서는 자동으로 안 뜨나
 * -----------------------------------
 * 시연 빌드는 남 앞에서 켜는 것이다. 정책기관 담당자 앞에서 화면을
 * 열자마자 "처음 오셨나요?" 가 뜨면 그 순간 이야기가 끊긴다.
 * 대신 강제 표식(jt-welcome-force)을 두어 회귀 검사는 시연 빌드에서도
 * 이 창을 열어 확인한다.
 */

import { useEffect, useState } from "react";
import { useStore } from "@/lib/data/store";
import { useTour } from "@/components/docs/Tour";
import { demoMode } from "@/lib/auth/mode";
import { Modal } from "@/components/ui";
import { BookIcon, SparkIcon } from "@/components/ui/icons";

const DONE_KEY = "jt-welcome-done";
const FORCE_KEY = "jt-welcome-force";

export default function WelcomeIntro() {
  const { ready, settings, updateSettings } = useStore();
  const { startTour } = useTour();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    try {
      const done = localStorage.getItem(DONE_KEY) === "1";
      const force = localStorage.getItem(FORCE_KEY) === "1";
      if (force || (!done && !demoMode)) setOpen(true);
    } catch {
      /* 저장소가 막힌 브라우저에서는 조용히 넘어간다 */
    }
  }, [ready]);

  const dismiss = () => {
    try {
      localStorage.setItem(DONE_KEY, "1");
      localStorage.removeItem(FORCE_KEY);
    } catch {
      /* 못 적어도 이번 화면은 닫는다 */
    }
    setOpen(false);
  };

  const big = settings.fontScale === "large";

  return (
    <Modal open={open} onClose={dismiss} title="처음 오셨나요?">
      <div className="space-y-4">
        <p className="text-[1.0625rem] leading-relaxed text-ink-soft">
          화면 위에서 하나씩 짚어 드리는 <b className="text-ink">사용 방법</b>이
          있습니다. 네 걸음이면 오늘 할 일을 시작하실 수 있습니다.
        </p>

        {/*
          단추 셋을 세로로 크게 쌓는다. 가로로 나란히 두면 폰에서 글자가
          줄어들고, 이 창을 보는 분들이야말로 작은 단추에서 막힌다.
        */}
        <button
          type="button"
          onClick={() => {
            dismiss();
            startTour("quick");
          }}
          className="flex w-full items-center gap-3.5 rounded-card bg-gradient-to-b from-aqua-650 to-aqua-850 px-5 py-4 text-left shadow-[0_2px_10px_rgba(14,127,125,0.35)] transition-colors hover:from-aqua-850 hover:to-deep-700"
        >
          <SparkIcon className="h-6 w-6 shrink-0 text-white" />
          <span className="min-w-0 flex-1">
            <span className="block text-[1.125rem] font-extrabold text-white">
              사용 방법 따라 하기
            </span>
            <span className="mt-0.5 block text-[0.9375rem] text-white/85">
              실제 화면 위에서 네 걸음 · 3분이면 됩니다
            </span>
          </span>
        </button>

        {/*
          글자 크기를 여기서 바로 바꾼다.

          설정 화면에 이미 있는 기능이지만, 글자가 작아 불편한 분일수록
          설정 화면까지 찾아 들어가기가 어렵다. 필요한 사람이 가장 먼저
          만나는 자리에 둔다. 누르면 그 자리에서 바로 커져서, 무엇이
          바뀌는지 설명할 필요가 없다.
        */}
        <button
          type="button"
          aria-pressed={big}
          onClick={() =>
            updateSettings({ fontScale: big ? "default" : "large" })
          }
          className={`flex w-full items-center gap-3.5 rounded-card px-5 py-4 text-left ring-1 transition-colors ${
            big
              ? "bg-sel text-sel-ink ring-transparent"
              : "bg-card-soft ring-stone-line hover:bg-aqua-50/60"
          }`}
        >
          <span
            aria-hidden
            className={`shrink-0 text-[1.5rem] font-extrabold leading-none ${big ? "" : "text-ink"}`}
          >
            가
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block text-[1.125rem] font-extrabold ${big ? "" : "text-ink"}`}>
              {big ? "글자를 크게 보는 중입니다" : "글자가 작게 보이면 — 크게 하기"}
            </span>
            <span className={`mt-0.5 block text-[0.9375rem] ${big ? "opacity-85" : "text-ink-sub"}`}>
              {big ? "한 번 더 누르면 원래 크기로 돌아갑니다" : "누르는 즉시 이 화면부터 커집니다"}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={dismiss}
          className="touch-target w-full rounded-card px-5 text-[1rem] font-bold text-ink-sub transition-colors hover:bg-stone-bg hover:text-ink"
        >
          나중에 볼게요
        </button>

        <p className="flex items-start gap-2 rounded-card bg-stone-bg px-4 py-3 text-[0.875rem] leading-relaxed text-ink-sub">
          <BookIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
          <span>
            언제든 다시 보실 수 있습니다 — PC는 왼쪽 아래{" "}
            <b className="text-ink-soft">[사용 방법]</b>, 폰은 아래{" "}
            <b className="text-ink-soft">[더보기]</b> 안에 있습니다.
          </span>
        </p>
      </div>
    </Modal>
  );
}
