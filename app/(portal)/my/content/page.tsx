"use client";

/**
 * 나를 위한 웰니스 콘텐츠
 *
 * 여기 있는 글은 전부 누구에게나 해당하는 생활 습관 이야기다.
 * 어떤 증상에 무엇이 좋다는 말은 한 줄도 없고, 그렇게 읽힐 여지가 있는
 * 문장도 두지 않았다. 몸에 대한 판단이 필요한 이야기는 매장으로 넘긴다.
 *
 * 순서만 조금 바꾼다. 감추지 않는 이유는 단순하다 — 고객이 "왜 나한테는
 * 이것만 보이지" 라고 느끼면, 보이지 않는 무언가가 있다고 생각하게 된다.
 */

import { useEffect, useState } from "react";
import { usePortal } from "@/lib/portal/store";
import { rankContents } from "@/lib/portal/content";
import {
  classifyWellnessType,
  summarizePasses,
  summarizeUsage,
} from "@/lib/portal/wellness";
import { ChevronRightIcon } from "@/components/ui/icons";
import { PageHead, Panel, StatusPill } from "@/components/portal/kit";

export default function MyContent() {
  const { visits, memberships, profile, contentOpens, logContentOpen } = usePortal();
  const [open, setOpen] = useState<string | null>(null);
  const [tag, setTag] = useState<string>("전체");

  const type = classifyWellnessType({
    usage: summarizeUsage(visits),
    pass: summarizePasses(memberships),
    homecareInterest: profile.homecareInterest,
    contentOpens,
  });

  const list = rankContents({
    type: type.key,
    interestParts: profile.interestAreas,
  });
  /* 분류 알약 — 배달 앱의 「전체 · 음식 · 장보기」 줄. 감추지 않고 좁혀 보기만 */
  const tags = ["전체", ...Array.from(new Set(list.map((c) => c.tag)))];
  const shown = tag === "전체" ? list : list.filter((c) => c.tag === tag);

  const toggle = (id: string) => {
    const next = open === id ? null : id;
    setOpen(next);
    if (next) logContentOpen(id);
  };

  /* 홈의 카드에서 왔으면(#글이름) 그 글을 펴서 보여 준다 */
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id || !list.some((c) => c.id === id)) return;
    setOpen(id);
    logContentOpen(id);
    requestAnimationFrame(() =>
      document.getElementById(`content-${id}`)?.scrollIntoView({ block: "start" }),
    );
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <PageHead
        back={{ href: "/my", label: "홈" }}
        title="웰니스 정보"
        sub="일상에서 해볼 수 있는 생활관리 정보입니다."
      />

      <div
        role="group"
        aria-label="분류로 좁혀 보기"
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4"
      >
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tag === t}
            onClick={() => setTag(t)}
            className={`touch-target shrink-0 whitespace-nowrap rounded-full px-4 text-[0.9375rem] font-bold ring-1 transition-colors ${
              tag === t
                ? "bg-sel text-sel-ink ring-transparent"
                : "bg-card text-ink-soft ring-stone-line hover:bg-aqua-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {shown.map((c) => {
          const isOpen = open === c.id;
          return (
            <div
              key={c.id}
              id={`content-${c.id}`}
              className="scroll-mt-24 overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggle(c.id)}
                className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-aqua-50/40"
              >
                <span className="min-w-0 flex-1">
                  <StatusPill tone="muted">{c.tag}</StatusPill>
                  <span className="mt-2 block text-[1.0625rem] font-extrabold leading-snug text-ink">
                    {c.title}
                  </span>
                  <span className="mt-1 block text-[0.9375rem] leading-relaxed text-ink-sub">
                    {c.summary}
                  </span>
                </span>
                <ChevronRightIcon
                  className={`mt-1 h-5 w-5 shrink-0 text-ink-faint transition-transform ${
                    isOpen ? "-rotate-90" : "rotate-90"
                  }`}
                />
              </button>

              {isOpen && (
                <div className="border-t border-stone-line bg-card-soft px-4 py-4">
                  <ul className="space-y-2.5">
                    {c.body.map((line, i) => (
                      <li
                        key={i}
                        className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-ink-soft"
                      >
                        <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-500" />
                        <span className="min-w-0">{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Panel className="!bg-card-soft">
        <p className="text-[0.8125rem] leading-relaxed text-ink-sub">
          일상 생활관리에 대한 일반적인 정보입니다. 몸에 이상이 느껴지시면
          전문가와 상담하시고, 매장 이용에 대한 문의는 매장으로 연락 주세요.
        </p>
      </Panel>
    </div>
  );
}
