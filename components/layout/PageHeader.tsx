"use client";

import { ReactNode } from "react";

export default function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  /**
   * 제목과 단추를 **한 줄에** 둔다.
   *
   * 예전에는 자리가 모자라면 단추가 아래로 밀려나 한 줄을 통째로 차지했다.
   * 폰에서는 그 한 줄이 화면의 8분의 1이라, 정작 이 화면의 본론
   * (고객 목록 · 지표)이 첫 화면 밖으로 밀려났다.
   * 제목이 두 줄로 접히더라도 단추는 제목 옆에 붙여 둔다.
   */
  return (
    <div className="mb-4 lg:mb-7">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-page-title flex min-w-0 items-center gap-2.5 text-ink">
          <span className="hidden h-6 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-aqua-400 to-deep-700 sm:block" />
          {title}
        </h1>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {description && (
        <p className="mt-1 text-sm leading-relaxed text-ink-sub sm:text-[0.9375rem]">
          {description}
        </p>
      )}
    </div>
  );
}
