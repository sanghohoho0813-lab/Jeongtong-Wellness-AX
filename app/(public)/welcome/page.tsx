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
import StickyBookBar from "@/components/public/StickyBookBar";
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
    desc: "날짜를 남기시면 매장에서 연락드립니다",
    icon: CalendarIcon,
    solid: true,
  },
  {
    href: "#가격",
    label: "이용권 보기",
    desc: "1회 · 10회권 · 30회권 가격표",
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
    desc: "이용 기록과 남은 이용권 확인",
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

/**
 * 매장을 믿을 만한 이유 — **확인된 사실만**.
 *
 * 경력 연수 · 만족도 · 누적 고객 수는 넣지 않았다. 매장이 확인해 준 값이
 * 없어서다. 아래 셋은 전부 서비스 표준(/service)·실제 제품자료에 이미
 * 있는 내용이고, 효능이나 결과를 약속하는 문장은 하나도 없다.
 */
const TRUST = [
  {
    icon: LeafIcon,
    title: "국내산 최상급 쑥",
    desc: "반죽 위에 올리는 쑥은 국내산 최상급을 씁니다.",
  },
  {
    icon: CheckIcon,
    title: "세 겹, 늘 같은 순서",
    desc: "거즈 → 특제 반죽 → 쑥. 매번 같은 구성으로 준비합니다.",
  },
  {
    icon: ClipboardIcon,
    title: "기록으로 잇는 관리",
    desc: "부위와 반응을 방문마다 남겨 다음 방문에 이어 갑니다.",
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
      {/*
        사진을 '띠' 로 깔지 않는다 — 이게 이번에 바뀐 핵심이다.

        moxa.jpg 는 1120×1031, 거의 정사각형(1.09)이다. 이걸 가로로 긴 띠에
        object-cover 로 깔면 어떻게 되는지 계산해 보면 답이 바로 나온다.

            폰   390 × 208  → 가로세로비 1.88 → 세로의 42% 가 잘려 나간다
            PC  1280 × 288  → 가로세로비 4.44 → 세로의 76% 가 잘려 나간다

        76% 를 잘라내면 남는 것은 쑥 덩어리 한가운데의 회갈색 결뿐이다.
        무엇을 찍은 사진인지 알아볼 수 없고, 알아볼 수 없는 큰 사진은
        화면을 고급스럽게 만들지 않는다 — 그냥 크고 지저분한 얼룩이다.

        그래서 사진을 **줄이고 틀에 넣는다.**

            폰   5:4 틀   → 잘리는 양 13%
            PC  1:1 틀   → 잘리는 양 8% (가로로)

        그리고 틀에 금빛 실선과 깊은 그림자를 준다. 화면 끝까지 늘어난
        사진은 '배경'으로 읽히지만, 테두리가 있는 사진은 '작품'으로 읽힌다.
        PC 에서는 글과 사진을 좌우로 나눈다 — 오른쪽 절반이 비어 있던
        자리에 사진이 들어가면서, 세로로 300px 가까이 짧아진다.

        글자는 여전히 단색 딥그린 위에만 올린다. 사진 위에 얹는 것은 작은
        설명표 하나뿐이고, 그 자리에는 아래쪽 어둠 그라데이션을 깐다.
      */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-deep-900 to-deep-950">
        {/* 은은한 금빛 번짐 — 단색 면이 밋밋해지지 않게 */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/10 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-5xl items-center gap-7 px-4 pb-14 pt-9 sm:px-6 sm:pb-16 sm:pt-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
          <div className="min-w-0">
            <h1 className="text-[1.9375rem] font-extrabold leading-[1.25] tracking-tight text-white sm:text-[2.75rem]">
              몸과 마음을 돌보는
              <span className="mt-1 block bg-gradient-to-r from-gold-lite to-gold bg-clip-text text-transparent">
                프리미엄 쑥뜸 케어
              </span>
            </h1>

            <span className="my-4 flex max-w-xs items-center gap-3 sm:my-5" aria-hidden>
              <span className="h-px flex-1 bg-white/25" />
              <LeafIcon className="h-4 w-4 text-gold" />
              <span className="h-px flex-1 bg-white/25" />
            </span>

            <p className="max-w-md text-[1.0625rem] leading-relaxed text-white/85 sm:text-[1.125rem]">
              거즈 위에 특제 반죽을 펴고 쑥을 올려 넓은 부위에 온열을
              전달합니다. 다녀가신 기록이 쌓이면 다음 관리 시점까지 함께
              챙겨 드립니다.
            </p>
          </div>

          {/*
            사진 틀.

            aspect 를 폰·PC 다르게 주는 이유는 위 계산 그대로다. 폰에서는
            5:4 가 사진을 알아볼 만큼 담으면서도 첫 화면을 다 먹지 않는
            선이고, PC 에서는 옆에 글이 있으니 정사각형으로 두어 원본에
            가장 가깝게 보여 준다.
          */}
          <figure className="relative min-w-0">
            {/*
              사진 둘레에 얇은 빛 테두리(매트)를 한 겹 두른다.

              moxa.jpg 는 검은 배경에서 찍은 제품 사진이라, 딥그린 위에
              그냥 얹으면 '까만 네모' 가 하나 떠 있는 것처럼 보인다.
              액자에 흰 매트를 두르듯 반투명한 밝은 테두리를 한 겹 주면
              검은 면이 배경 사고가 아니라 작품의 일부로 읽힌다.
            */}
            <div className="rounded-[2rem] bg-white/[0.06] p-2 shadow-[0_28px_64px_-28px_rgba(0,0,0,0.8)] ring-1 ring-gold/25">
            <div className="relative aspect-[5/4] overflow-hidden rounded-[1.5rem] lg:aspect-[6/5]">
              <Image
                src="/service/moxa.jpg"
                alt="거즈와 특제 반죽 위에 쑥을 올려 완성한 대왕쑥뜸"
                fill
                priority
                sizes="(min-width: 1024px) 480px, 100vw"
                className="object-cover object-center"
              />

              {/* 아래쪽만 어둡게 — 설명표가 사진 위에서 읽히도록 */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
              />

              <figcaption className="absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-deep-950/65 px-3.5 py-2 text-[0.875rem] font-bold text-gold-lite ring-1 ring-gold/35 backdrop-blur-md sm:text-[0.9375rem]">
                  <LeafIcon className="h-4 w-4 shrink-0" />
                  국내산 최상급 쑥 사용
                </span>
              </figcaption>
            </div>
            </div>
          </figure>
        </div>
      </section>

      {/* ── 2. 지금 할 수 있는 것 ─────────────────────────── */}
      {/*
        relative z-10 이 없으면 이 카드들이 히어로 밑에 깔린다.
        히어로는 position:relative + isolate 라 스택 문맥을 만드는데, 이쪽은
        position:static 이라 '위치 잡힌 요소'에게 그림 순서를 내준다.
        -mt-6 으로 끌어올린 26px 이 그대로 히어로에 먹혀서, 실제 폰에서
        첫 카드의 '예약하기' 글자 윗부분이 잘려 보였다.
      */}
      <section
        aria-label="바로 하실 수 있는 것"
        data-book-anchor
        className="relative z-10 mx-auto -mt-6 max-w-5xl px-4 sm:px-6"
      >
        {/*
          네 칸의 크기를 맞춘다.

          전에는 설명 길이가 칸마다 달라서 카드 높이가 제각각이었다
          ('1회 · 10회권 · 30회권 가격표' 는 한 줄, '날짜를 남기시면
          매장에서 연락드립니다' 는 두 줄). PC 에서 2×2 로 놓이면 그 차이가
          왼쪽·오른쪽 어긋남으로 그대로 드러난다.

          items-stretch(기본) + h-full 로 같은 줄의 두 칸을 같은 높이로
          묶고, 글은 위에서부터 채운다(items-start). 아이콘 상자는 어느
          칸에서나 48px 한 가지다.
        */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.label}
                href={a.href}
                className={`card-lift group flex h-full items-start gap-4 rounded-card-lg p-5 shadow-card transition-colors ${
                  a.solid
                    ? "bg-deep-800 text-white ring-1 ring-deep-700 hover:bg-deep-700"
                    : "bg-card text-ink ring-1 ring-stone-line hover:bg-aqua-50"
                }`}
              >
                <span
                  className={`icon-pop flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
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
                    className={`mt-1 block text-[0.9375rem] leading-snug ${
                      a.solid ? "text-white/75" : "text-ink-sub"
                    }`}
                  >
                    {a.desc}
                  </span>
                </span>
                <ChevronRightIcon
                  className={`mt-1 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                    a.solid ? "text-white/60" : "text-ink-faint"
                  }`}
                />
              </Link>
            );
          })}
        </div>

        <p className="mt-3 px-1 text-[0.9375rem] leading-relaxed text-ink-sub">
          예약과 상담은 <b className="text-ink-soft">내 기록</b>에 들어가신 뒤
          남기실 수 있습니다. 처음이시라면 매장에서 연결코드를 받아 주세요.
        </p>
      </section>

      {/* ── 2-1. 매장을 믿을 만한 이유 ────────────────────── */}
      {/*
        여기에 무엇을 쓰지 '않았는지' 를 먼저 적어 둔다.

        보통 이 자리에는 '○년 경력', '만족도 ○%', '누적 ○명' 이 들어간다.
        그 숫자들을 쓰지 않았다. 매장이 확인해 준 값이 이 저장소 어디에도
        없기 때문이다. 확인되지 않은 숫자를 공개 화면에 거는 것은 그냥
        거짓말이고, 한 번 걸면 내리기도 어렵다.

        그래서 **이미 확인된 사실 셋**만 쓴다. 셋 다 서비스 표준 화면
        (/service) · 실제 제품자료와 같은 내용이고, 효능을 말하지 않는다.
        매장에서 경력·만족도 수치를 확정해 주시면 그때 이 자리에 더한다.
      */}
      <section
        aria-labelledby="trust"
        className="mx-auto mt-10 max-w-5xl px-4 sm:px-6"
      >
        <h2 id="trust" className="eyebrow mb-3 px-1">
          정통대왕쑥뜸원이 지키는 것
        </h2>
        <ul className="stat-strip grid-cols-1 sm:grid-cols-3">
          {TRUST.map((t) => {
            const Icon = t.icon;
            return (
              <li key={t.title} className="stat-cell flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft/60 text-gold-deep ring-1 ring-gold/25">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[1.0625rem] font-extrabold leading-tight text-ink">
                    {t.title}
                  </span>
                  <span className="mt-1 block text-[0.9375rem] leading-snug text-ink-sub">
                    {t.desc}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
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

        {/*
          폰에서는 가로줄, PC 에서는 세 칸.

          처음엔 어느 폭에서나 세로 카드였다. 그런데 폰에서 카드 하나가
          480px 씩 차지해, 짧은 문장 셋을 읽는 데 스크롤이 두 화면 가까이
          들었다. 여백이 넉넉한 것과 텅 빈 것은 다르다.

          폰에서는 아이콘을 왼쪽에 두고 글을 오른쪽에 붙인다 — 셋을 합쳐
          한 화면에 들어온다. PC 는 가로 폭이 남으니 그대로 세 칸으로 편다.
        */}
        <ul className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {FOR_WHOM.map((f) => {
            const Icon = f.icon;
            return (
              <li
                key={f.title}
                className="flex items-center gap-4 rounded-card-lg bg-card p-4 shadow-card ring-1 ring-stone-line sm:flex-col sm:p-6 sm:text-center"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-deep-700 to-deep-900 text-gold shadow-[0_4px_12px_rgba(10,46,44,0.25)] sm:h-16 sm:w-16">
                  <Icon className="h-6 w-6 sm:h-8 sm:w-8" />
                </span>
                <span className="min-w-0 flex-1 sm:flex-none">
                  <span className="block text-[1.0625rem] font-extrabold text-ink sm:mt-4">
                    {f.title}
                  </span>
                  <span className="mt-1 block break-words text-[0.9375rem] leading-snug text-ink-sub sm:mt-1.5 sm:leading-relaxed">
                    {f.desc}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── 4. 어떻게 하는가 ──────────────────────────────── */}
      <section aria-labelledby="how" className="mx-auto mt-12 max-w-5xl px-4 sm:px-6">
        {/*
          여기도 같은 문제였다. mugwort.jpg 는 840×1120, **세로로 긴** 사진
          (0.75)인데 21:9(2.33) 띠에 깔아 두었다 — 세로의 68% 가 잘려서,
          쑥 무더기의 허리께만 가로로 길게 남았다.

          세로 사진은 세로로 놓는다. PC 에서는 왼쪽에 3:4 로 세워
          원본 그대로 보여 주고(잘리는 양 0%), 글과 3단 구성을 오른쪽에
          붙인다. 폰에서는 1:1 로 두어 25% 만 잘리게 한다.
        */}
        <div className="overflow-hidden rounded-card-lg bg-card shadow-card ring-1 ring-stone-line sm:grid sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="relative aspect-square sm:aspect-auto sm:min-h-full">
            <Image
              src="/service/mugwort.jpg"
              alt="반죽 위에 올리는 국내산 쑥"
              fill
              sizes="(min-width: 640px) 420px, 100vw"
              className="object-cover object-center"
            />
          </div>
          <div className="min-w-0 p-6 sm:p-7">
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

        {/*
          폰에서는 가로줄, PC 에서는 세 칸.

          세로 카드로 두었더니 값 하나 보는 데 카드가 400px 씩 들었고,
          '가장 많이 찾으십니다' 배지를 카드 위쪽에 띄워 놓은 탓에 폰에서
          위 카드의 아래쪽을 덮었다 — 히어로가 예약 카드를 덮던 것과 같은
          실수다. 배지를 카드 안으로 들이고, 폰에서는 한 줄로 눕힌다.
        */}
        <ul className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {PUBLIC_PRICES.map((p) => (
            <li
              key={p.name}
              className={`flex h-full items-center gap-4 rounded-card-lg p-4 shadow-card sm:flex-col sm:items-start sm:p-6 ${
                p.highlight
                  ? "bg-deep-800 text-white ring-1 ring-gold/40"
                  : "bg-card ring-1 ring-stone-line"
              }`}
            >
              <span className="min-w-0 flex-1">
                {p.highlight && (
                  <span className="mb-1.5 inline-flex rounded-full bg-gradient-to-r from-gold to-gold-deep px-2.5 py-0.5 text-[0.6875rem] font-extrabold tracking-wide text-deep-900">
                    가장 많이 찾으십니다
                  </span>
                )}
                <span
                  className={`block break-words text-[1.0625rem] font-extrabold ${
                    p.highlight ? "text-gold-lite" : "text-ink"
                  }`}
                >
                  {p.name}
                </span>
                <span
                  className={`mt-1 flex items-center gap-1.5 text-[0.875rem] font-bold ${
                    p.highlight ? "text-gold-lite" : "text-aqua-800"
                  }`}
                >
                  <CheckIcon className="h-4 w-4 shrink-0" />
                  {p.sessions}회 이용
                </span>
              </span>

              {/*
                PC 에서 값을 카드 바닥에 붙인다(mt-auto). 10회권만 위에
                배지가 붙어 있어서, 그냥 두면 세 카드의 값이 계단처럼
                어긋난 높이에 놓인다 — 값을 견주려고 보는 표에서 그건
                제일 하면 안 되는 일이다.
              */}
              <span className="shrink-0 text-right sm:mt-auto sm:w-full sm:pt-4 sm:text-left">
                <span
                  className={`nowrap-num block text-[1.375rem] font-extrabold tabular lg:text-[1.75rem] ${
                    p.highlight ? "text-white" : "text-ink"
                  }`}
                >
                  {formatWon(p.price)}
                </span>
                {p.sessions > 1 && (
                  <span
                    className={`nowrap-num mt-0.5 block text-[0.8125rem] tabular ${
                      p.highlight ? "text-white/70" : "text-ink-sub"
                    }`}
                  >
                    1회당 {formatWon(p.perSession)}
                  </span>
                )}
              </span>
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

      {/*
        폰 하단 고정 예약 막대 — 위쪽 단추가 화면 밖으로 나간 뒤에만 올라온다.
        (자세한 이유는 StickyBookBar 안에)
      */}
      <StickyBookBar />

      {/* 고정 막대가 마지막 글을 가리지 않게 그만큼 비워 둔다 */}
      <div aria-hidden className="h-[4.5rem] sm:hidden" />
    </>
  );
}
