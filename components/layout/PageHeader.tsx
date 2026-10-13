"use client";

import { ReactNode, useState } from "react";
import { useDocumentTitle } from "@/lib/utils/title";
import { InfoButton } from "@/components/ui/Fold";

export default function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  // 화면 제목이 곧 탭 이름이다 — 탭을 여러 개 열어 두면 여기서 구분한다
  useDocumentTitle(title);
  const [info, setInfo] = useState(false);

  /**
   * 제목과 단추를 **한 줄에** 둔다.
   *
   * 예전에는 자리가 모자라면 단추가 아래로 밀려나 한 줄을 통째로 차지했다.
   * 폰에서는 그 한 줄이 화면의 8분의 1이라, 정작 이 화면의 본론
   * (고객 목록 · 지표)이 첫 화면 밖으로 밀려났다.
   * 제목이 두 줄로 접히더라도 단추는 제목 옆에 붙여 둔다.
   *
   * 다만 큰 글씨 + 좁은 폰에서 제목을 최대한 접어도 단추와 겹친다면
   * (제목 옆 ⓘ 가 단추 밑에 깔린다) 그때만 단추를 다음 줄로 내린다.
   * 제목의 최소 폭(min-content)을 기준으로 줄을 바꾸므로, 두 줄 제목으로
   * 버틸 수 있는 동안에는 지금처럼 한 줄이다.
   */
  return (
    <div className="mb-4 lg:mb-7">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h1 className="text-page-title flex min-w-min flex-[1_1_0%] items-center gap-2.5 text-ink">
          <span className="hidden h-6 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-aqua-400 to-deep-700 sm:block" />
          {title}
          {/*
            화면 설명은 제목 아래에 늘 적지 않는다 — 대표님 말씀 「글씨가
            너무 많으면 안 돼」. 제목 옆 ⓘ 에 마우스를 올리면 말풍선으로,
            누르면(폰) 제목 아래 한 줄로 편다.
          */}
          {description && (
            <InfoButton
              text={description}
              title={title}
              open={info}
              onToggle={() => setInfo((v) => !v)}
              className="ml-0.5"
            />
          )}
        </h1>
        {action && <div className="ml-auto max-w-full shrink-0">{action}</div>}
      </div>
      {description && info && (
        <p className="mt-1 text-sm leading-relaxed text-ink-sub sm:text-[0.9375rem]">
          {description}
        </p>
      )}
    </div>
  );
}
