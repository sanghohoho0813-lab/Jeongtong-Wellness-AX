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
import FutureSection from "@/components/public/FutureSection";
import { ListGroup, ListRow, Section, StatusPill } from "@/components/portal/kit";
import { PUBLIC_PRICES } from "@/lib/public/price-sheet";
import { formatWon } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "정통대왕쑥뜸원 — 프리미엄 온열 웰니스 케어",
  description:
    "거즈 · 특제 반죽 · 국내산 최상급 쑥을 올려 넓은 부위에 온열을 전달하는 대왕쑥뜸. 방문 기록이 쌓이면 다음 관리 시점을 함께 챙겨 드립니다.",
};

/**
 * 고객용 화면 — 고객이 보는 플랫폼
 * =================================
 *
 * 이 주소는 소개만 하고 마는 랜딩페이지가 아니라, 고객이 예약을 남기고
 * 가격을 보고 상담을 남기고 자기 기록(MY WELLNESS)으로 건너가는 문이다.
 *
 * 생김새를 MY WELLNESS 와 같은 앱으로 맞췄다 (D-56).
 * ------------------------------------------------
 * 대표님이 내부 화면 「더보기 → 고객용 화면」 으로 들어와 보시고 "옛날
 * 모습" 이라고 하셨다. 맞는 말이었다. 바로 다음 화면인 /my 는 배달 · 적립
 * 앱 모양(머리 띠 · 바로가기 칸 · 옆으로 넘기는 카드 · 목록 줄 · 알약)
 * 으로 바뀌었는데, 그 앞의 문만 홍보 페이지 모양 — 큰 사진 띠가 위아래로
 * 일곱 장 — 그대로였다. 같은 가게의 두 화면이 서로 다른 앱처럼 보였다.
 *
 * 그래서 /my 의 부품(components/portal/kit)을 그대로 가져다 쓴다.
 *
 *   1) 어두운 머리 띠 + 대표 사진            (여기가 무엇을 하는 곳인가)
 *   2) 머리 띠에 걸친 바로가기 네 칸         (지금 뭘 할 수 있는가)
 *   3) 지키는 것 세 가지                     (믿을 만한가)
 *   4) 옆으로 넘기는 사진 카드 셋            (가면 어떤 시간을 보내나)
 *   5) 이런 분께 · 세 겹 구성 — 목록 줄      (나에게 맞나 · 무엇을 하나)
 *   6) 이용권 — 쿠폰 모양                    (얼마인가)
 *   7) 기록이 쌓인다 — 어두운 판             (왜 여기여야 하나)
 *   8) 앞으로 준비하는 것 — 점선 목록        (아직 없는 것)
 *
 * 폰에서 8,200px 이던 길이가 절반 가까이로 준다. 사진을 크게 깔던 띠를
 * 카드 안의 사진으로 바꾼 것이 대부분이다. 내용은 하나도 빼지 않았다.
 *
 * 이 화면은 데이터베이스를 읽지 않는다. 읽는 순간 로그인 없이 열리는 통로가
 * 하나 생기고, 그건 공개 화면이 감당할 위험이 아니다. 여기 있는 글과 숫자는
 * 전부 매장 자료에서 옮겨 온 고정값이다.
 */

/** 바로가기 네 칸 — /my 홈의 바로가기와 같은 모양 */
const ACTIONS = [
  {
    href: "/my/booking",
    label: "예약하기",
    desc: "날짜를 남기시면 연락드립니다",
    icon: CalendarIcon,
    tone: "bg-aqua-50 text-aqua-700 ring-aqua-100 dark:bg-aqua-500/10 dark:text-aqua-300 dark:ring-aqua-500/20",
  },
  {
    href: "#가격",
    label: "이용권 보기",
    desc: "1회 · 10회권 · 30회권 가격표",
    icon: TicketIcon,
    tone: "bg-gold-soft text-gold-deep ring-gold/20",
  },
  {
    href: "/my/request",
    label: "상담 문의",
    desc: "궁금한 점을 남겨 주세요",
    icon: ChatIcon,
    tone: "bg-aqua-50 text-aqua-700 ring-aqua-100 dark:bg-aqua-500/10 dark:text-aqua-300 dark:ring-aqua-500/20",
  },
  {
    href: "/my",
    label: "내 기록",
    desc: "이용 기록 · 남은 이용권 확인",
    icon: ClipboardIcon,
    tone: "bg-gradient-to-br from-deep-700 to-deep-900 text-gold ring-black/10",
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

/**
 * 옆으로 넘기는 사진 카드 셋.
 *
 * 사진마다 **왜 거기 있는지**가 다르다 — 무엇을 해 주나 · 어떤 곳인가 ·
 * 무엇을 몸에 올리나. 같은 쑥뜸 사진을 세 번 쓰면 세 번 다 같은 말이 된다.
 *
 * 세 장 모두 3:2 상자에 넣는다. 원본 비율이 1.50 · 2.00 · 1.25 라
 * 잘리는 양은 0% · 25% · 17% — 무엇을 찍은 사진인지 알아볼 수 있는 선
 * (34%) 안이다. 4:3 으로 두면 store_space 가 33% 로 그 선에 붙는다.
 */
const SCENES = [
  {
    src: "/brand/service_scene.jpg",
    alt: "직원이 고객의 복부에 쑥뜸을 올려 드리는 모습",
    position: "object-[45%_45%]",
    eyebrow: "방문하시면",
    title: "눕기만 하시면 됩니다",
    desc: "부위를 여쭙고 거즈 · 반죽 · 쑥을 차례로 올립니다. 진행되는 동안 편히 쉬시면 됩니다.",
  },
  {
    src: "/brand/store_space.jpg",
    alt: "따뜻한 조명과 나무·초록으로 꾸민 케어 공간",
    position: "object-center",
    eyebrow: "머무는 동안",
    title: "서두르지 않아도 되는 자리",
    desc: "따뜻한 조명과 나무 · 초록으로 꾸민 공간에서 쉬다 가십니다.",
  },
  {
    src: "/brand/material_closeup.jpg",
    alt: "거즈 위에 넓게 편 쑥 — 가까이서 본 모습",
    position: "object-center",
    eyebrow: "무엇을 올리나",
    title: "몸에 닿는 것부터 봅니다",
    desc: "보호용 거즈 위에 여러 식물을 배합·발효한 반죽을 펴고, 국내산 최상급 쑥을 올립니다.",
  },
];

const FOR_WHOM = [
  {
    icon: BodyIcon,
    title: "맞춤 웰니스 관리",
    desc: "케어 부위와 반응을 매번 기록해, 다음 방문 때 이어서 봐 드립니다.",
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

/** 실제 시술 구성 — 서비스 표준 화면 · 고객 화면(/my/more)과 같은 내용 */
const LAYERS: { no: number; name: string; desc: string; photo?: string }[] = [
  { no: 1, name: "보호용 거즈", desc: "피부에 먼저 올립니다" },
  { no: 2, name: "특제 반죽", desc: "여러 식물을 곱게 갈아 배합·발효한 반죽", photo: "/service/dough.jpg" },
  { no: 3, name: "국내산 쑥", desc: "국내산 최상급을 씁니다", photo: "/service/mugwort.jpg" },
];

const card =
  "rounded-[20px] bg-card shadow-card ring-1 ring-black/[0.04] dark:ring-white/[0.06]";

export default function PublicHome() {
  return (
    <>
      {/* ── 1. 머리 띠 ─────────────────────────────────────── */}
      {/*
        /my 홈의 머리 띠와 같은 딥그린 띠. 글자는 단색 띠 위에만 올리고,
        사진은 띠 안의 둥근 카드로 넣는다.

        hero_main.jpg (1536×1024, 비 1.50)
            PC   3:2  → 잘리는 양 0%
            폰   16:10 → 세로 6%. 바로가기 칸이 첫 화면에 들어오도록
                        4:3 보다 한 단계 낮췄다. 58% 지점을 기준으로 잘라
                        왼쪽 빈 벽을 먼저 버리고 얼굴을 남긴다.
        전체폭으로 깔지 않는다 — 1920 화면에 깔면 25% 확대되어 흐려진다.
      */}
      <section
        data-welcome-hero
        className="relative isolate overflow-hidden bg-gradient-to-b from-deep-900 via-deep-900 to-deep-800 text-white"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/10 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-5xl items-center gap-5 px-4 pb-14 pt-6 sm:px-6 sm:pb-16 sm:pt-9 lg:grid-cols-[1fr_1fr] lg:gap-10 lg:pb-20 lg:pt-12">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[0.8125rem] font-extrabold text-gold-lite ring-1 ring-gold/30">
              <LeafIcon className="h-4 w-4 shrink-0" />
              국내산 최상급 쑥 사용
            </span>
            <h1 className="mt-3 text-[1.875rem] font-extrabold leading-[1.25] tracking-tight sm:text-[2.5rem]">
              몸과 마음을 돌보는
              <span className="block bg-gradient-to-r from-gold-lite to-gold bg-clip-text text-transparent">
                프리미엄 쑥뜸 케어
              </span>
            </h1>
            <p className="mt-2.5 max-w-md text-[1rem] leading-relaxed text-white/80 sm:text-[1.0625rem]">
              거즈 위에 특제 반죽을 펴고 쑥을 올려, 넓은 부위에 온열을
              전달합니다.
            </p>
          </div>

          <figure className="relative min-w-0 overflow-hidden rounded-[22px] shadow-[0_24px_56px_-28px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
            <div className="relative aspect-[16/10] lg:aspect-[3/2]">
              <Image
                src="/brand/hero_main.jpg"
                alt="따뜻한 조명 아래 케어를 받으며 쉬고 계신 모습과, 앞에 놓인 쑥과 허브볼"
                fill
                priority
                sizes="(min-width: 1024px) 480px, 100vw"
                className="object-cover object-[58%_50%] lg:object-center"
              />
            </div>
          </figure>
        </div>
      </section>

      {/* ── 2. 바로가기 네 칸 ─────────────────────────────── */}
      {/*
        머리 띠에 반쯤 걸쳐 올린다 (/my 홈과 같은 자리 · 같은 모양).
        relative z-10 이 없으면 이 판이 머리 띠 밑에 깔린다 — 띠가 isolate
        라 스택 문맥을 만들고, 이쪽이 static 이면 그림 순서를 내준다.

        폰에서는 아이콘 + 이름만, 넓은 화면에서는 한 줄 설명을 더한다.
      */}
      <section
        id="actions"
        aria-label="바로 하실 수 있는 것"
        data-book-anchor
        className="relative z-10 mx-auto -mt-9 max-w-5xl scroll-mt-24 px-4 sm:px-6"
      >
        <div className={`${card} !rounded-[22px] px-2 pb-3 pt-4 sm:px-4 sm:pb-4 sm:pt-5`}>
          <nav aria-label="바로가기">
            <ul className="grid grid-cols-4 gap-x-1.5 sm:gap-x-3">
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <li key={a.label} className="min-w-0">
                    <Link
                      href={a.href}
                      data-quick={a.href}
                      className="group flex flex-col items-center gap-1.5 rounded-2xl py-1 text-center transition-colors sm:px-2 sm:py-2 sm:hover:bg-card-soft"
                    >
                      <span
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-1 transition-transform group-hover:-translate-y-0.5 group-active:scale-95 ${a.tone}`}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="w-full text-[0.8125rem] font-bold leading-tight text-ink-soft [word-break:keep-all] sm:text-[1rem] sm:font-extrabold sm:text-ink">
                        {a.label}
                      </span>
                      <span className="hidden w-full text-[0.8125rem] leading-snug text-ink-sub [word-break:keep-all] sm:block">
                        {a.desc}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <p className="mx-1 mt-3.5 rounded-2xl bg-card-soft px-3.5 py-2.5 text-[0.875rem] leading-snug text-ink-sub ring-1 ring-stone-line sm:mx-2">
            예약과 상담은 <b className="text-ink-soft">내 기록</b>에 들어가신 뒤
            남기실 수 있습니다. 처음이시라면 매장에서 연결코드를 받아 주세요.
          </p>
        </div>
      </section>

      {/* ── 3. 매장이 지키는 것 ──────────────────────────── */}
      {/*
        보통 이 자리에는 '○년 경력', '만족도 ○%', '누적 ○명' 이 들어간다.
        그 숫자들을 쓰지 않았다. 매장이 확인해 준 값이 이 저장소 어디에도
        없기 때문이다. 확인된 사실 셋만 쓴다.
      */}
      <Section
        id="trust"
        headingId="trust-h"
        title="정통대왕쑥뜸원이 지키는 것"
        className="mx-auto mt-8 max-w-5xl scroll-mt-24 px-4 sm:px-6"
      >
        <ul
          className={`${card} grid grid-cols-1 divide-y divide-stone-line overflow-hidden sm:grid-cols-3 sm:divide-x sm:divide-y-0`}
        >
          {TRUST.map((t) => {
            const Icon = t.icon;
            return (
              <li key={t.title} className="flex items-start gap-3 px-4 py-3.5 sm:py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft/70 text-gold-deep ring-1 ring-gold/25">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[1rem] font-extrabold leading-snug text-ink">
                    {t.title}
                  </span>
                  <span className="mt-0.5 block text-[0.875rem] leading-snug text-ink-sub">
                    {t.desc}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* ── 4. 어떤 시간을 보내시게 되는지 — 옆으로 넘기는 카드 ── */}
      {/*
        전에는 사진을 화면 폭 가득 세 장 연달아 깔았다(폰에서 약 1,900px).
        배달 앱의 「가게 카드 줄」 처럼 옆으로 넘기게 하면 한 화면 높이로
        세 장면이 다 들어온다. 넓은 화면에서는 세 칸으로 나란히 놓는다.
      */}
      <Section
        id="service"
        headingId="service-h"
        title="어떤 시간을 보내시게 되는지"
        sub={<span className="sm:hidden">옆으로 넘겨 보세요</span>}
        className="mx-auto mt-8 max-w-5xl scroll-mt-24 px-4 sm:px-6"
      >
        <ul
          aria-label="방문하시면 · 머무는 동안 · 무엇을 올리나"
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 pt-0.5 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0"
        >
          {SCENES.map((s) => (
            <li
              key={s.src}
              className="w-[78%] max-w-[20rem] shrink-0 snap-start sm:w-auto sm:max-w-none"
            >
              <article className={`${card} flex h-full flex-col overflow-hidden`}>
                <div className="relative aspect-[3/2] bg-stone-bg-deep">
                  <Image
                    src={s.src}
                    alt={s.alt}
                    fill
                    sizes="(min-width: 640px) 330px, 80vw"
                    className={`object-cover ${s.position}`}
                  />
                </div>
                <div className="flex-1 p-4">
                  <p className="text-[0.8125rem] font-extrabold text-gold-deep">{s.eyebrow}</p>
                  <h3 className="mt-0.5 text-[1.0625rem] font-extrabold leading-snug text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-sub">{s.desc}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Section>

      {/* ── 5. 이런 분께 · 세 겹 구성 — 목록 줄 ───────────── */}
      {/* 넓은 화면에서는 두 목록을 나란히 둔다. 폭 1,000px 짜리 목록 줄은 읽기 어렵다 */}
      <div className="mx-auto mt-8 grid max-w-5xl items-start gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-6">
        <Section
          id="for-whom"
          headingId="for-whom-h"
          title="이런 분께 권해 드립니다"
          className="min-w-0 scroll-mt-24"
        >
          <ListGroup>
            {FOR_WHOM.map((f) => {
              const Icon = f.icon;
              return (
                <ListRow
                  key={f.title}
                  chevron={false}
                  icon={<Icon className="h-5 w-5 text-aqua-700" />}
                  title={f.title}
                  sub={f.desc}
                />
              );
            })}
          </ListGroup>
        </Section>

        <Section
          id="how"
          headingId="how-h"
          title="세 겹으로 올립니다"
          sub="피부에 닿는 순서대로 — 한 점이 아니라 넓은 부위에 온열이 퍼집니다."
          className="min-w-0 scroll-mt-24"
        >
          <ListGroup>
            {LAYERS.map((l) => (
              <ListRow
                key={l.no}
                chevron={false}
                icon={
                  l.photo ? (
                    /* 사진이 있는 겹은 사진으로 — 가게 화면 메뉴 줄의 작은 사진처럼 */
                    <span className="relative block h-10 w-10 overflow-hidden rounded-xl">
                      <Image src={l.photo} alt={l.name} fill sizes="40px" className="object-cover" />
                    </span>
                  ) : (
                    <span className="nowrap-num text-[1rem] font-extrabold text-aqua-800">
                      {l.no}
                    </span>
                  )
                }
                title={
                  l.photo ? (
                    <span>
                      <span className="nowrap-num mr-1.5 text-aqua-700">{l.no}</span>
                      {l.name}
                    </span>
                  ) : (
                    l.name
                  )
                }
                sub={l.desc}
              />
            ))}
          </ListGroup>
        </Section>
      </div>

      {/* ── 6. 이용권 — 쿠폰 모양 ─────────────────────────── */}
      {/*
        /my/passes 의 이용권 쿠폰과 같은 모양. 값은 오른쪽(넓은 화면에서는
        아래쪽) 절취선 너머에 둔다. 폭을 고정하지 않는다 — 30회권 값이
        카드 밖으로 12px 삐져나왔던 일(태블릿 검사)을 되풀이하지 않는다.
      */}
      <Section
        id="가격"
        headingId="price"
        title="이용권 안내"
        sub="매장 가격표 기준입니다. 변동될 수 있으니 방문 전 확인해 주세요."
        className="mx-auto mt-8 max-w-5xl scroll-mt-24 px-4 sm:px-6"
      >
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {PUBLIC_PRICES.map((p) => (
            <li
              key={p.name}
              data-price-ticket
              className={`overflow-hidden ${card} ${p.highlight ? "!ring-2 !ring-gold/55" : ""}`}
            >
              <div className="flex h-full sm:flex-col">
                <div className="min-w-0 flex-1 p-4">
                  <p className="break-words text-[1.0625rem] font-extrabold leading-snug text-ink">
                    {p.name}
                  </p>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    <StatusPill tone="wait">{p.sessions}회 이용</StatusPill>
                    {p.highlight && <StatusPill tone="warn">가장 많이 찾으십니다</StatusPill>}
                  </p>
                </div>
                <div
                  className={`relative flex min-w-[6.5rem] shrink-0 flex-col items-end justify-center border-l-2 border-dashed border-stone-line px-3.5 py-3 text-right sm:items-start sm:border-l-0 sm:border-t-2 sm:px-4 sm:text-left ${
                    p.highlight ? "bg-gold-soft/70" : "bg-aqua-50/70 dark:bg-aqua-500/10"
                  }`}
                >
                  {/* 절취선 끝의 반원 홈 — 폰은 위아래, 넓은 화면은 좌우 */}
                  <span
                    aria-hidden
                    className="absolute -left-[9px] -top-2 h-4 w-4 rounded-full bg-stone-bg sm:-left-2 sm:-top-[9px]"
                  />
                  <span
                    aria-hidden
                    className="absolute -bottom-2 -left-[9px] h-4 w-4 rounded-full bg-stone-bg sm:-right-2 sm:-top-[9px] sm:bottom-auto sm:left-auto"
                  />
                  <span className="nowrap-num tabular text-[1.25rem] font-extrabold leading-tight text-ink lg:text-[1.5rem]">
                    {formatWon(p.price)}
                  </span>
                  {p.sessions > 1 && (
                    <span className="nowrap-num tabular mt-0.5 text-[0.8125rem] text-ink-sub">
                      1회당 {formatWon(p.perSession)}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 px-1 text-[0.8125rem] leading-relaxed text-ink-faint">
          이용권 유효기간·환불 규정은 매장에서 정한 내용을 안내해 드립니다.
        </p>
      </Section>

      {/* ── 7. 왜 여기인가 — 기록이 쌓인다 ────────────────── */}
      {/*
        머리 띠와 같은 딥그린 판 — 이 화면의 결론이라 무게를 맞춘다.
        사진은 my_wellness.jpg — 고객이 자기 화면을 보는 장면. 바로 아래
        단추가 '내 기록 시작하기' 이므로, 누르면 무엇이 나오는지를 사진이
        먼저 말해 준다.  폰 16:9 → 16% · PC 3:2 → 0% 잘림.
      */}
      <section
        id="records"
        aria-labelledby="records-h"
        className="mx-auto mt-8 max-w-5xl scroll-mt-24 px-4 sm:px-6"
      >
        <div className="overflow-hidden rounded-[22px] bg-gradient-to-br from-deep-800 to-deep-950 text-white shadow-card ring-1 ring-gold/25 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <figure className="relative aspect-[16/9] lg:order-2 lg:m-5 lg:aspect-[3/2] lg:overflow-hidden lg:rounded-[18px]">
            <Image
              src="/brand/my_wellness.jpg"
              alt="휴대폰으로 자신의 이용 기록을 확인하는 모습"
              fill
              sizes="(min-width: 1024px) 420px, 100vw"
              className="object-cover object-[55%_40%]"
            />
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-deep-800/90 via-transparent to-transparent lg:hidden"
            />
          </figure>
          <div className="p-5 sm:p-7 lg:order-1">
            <p className="text-[0.8125rem] font-extrabold text-gold">다니실수록 편해집니다</p>
            <h2
              id="records-h"
              className="mt-1 text-[1.375rem] font-extrabold leading-snug [word-break:keep-all] sm:text-[1.625rem]"
            >
              매번 처음부터 다시 설명하지 않으셔도 됩니다
            </h2>
            <p className="mt-2 max-w-xl text-[0.9375rem] leading-relaxed text-white/80">
              어느 부위를 어떻게 봐 드렸는지, 어떤 반응이 좋으셨는지가 방문마다
              남습니다. 다음에 오시면 그 기록에서 이어서 시작합니다.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {["케어 부위와 반응 기록", "남은 이용권 확인", "다음 방문 권장 시점 안내"].map((t) => (
                <li
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[0.875rem] font-bold ring-1 ring-white/15"
                >
                  <CheckIcon className="h-4 w-4 shrink-0 text-gold" />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              href="/my"
              className="mt-5 inline-flex min-h-[52px] items-center gap-1.5 rounded-full bg-gradient-to-r from-gold to-gold-deep px-6 text-[1.0625rem] font-extrabold text-deep-900 shadow-[0_4px_14px_rgba(201,168,106,0.3)] transition-transform hover:scale-[1.02]"
            >
              내 기록 시작하기
              <ChevronRightIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 7-1. 다녀가신 뒤 — 사진 배너 ──────────────────── */}
      {/* /my 홈의 사진 배너와 같은 모양. 4:3 작은 사진 → 11% 잘림 */}
      <section aria-labelledby="after-h" className="mx-auto mt-4 max-w-5xl px-4 sm:px-6">
        <div className={`${card} flex items-center gap-4 p-3.5 sm:p-4`}>
          <span className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-2xl sm:w-44">
            <Image
              src="/brand/customer_experience.jpg"
              alt="케어를 마치고 편안히 쉬고 계신 모습"
              fill
              sizes="(min-width: 640px) 200px, 140px"
              className="object-cover object-[40%_40%]"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.8125rem] font-extrabold text-gold-deep">다녀가신 뒤</p>
            <h2
              id="after-h"
              className="mt-0.5 text-[1.0625rem] font-extrabold leading-snug text-ink [word-break:keep-all]"
            >
              몸이 어떠셨는지 한마디만 남겨 주세요
            </h2>
            <p className="mt-1 text-[0.875rem] leading-snug text-ink-sub">
              남겨 주신 말은 다음 방문 준비에 그대로 쓰입니다.
            </p>
          </div>
        </div>
        <p className="mt-2 px-1 text-[0.8125rem] leading-relaxed text-ink-faint">
          몸 상태에 대한 판단이나 의학적 안내는 제공하지 않습니다.
        </p>
      </section>

      {/* ── 8. 앞으로 준비하고 있는 것 ────────────────────── */}
      {/*
        맨 아래에 둔다. 오늘 예약하러 오신 분이 아직 없는 기능을 먼저
        만나면 안 된다. 점선 상자 + 「향후 확장」 배지로 위쪽 실선 목록
        (지금 되는 것)과 갈라 놓는다.
        제목(h2)은 FutureSection 안에 있어 여기서 id 로 집을 수 없으므로
        aria-label 로 직접 적는다.
      */}
      <section
        id="future"
        aria-label="앞으로 준비하고 있는 것"
        className="mx-auto mt-10 max-w-5xl scroll-mt-24 px-4 sm:px-6"
      >
        <FutureSection />
      </section>

      {/*
        폰 하단 고정 예약 막대 — 위쪽 바로가기가 화면 밖으로 나간 뒤에만
        올라온다. 막대가 마지막 글을 가리지 않게 비워 두는 자리는 이제
        바닥글 아래에 있다 (PublicShell) — 본문과 바닥글 사이에 두었더니
        폰에서 미래 목록과 바닥글 사이가 120px 비어 보였다.
      */}
      <StickyBookBar />
    </>
  );
}
