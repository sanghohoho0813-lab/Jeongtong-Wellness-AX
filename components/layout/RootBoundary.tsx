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
  /*
    여기서 children 을 <div className="px-4 py-6 sm:px-6"> 로 감싸고 있었다.
    오류 안내 카드가 화면 모서리에 붙지 않게 하려던 여백인데, 오류가 났을
    때만이 아니라 **앱 전체에 항상** 걸려 있었다.

    폰(390px)에서 그 대가가 컸다.
      - 머리글이 좌우로 17.6px 씩 들어가 앉고, 위로 26.4px 밀려났다.
      - 본문은 이 여백 위에 자기 px-4 를 또 얹어, 쓸 수 있는 폭이
        354.8px → 319.6px 로 줄었다. 화면의 10% 다.
    머리글 바탕이 본문 배경과 같은 색이라 눈에 잘 띄지 않아 오래 남아 있었다.

    여백은 필요할 때(오류 안내가 실제로 뜰 때)만 준다.
  */
  return (
    <ErrorBoundary resetKey={pathname} padded>
      {children}
    </ErrorBoundary>
  );
}
