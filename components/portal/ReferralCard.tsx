"use client";

/**
 * 친구에게 알리기
 * ================
 *
 * 여기서 조심할 것이 하나 있다.
 *
 * 흔한 앱은 "친구 추천하면 1만원 드려요" 라고 쓴다. 그런데 **우리는 매장이
 * 정한 혜택을 모른다.** 모르는 것을 화면에 적으면 그건 약속이 되고, 고객은
 * 그 약속을 들고 매장에 온다. 그래서 금액도, 조건도, 기한도 적지 않는다.
 *
 * 대신 실제로 할 수 있는 것만 남긴다 — 매장을 소개하는 링크를 건네는 것.
 * 혜택이 있는지는 매장에 물어보시라고 안내한다. 매장이 나중에 혜택을 정하면
 * 그때 이 카드에 얹으면 된다.
 *
 * 나누는 방법은 두 갈래다. 폰에는 대개 공유 창이 있고(navigator.share),
 * 없으면 주소를 복사해 드린다. 둘 다 안 되면 주소를 눈에 보이게 띄운다 —
 * 아무 일도 일어나지 않는 단추가 제일 나쁘다.
 */

import { ReactNode, useState } from "react";
import { Button, Card } from "@/components/ui";

export default function ReferralCard({
  branchName,
  icon,
}: {
  branchName?: string;
  icon?: ReactNode;
}) {
  const [state, setState] = useState<"idle" | "copied" | "shown">("idle");
  const [url, setUrl] = useState("");

  const share = async () => {
    const link = window.location.origin + "/";
    const title = `${branchName ?? "정통대왕쑥뜸원"} — 프리미엄 온열 웰니스 케어`;
    setUrl(link);

    if (navigator.share) {
      try {
        await navigator.share({ title, url: link });
        return;
      } catch {
        /* 공유 창을 그냥 닫으신 경우 — 복사로 넘어간다 */
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setState("copied");
      return;
    } catch {
      /* 클립보드를 막아 둔 브라우저 */
    }
    setState("shown");
  };

  return (
    <Card>
      {/*
        단추를 옆에 두면 폰에서 제목이 "친구에게 / 알리기" 로 갈라진다.
        폰에서는 아래로 내려 폭을 다 준다 (1:1 상담 카드와 같은 규칙).
      */}
      <div className="flex items-start gap-3.5">
        {icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep text-deep-900">
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[1.0625rem] font-extrabold text-ink">
            친구에게 알리기
          </p>
          <p className="mt-0.5 text-[0.9375rem] leading-relaxed text-ink-sub">
            매장 소개 링크를 보내 드립니다.
          </p>
        </div>
      </div>
      <Button
        variant="secondary"
        size="lg"
        onClick={() => void share()}
        className="mt-3.5 w-full"
      >
        링크 보내기
      </Button>

      {state === "copied" && (
        <p className="mt-3 rounded-btn bg-aqua-50 px-3.5 py-2.5 text-[0.9375rem] font-bold text-aqua-800 ring-1 ring-aqua-100">
          링크를 복사했습니다. 문자나 메신저에 붙여 넣어 보내 주세요.
        </p>
      )}
      {state === "shown" && (
        <div className="mt-3 rounded-btn bg-card-soft px-3.5 py-2.5 ring-1 ring-stone-line">
          <p className="text-[0.8125rem] font-bold text-ink-sub">
            아래 주소를 눌러서 복사해 주세요
          </p>
          <p className="mt-1 break-all text-[0.9375rem] font-bold text-aqua-800">
            {url}
          </p>
        </div>
      )}

      <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-faint">
        추천에 따른 혜택이 있는지는 매장에 문의해 주세요. 이 화면에서 혜택이
        확정되지는 않습니다.
      </p>
    </Card>
  );
}
