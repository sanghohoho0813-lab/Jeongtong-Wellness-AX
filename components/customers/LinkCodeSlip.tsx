"use client";

/**
 * 연결코드 안내문 (인쇄용 한 장)
 * ==============================
 *
 * 왜 종이인가
 * ----------
 * 연결코드는 매장이 고객에게 직접 건네는 물건이다. 그런데 이번 범위에는
 * 문자·카카오 발송이 없다. 그러면 남는 길은 두 가지다 — 구두로 불러 주거나,
 * 적어서 드리거나.
 *
 * 구두로는 여섯 자리가 잘 안 남는다. 주소도 함께 알려 드려야 하는데
 * "슬래시 마이" 를 말로 옮기는 순간 대부분 끊긴다. 그래서 코드·주소·순서를
 * 한 장에 담아 손에 쥐어 드리는 쪽을 택했다.
 *
 * 주 이용자가 40~60대라 글자를 키우고, 넣을 곳을 1·2·3 으로 끊어 적었다.
 *
 * 지어내지 않는 것
 * ----------------
 * 주소는 지금 이 브라우저가 보고 있는 주소에서 그대로 가져온다. 만료일은
 * 발급 때 서버가 정한 값을 그대로 쓴다. 둘 다 화면에 적힌 대로가 사실이다.
 */

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/data/store";
import { Button } from "@/components/ui";
import { PrinterIcon } from "@/components/ui/icons";
import { formatDateKr } from "@/lib/utils/date";
import { printRegion } from "@/lib/utils/print";

export default function LinkCodeSlip({
  customerName,
  code,
  expiresAt,
}: {
  customerName: string;
  code: string;
  expiresAt: string;
}) {
  const { settings } = useStore();
  const regionRef = useRef<HTMLDivElement>(null);

  // 서버 렌더에는 주소가 없다 — 붙은 뒤에 읽는다
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = origin ? `${origin}/my` : "/my";

  return (
    <div>
      {/* 인쇄 대상 — 이 영역만 종이에 나간다 */}
      <div ref={regionRef} className="print-region">
        <div className="border-b border-stone-line pb-3">
          <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-aqua-700">
            {settings.companyName}
          </p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
            {/* 고객 본인에게 드리는 종이라 이름을 가리지 않는다 */}
            {customerName} 님 · 휴대폰 연결 안내
          </p>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
            방문 기록과 남은 이용권을 휴대폰에서 직접 보실 수 있습니다.
          </p>
        </div>

        {/* 코드 — 이 종이에서 가장 먼저 눈에 들어와야 하는 것 */}
        <div className="mt-4 rounded-card bg-card-soft px-4 py-5 text-center ring-1 ring-stone-line">
          <p className="text-[0.8125rem] font-extrabold text-ink-sub">연결코드</p>
          <p className="mt-1 text-[2.5rem] font-extrabold leading-tight tracking-[0.25em] text-ink">
            {code}
          </p>
          <p className="nowrap-num mt-1 text-[0.875rem] tabular text-ink-sub">
            {formatDateKr(expiresAt.slice(0, 10))}까지 · 한 번만 쓸 수 있습니다
          </p>
        </div>

        {/* 순서 — 말로 하면 흘러가는 것을 번호로 붙잡아 둔다 */}
        <ol className="mt-4 space-y-3">
          <Step n={1} title="휴대폰에서 아래 주소를 엽니다">
            <span className="block break-all rounded-card bg-card-soft px-3 py-2 text-[1.0625rem] font-extrabold text-aqua-800 ring-1 ring-stone-line">
              {url}
            </span>
          </Step>
          <Step n={2} title="이메일 주소를 넣고 숫자 6자리로 로그인합니다">
            넣으신 이메일로 숫자 여섯 자리가 갑니다. 비밀번호는 만들지 않으셔도
            됩니다.
          </Step>
          <Step n={3} title="위 연결코드를 넣습니다">
            한 번만 넣으면 됩니다. 다음부터는 바로 열립니다.
          </Step>
        </ol>

        <p className="mt-4 border-t border-stone-line pt-3 text-[0.875rem] leading-relaxed text-ink-sub">
          이 코드는 {customerName} 님 한 분을 위한 것입니다. 다른 분께 알려 주지
          마세요. 잘 안 되시면 매장으로 말씀해 주시면 새로 만들어 드립니다.
        </p>
      </div>

      <div className="no-print mt-5 flex justify-end">
        <Button variant="secondary" onClick={() => printRegion(regionRef.current)}>
          <PrinterIcon className="h-4 w-4" />
          인쇄하기
        </Button>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aqua-700 text-[0.9375rem] font-extrabold text-white">
        {n}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.0625rem] font-extrabold text-ink">
          {title}
        </span>
        <span className="mt-1 block text-[0.9375rem] leading-relaxed text-ink-soft">
          {children}
        </span>
      </span>
    </li>
  );
}
