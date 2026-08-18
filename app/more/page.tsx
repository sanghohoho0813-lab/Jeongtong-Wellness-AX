"use client";

/** 모바일 더보기 — 하단 네비에 없는 메뉴로 이동 */

import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { useStore } from "@/lib/data/store";
import { SIDEBAR_ITEMS } from "@/components/layout/nav-items";
import { Card } from "@/components/ui";
import { ChevronRightIcon } from "@/components/ui/icons";

export default function MorePage() {
  const { settings } = useStore();
  return (
    <div>
      <PageHeader
        title="더보기"
        description={`${settings.companyName} ${settings.branchName} · ${settings.ownerName}`}
      />
      <Card className="!p-2">
        <ul className="divide-y divide-stone-bg-deep">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3.5 px-3.5 py-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-aqua-50 text-aqua-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="flex-1 truncate font-semibold text-ink">
                    {item.label}
                  </span>
                  <ChevronRightIcon className="h-5 w-5 text-ink-faint" />
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
