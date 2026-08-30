/**
 * 고객 화면 견본 자료 — 시연·설계용
 * ==================================
 *
 * 왜 필요한가
 * -----------
 * MY WELLNESS 는 로그인 뒤 화면이라, 실제 계정 없이는 **아무도 볼 수 없다.**
 * 그 말은 곧
 *   - 대표님이 이 화면을 남에게 보여 주려면 실제 고객 계정을 빌려야 하고
 *   - 만드는 쪽도 자기가 만든 화면을 눈으로 확인할 수 없다
 * 는 뜻이다. 실제로 직전까지 고객 화면만 내부 AX 보다 덜 다듬어져 있었는데,
 * 이유가 재능이 아니라 **볼 수가 없어서** 였다.
 *
 * 안전 장치
 * ---------
 * 이 자료는 `NEXT_PUBLIC_DEMO_MODE=1` 로 빌드했을 때만 쓰인다. 그 값은
 * 빌드 시점에 코드에 박히므로, 운영 빌드에는 이 통로 자체가 존재하지 않는다.
 * (같은 스위치가 직원 화면의 로그인 우회에도 이미 쓰이고 있다 — lib/auth/mode.ts)
 *
 * 그리고 여기 있는 사람은 실존하지 않는다. 이름 · 연락처 · 이메일 전부
 * 지어낸 것이고, 전화번호는 통화가 되지 않는 자리번호(0000)를 쓴다.
 * 실제 고객 자료는 서버에 있고 서버는 로그인해야 열리므로, 이 파일로
 * 실제 개인정보에 닿을 길은 없다.
 *
 * 화면에는 늘 '견본' 이라고 적어 둔다 — 보는 사람이 실제 자기 기록으로
 * 착각하면 그게 더 나쁜 일이다.
 */

import type {
  Branch,
  Customer,
  Membership,
  ServiceProduct,
  Visit,
} from "@/lib/types";

/** 오늘로부터 n일 전(음수면 뒤) 날짜 — 견본이 늘 '최근'으로 보이게 */
function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
function stamp(offset: number, time = "14:00"): string {
  return `${day(offset)}T${time}:00`;
}

const CUSTOMER_ID = "demo-customer";
const BRANCH_ID = "demo-branch";

export const DEMO_BRANCH: Branch = {
  id: BRANCH_ID,
  hqId: "demo-hq",
  name: "본점",
  address: "매장 주소",
  phone: "02-0000-0000",
  openHours: "10:00 - 20:00",
  createdAt: day(-400),
};

export const DEMO_CUSTOMER: Customer = {
  id: CUSTOMER_ID,
  branchId: BRANCH_ID,
  name: "김웰니스",
  phone: "010-0000-0000",
  ageGroup: "50대",
  registeredAt: day(-186),
  /* 매장이 잡아 둔 다음 관리 예정일 — 포털 홈의 '다음 방문 예정'이 이 값을 읽는다 */
  nextManageDate: day(6),
  nextManageTime: "15:00",
  memo: "",
  tags: [],
  focusBodyParts: [
    { part: "neck_shoulder", note: "" },
    { part: "waist", note: "" },
  ],
  preferences: [],
};

/**
 * 방문 여덟 번.
 *
 * 간격을 14~16일로 두었다. 포털이 "지금까지의 이용 간격" 으로 다음 방문
 * 참고일을 계산하므로, 간격이 들쭉날쭉하면 견본 화면에서 이상한 날짜가 뜬다.
 * 부위는 어깨·허리에 몰아 두었다 — 홈 화면의 '가장 많이 봐 드린 부위'가
 * 실제로 무언가를 집어내는 모습을 보여 주기 위해서다.
 */
export const DEMO_VISITS: Visit[] = [
  { d: -8, parts: ["neck_shoulder"], reaction: "어깨가 한결 가벼워졌다고 하심" },
  { d: -23, parts: ["neck_shoulder", "waist"], reaction: "" },
  { d: -38, parts: ["waist"], reaction: "허리 쪽을 더 봐 드리기로" },
  { d: -53, parts: ["neck_shoulder"], reaction: "" },
  { d: -69, parts: ["neck_shoulder", "waist"], reaction: "" },
  { d: -84, parts: ["abdomen"], reaction: "" },
  { d: -100, parts: ["back"], reaction: "" },
  { d: -116, parts: ["neck_shoulder"], reaction: "" },
].map((v, i) => ({
  id: `demo-visit-${i}`,
  customerId: CUSTOMER_ID,
  branchId: BRANCH_ID,
  staffId: "demo-staff",
  type: "visit" as const,
  visitedAt: stamp(v.d),
  programName: "대왕쑥뜸",
  membershipId: v.d >= -69 ? "demo-pass-2" : "demo-pass-1",
  bodyParts: v.parts.map((part) => ({ part, note: "" })) as Visit["bodyParts"],
  reaction: v.reaction,
  note: "",
  amount: 0,
}));

/** 이용권 두 장 — 하나는 다 쓰신 것, 하나는 쓰는 중 */
export const DEMO_MEMBERSHIPS: Membership[] = [
  {
    id: "demo-pass-2",
    customerId: CUSTOMER_ID,
    branchId: BRANCH_ID,
    programName: "대왕쑥뜸 10회권",
    totalCount: 10,
    remainingCount: 6,
    price: 400_000,
    purchasedAt: day(-72),
    status: "active",
  },
  {
    id: "demo-pass-1",
    customerId: CUSTOMER_ID,
    branchId: BRANCH_ID,
    programName: "대왕쑥뜸 10회권",
    totalCount: 10,
    remainingCount: 0,
    price: 400_000,
    purchasedAt: day(-188),
    status: "exhausted",
  },
];

/** 매장 가격표 — 실제 상품 셋과 같은 값 (lib/public/price-sheet.ts 와 한 벌) */
export const DEMO_PRODUCTS: ServiceProduct[] = [
  {
    id: "demo-p1",
    branchId: BRANCH_ID,
    name: "대왕쑥뜸 1회",
    serviceName: "대왕쑥뜸",
    sessionCount: 1,
    price: 45_000,
    active: true,
    sortOrder: 1,
    source: "price_sheet",
  },
  {
    id: "demo-p10",
    branchId: BRANCH_ID,
    name: "대왕쑥뜸 10회권",
    serviceName: "대왕쑥뜸",
    sessionCount: 10,
    price: 400_000,
    active: true,
    sortOrder: 2,
    source: "price_sheet",
  },
  {
    id: "demo-p30",
    branchId: BRANCH_ID,
    name: "대왕쑥뜸 30회권",
    serviceName: "대왕쑥뜸",
    sessionCount: 30,
    price: 1_100_000,
    active: true,
    sortOrder: 3,
    source: "price_sheet",
  },
];
