/**
 * 홈케어 · 일상 웰니스 정보
 * =========================
 *
 * 고객 화면에 얹는 짧은 생활 정보다.
 *
 * 무엇을 쓰지 않는가
 * ------------------
 * 어떤 증상에 무엇이 좋다는 말은 한 줄도 쓰지 않는다. 질환·효능·예방·개선은
 * 물론이고, "~에 도움이 됩니다" 처럼 완곡하게 돌린 표현도 쓰지 않는다.
 * 여기 있는 문장은 전부 누구에게나 해당하는 생활 습관 이야기이며,
 * 몸에 대한 판단이 필요한 내용은 매장에 문의하도록 넘긴다.
 *
 * 추천 방식
 * ---------
 * 추천 엔진이 아니다. Wellness Type 과 관심 부위로 순서를 조금 바꾸는 정도다.
 * 순서가 바뀔 뿐 아무 글도 감추지 않는다 — 고객이 "왜 이것만 보이지" 라고
 * 느끼지 않게.
 */

import type { BodyPart } from "@/lib/types";
import type { WellnessTypeKey } from "./wellness";

export interface WellnessContent {
  id: string;
  title: string;
  /** 카드에 보이는 한 줄 */
  summary: string;
  /** 펼쳤을 때 나오는 본문 (2~4문장) */
  body: string[];
  /** 분류 표기 */
  tag: string;
  /** 이 유형에게 먼저 보여 준다 */
  forTypes?: WellnessTypeKey[];
  /** 이 부위에 관심을 둔 고객에게 먼저 보여 준다 */
  forParts?: BodyPart[];
}

export const CONTENTS: WellnessContent[] = [
  {
    id: "warmth-daily",
    title: "몸을 따뜻하게 두는 습관",
    summary: "평소 체온 관리를 돕는 생활 습관 몇 가지입니다.",
    tag: "생활관리",
    body: [
      "실내외 온도 차가 큰 계절에는 얇은 옷을 여러 겹 입어 조절하는 편이 편합니다.",
      "발과 손목, 목처럼 바깥에 자주 닿는 부위를 덮어 두면 체온이 덜 떨어집니다.",
      "따뜻한 물을 자주 마시는 것도 일상에서 하기 쉬운 방법입니다.",
    ],
    forTypes: ["steady", "homecare"],
  },
  {
    id: "sleep-rhythm",
    title: "잠드는 시간을 일정하게",
    summary: "수면 리듬을 고르게 유지하는 방법입니다.",
    tag: "수면습관",
    body: [
      "매일 같은 시각에 눕고 같은 시각에 일어나는 것이 수면 시간을 늘리는 것보다 리듬에 도움이 됩니다.",
      "잠들기 한 시간 전부터는 밝은 화면을 줄여 보세요.",
      "낮잠은 20분 안쪽으로 두면 밤잠에 영향을 덜 줍니다.",
    ],
    forTypes: ["homecare", "steady", "dormant"],
  },
  {
    id: "water",
    title: "하루 수분 섭취",
    summary: "한 번에 많이보다 나눠서 자주가 편합니다.",
    tag: "수분섭취",
    body: [
      "한 번에 많이 마시기보다 하루 동안 조금씩 나눠 마시는 편이 부담이 적습니다.",
      "아침에 일어나 한 컵, 식사 사이에 한 컵처럼 시간을 정해 두면 잊지 않습니다.",
      "카페인이 든 음료는 마신 양만큼 수분으로 세지 않는 편이 낫습니다.",
    ],
  },
  {
    id: "stretch-light",
    title: "앉아서 하는 가벼운 스트레칭",
    summary: "오래 앉아 계신 날 짬짬이 해볼 수 있는 동작입니다.",
    tag: "가벼운 스트레칭",
    body: [
      "한 시간에 한 번은 일어나 어깨를 천천히 돌리고 목을 좌우로 기울여 보세요.",
      "숨을 참지 않고, 아프지 않은 범위에서 10초 정도씩만 머무르면 충분합니다.",
      "통증이 느껴지면 바로 멈추고, 매장에 오셨을 때 말씀해 주세요.",
    ],
    forParts: ["neck_shoulder", "back", "waist"],
    forTypes: ["intensive", "steady"],
  },
  {
    id: "rest-quality",
    title: "쉬는 시간을 짧게 자주",
    summary: "긴 휴식 한 번보다 짧은 휴식 여러 번이 몸에 덜 부담입니다.",
    tag: "휴식",
    body: [
      "일하는 중간에 5분씩 자주 쉬는 편이 몰아서 오래 쉬는 것보다 회복에 낫습니다.",
      "쉴 때는 화면을 보지 않고 먼 곳을 보거나 눈을 감아 보세요.",
      "숨을 천천히 내쉬는 것만으로도 긴장이 조금 풀립니다.",
    ],
    forTypes: ["intensive", "renewal"],
  },
  {
    id: "daily-rhythm",
    title: "생활 리듬 고르게 두기",
    summary: "식사·활동·휴식 시간을 크게 흔들지 않는 것이 핵심입니다.",
    tag: "생활리듬",
    body: [
      "식사 시간이 매일 크게 달라지면 다른 리듬도 함께 흔들립니다.",
      "아침에 잠깐이라도 바깥 빛을 보면 하루 리듬을 잡는 데 도움이 됩니다.",
      "무리해서 바꾸기보다 한 가지씩 자리 잡게 두는 편이 오래갑니다.",
    ],
    forTypes: ["dormant", "steady"],
  },
  {
    id: "after-care",
    title: "이용하신 날의 컨디션 관리",
    summary: "매장에 다녀오신 날 참고하실 만한 내용입니다.",
    tag: "이용 후",
    body: [
      "이용하신 날은 평소보다 물을 조금 더 챙겨 드시는 분이 많습니다.",
      "무리한 일정보다는 여유 있게 하루를 마무리하시는 편이 편안합니다.",
      "느끼신 점이 있으면 다음 방문 때 말씀해 주시면 기록에 남겨 둡니다.",
    ],
    forTypes: ["steady", "intensive", "renewal"],
  },
];

/**
 * 보여 줄 순서를 정한다.
 *
 * 감추지 않고 순서만 바꾼다. 유형이 맞으면 +2, 관심 부위가 맞으면 +2.
 * 원래 순서를 유지하기 위해 같은 점수면 목록 순서를 따른다.
 */
export function rankContents(args: {
  type?: WellnessTypeKey;
  interestParts?: BodyPart[];
}): WellnessContent[] {
  const parts = new Set(args.interestParts ?? []);
  return CONTENTS.map((c, i) => {
    let score = 0;
    if (args.type && c.forTypes?.includes(args.type)) score += 2;
    if (c.forParts?.some((p) => parts.has(p))) score += 2;
    return { c, score, i };
  })
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.c);
}

export function findContent(id: string): WellnessContent | undefined {
  return CONTENTS.find((c) => c.id === id);
}

/**
 * 홈 화면에 한 줄로 얹는 홈케어 한마디.
 *
 * 콘텐츠 목록(CONTENTS)과 같은 규칙을 따른다 — 증상도, 효능도, "~에 좋다"도
 * 쓰지 않는다. 누구에게나 해당하는 생활 습관 이야기만 남긴다.
 * 유형에 따라 문장이 바뀌지만, 그건 판정이 아니라 이용 방식에 맞춘 인사말이다.
 */
const HOMECARE_TIP: Record<WellnessTypeKey, string> = {
  accumulating:
    "따뜻한 물을 자주 드시고, 방문하실 때 편한 옷차림으로 오시면 좋습니다.",
  steady:
    "따뜻한 물을 자주 마셔 주세요. 지금처럼 일정한 간격으로 오시는 것이 가장 편하십니다.",
  intensive:
    "관리와 관리 사이에는 충분히 쉬어 주세요. 따뜻한 물과 가벼운 스트레칭을 곁들이시면 좋습니다.",
  homecare:
    "집에서는 몸을 따뜻하게 유지하고, 같은 자세로 오래 있지 않도록 자주 움직여 주세요.",
  dormant:
    "오랜만에 오실 때는 무리하지 마시고, 편하신 시간대로 알려 주시면 맞춰 드리겠습니다.",
  renewal:
    "따뜻한 물을 자주 드세요. 이용권 관련해 궁금하신 점은 매장에 편히 물어봐 주세요.",
};

export function homecareTip(type: WellnessTypeKey): string {
  return HOMECARE_TIP[type];
}
