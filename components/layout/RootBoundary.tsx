"use client";

/**
 * 가장 바깥 방어막.
 *
 * 화면 안쪽 오류는 AppShell 의 방어막이 잡지만, 데이터를 읽어 들이는
 * 스토어(AppProvider)에서 오류가 나면 그보다 위이므로 잡히지 않고
 * 앱 전체가 하얗게 비어 버린다. 그 마지막 경우까지 여기서 받는다.
 *
 * 스토어 바깥이라 useStore 를 쓸 수 없다 — 안내 화면이 스토어에
 * 의존하지 않도록 만들어 둔 이유다.
 */

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import ErrorBoundary from "./ErrorBoundary";

export default function RootBoundary({ children }: { children: ReactNode }) {
  // 경로가 바뀌면 다시 시도한다 (다른 화면은 멀쩡할 수 있다)
  const pathname = usePathname();
  return (
    <div className="px-4 py-6 sm:px-6">
      <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
    </div>
  );
}
