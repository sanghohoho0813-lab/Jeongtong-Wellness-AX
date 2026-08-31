/**
 * 샘플 데이터 시드 — 오늘 날짜 기준 상대 날짜로 생성되어
 * 언제 열어도 신규/활성/장기 미방문/이용권 임박/재방문 예정 상태가 살아있다.
 * Supabase 연동 시 이 모듈만 실제 fetch로 교체한다.
 */

import {
  BodyPartRecord,
  Branch,
  CarePreference,
  Customer,
  Membership,
  ServiceProduct,
  Staff,
  Visit,
} from "@/lib/types";
import { daysFromToday } from "@/lib/utils/date";

const B1 = "branch-main";

export const seedBranches: Branch[] = [
  {
    id: B1,
    hqId: "hq-jeongtong",
    name: "본점",
    // 회사 소개자료에 적힌 실제 매장 정보
    address: "경기도 남양주시 경춘로 951, 4층",
    phone: "010-3900-0977",
    openHours: "10:00 - 20:00",
    createdAt: daysFromToday(-300),
  },
];

export const seedStaff: Staff[] = [
  { id: "staff-1", branchId: B1, name: "최정철", role: "owner", active: true },
  { id: "staff-2", branchId: B1, name: "이수민", role: "staff", active: true },
  { id: "staff-3", branchId: B1, name: "박정호", role: "staff", active: true },
];

// d = daysFromToday 축약
const d = daysFromToday;

interface CustomerSpec {
  id: string;
  name: string;
  phone: string;
  gender?: "female" | "male";
  birthYear?: number;
  /** '60대' 처럼 연령대만 아는 경우 — 엑셀이 주는 것이 생년이 아니라 대(代)다 */
  ageGroup?: string;
  registered: number; // 등록일 (오늘로부터 -n일)
  staff?: string;
  memo?: string;
  focus: BodyPartRecord[];
  nextManage?: number; // 다음 관리 예정일 offset
  lastContact?: number;
  tags?: string[];
  /** 케어 선호 · 특이사항 (고객 감동 포인트) */
  prefs?: Array<{
    category:
      | "temperature"
      | "pressure"
      | "position"
      | "environment"
      | "beverage"
      | "conversation"
      | "caution"
      | "etc";
    note: string;
    pinned?: boolean;
    at: number;
  }>;
  /** 방문 offsets (음수, 과거) — type 기본 visit */
  visits: Array<{
    at: number;
    type?: "visit" | "consult";
    program?: string;
    parts?: BodyPartRecord[];
    reaction?: string;
    membership?: string;
    amount?: number;
  }>;
  memberships?: Array<{
    id: string;
    program: string;
    total: number;
    remaining: number;
    purchased: number;
    price: number;
    status?: "active" | "exhausted" | "expired";
  }>;
}

/*
 * 서비스명과 이용권은 매장 가격표에 적힌 것을 그대로 쓴다.
 * 예전 샘플에는 '베이직 / 딥 릴랙스 / 반신 온열' 처럼 없는 프로그램과
 * 없는 금액이 들어 있었다. 실제로 파는 것은 대왕쑥뜸 하나이고
 * 이용권은 1회 / 10회 / 30회 세 가지다.
 */
export const SERVICE_NAME = "대왕쑥뜸";

export const seedProducts: ServiceProduct[] = [
  {
    id: "prod-1",
    branchId: B1,
    name: "대왕쑥뜸 1회",
    serviceName: SERVICE_NAME,
    sessionCount: 1,
    price: 45000,
    active: true,
    sortOrder: 1,
    source: "price_sheet",
  },
  {
    id: "prod-10",
    branchId: B1,
    name: "대왕쑥뜸 10회권",
    serviceName: SERVICE_NAME,
    sessionCount: 10,
    price: 400000,
    active: true,
    sortOrder: 2,
    source: "price_sheet",
  },
  {
    id: "prod-30",
    branchId: B1,
    name: "대왕쑥뜸 30회권",
    serviceName: SERVICE_NAME,
    sessionCount: 30,
    price: 1100000,
    active: true,
    sortOrder: 3,
    source: "price_sheet",
  },
];

/*
 * 매장 고객 명부 — 실제 자료
 * ==========================
 *
 * 여기 있는 열두 분은 **실제 정통대왕쑥뜸원 고객**이다. 대표님이 쓰시던
 * 고객차트 엑셀을 그대로 옮겼다 (scripts/xlsx-to-customers.mjs).
 * 전에는 지어낸 이름 스물네 명이 있었는데, 대표님 결정으로 실제 명부로
 * 바꾸었다.
 *
 * 그래서 이 파일을 고칠 때 지켜야 할 것이 생겼다.
 *
 * 1) 없는 것을 채우지 않는다
 *    엑셀에 있는 것은 이름 · 등록일 · 상담내역, 그리고 두 분의 연령뿐이다.
 *    방문 이력도, 이용권도, 결제도 적혀 있지 않다. 그래서 **넣지 않았다.**
 *    화면이 허전해 보인다고 실제 사람 이름에 없던 방문을 붙이면, 그건
 *    원장님이 나중에 화면을 보고 "이 분 여덟 번 오셨네" 하고 잘못 아시게
 *    되는 일이다. 지금 기록은 등록일에 상담 한 번씩이 전부다.
 *
 * 2) 상담내역은 손대지 않는다
 *    고객이 말씀하신 그대로 옮겼다. '구안와사' · '상지마비' 같은 말이
 *    들어 있지만, 그건 **고객이 그렇게 말씀하셨다는 기록**이지 우리가
 *    판단한 것이 아니다. 요약하거나 바꿔 쓰지 않는다.
 *    (같은 원칙이 고객 원문 상담메모 전체에 적용된다)
 *
 * 3) 관리부위는 글자 그대로만
 *    엑셀의 관리부위 칸은 열두 분 모두 비어 있다. 그래서 상담내역에
 *    **부위가 글자로 적힌 경우에만** 넣었다 — '하체' · '어깨/목' · '상지'.
 *    '냉증' 이나 '구안와사' 에서 부위를 짐작해 채우지 않았다.
 *
 * 4) 연락처는 저장소에 넣지 않는다
 *    엑셀에는 한 분의 번호가 있지만 여기에는 비워 두었다. 이 파일은
 *    GitHub 에 올라가고 시연 빌드에도 들어간다. 번호는 매장에서 화면에
 *    직접 채워 넣으시면 된다.
 */
const SPECS: CustomerSpec[] = [
  {
    id: "c-01", name: "옥윤용",
    phone: "",  // 엑셀에 번호가 있으나 저장소에는 넣지 않는다
    ageGroup: "60대",
    registered: -19, lastContact: -19,
    focus: [{ part: "leg" }],
    memo: "우측 하반신 시림증상",
    visits: [{ at: -19, type: "consult" }],
  },
  {
    id: "c-02", name: "김청하",
    phone: "",
    registered: -35, lastContact: -35,
    focus: [],
    memo: "구안와사",
    visits: [{ at: -35, type: "consult" }],
  },
  {
    id: "c-03", name: "김윤정",
    phone: "",
    registered: -28, lastContact: -28,
    focus: [],
    memo: "스테로이드 부작용으로 인한 붓기 관리 / 버섯목",
    visits: [{ at: -28, type: "consult" }],
  },
  {
    id: "c-04", name: "김수연",
    phone: "",
    registered: -10, lastContact: -10,
    focus: [],
    memo: "건강관리",
    visits: [{ at: -10, type: "consult" }],
  },
  {
    id: "c-05", name: "오화순",
    phone: "",
    registered: -39, lastContact: -39,
    focus: [{ part: "leg" }],
    memo: "하체 혈액순환 관리, 셀룰라이트 고민",
    visits: [{ at: -39, type: "consult" }],
  },
  {
    id: "c-06", name: "조미숙",
    phone: "",
    registered: -24, lastContact: -24,
    focus: [{ part: "neck_shoulder" }],
    memo: "어깨통증/목 통증",
    visits: [{ at: -24, type: "consult" }],
  },
  {
    id: "c-07", name: "김효자",
    phone: "",
    registered: -23, lastContact: -23,
    focus: [{ part: "leg" }],
    memo: "하체 냉증",
    visits: [{ at: -23, type: "consult" }],
  },
  {
    id: "c-08", name: "노순자",
    phone: "",
    registered: -13, lastContact: -13,
    focus: [{ part: "arm" }],
    memo: "상지마비 증상",
    visits: [{ at: -13, type: "consult" }],
  },
  {
    id: "c-09", name: "소피아최",
    phone: "",
    registered: -39, lastContact: -39,
    focus: [],
    memo: "냉증",
    visits: [{ at: -39, type: "consult" }],
  },
  {
    id: "c-10", name: "김혜숙",
    phone: "",
    registered: -22, lastContact: -22,
    focus: [{ part: "leg" }],
    memo: "알 수 없는 가려움증 및 하체 부종",
    visits: [{ at: -22, type: "consult" }],
  },
  {
    id: "c-11", name: "김율희",
    phone: "",
    registered: -10, lastContact: -10,
    focus: [{ part: "leg" }],
    memo: "신장 및 방광에 의한 하체 붓기",
    visits: [{ at: -10, type: "consult" }],
  },
  {
    id: "c-12", name: "옥윤용2",
    phone: "",
    ageGroup: "20대",
    registered: -8, lastContact: -8,
    focus: [],
    memo: "건강관리",
    visits: [{ at: -8, type: "consult" }],
  },
];

function build() {
  const customers: Customer[] = [];
  const visits: Visit[] = [];
  const memberships: Membership[] = [];

  for (const s of SPECS) {
    customers.push({
      id: s.id,
      branchId: B1,
      name: s.name,
      phone: s.phone,
      gender: s.gender,
      birthYear: s.birthYear,
      ageGroup: s.ageGroup,
      registeredAt: d(s.registered),
      assignedStaffId: s.staff,
      memo: s.memo,
      focusBodyParts: s.focus,
      nextManageDate: s.nextManage !== undefined ? d(s.nextManage) : undefined,
      lastContactDate: s.lastContact !== undefined ? d(s.lastContact) : undefined,
      tags: s.tags,
      preferences: (s.prefs ?? []).map(
        (pf, i): CarePreference => ({
          id: `${s.id}-pref${i + 1}`,
          category: pf.category,
          note: pf.note,
          createdAt: d(pf.at),
          createdByStaffId: s.staff,
          pinned: pf.pinned,
        }),
      ),
    });

    s.visits.forEach((v, i) => {
      visits.push({
        id: `${s.id}-v${i + 1}`,
        branchId: B1,
        customerId: s.id,
        staffId: s.staff,
        visitedAt: `${d(v.at)}T${10 + (i % 8)}:00:00`,
        type: v.type ?? "visit",
        programName: v.program,
        membershipId: v.membership,
        bodyParts: v.parts ?? [],
        reaction: v.reaction,
        amount: v.amount,
      });
    });

    for (const m of s.memberships ?? []) {
      memberships.push({
        id: m.id,
        branchId: B1,
        customerId: s.id,
        programName: m.program,
        totalCount: m.total,
        remainingCount: m.remaining,
        purchasedAt: d(m.purchased),
        price: m.price,
        status: m.status ?? (m.remaining <= 0 ? "exhausted" : "active"),
      });
    }
  }

  return { customers, visits, memberships };
}

const built = build();

export const seedCustomers = built.customers;
export const seedVisits = built.visits;
export const seedMemberships = built.memberships;
