/**
 * 공개 화면 껍데기 — 아직 아무도 아닌 사람이 보는 자리
 * ====================================================
 *
 * 여기 오는 사람은 로그인하지 않았고, 대개 우리를 처음 본다.
 * 그래서 이 껍데기는 두 가지만 한다: 누구인지 밝히고, 다음 걸음을 보여 준다.
 *
 * 직원 화면(AppShell)의 사이드바·명령 팔레트·저장 상태 표시는 하나도
 * 가져오지 않는다. 그건 매일 쓰는 사람을 위한 장치고, 여기서는 소음이다.
 *
 * 로그인 게이트도 지나지 않는다 — 지나면 공개 화면이 아니게 된다.
 */

import type { ReactNode } from "react";
import PublicShell from "@/components/public/PublicShell";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
