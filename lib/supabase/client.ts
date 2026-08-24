"use client";

/**
 * Supabase 클라이언트
 * ===================
 *
 * 두 개를 따로 만든다. 직원용과 고객용이다.
 *
 * 같은 브라우저에서 원장님이 직원 화면을 쓰다가 고객 포털을 열어 볼 수 있다
 * (시연 때 반드시 그렇게 된다). 세션 저장 키가 같으면 나중에 로그인한 쪽이
 * 앞의 세션을 덮어써서, 고객 화면에 들어갔다 나오면 직원 로그인이 풀린다.
 * 키를 나눠 두면 두 세션이 나란히 살아 있는다.
 *
 * 환경변수가 없으면 두 함수 모두 null 을 준다.
 * 그때 앱은 지금까지처럼 이 기기 안에서만(localStorage) 돈다 — 켜지지 않을 뿐
 * 고장 나지는 않는다.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** 이 빌드에 Supabase 설정이 들어 있는가 */
export const supabaseConfigured = Boolean(URL && KEY);

type Client = SupabaseClient;

let staff: Client | null = null;
let portal: Client | null = null;

function make(storageKey: string): Client | null {
  if (!URL || !KEY) return null;
  if (typeof window === "undefined") return null;
  return createClient(URL, KEY, {
    auth: {
      storageKey,
      persistSession: true,
      autoRefreshToken: true,
      // 로그인 링크를 눌러 돌아왔을 때 주소창의 토큰을 세션으로 바꿔 준다
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    global: {
      headers: { "x-application-name": "jeongtong-wellness-ax" },
    },
  });
}

/** 직원 · 관리자용 (매장 계정) */
export function staffClient(): Client | null {
  if (!staff) staff = make("jeongtong-ax-staff-auth");
  return staff;
}

/** 고객 포털용 (MY WELLNESS) */
export function portalClient(): Client | null {
  if (!portal) portal = make("jeongtong-my-auth");
  return portal;
}

/**
 * 사람이 읽을 수 있는 오류 문구.
 *
 * Supabase 는 영어로, 그리고 개발자에게 하는 말투로 오류를 준다.
 * ("JWT expired", "permission denied for table customers")
 * 그대로 띄우면 원장님이나 고객은 무엇을 해야 하는지 알 수 없다.
 */
export function humanError(e: unknown): string {
  const raw =
    typeof e === "string"
      ? e
      : e && typeof e === "object" && "message" in e
        ? String((e as { message: unknown }).message)
        : "";

  if (!raw) return "알 수 없는 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";

  if (/permission denied|42501/i.test(raw))
    return "이 계정에는 권한이 없습니다. 매장 관리자에게 문의해 주세요.";
  if (/jwt|expired|invalid.*token/i.test(raw))
    return "로그인 시간이 지났습니다. 다시 로그인해 주세요.";
  if (/rate ?limit|too many/i.test(raw))
    return "요청이 너무 잦습니다. 1분 정도 뒤에 다시 시도해 주세요.";
  if (/invalid.*(otp|code)|token has expired|expired.*token/i.test(raw))
    return "인증번호가 맞지 않거나 시간이 지났습니다. 다시 받아 주세요.";
  if (/failed to fetch|network|fetch failed/i.test(raw))
    return "인터넷 연결을 확인해 주세요.";
  if (/relation .* does not exist|does not exist/i.test(raw))
    return "데이터베이스 준비가 아직 끝나지 않았습니다. (스키마 실행 필요)";

  // 우리가 SQL 에서 한국어로 직접 던진 메시지는 그대로 쓴다
  if (/[가-힣]/.test(raw)) return raw;
  return "문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";
}
