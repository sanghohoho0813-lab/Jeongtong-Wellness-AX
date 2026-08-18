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
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 lg:mb-7">
      <div className="min-w-0">
        <h1 className="text-page-title flex items-center gap-2.5 text-ink">
          <span className="hidden h-6 w-1.5 rounded-full bg-gradient-to-b from-aqua-400 to-deep-700 sm:block" />
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-ink-sub sm:text-[0.9375rem]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
