"use client";

import { ReactNode, useRef, useState } from "react";
import { useDocumentTitle } from "@/lib/utils/title";
import { InfoButton } from "@/components/ui/Fold";
import { useAnnounceWhenHidden } from "@/lib/ui/band-title";

/**
 * 작은 머리 띠 — 목록 · 설정 화면의 제목 (D-60)
 * =============================================
 *
 * 대시보드 · 챙길 고객 · 고객 상세 등은 딥그린 머리 띠(StaffBand)인데,
 * 고객 목록 · 방문 기록 · 설정 · 서비스 표준 · 지점 · 안내 영상은 흰 바탕에
 * 제목 한 줄이었다. 하단 탭으로 오가면 화면마다 다른 앱처럼 보였다.
 *
 * 이 화면들은 결론 한 문장이나 숫자 판이 따로 없는 「목록을 여는」 화면이라
 * 큰 띠 대신 **작은 띠**로 — 제목 · ⓘ · 덧말 한 줄 · 단추만 담는다.
 * 높이는 단추 한 줄(44px)에 위아래 여백뿐이라 목록이 첫 화면에서 밀리지
 * 않는다.
 *
 * 단추는 띠 위의 알약 (StaffBand 의 bandPrimary · bandGhost) 을 쓴다.
 */
export default function PageHeader({
  title,
  description,
  meta,
  action,
}: {
  title: string;
  description?: ReactNode;
  /** 제목 아래 덧말 한 줄 — 「전체 12명」 같은 것 */
  meta?: ReactNode;
  action?: ReactNode;
}) {
  // 화면 제목이 곧 탭 이름이다 — 탭을 여러 개 열어 두면 여기서 구분한다
  useDocumentTitle(title);
  const [info, setInfo] = useState(false);
  /* 내려가서 띠가 머리글 밑으로 들어가면 머리글에 화면 이름 (lib/ui/band-title.ts) */
  const headRef = useRef<HTMLHeadingElement>(null);
  useAnnounceWhenHidden(headRef, title);

  /**
   * 제목과 단추를 **한 줄에** 둔다.
   *
   * 자리가 모자라면 단추가 아래로 밀려나 한 줄을 통째로 차지했다 — 폰에서
   * 그 한 줄이 화면의 8분의 1이라 본론이 첫 화면 밖으로 밀렸다. 제목의
   * 최소 폭(min-content)을 기준으로 줄을 바꾸므로, 두 줄 제목으로 버틸 수
   * 있는 동안에는 한 줄이다 (큰 글씨 + 좁은 폰에서만 단추가 내려간다).
   */
  return (
    <div data-page-band className="mb-4 lg:mb-6">
      <section className="relative isolate overflow-hidden rounded-[24px] bg-gradient-to-br from-deep-800 via-deep-900 to-deep-950 px-5 py-4 text-white shadow-[0_18px_40px_-24px_rgba(10,46,44,0.7)] sm:px-6 lg:px-8 lg:py-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-aqua-400/15 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
          <div className="min-w-min flex-[1_1_0%]">
            <h1
              ref={headRef}
              className="flex items-center text-[1.375rem] font-extrabold leading-tight tracking-tight sm:text-[1.5rem]"
            >
              {title}
              {/*
                화면 설명은 제목 아래에 늘 적지 않는다 — 대표님 말씀 「글씨가
                너무 많으면 안 돼」. ⓘ 에 마우스를 올리면 말풍선으로, 누르면(폰)
                제목 아래 한 줄로 편다.
              */}
              {description && (
                <InfoButton
                  text={description}
                  title={title}
                  open={info}
                  onToggle={() => setInfo((v) => !v)}
                  className="-my-3 ml-0.5 !text-white/70 hover:!text-white"
                />
              )}
            </h1>
            {meta && (
              <p className="nowrap-num mt-0.5 text-[0.8125rem] font-bold text-white/70">{meta}</p>
            )}
          </div>
          {action && (
            <div className="no-print ml-auto flex max-w-full shrink-0 flex-wrap justify-end gap-2">
              {action}
            </div>
          )}
        </div>
        {description && info && (
          <p className="relative mt-2 max-w-2xl text-[0.875rem] leading-relaxed text-white/80">
            {description}
          </p>
        )}
      </section>
    </div>
  );
}
