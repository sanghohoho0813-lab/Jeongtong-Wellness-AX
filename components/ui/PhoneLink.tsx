"use client";

/**
 * 전화 걸기 — 번호를 글로만 보여 주던 자리를 누르는 자리로
 * ======================================================
 *
 * 브리핑의 권장 행동은 대개 "연락" 이다. 그런데 직원 화면 어디에도
 * tel: 링크가 없어서, 폰을 든 대표님은 번호를 눈으로 외워 전화 앱으로
 * 옮겨 적어야 했다. 60대 손끝에서 그 한 번의 옮겨 적기가 실행을 막는다.
 *
 * 규칙
 *   · 번호가 없으면 아무것도 그리지 않는다 (견본 명부는 번호가 비어 있다)
 *   · 화면 공유 모드(canSee=false)면 그리지 않는다 — 가린 번호로 전화를
 *     걸게 하면 가린 뜻이 없다
 *   · 링크는 tel: 하나뿐. 발송 · 문자 · 대량 연락은 만들지 않는다
 */

import { formatPhone } from "@/lib/utils/format";
import { PhoneIcon } from "./icons";

export function PhoneLink({
  phone,
  canSee,
  onDark = false,
  size = "sm",
  className = "",
}: {
  phone?: string;
  canSee: boolean;
  onDark?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const digits = (phone ?? "").replace(/[^0-9+]/g, "");
  if (!canSee || digits.length < 8) return null;

  const tone = onDark
    ? "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"
    : "bg-card text-aqua-800 ring-1 ring-aqua-200 hover:bg-aqua-50";
  const pad = size === "md" ? "px-4 py-2.5 text-[0.9375rem]" : "px-3.5 py-1.5 text-sm";

  return (
    <a
      href={`tel:${digits}`}
      aria-label={`${formatPhone(phone ?? "")} 로 전화 걸기`}
      className={`touch-target nowrap-num inline-flex items-center gap-1.5 rounded-full font-bold transition-colors ${tone} ${pad} ${className}`}
    >
      <PhoneIcon className={size === "md" ? "h-5 w-5" : "h-4 w-4"} />
      전화 걸기
      <span className={onDark ? "font-medium text-white/80" : "font-medium text-ink-sub"}>
        {formatPhone(phone ?? "")}
      </span>
    </a>
  );
}
