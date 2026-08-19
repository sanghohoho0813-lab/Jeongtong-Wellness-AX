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
    address: "서울특별시",
    phone: "02-000-0000",
    openHours: "10:00 - 20:00",
    createdAt: daysFromToday(-300),
  },
];

export const seedStaff: Staff[] = [
  { id: "staff-1", branchId: B1, name: "김대표", role: "owner", active: true },
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

const P_BASIC = "쑥뜸 베이직 케어";
const P_DEEP = "쑥뜸 딥 릴랙스 케어";
const P_HALF = "반신 온열 케어";

const SPECS: CustomerSpec[] = [
  // --- 재방문 예정 (관리일 도래/경과) ---
  {
    id: "c-01", name: "김영희", phone: "01012340001", gender: "female", birthYear: 1965,
    registered: -180, staff: "staff-2",
    focus: [{ part: "waist" }, { part: "neck_shoulder" }],
    nextManage: -2, lastContact: -16, tags: ["집중관리"],
    memo: "허리 집중 관리 희망. 따뜻한 온도 선호.",
    prefs: [
      { category: "temperature", note: "쑥뜸 온도는 조금 낮게 — 뜨거운 것에 예민하심", pinned: true, at: -58 },
      { category: "conversation", note: "케어 중에는 조용히 쉬는 편을 선호", at: -44 },
      { category: "beverage", note: "끝나고 따뜻한 물 챙겨드리면 좋아하심", at: -30 },
    ],
    visits: [
      { at: -72, program: P_BASIC, parts: [{ part: "waist" }] },
      { at: -58, program: P_BASIC, parts: [{ part: "waist" }], reaction: "허리가 한결 가볍다고 만족" },
      { at: -44, program: P_DEEP, parts: [{ part: "waist" }, { part: "neck_shoulder" }] },
      { at: -30, program: P_DEEP, parts: [{ part: "waist" }] },
      { at: -16, program: P_DEEP, parts: [{ part: "waist" }, { part: "neck_shoulder" }], reaction: "어깨 결림 완화 체감", membership: "m-01" },
    ],
    memberships: [
      { id: "m-01", program: "딥 릴랙스 10회권", total: 10, remaining: 5, purchased: -44, price: 450000 },
    ],
  },
  {
    id: "c-02", name: "박철수", phone: "01012340002", gender: "male", birthYear: 1958,
    registered: -220, staff: "staff-3",
    focus: [{ part: "knee" }, { part: "leg" }],
    nextManage: 0, lastContact: -14,
    prefs: [
      { category: "position", note: "무릎 케어 시 다리 아래 쿠션 받쳐드리기", pinned: true, at: -70 },
      { category: "etc", note: "손주 이야기 자주 하심 — 안부 여쭤보면 아주 좋아하심", at: -42 },
    ],
    visits: [
      { at: -84, program: P_HALF, parts: [{ part: "knee" }] },
      { at: -70, program: P_HALF, parts: [{ part: "knee" }, { part: "leg" }] },
      { at: -56, program: P_HALF, parts: [{ part: "knee" }] },
      { at: -42, program: P_HALF, parts: [{ part: "knee" }], reaction: "계단 오르기 편해졌다고 함" },
      { at: -28, program: P_HALF, parts: [{ part: "knee" }, { part: "leg" }] },
      { at: -14, program: P_HALF, parts: [{ part: "knee" }], membership: "m-02" },
    ],
    memberships: [
      { id: "m-02", program: "반신 온열 10회권", total: 10, remaining: 4, purchased: -84, price: 380000 },
    ],
  },
  {
    id: "c-03", name: "이순자", phone: "01012340003", gender: "female", birthYear: 1952,
    registered: -150, staff: "staff-2",
    focus: [{ part: "back" }, { part: "pelvis_hip" }],
    nextManage: 1,
    visits: [
      { at: -63, program: P_BASIC, parts: [{ part: "back" }] },
      { at: -49, program: P_BASIC, parts: [{ part: "back" }] },
      { at: -35, program: P_DEEP, parts: [{ part: "back" }, { part: "pelvis_hip" }], reaction: "등 전체가 시원하다고 만족" },
      { at: -20, program: P_DEEP, parts: [{ part: "back" }], membership: "m-03" },
    ],
    memberships: [
      { id: "m-03", program: "딥 릴랙스 10회권", total: 10, remaining: 6, purchased: -49, price: 450000 },
    ],
  },

  // --- 이용권 잔여 임박 ---
  {
    id: "c-04", name: "최미경", phone: "01012340004", gender: "female", birthYear: 1970,
    registered: -95, staff: "staff-2",
    focus: [{ part: "abdomen" }],
    nextManage: 5, lastContact: -7,
    prefs: [
      { category: "environment", note: "조명 어둡게, 음악은 작게 선호", at: -49 },
      { category: "pressure", note: "복부는 부드럽게 — 강한 압 부담스러워하심", pinned: true, at: -35 },
    ],
    visits: [
      { at: -63, program: P_BASIC, parts: [{ part: "abdomen" }], membership: "m-04" },
      { at: -49, program: P_BASIC, parts: [{ part: "abdomen" }], membership: "m-04" },
      { at: -35, program: P_BASIC, parts: [{ part: "abdomen" }], membership: "m-04", reaction: "속이 편안해졌다고 함" },
      { at: -21, program: P_BASIC, parts: [{ part: "abdomen" }], membership: "m-04" },
      { at: -7, program: P_BASIC, parts: [{ part: "abdomen" }], membership: "m-04" },
    ],
    memberships: [
      { id: "m-04", program: "베이직 10회권", total: 10, remaining: 2, purchased: -63, price: 350000 },
    ],
  },
  {
    id: "c-05", name: "정광수", phone: "01012340005", gender: "male", birthYear: 1963,
    registered: -130, staff: "staff-3",
    focus: [{ part: "neck_shoulder" }, { part: "arm" }],
    nextManage: 3,
    visits: [
      { at: -80, program: P_DEEP, parts: [{ part: "neck_shoulder" }], membership: "m-05" },
      { at: -64, program: P_DEEP, parts: [{ part: "neck_shoulder" }], membership: "m-05" },
      { at: -48, program: P_DEEP, parts: [{ part: "neck_shoulder" }, { part: "arm" }], membership: "m-05" },
      { at: -32, program: P_DEEP, parts: [{ part: "neck_shoulder" }], membership: "m-05" },
      { at: -12, program: P_DEEP, parts: [{ part: "neck_shoulder" }], membership: "m-05", reaction: "팔 저림이 줄었다고 함" },
    ],
    memberships: [
      { id: "m-05", program: "딥 릴랙스 6회권", total: 6, remaining: 1, purchased: -80, price: 290000 },
    ],
  },
  {
    id: "c-06", name: "한복순", phone: "01012340006", gender: "female", birthYear: 1949,
    registered: -200, staff: "staff-2",
    focus: [{ part: "waist" }, { part: "foot_ankle" }],
    prefs: [
      { category: "caution", note: "발/발목은 열 오래 적용하지 않기", pinned: true, at: -70 },
      { category: "beverage", note: "차가운 음료 사양 — 항상 따뜻한 차 선호", at: -55 },
    ],
    visits: [
      { at: -100, program: P_HALF, membership: "m-06", parts: [{ part: "waist" }] },
      { at: -85, program: P_HALF, membership: "m-06", parts: [{ part: "waist" }] },
      { at: -70, program: P_HALF, membership: "m-06", parts: [{ part: "waist" }, { part: "foot_ankle" }] },
      { at: -55, program: P_HALF, membership: "m-06", parts: [{ part: "waist" }] },
      { at: -40, program: P_HALF, membership: "m-06", parts: [{ part: "waist" }], reaction: "발이 따뜻해져 잠이 잘 온다고 함" },
      { at: -25, program: P_HALF, membership: "m-06", parts: [{ part: "waist" }] },
    ],
    memberships: [
      { id: "m-06", program: "반신 온열 6회권", total: 6, remaining: 0, purchased: -100, price: 240000, status: "exhausted" },
    ],
  },

  // --- 신규 고객 후속관리 ---
  {
    id: "c-07", name: "오지영", phone: "01012340007", gender: "female", birthYear: 1978,
    registered: -4, staff: "staff-2",
    focus: [{ part: "neck_shoulder" }],
    memo: "사무직, 어깨 결림 고민으로 방문",
    visits: [
      { at: -4, program: P_BASIC, parts: [{ part: "neck_shoulder" }], reaction: "첫 이용 후 개운하다고 만족", amount: 60000 },
    ],
  },
  {
    id: "c-08", name: "강민재", phone: "01012340008", gender: "male", birthYear: 1985,
    registered: -9, staff: "staff-3",
    focus: [{ part: "waist" }, { part: "pelvis_hip" }],
    visits: [
      { at: -9, program: P_BASIC, parts: [{ part: "waist" }], amount: 60000 },
    ],
  },
  {
    id: "c-09", name: "윤서연", phone: "01012340009", gender: "female", birthYear: 1990,
    registered: -2, staff: "staff-2",
    focus: [{ part: "abdomen" }, { part: "pelvis_hip" }],
    memo: "수족냉증 고민, 복부 온열 관심",
    visits: [
      { at: -2, program: P_BASIC, parts: [{ part: "abdomen" }], reaction: "생각보다 뜨겁지 않고 편안했다고 함", amount: 60000 },
    ],
  },

  // --- 상담 후 미예약 ---
  {
    id: "c-10", name: "임달호", phone: "01012340010", gender: "male", birthYear: 1955,
    registered: -12, staff: "staff-1",
    focus: [{ part: "back" }, { part: "waist" }],
    memo: "지인 소개로 상담 방문",
    visits: [
      { at: -6, type: "consult", reaction: "프로그램 설명 듣고 긍정적. 가족과 상의 후 결정 예정" },
    ],
  },
  {
    id: "c-11", name: "송혜란", phone: "01012340011", gender: "female", birthYear: 1968,
    registered: -15, staff: "staff-2",
    focus: [{ part: "neck_shoulder" }, { part: "back" }],
    visits: [
      { at: -10, type: "consult", reaction: "온열 케어 관심 높음. 평일 오전 방문 희망" },
    ],
  },

  // --- 장기 미방문 ---
  {
    id: "c-12", name: "조성훈", phone: "01012340012", gender: "male", birthYear: 1972,
    registered: -260, staff: "staff-3",
    focus: [{ part: "waist" }],
    lastContact: -50,
    visits: [
      { at: -150, program: P_BASIC, parts: [{ part: "waist" }] },
      { at: -130, program: P_BASIC, parts: [{ part: "waist" }] },
      { at: -110, program: P_BASIC, parts: [{ part: "waist" }] },
      { at: -62, program: P_BASIC, parts: [{ part: "waist" }] },
    ],
  },
  {
    id: "c-13", name: "백금자", phone: "01012340013", gender: "female", birthYear: 1947,
    registered: -320, staff: "staff-2",
    focus: [{ part: "knee" }, { part: "leg" }],
    lastContact: -70,
    visits: [
      { at: -210, program: P_HALF, parts: [{ part: "knee" }] },
      { at: -180, program: P_HALF, parts: [{ part: "knee" }] },
      { at: -95, program: P_HALF, parts: [{ part: "knee" }], reaction: "무릎이 시원하다고 만족" },
    ],
  },
  {
    id: "c-14", name: "황인규", phone: "01012340014", gender: "male", birthYear: 1960,
    registered: -280,
    focus: [{ part: "back" }],
    visits: [
      { at: -160, program: P_BASIC, parts: [{ part: "back" }] },
      { at: -140, program: P_BASIC, parts: [{ part: "back" }] },
      { at: -55, program: P_BASIC, parts: [{ part: "back" }] },
    ],
  },

  // --- 활성 (정상 주기) ---
  {
    id: "c-15", name: "서영란", phone: "01012340015", gender: "female", birthYear: 1975,
    registered: -110, staff: "staff-2",
    focus: [{ part: "neck_shoulder" }],
    nextManage: 9,
    visits: [
      { at: -52, program: P_DEEP, parts: [{ part: "neck_shoulder" }], membership: "m-15" },
      { at: -38, program: P_DEEP, parts: [{ part: "neck_shoulder" }], membership: "m-15" },
      { at: -24, program: P_DEEP, parts: [{ part: "neck_shoulder" }], membership: "m-15" },
      { at: -10, program: P_DEEP, parts: [{ part: "neck_shoulder" }], membership: "m-15", reaction: "수면 질이 좋아졌다고 함" },
    ],
    memberships: [
      { id: "m-15", program: "딥 릴랙스 10회권", total: 10, remaining: 6, purchased: -52, price: 450000 },
    ],
  },
  {
    id: "c-16", name: "노태석", phone: "01012340016", gender: "male", birthYear: 1966,
    registered: -140, staff: "staff-3",
    focus: [{ part: "waist" }, { part: "pelvis_hip" }],
    nextManage: 7,
    visits: [
      { at: -60, program: P_BASIC, parts: [{ part: "waist" }], membership: "m-16" },
      { at: -45, program: P_BASIC, parts: [{ part: "waist" }], membership: "m-16" },
      { at: -30, program: P_BASIC, parts: [{ part: "waist" }, { part: "pelvis_hip" }], membership: "m-16" },
      { at: -15, program: P_BASIC, parts: [{ part: "waist" }], membership: "m-16" },
      { at: -1, program: P_BASIC, parts: [{ part: "waist" }], membership: "m-16" },
    ],
    memberships: [
      { id: "m-16", program: "베이직 10회권", total: 10, remaining: 5, purchased: -60, price: 350000 },
    ],
  },
  {
    id: "c-17", name: "문경자", phone: "01012340017", gender: "female", birthYear: 1959,
    registered: -240, staff: "staff-2",
    focus: [{ part: "abdomen" }, { part: "waist" }],
    nextManage: 11,
    prefs: [
      { category: "temperature", note: "복부 온열은 따뜻하게 오래 유지 선호", pinned: true, at: -59 },
      { category: "conversation", note: "이야기 나누는 것을 좋아하심", at: -31 },
    ],
    visits: [
      { at: -87, program: P_HALF, parts: [{ part: "abdomen" }], membership: "m-17" },
      { at: -73, program: P_HALF, parts: [{ part: "abdomen" }], membership: "m-17" },
      { at: -59, program: P_HALF, parts: [{ part: "abdomen" }], membership: "m-17" },
      { at: -45, program: P_HALF, parts: [{ part: "abdomen" }], membership: "m-17" },
      { at: -31, program: P_HALF, parts: [{ part: "abdomen" }], membership: "m-17" },
      { at: -17, program: P_HALF, parts: [{ part: "abdomen" }], membership: "m-17" },
      { at: -3, program: P_HALF, parts: [{ part: "abdomen" }], membership: "m-17", reaction: "몸이 전반적으로 가볍다고 만족" },
    ],
    memberships: [
      { id: "m-17", program: "반신 온열 10회권", total: 10, remaining: 3, purchased: -87, price: 380000 },
    ],
  },
  {
    id: "c-18", name: "유병철", phone: "01012340018", gender: "male", birthYear: 1953,
    registered: -190, staff: "staff-3",
    focus: [{ part: "leg" }, { part: "foot_ankle" }],
    nextManage: 6,
    visits: [
      { at: -64, program: P_HALF, parts: [{ part: "leg" }], membership: "m-18" },
      { at: -48, program: P_HALF, parts: [{ part: "leg" }], membership: "m-18" },
      { at: -32, program: P_HALF, parts: [{ part: "leg" }, { part: "foot_ankle" }], membership: "m-18" },
      { at: -16, program: P_HALF, parts: [{ part: "leg" }], membership: "m-18" },
      { at: -8, program: P_HALF, parts: [{ part: "leg" }], membership: "m-18" },
    ],
    memberships: [
      { id: "m-18", program: "반신 온열 10회권", total: 10, remaining: 5, purchased: -64, price: 380000 },
    ],
  },
  {
    id: "c-19", name: "안정순", phone: "01012340019", gender: "female", birthYear: 1962,
    registered: -170, staff: "staff-2",
    focus: [{ part: "back" }, { part: "neck_shoulder" }],
    nextManage: 8,
    visits: [
      { at: -66, program: P_DEEP, parts: [{ part: "back" }], membership: "m-19" },
      { at: -50, program: P_DEEP, parts: [{ part: "back" }], membership: "m-19" },
      { at: -36, program: P_DEEP, parts: [{ part: "back" }], membership: "m-19" },
      { at: -22, program: P_DEEP, parts: [{ part: "back" }, { part: "neck_shoulder" }], membership: "m-19" },
      { at: -6, program: P_DEEP, parts: [{ part: "back" }], membership: "m-19" },
    ],
    memberships: [
      { id: "m-19", program: "딥 릴랙스 10회권", total: 10, remaining: 5, purchased: -66, price: 450000 },
    ],
  },
  {
    id: "c-20", name: "장기석", phone: "01012340020", gender: "male", birthYear: 1969,
    registered: -125, staff: "staff-3",
    focus: [{ part: "neck_shoulder" }, { part: "arm" }],
    nextManage: 10,
    visits: [
      { at: -47, program: P_BASIC, parts: [{ part: "neck_shoulder" }], membership: "m-20" },
      { at: -33, program: P_BASIC, parts: [{ part: "neck_shoulder" }], membership: "m-20" },
      { at: -19, program: P_BASIC, parts: [{ part: "neck_shoulder" }], membership: "m-20" },
      { at: -5, program: P_BASIC, parts: [{ part: "neck_shoulder" }], membership: "m-20" },
    ],
    memberships: [
      { id: "m-20", program: "베이직 10회권", total: 10, remaining: 6, purchased: -47, price: 350000 },
    ],
  },

  // --- 오늘 방문/오늘 신규 상담 (대시보드 KPI 노출용) ---
  {
    id: "c-21", name: "권순애", phone: "01012340021", gender: "female", birthYear: 1957,
    registered: -75, staff: "staff-2",
    focus: [{ part: "waist" }],
    nextManage: 14,
    visits: [
      { at: -42, program: P_BASIC, parts: [{ part: "waist" }], membership: "m-21" },
      { at: -28, program: P_BASIC, parts: [{ part: "waist" }], membership: "m-21" },
      { at: -14, program: P_BASIC, parts: [{ part: "waist" }], membership: "m-21" },
      { at: 0, program: P_BASIC, parts: [{ part: "waist" }], membership: "m-21", reaction: "오늘 컨디션 좋다고 함" },
    ],
    memberships: [
      { id: "m-21", program: "베이직 10회권", total: 10, remaining: 6, purchased: -42, price: 350000 },
    ],
  },
  {
    id: "c-22", name: "신동혁", phone: "01012340022", gender: "male", birthYear: 1980,
    registered: 0, staff: "staff-1",
    focus: [{ part: "waist" }, { part: "back" }],
    memo: "오늘 신규 상담. 온라인 검색으로 방문",
    visits: [
      { at: 0, type: "consult", reaction: "허리 피로 고민. 프로그램 안내 완료" },
    ],
  },
  {
    id: "c-23", name: "홍말숙", phone: "01012340023", gender: "female", birthYear: 1950,
    registered: -60, staff: "staff-2",
    focus: [{ part: "knee" }, { part: "foot_ankle" }],
    nextManage: 12,
    visits: [
      { at: -36, program: P_HALF, parts: [{ part: "knee" }], membership: "m-23" },
      { at: -24, program: P_HALF, parts: [{ part: "knee" }], membership: "m-23" },
      { at: -12, program: P_HALF, parts: [{ part: "knee" }], membership: "m-23" },
      { at: 0, program: P_HALF, parts: [{ part: "knee" }, { part: "foot_ankle" }], membership: "m-23" },
    ],
    memberships: [
      { id: "m-23", program: "반신 온열 10회권", total: 10, remaining: 6, purchased: -36, price: 380000 },
    ],
  },
  {
    id: "c-24", name: "구자현", phone: "01012340024", gender: "male", birthYear: 1974,
    registered: -45, staff: "staff-3",
    focus: [{ part: "back" }],
    nextManage: 13,
    visits: [
      { at: -31, program: P_DEEP, parts: [{ part: "back" }], membership: "m-24" },
      { at: -17, program: P_DEEP, parts: [{ part: "back" }], membership: "m-24" },
      { at: -3, program: P_DEEP, parts: [{ part: "back" }], membership: "m-24" },
    ],
    memberships: [
      { id: "m-24", program: "딥 릴랙스 6회권", total: 6, remaining: 3, purchased: -31, price: 290000 },
    ],
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
