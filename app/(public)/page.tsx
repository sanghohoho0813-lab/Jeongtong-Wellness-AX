import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  BodyIcon,
  CalendarIcon,
  ChatIcon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardIcon,
  LeafIcon,
  TicketIcon,
} from "@/components/ui/icons";
import { PUBLIC_PRICES } from "@/lib/public/price-sheet";
import { formatWon } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "정통대왕쑥뜸원 — 프리미엄 온열 웰니스 케어",
  description:
    "거즈 · 특제 반죽 · 국내산 최상급 쑥을 올려 넓은 부위에 온열을 전달하는 대왕쑥뜸. 방문 기록이 쌓이면 다음 관리 시점을 함께 챙겨 드립니다.",
};

/**
 * 공개 첫 화면 — 처음 온 사람이 5초 안에 알아야 하는 것
 * ======================================================
 *
 * 순서를 이렇게 잡았다.
 *
 *   1) 여기가 무엇을 하는 곳인가        (히어로)
 *   2) 내가 지금 뭘 할 수 있는가        (큰 단추 넷)
 *   3) 나 같은 사람에게 맞는 곳인가     (이런 분께)
 *   4) 실제로 뭘 어떻게 하는가          (3단 구성)
 *   5) 얼마인가                         (가격표)
 *   6) 왜 여기여야 하는가               (기록이 쌓인다)
 *
 * 흔한 랜딩페이지는 2)를 맨 아래에 둔다. 그런데 이 화면에 오는 사람의 절반은
 * **이미 다니시는 고객**이고, 그분들이 원하는 건 소개가 아니라 자기 기록이다.
 * 그래서 단추를 위로 끌어올렸다.
 *
 * 이 화면은 데이터베이스를 읽지 않는다. 읽는 순간 로그인 없이 열리는 통로가
 * 하나 생기고, 그건 공개 화면이 감당할 위험이 아니다. 여기 있는 글과 숫자는
 * 전부 매장 자료에서 옮겨 온 고정값이다.
 */

/** 큰 단추 넷 — 시안의 2×2 배치를 그대로 쓴다 */
const ACTIONS = [
  {
    href: "/my/booking",
    label: "예약하기",
    desc: "원하시는 날짜를 남기시면 매장에서 확인 후 연락드립니다",
    icon: CalendarIcon,
    solid: true,
  },
  {
    href: "#가격",
    label: "이용권 보기",
    desc: "1회 · 10회권 · 30회권 매장 가격표",
    icon: TicketIcon,
    solid: false,
  },
  {
    href: "/my/request",
    label: "상담 문의",
    desc: "궁금한 점을 남겨 주세요",
    icon: ChatIcon,
    solid: false,
  },
  {
    href: "/my",
    label: "내 기록 시작하기",
    desc: "지금까지의 이용 기록과 남은 이용권을 확인",
    icon: ClipboardIcon,
    solid: true,
  },
];

const FOR_WHOM = [
  {
    icon: BodyIcon,
    title: "맞춤 웰니스 관리",
    desc: "케어 부위와 반응을 매번 기록해, 다음 방문 때 그대로 이어서 봐 드립니다.",
  },
  {
    icon: CalendarIcon,
    title: "방문 주기 관리",
    desc: "다녀가신 간격을 보고 다음 방문 권장 시점을 함께 챙겨 드립니다.",
  },
  {
    icon: LeafIcon,
    title: "홈케어 안내",
    desc: "매장에서 하는 관리와 이어지는 생활 관리 정보를 안내해 드립니다.",
  },
];

/** 실제 시술 구성 — 서비스 표준 화면과 같은 내용 */
const LAYERS = [
  { no: 1, name: "보호용 거즈", desc: "피부에 먼저 올립니다" },
  { no: 2, name: "특제 반죽", desc: "여러 식물을 곱게 갈아 배합·발효한 반죽" },
  { no: 3, name: "국내산 쑥", desc: "국내산 최상급을 씁니다" },
];

export default function PublicHome() {
  return (
    <>
      {/* ── 1. 히어로 ─────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-deep-900">
        <div className="absolute inset-0">
          <Image
            src="/service/moxa.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-right opacity-45 sm:opacity-55"
          />
          {/*
            사진 위에 글자를 얹으면 밝은 부분에서 읽히지 않는다.
            왼쪽(글자 쪽)을 진하게 덮는 가로 그라데이션을 하나 더 깐다.
          */}
          <div className="absolute inset-0 bg-gradient-to-r from-deep-950 via-deep-950/85 to-deep-950/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-deep-950/70 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14">
          <h1 className="max-w-xl text-[2rem] font-extrabold leading-[1.25] tracking-tight text-white sm:text-[2.75rem]">
            몸과 마음을 돌보는
            <span className="mt-1 block bg-gradient-to-r from-gold-lite to-gold bg-clip-text text-transparent">
              프리미엄 쑥뜸 케어
            </span>
          </h1>

          <span className="my-5 flex max-w-xs items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-white/25" />
            <LeafIcon className="h-4 w-4 text-gold" />
            <span className="h-px flex-1 bg-white/25" />
          </span>

          <p className="max-w-md text-[1.0625rem] leading-relaxed text-white/85 sm:text-[1.125rem]">
            거즈 위에 특제 반죽을 넓게 펴고 쑥을 올려, 넓은 부위에 온열을
            전달합니다. 다녀가신 기록이 쌓이면 다음 관리 시점까지 함께 챙겨
            드립니다.
          </p>

          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[0.9375rem] font-bold text-gold-lite ring-1 ring-gold/35">
            <LeafIcon className="h-4 w-4 shrink-0" />
            국내산 최상급 쑥 사용
          </span>
        </div>
      </section>

      {/* ── 2. 지금 할 수 있는 것 ─────────────────────────── */}
      <section
        aria-label="바로 하실 수 있는 것"
        className="mx-auto -mt-6 max-w-5xl px-4 sm:px-6"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.label}
                href={a.href}
                className={`card-lift group flex items-center gap-4 rounded-card-lg p-5 shadow-card transition-colors ${
                  a.solid
                    ? "bg-deep-800 text-white ring-1 ring-deep-700 hover:bg-deep-700"
                    : "bg-card text-ink ring-1 ring-stone-line hover:bg-aqua-50"
                }`}
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    a.solid
                      ? "bg-white/12 text-gold-lite ring-1 ring-white/15"
                      : "bg-gold-soft/50 text-gold-deep ring-1 ring-gold/25"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[1.1875rem] font-extrabold leading-tight">
                    {a.label}
                  </span>
                  <span
                    className={`mt-1 block text-[0.875rem] leading-snug ${
                      a.solid ? "text-white/70" : "text-ink-sub"
                    }`}
                  >
                    {a.desc}
                  </span>
                </span>
                <ChevronRightIcon
                  className={`h-5 w-5 shrink-0 ${a.solid ? "text-white/60" : "text-ink-faint"}`}
                />
              </Link>
            );
          })}
        </div>

        <p className="mt-3 px-1 text-[0.875rem] leading-relaxed text-ink-sub">
          예약과 상담은 <b className="text-ink-soft">내 기록</b>에 들어가신 뒤
          남기실 수 있습니다. 처음이시라면 매장에서 연결코드를 받아 주세요.
        </p>
      </section>

      {/* ── 3. 이런 분께 ──────────────────────────────────── */}
      <section aria-labelledby="for-whom" className="mx-auto mt-12 max-w-5xl px-4 sm:px-6">
        <h2
          id="for-whom"
          className="flex items-center justify-center gap-2.5 text-center text-[1.375rem] font-extrabold text-ink sm:text-[1.625rem]"
        >
          <LeafIcon className="h-5 w-5 shrink-0 text-gold-deep" aria-hidden />
          이런 분께 권해 드립니다
          <LeafIcon className="h-5 w-5 shrink-0 scale-x-[-1] text-gold-deep" aria-hidden />
        </h2>

        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {FOR_WHOM.map((f) => {
            const Icon = f.icon;
            return (
              <li
                key={f.title}
                className="rounded-card-lg bg-card p-6 text-center shadow-card ring-1 ring-stone-line"
              >
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-deep-700 to-deep-900 text-gold shadow-[0_4px_12px_rgba(10,46,44,0.25)]">
                  <Icon className="h-8 w-8" />
                </span>
                <p className="mt-4 text-[1.0625rem] font-extrabold text-ink">
                  {f.title}
                </p>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-sub">
                  {f.desc}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── 4. 어떻게 하는가 ──────────────────────────────── */}
      <section aria-labelledby="how" className="mx-auto mt-12 max-w-5xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-card-lg bg-card shadow-card ring-1 ring-stone-line">
          <div className="relative aspect-[16/9] sm:aspect-[21/9]">
            <Image
              src="/service/mugwort.jpg"
              alt="반죽 위에 올리는 국내산 쑥"
              fill
              sizes="(min-width: 640px) 900px, 100vw"
              className="object-cover"
            />
          </div>
          <div className="p-6 sm:p-7">
            <h2 id="how" className="text-[1.375rem] font-extrabold text-ink sm:text-[1.5rem]">
              세 겹으로 올립니다
            </h2>
            <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-ink-sub">
              피부에 닿는 순서대로 거즈 → 특제 반죽 → 쑥을 올려 완성합니다.
              한 점이 아니라 넓은 부위에 온열이 퍼지는 것이 대왕쑥뜸의 방식입니다.
            </p>
            <ol className="mt-5 space-y-2.5">
              {LAYERS.map((l) => (
                <li
                  key={l.no}
                  className="flex items-center gap-3.5 rounded-card bg-card-soft px-4 py-3 ring-1 ring-stone-line"
                >
                  <span className="nowrap-num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aqua-500 to-deep-800 text-[0.9375rem] font-extrabold text-white">
                    {l.no}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[1rem] font-extrabold text-ink">
                      {l.name}
                    </span>
                    <span className="block text-[0.875rem] leading-snug text-ink-sub">
                      {l.desc}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── 5. 가격표 ─────────────────────────────────────── */}
      <section id="가격" aria-labelledby="price" className="mx-auto mt-12 max-w-5xl scroll-mt-24 px-4 sm:px-6">
        <h2 id="price" className="text-center text-[1.375rem] font-extrabold text-ink sm:text-[1.625rem]">
          이용권 안내
        </h2>
        <p className="mx-auto mt-2 max-w-prose text-center text-[0.9375rem] leading-relaxed text-ink-sub">
          매장 가격표 기준입니다. 변동될 수 있으니 방문 전 확인해 주세요.
        </p>

        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PUBLIC_PRICES.map((p) => (
            <li
              key={p.name}
              className={`relative flex flex-col rounded-card-lg p-6 shadow-card ${
                p.highlight
                  ? "bg-deep-800 text-white ring-1 ring-gold/40"
                  : "bg-card ring-1 ring-stone-line"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-gradient-to-r from-gold to-gold-deep px-3 py-1 text-[0.6875rem] font-extrabold tracking-wide text-deep-900">
                  가장 많이 찾으십니다
                </span>
              )}
              <p
                className={`text-[1.0625rem] font-extrabold ${p.highlight ? "text-gold-lite" : "text-ink"}`}
              >
                {p.name}
              </p>
              <p
                className={`nowrap-num mt-2 text-[1.75rem] font-extrabold tabular ${
                  p.highlight ? "text-white" : "text-ink"
                }`}
              >
                {formatWon(p.price)}
              </p>
              {p.sessions > 1 && (
                <p
                  className={`nowrap-num mt-1 text-[0.875rem] tabular ${
                    p.highlight ? "text-white/70" : "text-ink-sub"
                  }`}
                >
                  1회당 {formatWon(p.perSession)} 꼴
                </p>
              )}
              <p
                className={`mt-4 flex items-center gap-1.5 text-[0.875rem] font-bold ${
                  p.highlight ? "text-gold-lite" : "text-aqua-800"
                }`}
              >
                <CheckIcon className="h-4 w-4 shrink-0" />
                {p.sessions}회 이용
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-center text-[0.875rem] leading-relaxed text-ink-faint">
          이용권 유효기간·환불 규정은 매장에서 정한 내용을 안내해 드립니다.
        </p>
      </section>

      {/* ── 6. 왜 여기인가 — 기록이 쌓인다 ────────────────── */}
      <section className="mx-auto mt-12 max-w-5xl px-4 sm:px-6">
        <div className="rounded-card-lg bg-gradient-to-br from-deep-800 to-deep-950 p-7 shadow-card ring-1 ring-gold/25 sm:p-9">
          <p className="text-[0.75rem] font-extrabold uppercase tracking-[0.16em] text-gold">
            다니실수록 편해집니다
          </p>
          <h2 className="mt-2 max-w-xl text-[1.5rem] font-extrabold leading-snug text-white sm:text-[1.875rem]">
            매번 처음부터 다시 설명하지 않으셔도 됩니다
          </h2>
          <p className="mt-3 max-w-xl text-[1rem] leading-relaxed text-white/80">
            어느 부위를 어떻게 봐 드렸는지, 어떤 반응이 좋으셨는지가 방문마다
            남습니다. 다음에 오시면 그 기록에서 이어서 시작합니다.
          </p>

          <ul className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {[
              "케어 부위와 반응 기록",
              "남은 이용권 확인",
              "다음 방문 권장 시점 안내",
            ].map((t) => (
              <li
                key={t}
                className="flex items-center gap-2.5 rounded-card bg-white/[0.07] px-4 py-3 text-[0.9375rem] font-bold text-white ring-1 ring-white/10"
              >
                <CheckIcon className="h-4 w-4 shrink-0 text-gold" />
                <span className="min-w-0">{t}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/my"
            className="touch-target mt-7 inline-flex items-center gap-1.5 rounded-btn bg-gradient-to-r from-gold to-gold-deep px-6 text-[1.0625rem] font-extrabold text-deep-900 shadow-[0_4px_14px_rgba(201,168,106,0.3)] transition-transform hover:scale-[1.02]"
          >
            내 기록 시작하기
            <ChevronRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
