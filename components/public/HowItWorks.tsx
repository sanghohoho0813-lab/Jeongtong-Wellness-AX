"use client";

/**
 * 이용 안내 — 어떻게 이용하게 되고, 어떻게 만들어지고 있나
 * ========================================================
 *
 * 왜 필요해졌나
 * -------------
 * 매장 시스템이 아직 연결되지 않은 동안, 고객 화면은 이런 한 장이었다.
 *
 *     아직 연결 준비 중입니다
 *     고객 화면은 매장 시스템과 연결된 뒤에 열립니다. 매장에 문의해 주세요.
 *
 * 사실이긴 한데, 보러 온 사람 입장에서는 **아무것도 알 수 없는 막다른
 * 길**이다. 무엇을 하는 곳인지, 자기가 나중에 무엇을 보게 되는지, 어떻게
 * 시작하는지 — 하나도 모른 채 되돌아간다.
 *
 * 그래서 두 가지를 함께 둔다.
 *
 *   ① 예시 화면   실제로 열리게 될 그 화면을 견본 자료로 그대로 보여 준다
 *   ② 이 안내      그 화면이 어떻게 열리고, 어떻게 채워지는지 글로 적는다
 *
 * ②가 없으면 ①은 그냥 '남의 기록' 으로 보인다. ①이 없으면 ②는 그냥
 * 약속으로 들린다. 둘이 같이 있어야 "아, 이렇게 돌아가는구나" 가 된다.
 *
 * 지키는 선
 * ---------
 * 여기에는 **숫자를 적지 않는다.** 언제 열린다, 몇 명이 쓴다, 얼마나
 * 좋아진다 — 지금 근거가 없는 말이고, 없는 근거로 적은 숫자는 나중에
 * 전부 거짓말이 된다. 순서와 구조만 적는다.
 */

import { useState } from "react";
import { Modal } from "@/components/ui";
import {
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  ClipboardIcon,
  PhoneIcon,
  SparkIcon,
  TicketIcon,
} from "@/components/ui/icons";

/** 번호가 붙는 순서 — 시작하는 방법 */
const START_STEPS = [
  {
    icon: BuildingIcon,
    title: "매장에서 연결코드를 받으십니다",
    body: "방문하시거나 전화로 요청하시면 여섯 자리 코드를 알려 드립니다. 매장이 직접 건네는 코드라, 그걸 가진 분만 그 기록에 닿습니다.",
  },
  {
    icon: PhoneIcon,
    title: "이메일로 숫자 여섯 자리를 받아 넣으십니다",
    body: "비밀번호는 만들지 않으셔도 됩니다. 새 비밀번호를 만들고 기억하는 데서 가장 많이 막히기 때문에, 그 단계를 아예 두지 않았습니다.",
  },
  {
    icon: CheckIcon,
    title: "그 다음부터는 바로 열립니다",
    body: "한 번만 이으시면 됩니다. 다음부터는 주소만 누르시면 내 기록이 그대로 열립니다.",
  },
];

/** 이어서 도는 방식 — 다니시는 동안 */
const LOOP_STEPS = [
  {
    icon: CalendarIcon,
    title: "오시기 전",
    body: "이 화면에서 원하시는 날짜를 남기십니다. 매장에서 확인한 뒤 연락드립니다 — 이 화면에서 예약이 확정되거나 결제가 되지는 않습니다.",
  },
  {
    icon: ClipboardIcon,
    title: "다녀가신 뒤",
    body: "그날 어느 부위를 어떻게 봐 드렸는지, 어떤 반응이 좋으셨는지를 매장이 기록합니다. 그 기록이 고객님 화면에 그대로 이어집니다.",
  },
  {
    icon: TicketIcon,
    title: "다음에 오실 때",
    body: "남은 이용권과 지난 기록이 이미 화면에 있습니다. 매번 처음부터 다시 설명하지 않으셔도 됩니다.",
  },
];

export function HowItWorksBody() {
  return (
    <div className="space-y-6">
      {/* 시작하는 방법 */}
      <section>
        <h4 className="eyebrow mb-2.5">어떻게 시작하나</h4>
        <ol className="space-y-2.5">
          {START_STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li
                key={s.title}
                className="flex items-start gap-3.5 rounded-card bg-card-soft px-4 py-3.5 ring-1 ring-stone-line"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-aqua-50 text-aqua-800 ring-1 ring-aqua-100">
                  <Icon className="h-[1.125rem] w-[1.125rem]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[1rem] font-extrabold leading-snug text-ink">
                    {/*
                      번호를 글자로 박지 않고 따로 그린다. ol 이 매기는
                      번호는 화면 폭이 좁아지면 글과 붙어 읽기 어려워진다.
                    */}
                    <span className="mr-1.5 text-gold-deep">{i + 1}.</span>
                    {s.title}
                  </span>
                  <span className="mt-1 block text-[0.9375rem] leading-relaxed text-ink-sub">
                    {s.body}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 다니시는 동안 도는 방식 */}
      <section>
        <h4 className="eyebrow mb-2.5">다니시는 동안</h4>
        <ul className="space-y-2.5">
          {LOOP_STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <li
                key={s.title}
                className="flex items-start gap-3.5 rounded-card bg-card-soft px-4 py-3.5 ring-1 ring-stone-line"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-soft/60 text-gold-deep ring-1 ring-gold/25">
                  <Icon className="h-[1.125rem] w-[1.125rem]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[1rem] font-extrabold leading-snug text-ink">
                    {s.title}
                  </span>
                  <span className="mt-1 block text-[0.9375rem] leading-relaxed text-ink-sub">
                    {s.body}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 남의 기록이 보일 길이 없다는 것 */}
      <section className="rounded-card border border-aqua-100 bg-aqua-50/60 px-4 py-3.5">
        <h4 className="eyebrow mb-1.5">고객님 기록만 보입니다</h4>
        <p className="text-[0.9375rem] leading-relaxed text-ink-sub">
          화면에서 남의 기록을 <b className="text-ink-soft">가리는</b> 방식이
          아닙니다. 서버가 로그인하신 분의 기록만 내려보내므로, 다른 분의
          기록은 <b className="text-ink-soft">애초에 오지 않습니다.</b> 가리는
          방식은 한 화면만 빠뜨려도 새지만, 이 방식은 샐 자리가 없습니다.
        </p>
      </section>

      {/* 만드는 방식 */}
      <section>
        <h4 className="eyebrow mb-2">어떻게 만들어지고 있나</h4>
        <ul className="space-y-2">
          {[
            [
              "매장 화면과 고객 화면이 같은 기록을 봅니다",
              "매장이 적은 것을 고객 화면에 옮겨 적지 않습니다. 한 곳에 적으면 양쪽이 같이 바뀝니다 — 옮겨 적는 순간부터 두 숫자가 달라지기 시작하기 때문입니다.",
            ],
            [
              "화면을 먼저 확정하고, 자료를 나중에 넣습니다",
              "지금 보시는 예시가 실제로 열리게 될 그 화면입니다. 매장 시스템이 연결되면 이 자리에 고객님의 실제 기록이 들어옵니다 — 화면이 바뀌는 것이 아니라 내용이 채워집니다.",
            ],
            [
              "아직 없는 것은 없다고 적어 둡니다",
              "준비 중인 기능은 「향후 확장」이라고 따로 표시하고, 점선으로 둘러 지금 쓰실 수 있는 것과 갈라 둡니다. 되는 것처럼 보이게 만들지 않습니다.",
            ],
          ].map(([t, b]) => (
            <li
              key={t}
              className="flex items-start gap-2.5 rounded-card px-3.5 py-3 ring-1 ring-stone-line"
            >
              <SparkIcon className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 text-gold-deep" />
              <span className="min-w-0">
                <span className="block text-[0.9375rem] font-extrabold text-ink">
                  {t}
                </span>
                <span className="mt-0.5 block text-[0.9375rem] leading-relaxed text-ink-sub">
                  {b}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[0.8125rem] leading-relaxed text-ink-faint">
        표시되는 케어 안내는 이용 기록을 바탕으로 정리한 것입니다. 몸 상태에
        대한 판단이나 의학적 안내는 제공하지 않습니다.
      </p>
    </div>
  );
}

/**
 * 창을 여는 쪽에서 쓰는 조각.
 *
 * 고객용 화면의 메뉴와 MY WELLNESS 의 예시 띠, 두 곳에서 같은 것을 연다.
 * 같은 질문("이거 어떻게 되는 건가요")에 두 벌의 답을 두면 언젠가 한쪽만
 * 고쳐진다.
 */
export function useHowItWorks() {
  const [open, setOpen] = useState(false);
  const sheet = (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="어떻게 이용하게 되나요"
      wide
    >
      <HowItWorksBody />
    </Modal>
  );
  return { openHowItWorks: () => setOpen(true), howItWorksSheet: sheet };
}
