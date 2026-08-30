"use client";

/**
 * 더보기 — 눌렀을 때 실제로 '더 보이게'
 * =====================================
 *
 * 지금까지 폰 하단의 [더보기]는 `/more` 라는 **화면 하나로 이동**했다.
 * 라벨은 "메뉴가 더 있다"고 말하는데 행동은 "다른 화면으로 간다"였다.
 * 그 사이에서 두 가지가 나빠진다.
 *   - 보던 화면을 잃는다. 고객 상세를 보다가 더보기를 누르면 그 고객이
 *     사라지고, 돌아오려면 뒤로 가기를 눌러야 한다.
 *   - '더보기'가 목적지가 되어 버려서, 정작 그 안의 메뉴는 한 겹 더 안쪽이 된다.
 *
 * 그래서 **덮어서 열고, 닫으면 보던 화면 그대로**인 시트로 바꾼다.
 * `/more` 화면은 지우지 않았다 — 주소를 아는 사람도 있고, 시트 안에서
 * 그 화면으로 갈 수 있게 맨 아래에 남겨 두었다.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/lib/data/store";
import { FontScale, PALETTES, Theme } from "@/lib/types";
import { MORE_ITEMS, NAV_TONE_CLASS, navItemsFor } from "./nav-items";
import { DevicePreviewButton } from "./DevicePreview";
import { ProfileButton } from "./UserSwitch";
import { SurfaceSwitch } from "./SurfaceSwitch";
import { FieldLabel, SegmentedControl } from "@/components/ui";
import {
  BookIcon,
  ChevronRightIcon,
  PlayIcon,
  SparkIcon,
  XIcon,
} from "@/components/ui/icons";
import { useTour } from "@/components/docs/Tour";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function MoreSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { settings, isManager, updateSettings } = useStore();
  const { startTour } = useTour();
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const body = document.body;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      body.style.overflow = prev;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  if (!open || !mounted) return null;

  const items = navItemsFor(MORE_ITEMS, isManager);

  return createPortal(
    <div className="fixed inset-0 z-[65] flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-deep-950/45 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={isManager ? "더보기" : "계정"}
        className="relative z-10 flex max-h-[88dvh] flex-col rounded-t-card-lg bg-card shadow-float outline-none"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-line px-4 py-3.5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold text-ink">
              {isManager ? "더보기" : "계정"}
            </h2>
            <p className="mt-0.5 truncate text-xs text-ink-sub">
              {settings.companyName} {settings.branchName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-bg text-ink-sub transition-colors hover:bg-stone-bg-deep"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <ProfileButton />

          {/*
            화면 전환 — 목록에 섞어 두지 않고 맨 위에 스위치로 둔다.
            폰에서 고객 화면을 확인하고 돌아오는 왕복이 잦다.
          */}
          <SurfaceSwitch
            current="staff"
            className="mt-3 w-full !justify-stretch [&>a]:flex-1 [&>a]:justify-center"
          />

          {/* 이야기 두 편 — 기획의도와 Why AX 는 목적이 다르다 */}
          <div className="grid grid-cols-1 gap-2.5 xs:grid-cols-2">
            <SheetDoc
              href="/why"
              onClose={onClose}
              icon={<SparkIcon className="h-5 w-5" />}
              title="Why AX"
              desc="우리 매장에 무엇이 달라지는가"
              tone="aqua"
            />
            <SheetDoc
              href="/intro"
              onClose={onClose}
              icon={<BookIcon className="h-5 w-5" />}
              title="기획의도"
              desc="이 시스템을 만든 이유"
              tone="gold"
            />
          </div>

          {items.length > 0 && (
            <ul className="divide-y divide-stone-bg-deep overflow-hidden rounded-card ring-1 ring-stone-line">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3.5 px-3.5 py-3.5 transition-colors ${
                        active ? "bg-aqua-50" : "bg-card active:bg-stone-bg"
                      }`}
                    >
                      {/* 사이드바와 같은 색 배정 — PC 와 폰의 인지방식을 맞춘다 */}
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${NAV_TONE_CLASS[item.tone]}`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 font-bold leading-snug text-ink">
                        {item.label}
                      </span>
                      <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {/*
            안내 코스 — 라벨이 곧 행동이다.
            '시연' 은 실제 화면을 도는 안내를 시작하고, 슬라이드를 열지 않는다.
          */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                startTour("quick");
              }}
              className="touch-target flex-1 rounded-btn bg-aqua-50 px-3 py-2.5 text-[0.875rem] font-extrabold text-aqua-800 ring-1 ring-aqua-200 transition-colors hover:bg-aqua-100"
            >
              빠른 시작 안내
            </button>
            {isManager && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  startTour("demo");
                }}
                className="touch-target flex flex-1 items-center justify-center gap-1.5 rounded-btn bg-gold-soft px-3 py-2.5 text-[0.875rem] font-extrabold text-gold-deep ring-1 ring-gold/30 transition-colors hover:bg-gold/20"
              >
                <PlayIcon className="h-4 w-4" />
                시연
              </button>
            )}
          </div>

          {/* 지금 화면을 PC 폭으로 — 폰에서만 나온다 */}
          <DevicePreviewButton />

          <div className="rounded-card bg-card-soft p-4 ring-1 ring-stone-line">
            <p className="mb-3 text-[0.8125rem] font-extrabold tracking-wide text-ink-sub">
              화면 표시
            </p>
            <div className="space-y-4">
              <div>
                <FieldLabel>글자 크기</FieldLabel>
                <SegmentedControl<FontScale>
                  label="글자 크기"
                  value={settings.fontScale}
                  options={[
                    { key: "small", label: "작게" },
                    { key: "default", label: "기본" },
                    { key: "large", label: "크게" },
                  ]}
                  onChange={(v) => updateSettings({ fontScale: v })}
                />
              </div>
              <div>
                <FieldLabel>밝기</FieldLabel>
                <SegmentedControl<Theme>
                  label="밝기"
                  value={settings.theme ?? "light"}
                  options={[
                    { key: "light", label: "라이트" },
                    { key: "dark", label: "다크" },
                    { key: "system", label: "시스템" },
                  ]}
                  onChange={(v) => updateSettings({ theme: v })}
                />
              </div>
              {/*
                색 조합 — PC 설정과 같은 값을 본다. 폰에서는 이름을 다
                적을 자리가 없어 색 점만 늘어놓고, 고른 것에 테두리를 준다.
                (읽어 주는 도구에는 이름이 그대로 전달된다)
              */}
              {isManager && (
                <div>
                  <FieldLabel>색 조합</FieldLabel>
                  <div
                    role="radiogroup"
                    aria-label="색 조합"
                    className="flex flex-wrap gap-2"
                  >
                    {PALETTES.map((p) => {
                      const on = (settings.palette ?? "teal") === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-label={p.name}
                          onClick={() => updateSettings({ palette: p.key })}
                          className={`touch-target flex items-center gap-0.5 rounded-full px-2 transition-colors ${
                            on
                              ? "bg-aqua-50 ring-2 ring-aqua-500"
                              : "bg-card ring-1 ring-stone-line"
                          }`}
                        >
                          {p.swatch.map((c) => (
                            <span
                              key={c}
                              style={{ backgroundColor: c }}
                              className="h-5 w-5 rounded-full"
                            />
                          ))}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[0.8125rem] text-ink-sub">
                    {PALETTES.find((p) => p.key === (settings.palette ?? "teal"))
                      ?.name ?? ""}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 화면 하나로 전부 보고 싶을 때 — 기존 /more 는 그대로 남겨 둔다 */}
          <Link
            href="/more"
            onClick={onClose}
            className="tap-line flex items-center justify-center gap-1.5 py-2 text-[0.875rem] font-bold text-ink-sub underline-offset-4 hover:text-aqua-700 hover:underline"
          >
            {isManager ? "더보기 화면으로 열기" : "계정 화면으로 열기"}
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SheetDoc({
  href,
  onClose,
  icon,
  title,
  desc,
  tone,
}: {
  href: string;
  onClose: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  tone: "aqua" | "gold";
}) {
  const skin =
    tone === "aqua"
      ? "from-aqua-50 to-card ring-aqua-200 active:bg-aqua-100"
      : "from-gold-soft to-card ring-gold/25 active:bg-gold/10";
  const tile =
    tone === "aqua"
      ? "from-aqua-500 to-deep-700"
      : "from-gold to-gold-deep";
  const sub = tone === "aqua" ? "text-aqua-800" : "text-gold-deep";

  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-center gap-3 rounded-card bg-gradient-to-br px-3.5 py-3.5 shadow-card ring-1 transition-colors ${skin}`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${tile}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[1rem] font-extrabold text-ink">
          {title}
        </span>
        <span className={`block text-[0.8125rem] leading-snug ${sub}`}>
          {desc}
        </span>
      </span>
    </Link>
  );
}
