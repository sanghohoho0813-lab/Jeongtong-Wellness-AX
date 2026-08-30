"use client";

/**
 * 이 브라우저가 어느 화면들을 오갈 수 있는가
 * ============================================
 *
 * 이 프로젝트에는 성격이 다른 세 화면이 있다.
 *
 *   내부 AX (/, /customers, /briefing …)  — 매장 직원이 매일 쓰는 업무 화면
 *   MY WELLNESS (/my …)                   — 고객이 자기 기록만 보는 화면
 *   공개 Front (/welcome)                 — 로그인하지 않은 사람이 보는 화면
 *
 * 세 화면은 껍데기(Shell)도 Provider 도 서로 다르다. 그래서 "지금 보는
 * 사람이 반대쪽으로 갈 수 있는 사람인가" 를 각 껍데기가 따로 알 방법이
 * 없었고, 결국 어느 화면에나 똑같은 밑줄 링크 하나를 달아 두는 것으로
 * 끝나 있었다. 고객에게는 필요 없는 '내부 AX 화면' 이 늘 보이고,
 * 직원에게는 돌아갈 길이 작은 글씨 하나였다.
 *
 * 이 파일은 그 사이에 놓는 **아주 얇은 표시** 하나다.
 *
 * 이것이 권한이 아니라는 점
 * -------------------------
 * 여기 적히는 값은 **화면을 어떻게 그릴지**만 정한다. 권한은 조금도 주지
 * 않는다.
 *
 *   - 내부 AX 는 StaffGate 가 막고, 그 뒤의 자료는 전부 Supabase RLS 가
 *     auth.uid() 로 판단한다.
 *   - MY WELLNESS 는 PortalGate 가 막고, 고객은 RLS 로 자기 행만 읽는다.
 *
 * 그러니 누군가 브라우저 저장소에 이 값을 손으로 써 넣어도 얻는 것은
 * "버튼이 하나 더 보인다" 뿐이고, 눌러 봐야 로그인 화면이 받는다.
 * 반대로 이 파일을 통째로 지워도 막히는 것은 하나도 없다 —
 * 이건 편의지 자물쇠가 아니다.
 *
 * 값은 언제 켜지고 언제 꺼지는가
 * ------------------------------
 *   켜짐 — 직원으로 실제 로그인이 확인된 순간(StaffLink 의 identity 확정)
 *   꺼짐 — 로그아웃할 때
 *
 * 즉 "이 기기에서 직원으로 들어온 적이 있다" 는 뜻이고, 그 기기에서만
 * 왕복 스위치를 보여 준다. 매장 태블릿 하나를 직원과 고객이 번갈아
 * 쓰는 상황이 실제로 있으므로, 로그아웃하면 바로 꺼지게 해 둔다.
 */

import { useEffect, useState } from "react";
import { demoMode } from "@/lib/auth/mode";

const KEY = "jt.staff-device";
/** 같은 탭 안에서도 즉시 반영되도록 — storage 이벤트는 다른 탭에만 간다 */
const EVENT = "jt:staff-device";

export function markStaffDevice(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // 사생활 보호 모드 등으로 저장소가 막혀 있어도 화면은 그대로 돌아간다
  }
}

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * 이 기기에서 직원으로 들어온 적이 있는가.
 *
 * 첫 그림에서는 늘 false 다. 서버에는 브라우저 저장소가 없어서, 켜진
 * 상태로 그렸다가는 hydration 이 어긋난다. 스위치가 한 박자 늦게
 * 나타나는 편이 화면이 깜빡이는 것보다 낫다.
 */
export function useStaffDevice(): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    // 시연 빌드에서는 양쪽이 다 열려 있으므로 스위치도 늘 보여 준다
    if (demoMode) return setOn(true);

    const sync = () => setOn(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return on;
}
