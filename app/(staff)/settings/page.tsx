"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import SettingsSection from "@/components/settings/SettingsSection";
import { useStore } from "@/lib/data/store";
import { useBackup } from "@/lib/data/useBackup";
import {
  CareRuleSettings,
  DEFAULT_OPPORTUNITY_RULES,
  Density,
  FontScale,
  OpportunityRuleSettings,
  StaffRole,
  Theme,
  PALETTES,
  AppSettings,
} from "@/lib/types";
import {
  Button,
  Card,
  FieldLabel,
  Modal,
  SegmentedControl,
  inputCls,
} from "@/components/ui";
import { CheckIcon, DownloadIcon, PlusIcon } from "@/components/ui/icons";
import AiReadyNote from "@/components/ui/AiReadyNote";
import { useToast } from "@/components/ui/toast";
import DataImport from "@/components/settings/DataImport";
import ProductTable from "@/components/settings/ProductTable";
import SupabaseLinkCard from "@/components/settings/SupabaseLinkCard";
import StaffAccountRow from "@/components/settings/StaffAccountRow";
import { previewRuleChange } from "@/lib/scoring/rule-preview";
import {
  daysAgo,
  formatDateKr,
  formatRelative,
  todayISO,
} from "@/lib/utils/date";
import {
  customersCsv,
  downloadFile,
  membershipsCsv,
  preferencesCsv,
  stamp,
  visitsCsv,
} from "@/lib/utils/export";
import { formatBytes } from "@/lib/utils/storage";

const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "대표/관리자",
  manager: "관리자",
  staff: "직원",
};

function RuleField({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (n: number) => void;
}) {
  /**
   * 숫자를 고칠 때 사람들은 대개 전부 지우고 다시 친다.
   * 그런데 빈 칸을 부모로 올릴 수가 없다 — 관리 기준이 0일이 될 수는 없으니까.
   * 그래서 예전에는 `if (n > 0)` 로 막아 두었고, 지우는 순간 화면이 옛 숫자로
   * 되돌아와 커서까지 튀었다. 결국 "아무리 쳐도 안 바뀌는 칸" 이 되었다.
   *
   * 지우는 동안만 이 칸이 스스로 문자열을 들고 있는다. 칸을 떠날 때
   * 비어 있으면 원래 값으로 조용히 되돌린다.
   */
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          className={`${inputCls} max-w-28`}
          value={draft ?? String(value)}
          inputMode="numeric"
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            setDraft(digits);
            const n = Number(digits);
            if (digits !== "" && n > 0) onChange(n);
          }}
          onBlur={() => setDraft(null)}
        />
        <span className="text-sm text-ink-sub">{unit}</span>
      </div>
    </div>
  );
}


/** 기준선 숫자 칸 — 비우면 undefined (0 이 아니다. 0 은 "없음" 이 아니라 값이다) */
const toNum = (v: string) =>
  v.trim() === "" ? undefined : Number(v.replace(/[^\d]/g, ""));

function BaselineField({
  label,
  hint,
  value,
  unit,
  onChange,
}: {
  label: string;
  hint: string;
  value?: number;
  unit: string;
  onChange: (v?: number) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          className={`${inputCls} nowrap-num`}
          inputMode="numeric"
          aria-label={label}
          value={value ?? ""}
          onChange={(e) => onChange(toNum(e.target.value))}
          placeholder="모르면 비워 두기"
        />
        <span className="shrink-0 text-sm font-bold text-ink-sub">{unit}</span>
      </div>
      <p className="mt-1 text-[0.8125rem] text-ink-faint">{hint}</p>
    </div>
  );
}

export default function SettingsPage() {
  const {
    settings,
    staff,
    branches,
    customers,
    visits,
    memberships,
    updateSettings,
    updateStaff,
    resetData,
    startFresh,
    factsById,
    storage,
    isManager,
  } = useStore();
  const toast = useToast();
  const [staffModal, setStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>("staff");
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmFresh, setConfirmFresh] = useState(false);

  /**
   * 관리 기준은 바로 저장하지 않고 초안으로 둔다.
   * 저장 전에 "이 기준이면 오늘 대상이 몇 명이 되는지"를 먼저 보여 주기 위해서다.
   * 그동안은 저장하고 나서야 결과를 알 수 있어 감으로 정하게 됐다.
   */
  const [draftRules, setDraftRules] = useState<CareRuleSettings>(
    settings.careRules,
  );
  // 밖에서 기준이 바뀌면(초기화·백업 복원 등) 초안도 따라간다
  useEffect(() => setDraftRules(settings.careRules), [settings.careRules]);

  const setRule = (patch: Partial<CareRuleSettings>) =>
    setDraftRules((r) => ({ ...r, ...patch }));

  const allFacts = useMemo(() => [...factsById.values()], [factsById]);
  const preview = useMemo(
    () => previewRuleChange(allFacts, settings.careRules, draftRules),
    [allFacts, settings.careRules, draftRules],
  );

  // 매출기회 기준 — 저장된 값이 없으면 기본값을 쓴다 (기존 데이터 호환)
  const oppRules = settings.opportunityRules ?? DEFAULT_OPPORTUNITY_RULES;
  const setOppRule = (patch: Partial<OpportunityRuleSettings>) =>
    updateSettings({ opportunityRules: { ...oppRules, ...patch } });

  // ---------- 데이터 내보내기 ----------
  const prefCount = customers.reduce(
    (n, c) => n + (c.preferences?.length ?? 0),
    0,
  );
  const EXPORTS = [
    { key: "customers", label: "고객 목록", count: () => customers.length },
    { key: "visits", label: "방문 · 이용 기록", count: () => visits.length },
    { key: "memberships", label: "이용권 내역", count: () => memberships.length },
    { key: "preferences", label: "케어 선호 · 특이사항", count: () => prefCount },
  ] as const;

  const runExport = (key: (typeof EXPORTS)[number]["key"]) => {
    const d = stamp(todayISO());
    const map = {
      customers: {
        name: `고객목록_${d}.csv`,
        csv: () => customersCsv(customers, visits, memberships, staff),
      },
      visits: {
        name: `방문이용기록_${d}.csv`,
        csv: () => visitsCsv(visits, customers, staff),
      },
      memberships: {
        name: `이용권내역_${d}.csv`,
        csv: () => membershipsCsv(memberships, customers),
      },
      preferences: {
        name: `케어선호_${d}.csv`,
        csv: () => preferencesCsv(customers, staff),
      },
    };
    const item = map[key];
    downloadFile(item.name, item.csv());
    toast(`${item.name} 파일을 내려받았습니다`);
  };

  /*
    백업은 화면 위 띠 · 명령 팔레트 · 이 화면 셋에서 부른다.
    같은 코드를 세 벌 두지 않고 useBackup 하나로 모았다 — 한 벌이라도
    어긋나면 "받은 줄 알았는데 안 받아진" 상태가 되는 기능이다.
  */
  const { stale: backupStale, exportBackup: runBackup } = useBackup();
  const exportBackup = () => {
    runBackup();
    toast("전체 백업 파일을 내려받았습니다");
  };

  return (
    <div>
      <PageHeader
        title="설정"
        description={
          isManager
            ? "화면, 매장, 직원, 관리 기준을 설정합니다. 기준값은 오늘의 실행 브리핑 우선순위 계산에 바로 반영됩니다."
            : "화면 표시 방식을 설정합니다."
        }
      />

      {/*
        섹션 바로가기.

        폰에서는 아래 칸들이 접혀 있다 (`SettingsSection`). 여기서 누르면
        그 칸으로 가면서 **열린 채로** 도착한다 — 주소 조각(#set-store)을
        각 칸이 듣고 있다. 눌렀는데 제목만 나오고 또 눌러야 하면,
        바로가기가 아니라 일을 하나 늘린 것이다.
      */}
      {isManager && (
        <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
          {[
            { id: "set-screen", label: "화면" },
            { id: "set-store", label: "매장" },
            { id: "set-staff", label: "직원" },
            { id: "set-privacy", label: "화면 공유" },
            { id: "set-product", label: "서비스 · 상품" },
            { id: "set-link", label: "매장 계정 연결" },
            { id: "set-rules", label: "고객관리 기준" },
            { id: "set-opp", label: "매출기회 기준" },
            { id: "set-data", label: "데이터 · 백업" },
          ].map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="touch-target inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-card px-4 text-sm font-bold text-ink-sub ring-1 ring-stone-line transition-colors hover:bg-aqua-50 hover:text-aqua-800"
            >
              {s.label}
            </a>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 card-gap xl:grid-cols-2 xl:items-start">
        {/* 화면 */}
        <SettingsSection id="set-screen" title="화면" summary="글자 크기 · 밝기 · 색 조합 · 화면 밀도">
          <div className="space-y-5">
            <div>
              <FieldLabel>글자 크기</FieldLabel>
              <SegmentedControl<FontScale>
                label="글자 크기"
                value={settings.fontScale}
                options={[
                  { key: "small", label: "작게" },
                  { key: "default", label: "기본" },
                  { key: "large", label: "크게" },
                ]}
                onChange={(v) => updateSettings({ fontScale: v })}
              />
              <p className="mt-2 text-sm text-ink-sub">
                &lsquo;크게&rsquo; 설정 시 전체 화면의 글자가 커집니다. 50~60대
                사용자에게 권장합니다.
              </p>
            </div>
            <div>
              <FieldLabel>화면 밀도</FieldLabel>
              <SegmentedControl<Density>
                label="화면 밀도"
                value={settings.density}
                options={[
                  { key: "default", label: "기본" },
                  { key: "relaxed", label: "여유롭게" },
                ]}
                onChange={(v) => updateSettings({ density: v })}
              />
            </div>
            <div>
              <FieldLabel>밝기</FieldLabel>
              <SegmentedControl<Theme>
                label="밝기"
                value={settings.theme ?? "light"}
                options={[
                  { key: "light", label: "라이트" },
                  { key: "dark", label: "다크" },
                  { key: "system", label: "시스템" },
                ]}
                onChange={(v) => updateSettings({ theme: v })}
              />
              <p className="mt-2 text-sm text-ink-sub">
                시스템을 선택하면 기기의 다크모드 설정을 자동으로 따라갑니다.
              </p>
            </div>

            {/*
              색 조합 — 밝기와 따로 고른다.

              한 줄로 묶어 두면 '다크 네이비' 같은 조합을 만들 수 없다.
              밝기는 눈이 편한 쪽, 색은 매장 분위기. 서로 다른 이유로 고르는
              것이라 칸을 나눈다.

              기본값은 딥틸 샴페인 — 지금까지 쓰던 색 그대로다. 다른 조합을
              고르면 어두운 면 · 주 단추 · 활성 메뉴 · 배지 · 그래프 색이 함께
              바뀌고, 본문 글자와 표면은 그대로 있는다.
            */}
            <div>
              <FieldLabel>색 조합</FieldLabel>
              <ul
                role="radiogroup"
                aria-label="색 조합"
                className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-2"
              >
                {PALETTES.map((p) => {
                  const on = (settings.palette ?? "teal") === p.key;
                  return (
                    <li key={p.key}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => updateSettings({ palette: p.key })}
                        className={`touch-target flex w-full items-center gap-3 rounded-card px-3.5 py-3 text-left transition-colors ${
                          on
                            ? "bg-aqua-50 ring-2 ring-aqua-500"
                            : "bg-card-soft ring-1 ring-stone-line hover:bg-aqua-50"
                        }`}
                      >
                        {/* 색 점 여섯 — 껍데기 · 딥 · 주 색 · 강조 · 하이라이트 · 바탕 (v3.0 §6) */}
                        <span className="flex shrink-0 items-center -space-x-1">
                          {p.swatch.map((c, i) => (
                            <span
                              key={`${c}-${i}`}
                              style={{ backgroundColor: c }}
                              className="h-5 w-5 rounded-full ring-2 ring-card"
                            />
                          ))}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.9375rem] font-extrabold text-ink">
                            {p.name}
                          </span>
                          <span className="nowrap-num block text-[0.75rem] text-ink-sub">
                            {p.no}
                            {p.key === "teal" && " · 기본"}
                          </span>
                        </span>
                        {on && (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-aqua-500 text-white">
                            <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.4} />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-sm leading-relaxed text-ink-sub">
                본문 글자와 표면 색은 조합과 관계없이 그대로 유지됩니다. 어느
                조합을 고르셔도 글이 흐려지지 않도록 대비를 미리 맞춰 두었습니다.
                고객 화면에도 같은 조합이 적용됩니다.
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* 직원 계정: 화면 설정만 노출 */}
        {!isManager && (
          <Card className="border-l-4 border-gold">
            <p className="font-bold text-ink">관리자 전용 설정 안내</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              매장 정보, 직원 관리, 고객관리 기준은 대표/관리자 계정에서
              설정합니다. 사이드바 하단 또는 더보기에서 사용자를 전환하세요.
            </p>
          </Card>
        )}

        {isManager && (
          <>
        {/* 매장 */}
        <SettingsSection id="set-store" title="매장" summary="상호 · 지점명 · 영업시간">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>회사명</FieldLabel>
              <input
                className={inputCls}
                value={settings.companyName}
                onChange={(e) =>
                  updateSettings({ companyName: e.target.value })
                }
              />
            </div>
            <div>
              <FieldLabel>지점명</FieldLabel>
              <input
                className={inputCls}
                value={settings.branchName}
                onChange={(e) => updateSettings({ branchName: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>대표자 / 관리자</FieldLabel>
              <input
                className={inputCls}
                value={settings.ownerName}
                onChange={(e) => updateSettings({ ownerName: e.target.value })}
              />
            </div>
            <div>
              {/*
                AX Owner (Unified v3.0 §10) — KPI · 데이터 품질 · 사용 교육 ·
                이슈를 책임지는 한 사람. 대표자와 같아도 따로 적는다.
                "모두의 일" 은 아무의 일도 아니게 되기 때문이다.
              */}
              <FieldLabel>AX 담당자 (KPI · 데이터 · 교육 책임)</FieldLabel>
              <input
                className={inputCls}
                value={settings.axOwner ?? ""}
                placeholder="예: 대표 본인 또는 실장"
                onChange={(e) => updateSettings({ axOwner: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>영업시간</FieldLabel>
              <input
                className={inputCls}
                value={settings.openHours}
                onChange={(e) => updateSettings({ openHours: e.target.value })}
              />
            </div>
          </div>
        </SettingsSection>

        {/*
          도입 전 기준선 (Unified v3.0 §4.2 BASELINE).

          성과는 "이후 숫자" 만으로 증명되지 않는다. 비교할 이전이 필요한데
          이전은 시스템에 없다 — 수기로 운영하던 때라서. 그래서 대표님이
          아는 만큼만 적는다. 비워 두면 성과 화면은 "기준선 없음 — 개선율을
          계산하지 않습니다" 라고 말한다. 채우라고 재촉하되 지어내지 않는다.
        */}
        <SettingsSection
          id="set-baseline"
          dataTour="settings-baseline"
          tone="gold"
          title="도입 전 기준선 — 아는 만큼만"
          summary="AX 쓰기 전 숫자 — 성과 비교의 기준"
        >
          <p className="mb-4 text-[0.9375rem] leading-relaxed text-ink-sub">
            AX 를 쓰기 전에는 어땠는지 적어 두는 자리입니다. 성과 화면이 이
            값과 지금을 나란히 놓고 비교합니다. 정확히 모르시면 비워 두셔도
            됩니다 — 그러면 개선율을 계산하지 않고, 그렇다고 적습니다.
          </p>
          {(() => {
            const b = settings.baseline ?? {};
            const setB = (patch: Partial<NonNullable<AppSettings["baseline"]>>) =>
              updateSettings({ baseline: { ...b, ...patch } });
            return (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>기준 시점</FieldLabel>
                  <input
                    className={inputCls}
                    type="month"
                    aria-label="기준 시점"
                    value={b.asOf ?? ""}
                    onChange={(e) => setB({ asOf: e.target.value || undefined })}
                  />
                  <p className="mt-1 text-[0.8125rem] text-ink-faint">이 값들이 어느 달 기준인지</p>
                </div>
                <BaselineField label="월평균 재방문 인원" hint="한 달에 다시 오신 분 (REVENUE)" unit="명"
                  value={b.monthlyRevisitCustomers} onChange={(v) => setB({ monthlyRevisitCustomers: v })} />
                <BaselineField label="이용권 소진 뒤 재등록까지" hint="다 쓰신 뒤 다시 등록까지 걸린 평균 (REVENUE)" unit="일"
                  value={b.renewalGapDays} onChange={(v) => setB({ renewalGapDays: v })} />
                <BaselineField label="월평균 이용권 판매" hint="한 달 이용권 판매 건수" unit="건"
                  value={b.monthlyMembershipSales} onChange={(v) => setB({ monthlyMembershipSales: v })} />
                <BaselineField label="고객 1명 관리 시간" hint="전화 · 확인 · 수기 정리 포함, 한 주에 (COST)" unit="분/명"
                  value={b.minutesPerCustomerWeek} onChange={(v) => setB({ minutesPerCustomerWeek: v })} />
                <BaselineField label="도입 전 고객 수" hint="직원 1인당 관리 고객 계산용 (SCALE)" unit="명"
                  value={b.customersBefore} onChange={(v) => setB({ customersBefore: v })} />
                <BaselineField label="도입 전 직원 수" hint="직원 1인당 관리 고객 계산용 (SCALE)" unit="명"
                  value={b.staffBefore} onChange={(v) => setB({ staffBefore: v })} />
                <div className="sm:col-span-2">
                  <FieldLabel>어떻게 셌는지 (선택)</FieldLabel>
                  <input
                    className={inputCls}
                    aria-label="어떻게 셌는지"
                    value={b.note ?? ""}
                    placeholder="예: 2025년 장부 기준, 대략 기억"
                    onChange={(e) => setB({ note: e.target.value || undefined })}
                  />
                </div>
              </div>
            );
          })()}
        </SettingsSection>

        {/* 직원 */}
        <SettingsSection
          id="set-staff"
          title="직원"
          summary="직원 이름 · 역할 · 계정"
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStaffModal(true)}
            >
              <PlusIcon className="h-4 w-4" />
              직원 추가
            </Button>
          }
        >
          <ul className="divide-y divide-stone-bg-deep">
            {staff.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-3 py-3"
              >
                <span className="font-semibold text-ink">{s.name}</span>
                <select
                  className={`${inputCls} touch-target !w-auto !py-1.5 text-sm`}
                  // 줄 안에 있는 칸이라 이름표가 따로 없다 — 누구의 권한인지 함께 읽히게
                  aria-label={`${s.name} 권한`}
                  value={s.role}
                  onChange={(e) =>
                    updateStaff(
                      staff.map((x) =>
                        x.id === s.id
                          ? { ...x, role: e.target.value as StaffRole }
                          : x,
                      ),
                    )
                  }
                >
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-ink-sub">
                  {branches.find((b) => b.id === s.branchId)?.name ?? "-"}
                </span>
                <button
                  onClick={() =>
                    updateStaff(
                      staff.map((x) =>
                        x.id === s.id ? { ...x, active: !x.active } : x,
                      ),
                    )
                  }
                  className={`touch-target ml-auto inline-flex items-center rounded-full px-3.5 text-sm font-semibold ${
                    s.active
                      ? "bg-aqua-100 text-aqua-800"
                      : "bg-stone-bg-deep text-ink-sub"
                  }`}
                >
                  {s.active ? "재직 중" : "비활성"}
                </button>
                {/* 로그인 계정 잇기 — 이 줄이 곧 권한 부여다 */}
                <StaffAccountRow staffId={s.id} staffName={s.name} />
              </li>
            ))}
          </ul>
        </SettingsSection>

        {/* 고객관리 기준 */}
        {/*
          화면 공유 모드.

          실제 고객자료를 넣은 채로 화면을 함께 보거나 시연하는 일이 생긴다.
          그때 이름과 연락처가 그대로 나가면 되돌릴 수가 없다.
          저장된 자료는 건드리지 않고 보이는 것만 가린다.
        */}
        <SettingsSection id="set-privacy" title="화면 공유" summary="고객 이름과 연락처를 화면에서 가리기">
          {/*
            네모 체크박스 대신 누르는 단추로 둔다.
            체크박스는 실제 그림이 20px 라 손끝으로 겨냥하기 어렵고,
            이 화면의 다른 켜고 끄기와도 생김새가 달랐다.
          */}
          <button
            type="button"
            aria-pressed={settings.privacyMode === true}
            onClick={() =>
              updateSettings({ privacyMode: !(settings.privacyMode === true) })
            }
            className={`flex w-full items-start gap-3 rounded-card px-4 py-3.5 text-left ring-1 transition-colors ${
              settings.privacyMode
                ? "bg-aqua-50 ring-aqua-200 dark:bg-aqua-500/10"
                : "bg-card-soft ring-stone-line hover:bg-aqua-50/60"
            }`}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ${
                settings.privacyMode
                  ? "bg-sel text-sel-ink ring-transparent"
                  : "bg-card ring-stone-line"
              }`}
            >
              {settings.privacyMode && <CheckIcon className="h-4 w-4" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[0.9375rem] font-extrabold text-ink">
                화면 공유 모드
              </span>
              <span className="mt-1 block text-[0.8125rem] leading-relaxed text-ink-sub">
                고객 이름을 <b>김○희</b> 처럼 가리고 연락처를 모두 숨깁니다.
                화면을 함께 보거나 사진을 찍어 보낼 때 켜세요. 저장된 기록은
                그대로이며, 끄면 원래대로 보입니다.
              </span>
            </span>
          </button>
        </SettingsSection>

        {/* 서비스 · 이용권 상품 (매장 가격표) */}
        <SettingsSection
          id="set-product"
          title="서비스 · 이용권 상품"
          summary="매장이 파는 프로그램과 이용권 가격"
        >
          <p className="-mt-2 mb-4 text-sm leading-relaxed text-ink-sub">
            매장이 실제로 판매하는 것과 금액입니다. 여기 적어 둔 내용을 이용권
            등록 화면과 방문 기록의 프로그램 목록이 그대로 읽습니다. 가격을
            바꾸면 다음 등록부터 바로 반영되고, 이미 팔린 이용권의 금액은
            그때 팔린 금액 그대로 남습니다.
          </p>
          <ProductTable />
        </SettingsSection>

        {/*
          매장 계정 연결 — 여러 기기가 같은 기록을 보게 하고, 고객 화면
          (MY WELLNESS)을 여는 스위치다. 연결하지 않으면 지금까지처럼
          이 기기 안에서만 저장된다.
        */}
        <SupabaseLinkCard />

        <SettingsSection
          id="set-rules"
          dataTour="settings-rules"
          title="고객관리 기준"
          summary="브리핑과 재방문이 대상을 가려내는 숫자"
        >
          <p className="-mt-2 mb-4 text-sm leading-relaxed text-ink-sub">
            오늘의 실행 브리핑과 재방문 관리가 이 기준으로 대상을 가려냅니다.
            숫자를 바꾸면 <b>저장하기 전에</b> 대상이 어떻게 달라지는지 아래에서
            보여 드립니다.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/*
              기본 관리주기는 원래 '매장 정보' 카드에 있었다. 그런데 값은
              settings.careRules 에서 읽고 쓰기는 초안(draftRules)으로 했던 탓에
              무엇을 쳐도 화면 숫자가 되돌아왔다 — 고칠 수 없는 칸이었다.
              같은 초안을 쓰는 나머지 기준들 옆, '적용' 단추가 있는 이 자리로
              옮긴다. 성격도 여기가 맞다 — 매장 정보가 아니라 관리 기준이다.
            */}
            <RuleField
              label="기본 관리주기"
              value={draftRules.defaultCycleDays}
              unit="일 (방문 이력이 적은 고객에게 적용)"
              onChange={(n) => setRule({ defaultCycleDays: n })}
            />
            <RuleField
              label="장기 미방문 판단 기준"
              value={draftRules.dormantDays}
              unit="일 이상 미방문"
              onChange={(n) => setRule({ dormantDays: n })}
            />
            <RuleField
              label="이용권 소진 임박 기준"
              value={draftRules.membershipLowCount}
              unit="회 이하 잔여"
              onChange={(n) => setRule({ membershipLowCount: n })}
            />
            <RuleField
              label="재방문 예정 기준"
              value={draftRules.revisitWindowDays}
              unit="일 전부터 알림"
              onChange={(n) => setRule({ revisitWindowDays: n })}
            />
            <RuleField
              label="신규 고객 후속관리 기간"
              value={draftRules.newFollowupDays}
              unit="일"
              onChange={(n) => setRule({ newFollowupDays: n })}
            />
          </div>

          {/* 저장 전 영향 미리보기 — 규칙 엔진을 그대로 돌려 센 값이다 */}
          <div className="mt-4 border-t border-stone-line pt-4">
            {preview.unchanged ? (
              <p className="text-sm leading-relaxed text-ink-sub">
                지금 기준으로 오늘 관리 대상은{" "}
                <b className="nowrap-num text-ink">{preview.before.total}명</b>
                입니다. 위 숫자를 바꾸면 대상이 어떻게 달라지는지 저장하기 전에
                여기서 확인하실 수 있습니다.
              </p>
            ) : (
              <div>
                {preview.totalDelta === 0 ? (
                  <p className="text-sm leading-relaxed text-ink-soft">
                    오늘 관리 대상은{" "}
                    <b className="nowrap-num">{preview.after.total}명</b>으로
                    그대로지만,{" "}
                    {preview.changed.length > 0
                      ? "어떤 이유로 잡히는지가 달라집니다."
                      : "달라지는 것이 없습니다."}
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed text-ink-soft">
                    이 기준으로 바꾸면 오늘 관리 대상이{" "}
                    <b className="nowrap-num">{preview.before.total}명</b> →{" "}
                    <b className="nowrap-num text-deep-800 dark:text-aqua-700">
                      {preview.after.total}명
                    </b>
                    <span className="nowrap-num">
                      {" "}
                      ({preview.totalDelta > 0 ? "+" : ""}
                      {preview.totalDelta}명)
                    </span>
                    이 됩니다.
                  </p>
                )}

                {preview.changed.length > 0 && (
                  <ul className="mt-2.5 space-y-1">
                    {preview.changed.map((r) => (
                      <li
                        key={r.category}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            r.delta > 0 ? "bg-warn" : "bg-positive"
                          }`}
                        />
                        <span className="min-w-0 flex-1 truncate text-ink-soft">
                          {r.label}
                        </span>
                        <span className="nowrap-num shrink-0 font-bold text-ink">
                          {r.before} → {r.after}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ink-faint">
                  실제 브리핑을 만드는 규칙을 그대로 돌려 센 숫자입니다. 아직
                  저장되지 않았습니다.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      updateSettings({ careRules: draftRules });
                      toast("관리 기준을 적용했습니다");
                    }}
                  >
                    기준 적용
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setDraftRules(settings.careRules)}
                  >
                    되돌리기
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* 매출기회 기준 — Priority 기준과 분리된 별도 카드 */}
        <SettingsSection
          id="set-opp"
          title="AX 매출기회 기준"
          summary="재방문 · 재등록 기회를 판단하는 숫자"
        >
          <p className="-mt-2 mb-4 text-sm leading-relaxed text-ink-sub">
            재방문 · 이용권 재등록 기회를 판단하는 기준입니다. 위의 고객관리
            기준(우선순위 계산)과는 별개이며, 이 값만 바꿔도 우선순위 점수는
            달라지지 않습니다.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RuleField
              label="이용권 소진 후 재등록 기회 기간"
              value={oppRules.exhaustedWindowDays}
              unit="일 이내 소진 고객"
              onChange={(n) => setOppRule({ exhaustedWindowDays: n })}
            />
            <RuleField
              label="재등록 기회 최소 누적 방문"
              value={oppRules.minVisitsForRenewal}
              unit="회 이상 방문한 고객"
              onChange={(n) => setOppRule({ minVisitsForRenewal: n })}
            />
            <RuleField
              label="반복 이용 고객 기준"
              value={oppRules.loyalVisitCount}
              unit="회 이상 (기회 강도 판단)"
              onChange={(n) => setOppRule({ loyalVisitCount: n })}
            />
          </div>
          <div className="mt-4">
            <AiReadyNote subject="opportunity" />
          </div>
        </SettingsSection>

        {/* 데이터 */}
        <SettingsSection
          id="set-data"
          dataTour="settings-data"
          title="데이터"
          summary="전체 백업 내려받기 · 불러오기 · 초기화"
        >
          <p className="-mt-2 mb-3 text-sm leading-relaxed text-ink-sub">
            지금까지 쌓인 기록을 파일로 내려받습니다. 운영 성과 보고 자료로 쓰거나,
            실제 데이터베이스로 옮길 때 그대로 사용할 수 있습니다.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {EXPORTS.map((e) => (
              <button
                key={e.key}
                onClick={() => runExport(e.key)}
                className="row-accent flex items-center gap-3 rounded-card bg-card-soft px-3.5 py-3 text-left ring-1 ring-black/[0.04] transition-colors hover:bg-aqua-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-aqua-50 text-aqua-700 ring-1 ring-aqua-100">
                  <DownloadIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold leading-snug text-ink">
                    {e.label}
                  </span>
                  <span className="nowrap-num block truncate text-xs text-ink-sub">
                    {e.count()}건 · CSV
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-3 border-t border-stone-line pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={exportBackup}>
                <DownloadIcon className="h-4 w-4" />
                전체 백업 (JSON)
              </Button>
              <p className="text-xs text-ink-sub">
                {settings.lastBackupAt
                  ? `마지막 백업 ${formatDateKr(settings.lastBackupAt)} (${formatRelative(settings.lastBackupAt)})`
                  : "아직 백업한 적이 없습니다"}
              </p>
            </div>
            {/* 저장 공간 — 한도(약 5MB)에 닿으면 저장이 통째로 실패하므로 미리 보여 준다 */}
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-ink-soft">
                  이 기기 저장 공간
                </span>
                <span className="nowrap-num text-sm font-bold text-ink-sub">
                  {formatBytes(storage.bytes)} / 약 5 MB
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-stone-bg-deep">
                <div
                  className={`h-full rounded-full ${
                    storage.nearLimit
                      ? "bg-gradient-to-r from-amber-400 to-warn"
                      : "bg-gradient-to-r from-aqua-400 to-deep-700"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round(storage.ratio * 100))}%`,
                  }}
                />
              </div>
              {storage.nearLimit && (
                <p className="mt-2 rounded-btn border-l-4 border-warn bg-amber-50 px-3.5 py-2.5 text-sm leading-relaxed text-ink-soft dark:bg-amber-400/10">
                  저장 공간이 거의 찼습니다. 한도를 넘으면 <b>새 기록이 저장되지
                  않습니다.</b> 지금 전체 백업을 받아 두시고, 실제 데이터베이스
                  연결을 앞당기는 것을 권합니다.
                </p>
              )}
            </div>

            {/* 지금은 브라우저에만 저장되므로 주기적인 백업이 유일한 안전장치다 */}
            {backupStale && (
              <p className="mt-2 rounded-btn border-l-4 border-warn bg-amber-50 px-3.5 py-2.5 text-sm leading-relaxed text-ink-soft dark:bg-amber-400/10">
                기록이 <b>이 브라우저에만</b> 저장되어 있습니다. 캐시를 지우면
                모두 사라지므로 <b>주 1회 백업</b>을 권장합니다.
                {settings.lastBackupAt
                  ? ` 마지막 백업 후 ${daysAgo(settings.lastBackupAt)}일 지났습니다.`
                  : ""}
              </p>
            )}
          </div>

          <DataImport />

          {/* 실제 운영 시작 — 샘플을 지우고 우리 매장 기록만 남긴다 */}
          <div className="mt-4 border-t border-stone-line pt-4">
            <p className="font-bold text-ink">실제 운영 시작</p>
            <p className="mb-2.5 mt-1 text-sm leading-relaxed text-ink-sub">
              연습용 샘플 고객 {customers.length}명과 방문 · 이용권 기록을 모두
              지우고, 빈 상태에서 우리 매장 기록만 쌓기 시작합니다. 매장 정보 ·
              직원 명단 · 관리 기준은 그대로 유지됩니다.
            </p>
            <Button variant="secondary" onClick={() => setConfirmFresh(true)}>
              샘플 지우고 운영 시작
            </Button>
          </div>

          <div className="mt-4 border-t border-stone-line pt-4">
            <p className="mb-2 text-sm text-ink-sub">
              현재 브라우저에 저장된 데모 데이터를 초기 샘플 상태로 되돌립니다.
            </p>
            <Button variant="danger-ghost" onClick={() => setConfirmReset(true)}>
              샘플 데이터로 초기화
            </Button>
          </div>
        </SettingsSection>
          </>
        )}
      </div>

      {/* 직원 추가 모달 */}
      <Modal
        open={staffModal}
        onClose={() => setStaffModal(false)}
        title="직원 추가"
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>직원명</FieldLabel>
            <input
              className={inputCls}
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="이름"
            />
          </div>
          <div>
            <FieldLabel>역할</FieldLabel>
            <SegmentedControl<StaffRole>
              label="역할"
              value={newStaffRole}
              options={[
                { key: "staff", label: "직원" },
                { key: "manager", label: "관리자" },
                { key: "owner", label: "대표" },
              ]}
              onChange={setNewStaffRole}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStaffModal(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                if (!newStaffName.trim()) return;
                updateStaff([
                  ...staff,
                  {
                    id: `staff-${Date.now().toString(36)}`,
                    branchId: branches[0]?.id ?? "branch-main",
                    name: newStaffName.trim(),
                    role: newStaffRole,
                    active: true,
                  },
                ]);
                setNewStaffName("");
                setStaffModal(false);
              }}
            >
              추가
            </Button>
          </div>
        </div>
      </Modal>

      {/* 실제 운영 시작 확인 */}
      <Modal
        open={confirmFresh}
        onClose={() => setConfirmFresh(false)}
        title="샘플 지우고 운영 시작"
      >
        <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
          연습용으로 들어 있던 <b>고객 {customers.length}명</b>, 방문 ·
          이용 기록 <b>{visits.length}건</b>, 이용권{" "}
          <b>{memberships.length}건</b>이 모두 지워집니다. 매장 정보와 직원
          명단, 관리 기준은 그대로 남습니다.
        </p>
        <p className="mt-2.5 rounded-btn border-l-4 border-warn bg-amber-50 px-3.5 py-2.5 text-sm leading-relaxed text-ink-soft dark:bg-amber-400/10">
          되돌릴 수 없습니다. 샘플로 만들어 둔 내용을 남겨야 한다면 먼저{" "}
          <b>전체 백업</b>을 받아 두세요.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmFresh(false)}>
            취소
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              startFresh();
              setConfirmFresh(false);
              toast("빈 상태로 시작합니다. 고객 등록부터 진행하세요");
            }}
          >
            지우고 시작
          </Button>
        </div>
      </Modal>

      {/* 초기화 확인 모달 */}
      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="샘플 데이터로 초기화"
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          지금까지 브라우저에 저장한 고객·방문 기록과 설정이 모두 초기 샘플
          상태로 되돌아갑니다. 계속하시겠습니까?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>
            취소
          </Button>
          <Button
            onClick={() => {
              resetData();
              setConfirmReset(false);
            }}
          >
            초기화
          </Button>
        </div>
      </Modal>
    </div>
  );
}
