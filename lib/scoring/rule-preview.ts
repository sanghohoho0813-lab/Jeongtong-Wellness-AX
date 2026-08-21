/**
 * 관리 기준을 바꾸면 무엇이 달라지는지 미리 보기
 * ==============================================
 * 설정의 기준값(장기 미방문 45일, 이용권 임박 2회 …)은 오늘 브리핑에 곧바로
 * 반영된다. 그런데 지금까지는 **저장하고 나서야** 대상이 몇 명으로 바뀌었는지
 * 알 수 있었다. 그래서 "45일이 우리 매장에 맞나"를 감으로 정하게 된다.
 *
 * 여기서는 바꾸려는 값으로 규칙 엔진을 한 번 더 돌려 결과만 세어 본다.
 * 저장하지 않고, 화면에도 반영하지 않고, 숫자만 비교해 보여 준다.
 *
 * ── Priority Score 엔진과의 관계 ──
 * priority.ts 를 **호출만** 한다. 규칙을 흉내 내거나 다시 구현하지 않는다.
 * 그래야 미리보기 숫자와 실제 결과가 어긋날 수 없다.
 */

import { CareRuleSettings, TaskCategory } from "@/lib/types";
import { CustomerFacts, generateDailyBriefing } from "./priority";

export interface RuleImpact {
  /** 오늘 관리 대상으로 잡히는 고객 수 */
  total: number;
  /** 분류별 대상 수 */
  byCategory: Record<TaskCategory, number>;
}

const EMPTY_BY_CATEGORY: Record<TaskCategory, number> = {
  revisit_due: 0,
  dormant: 0,
  membership_low: 0,
  new_followup: 0,
  consult_no_booking: 0,
  focus_care: 0,
};

/** 주어진 기준으로 오늘 브리핑을 돌려 결과만 센다 (저장하지 않는다) */
export function countWithRules(
  allFacts: CustomerFacts[],
  rules: CareRuleSettings,
): RuleImpact {
  // 저장된 처리 상태는 넣지 않는다 — "기준이 무엇을 잡아내는가"만 보려는 것이라,
  // 이미 처리한 건이 섞이면 비교가 흐려진다.
  const tasks = generateDailyBriefing(allFacts, rules, []);
  const byCategory = { ...EMPTY_BY_CATEGORY };
  for (const t of tasks) byCategory[t.category]++;
  return { total: tasks.length, byCategory };
}

export interface RuleDiffRow {
  category: TaskCategory;
  label: string;
  before: number;
  after: number;
  delta: number;
}

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  revisit_due: "재방문 예정",
  dormant: "장기 미방문",
  membership_low: "이용권 잔여 임박",
  new_followup: "신규 후속관리",
  consult_no_booking: "상담 후 미방문",
  focus_care: "집중 관리",
};

export interface RulePreview {
  before: RuleImpact;
  after: RuleImpact;
  /** 전체 대상 수 변화 */
  totalDelta: number;
  /** 실제로 달라진 분류만 (많이 바뀐 순) */
  changed: RuleDiffRow[];
  /** 바꾼 값이 지금과 같은지 */
  unchanged: boolean;
}

/** 현재 기준과 바꾸려는 기준을 나란히 계산해 비교한다 */
export function previewRuleChange(
  allFacts: CustomerFacts[],
  current: CareRuleSettings,
  candidate: CareRuleSettings,
): RulePreview {
  const same = (Object.keys(current) as Array<keyof CareRuleSettings>).every(
    (k) => current[k] === candidate[k],
  );

  const before = countWithRules(allFacts, current);
  const after = same ? before : countWithRules(allFacts, candidate);

  const changed: RuleDiffRow[] = (
    Object.keys(CATEGORY_LABELS) as TaskCategory[]
  )
    .map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      before: before.byCategory[category],
      after: after.byCategory[category],
      delta: after.byCategory[category] - before.byCategory[category],
    }))
    .filter((r) => r.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    before,
    after,
    totalDelta: after.total - before.total,
    changed,
    unchanged: same,
  };
}
