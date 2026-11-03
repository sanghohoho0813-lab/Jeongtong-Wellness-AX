"use client";

/**
 * 인터넷이 끊겼을 때 — 한 줄로 알린다 (D-61)
 * ========================================
 *
 * 매장 와이파이가 잠깐 끊기거나 고객이 지하에서 열면, 화면은 멀쩡해
 * 보이는데 새 내용이 오지 않는다. 아무 말이 없으면 「앱이 멈췄다」 로
 * 읽힌다. 브라우저가 알려 주는 연결 상태(online/offline)를 듣고, 끊긴
 * 동안만 맨 위(머리글 아래)에 한 줄을 띄운다. 다시 이어지면 사라진다.
 *
 * 지어서 약속하지 않는다 — 직원 화면은 기록이 이 기기에 먼저 저장되므로
 * 그렇게 적고, 고객 화면은 「보이는 내용은 마지막으로 불러온 것」 이라고만.
 */

import { useEffect, useState } from "react";

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine !== false);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return online;
}

export default function OfflineBanner({ surface }: { surface: "staff" | "portal" }) {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      data-offline
      className={`no-print sticky z-40 border-b border-black/10 bg-ink px-4 py-2.5 text-white dark:bg-stone-bg-deep ${
        surface === "staff"
          ? "top-[var(--mobile-header-h,0px)] sm:px-6 lg:top-0 lg:ml-64 lg:px-8"
          : "top-16"
      }`}
    >
      <p className="mx-auto flex max-w-7xl items-center gap-2 text-[0.875rem] font-bold leading-snug">
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-warn" />
        {surface === "staff"
          ? "인터넷 연결이 끊겼습니다. 지금 적는 기록은 이 기기에 그대로 저장됩니다."
          : "인터넷 연결이 끊겼습니다. 보이는 내용은 마지막으로 불러온 것입니다."}
      </p>
    </div>
  );
}
