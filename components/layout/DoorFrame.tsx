/**
 * 문 화면 — 직원 로그인 · 고객 로그인 · 연결코드 · 길 잃은 주소
 * =============================================================
 *
 * 실제로 운영을 시작하면 사람들이 **가장 먼저** 보는 화면은 대시보드도
 * 고객 홈도 아니라 이 문들이다. 그런데 앱 안쪽이 딥그린 머리 띠 · 걸친
 * 흰 판 · 알약 단추로 바뀐 뒤에도(D-54 ~ D-57) 문만 흰 카드 한 장짜리
 * 옛 모양이었다 — 대표님이 말씀하신 「들어가기 전에 이런 것도 통일」.
 *
 * 그래서 문도 같은 뼈대로 짓는다 (D-58).
 *
 *   딥그린 띠   상호 표식 · 어느 문인지(눈썹 글) · 큰 제목 · 한 줄 설명
 *   걸친 흰 판  입력칸과 단추 (이 문에서 할 일 하나)
 *   그 아래     처음 오신 분 · 다른 문으로 가는 길 · 안내 글
 *
 * 서버 · 클라이언트 어느 쪽에서도 쓸 수 있게 훅을 쓰지 않는다
 * (404 화면은 서버에서 그린다).
 */

import { ReactNode } from "react";

export function DoorMark({ size = "md" }: { size?: "md" | "sm" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-gold-deep font-serif font-bold text-deep-900 shadow-[0_2px_8px_rgba(0,0,0,0.25)] ${
        size === "md" ? "h-12 w-12 text-xl" : "h-10 w-10 text-lg"
      }`}
    >
      鼎
    </span>
  );
}

export default function DoorFrame({
  eyebrow,
  title,
  sub,
  header,
  children,
  after,
}: {
  /** 어느 문인지 — 「직원용 · WELLNESS BUSINESS AX」 같은 한 줄 */
  eyebrow: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  /** 위에 따로 머리글이 있으면(고객 화면) 띠 안의 상호 표식을 그리지 않는다 */
  header?: ReactNode;
  /** 걸친 흰 판 안 — 이 문에서 할 일 */
  children: ReactNode;
  /** 판 아래 — 처음 오신 분 · 다른 문 · 안내 */
  after?: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-stone-bg">
      {header}
      <section
        data-door
        className="relative isolate overflow-hidden bg-gradient-to-b from-deep-900 via-deep-900 to-deep-800 text-white"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gold/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-aqua-400/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-lg px-5 pb-16 pt-7 sm:pt-10">
          {!header && (
            <div className="mb-5 flex items-center gap-3">
              <DoorMark />
              <span className="min-w-0 leading-tight">
                <span className="block text-[1.0625rem] font-extrabold">정통대왕쑥뜸원</span>
                <span className="block text-[0.6875rem] font-bold tracking-[0.12em] text-gold-lite/85">
                  WELLNESS BUSINESS AX
                </span>
              </span>
            </div>
          )}
          <p className="text-[0.8125rem] font-extrabold text-gold-lite/90">{eyebrow}</p>
          <h1 className="mt-1 text-[1.625rem] font-extrabold leading-snug tracking-tight [word-break:keep-all]">
            {title}
          </h1>
          {sub && (
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-white/80 [word-break:keep-all]">
              {sub}
            </p>
          )}
        </div>
      </section>

      <main id="main" className="relative z-10 mx-auto -mt-10 max-w-lg px-4 pb-10">
        <div className="rounded-[22px] bg-card p-5 shadow-card ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          {children}
        </div>
        {after}
      </main>
    </div>
  );
}

/** 판 아래의 작은 판 — 처음 오신 분 · 다른 문 */
export function DoorNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded-[20px] bg-card px-5 py-4 shadow-card ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
      {children}
    </div>
  );
}
