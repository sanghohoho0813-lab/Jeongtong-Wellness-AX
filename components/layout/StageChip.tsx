"use client";

/**
 * 단계 칩 — DEMO / PILOT / PRODUCTION 을 늘 보이는 자리에.
 *
 * 사이드바(PC) · 머리글(태블릿) · 더보기 시트(폰) 에 붙는다. 시연 중인
 * 담당자도, 매일 쓰는 대표님도 "지금 보는 게 견본인지 실제인지" 를
 * 화면에서 읽을 수 있어야 한다. 눌러도 아무 데도 가지 않고 뜻만 펼친다.
 *
 * 좁은 폰 머리글에는 넣지 않는다 — 날짜·시각 줄이 이미 꽉 차서 칩이
 * 셋째 줄로 내려가 머리글이 한 줄 더 두꺼워졌다. 60대 손님 화면에서
 * 그 한 줄은 본문 한 줄이다. 폰에서는 더보기 시트 맨 위에서 본다.
 */

import { useState } from "react";
import { Badge } from "@/components/ui";
import { useDeliveryStage } from "@/lib/stage";

export default function StageChip({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const s = useDeliveryStage();
  const [open, setOpen] = useState(false);

  return (
    <div className={`${compact ? "inline-flex" : "flex flex-col gap-1.5"} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        /*
          접근 이름에는 단계 코드만 넣는다. "DEMO · 시연 자료" 를 그대로
          넣으면 '시연' 을 찾는 검사·보조기기가 사용 방법 화면의
          「시연 · 10걸음」 단추와 이것을 헷갈린다 (실제로 그랬다).
        */
        aria-label={`지금 단계 ${s.stage} — 눌러서 설명 보기`}
        data-stage={s.stage}
        className="touch-target inline-flex items-center rounded-full text-left"
      >
        <Badge tone={s.tone} dot>
          {compact ? s.label.split(" · ")[0] : s.label}
        </Badge>
      </button>
      {open && (
        <p
          role="status"
          className={`rounded-card bg-stone-bg px-3 py-2 text-[0.8125rem] leading-relaxed text-ink-sub ${
            compact ? "absolute left-4 right-4 top-full z-40 mt-1 shadow-card" : ""
          }`}
        >
          {s.desc}
        </p>
      )}
    </div>
  );
}
