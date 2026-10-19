"use client";

/**
 * 홈 화면에 앱으로 두기 (D-58)
 * ===========================
 *
 * 대표님 내외 · 고객(40~60대)이 매번 주소를 치거나 즐겨찾기를 찾아 들어오지
 * 않게, 폰 홈 화면에 아이콘 하나로 둔다. 누르면 주소창 없이 앱처럼 열린다.
 *
 * 기기마다 길이 다르다.
 *   안드로이드 · PC 크롬/엣지  브라우저가 「설치」 신호(beforeinstallprompt)를
 *                              주면 그 자리에서 [설치] 단추 하나로 끝낸다.
 *   아이폰 · 아이패드          사파리는 그 신호를 주지 않는다 — 공유 단추 →
 *                              「홈 화면에 추가」 를 글로 안내한다.
 *   그 밖                      브라우저 메뉴에서 찾는 길을 안내한다.
 * 이미 앱으로 열려 있으면(standalone) 그렇다고만 적는다.
 *
 * 지어내지 않는다 — 신호가 없는데 [설치] 단추를 그리지 않는다. 눌러도
 * 아무 일이 없는 단추는 고장 난 것처럼 보인다.
 */

import { useEffect, useState } from "react";
import { CheckIcon, ChevronRightIcon, PlusIcon } from "./icons";

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallApp({ appName }: { appName: string }) {
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "other">("other");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(!!standalone);
    setPlatform(/iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : "other");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as PromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    const choice = await evt.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") setInstalled(true);
    setEvt(null);
  };

  const icon = (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-black/[0.06]">
      {/* 설치되면 홈 화면에 보일 바로 그 아이콘 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="h-full w-full" />
    </span>
  );

  if (installed) {
    return (
      <div data-install-app="installed" className="flex min-h-[60px] items-center gap-3 px-4 py-3">
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block text-[1rem] font-bold text-ink">앱으로 열려 있습니다</span>
          <span className="mt-0.5 block text-[0.875rem] text-ink-sub">
            홈 화면의 「{appName}」 아이콘으로 바로 여실 수 있습니다.
          </span>
        </span>
        <CheckIcon className="h-5 w-5 shrink-0 text-positive-text" />
      </div>
    );
  }

  return (
    <div data-install-app={evt ? "prompt" : "guide"}>
      {evt ? (
        <div className="flex min-h-[60px] items-center gap-3 px-4 py-3">
          {icon}
          <span className="min-w-0 flex-1">
            <span className="block text-[1rem] font-bold text-ink">홈 화면에 앱으로 두기</span>
            <span className="mt-0.5 block text-[0.875rem] text-ink-sub">
              아이콘을 누르면 주소창 없이 바로 열립니다.
            </span>
          </span>
          <button
            type="button"
            onClick={() => void install()}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-full bg-gradient-to-b from-aqua-650 to-aqua-850 px-4 text-[0.9375rem] font-extrabold text-white shadow-[0_4px_14px_rgba(14,127,125,0.30)]"
          >
            <PlusIcon className="h-4 w-4" strokeWidth={2.6} />
            설치
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-card-soft"
          >
            {icon}
            <span className="min-w-0 flex-1">
              <span className="block text-[1rem] font-bold text-ink">홈 화면에 앱으로 두기</span>
              <span className="mt-0.5 block text-[0.875rem] text-ink-sub">
                아이콘을 누르면 주소창 없이 바로 열립니다 — 방법 보기
              </span>
            </span>
            <ChevronRightIcon
              className={`h-5 w-5 shrink-0 text-ink-faint transition-transform ${open ? "rotate-90" : ""}`}
            />
          </button>
          {open && (
            <ol className="mx-4 mb-4 space-y-1.5 rounded-2xl bg-card-soft px-4 py-3 text-[0.9375rem] leading-relaxed text-ink-soft ring-1 ring-stone-line">
              {platform === "ios" ? (
                <>
                  <li>1. 사파리 아래쪽의 <b className="text-ink">공유 단추</b>(네모에 위 화살표)를 누릅니다.</li>
                  <li>2. 목록을 올려 <b className="text-ink">「홈 화면에 추가」</b> 를 누릅니다.</li>
                  <li>3. 이름이 「{appName}」 인지 보시고 <b className="text-ink">추가</b> 를 누릅니다.</li>
                </>
              ) : (
                <>
                  <li>1. 브라우저 오른쪽 위의 <b className="text-ink">메뉴</b>(⋮ 또는 …)를 누릅니다.</li>
                  <li>2. <b className="text-ink">「앱 설치」</b> 또는 <b className="text-ink">「홈 화면에 추가」</b> 를 누릅니다.</li>
                  <li>3. PC 에서는 주소창 오른쪽의 <b className="text-ink">설치 아이콘</b>을 눌러도 됩니다.</li>
                </>
              )}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
