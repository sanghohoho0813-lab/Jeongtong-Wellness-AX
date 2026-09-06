"use client";

/**
 * 지금 이 화면은 어느 단계인가 — DEMO / PILOT / PRODUCTION
 * ========================================================
 *
 * Unified v3.0 §15 "모든 Story/Presentation/설정에서 상태를 혼동시키지
 * 않는다". 시연 자료를 실제 성과처럼, 기기 안 자료를 서버 운영처럼
 * 읽히게 두면 그 순간 정직성이 깨진다. 그래서 단계를 **계산**해서
 * 화면 구석마다 같은 말로 적는다 — 사람이 고르는 값이 아니다.
 *
 *   DEMO        시연 빌드. 지어낸 견본 자료. 성과 주장 불가.
 *   PILOT       실제 자료지만 이 기기(브라우저)에만 저장. 실증 중.
 *   PRODUCTION  서버(Supabase)에 연결되어 여러 기기·지점이 같은 기록을 본다.
 */

import { demoMode } from "@/lib/auth/mode";
import { supabaseConfigured } from "@/lib/supabase/client";
import { useStaffLink } from "@/lib/supabase/StaffLink";
import type { BadgeTone } from "@/components/ui";

export type DeliveryStage = "DEMO" | "PILOT" | "PRODUCTION";

export interface StageInfo {
  stage: DeliveryStage;
  /** 화면에 적는 짧은 말 */
  label: string;
  /** 눌렀을 때 · 툴팁 — 무슨 뜻인지 한 문장 */
  desc: string;
  tone: BadgeTone;
  /** 성과 숫자를 "실제 성과" 라고 불러도 되는가 */
  canClaimResults: boolean;
}

const INFO: Record<DeliveryStage, Omit<StageInfo, "stage">> = {
  DEMO: {
    label: "DEMO · 시연 자료",
    desc: "지어낸 견본 자료로 도는 시연 빌드입니다. 여기 숫자는 성과가 아닙니다.",
    tone: "gold",
    canClaimResults: false,
  },
  PILOT: {
    label: "PILOT · 실제 자료 · 기기 저장",
    desc: "실제 매장 기록이지만 이 기기의 브라우저에만 저장됩니다. 서버를 연결하면 PRODUCTION 이 됩니다.",
    tone: "warn",
    canClaimResults: true,
  },
  PRODUCTION: {
    label: "PRODUCTION · 서버 운영",
    desc: "매장 계정으로 서버에 연결되어 여러 기기와 지점이 같은 기록을 봅니다.",
    tone: "positive",
    canClaimResults: true,
  },
};

export function useDeliveryStage(): StageInfo {
  const { phase } = useStaffLink();
  const stage: DeliveryStage = demoMode
    ? "DEMO"
    : supabaseConfigured && phase === "linked"
      ? "PRODUCTION"
      : "PILOT";
  return { stage, ...INFO[stage] };
}
