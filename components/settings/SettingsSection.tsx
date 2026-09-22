"use client";

/**
 * 설정 한 칸 — 폰에서는 접어 두고, 넓은 화면에서는 그대로 편다
 * ============================================================
 *
 * 폰에서 설정 화면이 **10.6 화면**이었다 (360px 기준, 실측).
 * 영업시간 하나 고치려고 열 화면을 쓸어내려야 한다는 뜻이다. 그 사이에
 * 원하던 칸을 두 번 지나치고, 세 번째에 포기한다.
 *
 * 그래서 폰에서는 **아홉 줄짜리 목록**으로 바꿨다. 줄마다 이름과 한 줄
 * 설명이 있고, 누르면 그 자리에서 펴진다. 아이폰 · 안드로이드 설정이
 * 오래 쓰는 방식이라 새로 배울 것이 없다.
 *
 * 넓은 화면(lg 이상)에서는 **접지 않는다.** 두 단 배치라 이미 다 보이고,
 * 거기서 접으면 마우스 쓰는 사람에게 없던 일이 하나 생긴다. 접는 것은
 * 자리가 없을 때 하는 일이지, 언제나 좋은 일이 아니다.
 *
 * 화면 안 바로가기(`#set-store`)로 들어오면 **그 칸이 열린 채로** 도착한다.
 * 열리지 않으면 바로가기가 제목까지만 데려다주고 끝나서, 누르는 일이
 * 한 번 더 늘어난다. 화면 공유 띠의 「설정에서 끄기」 도 같은 길을 쓴다.
 */

import { ReactNode, useEffect, useId, useState } from "react";
import { Card, SectionTitle } from "@/components/ui";
import { ChevronRightIcon } from "@/components/ui/icons";

export default function SettingsSection({
  id,
  title,
  summary,
  tone,
  action,
  dataTour,
  children,
}: {
  /** 화면 안 바로가기의 도착 지점 (`set-store` 처럼) */
  id: string;
  title: ReactNode;
  /** 접혀 있을 때 이 칸이 무엇인지 알려 주는 한 줄 */
  summary: string;
  tone?: "aqua" | "gold";
  /** 제목 오른쪽에 붙는 단추 (예: 「직원 추가」) — 펼쳤을 때만 나온다 */
  action?: ReactNode;
  dataTour?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = `${useId()}-body`;

  /* 바로가기로 들어왔으면 열어 둔다 (처음 그릴 때 · 주소가 바뀔 때) */
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === `#${id}`) setOpen(true);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [id]);

  return (
    <Card id={id} dataTour={dataTour} className="scroll-mt-36 lg:scroll-mt-6">
      {/*
        접는 손잡이 — 폰에서만. 높이 60px 이상, 글자 17px.
        제목과 한 줄 설명을 같이 둔다. 「데이터」 네 글자만 보고 그 안에
        백업이 있다는 것을 아는 사람은 만든 사람뿐이다.
      */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className={`flex w-full min-h-[3.25rem] items-center gap-3 text-left lg:hidden ${
          open ? "mb-4" : ""
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[1.0625rem] font-extrabold leading-snug text-ink">
            {title}
          </span>
          {!open && (
            <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-sub">
              {summary}
            </span>
          )}
        </span>
        <ChevronRightIcon
          className={`h-5 w-5 shrink-0 text-ink-faint transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>

      {/* 넓은 화면에서는 늘 쓰던 제목 그대로 */}
      <div className="hidden lg:block">
        <SectionTitle tone={tone} action={action}>
          {title}
        </SectionTitle>
      </div>

      {/* 펼쳤을 때 제목 오른쪽 단추를 폰에서도 쓸 수 있게 */}
      {open && action && <div className="mb-4 lg:hidden">{action}</div>}

      <div id={bodyId} className={`${open ? "block" : "hidden"} lg:block`}>
        {children}
      </div>
    </Card>
  );
}
