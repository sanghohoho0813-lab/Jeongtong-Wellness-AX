"use client";

import { useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import { useStore } from "@/lib/data/store";
import {
  CareRuleSettings,
  Density,
  FontScale,
  StaffRole,
  Theme,
} from "@/lib/types";
import {
  Button,
  Card,
  FieldLabel,
  Modal,
  SectionTitle,
  SegmentedControl,
  inputCls,
} from "@/components/ui";
import { DownloadIcon, PlusIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { todayISO } from "@/lib/utils/date";
import {
  customersCsv,
  downloadFile,
  membershipsCsv,
  preferencesCsv,
  stamp,
  visitsCsv,
} from "@/lib/utils/export";

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
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          className={`${inputCls} max-w-28`}
          value={value}
          inputMode="numeric"
          onChange={(e) => {
            const n = Number(e.target.value.replace(/\D/g, ""));
            if (n > 0) onChange(n);
          }}
        />
        <span className="text-sm text-ink-sub">{unit}</span>
      </div>
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
    isManager,
  } = useStore();
  const toast = useToast();
  const [staffModal, setStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>("staff");
  const [confirmReset, setConfirmReset] = useState(false);

  const setRule = (patch: Partial<CareRuleSettings>) =>
    updateSettings({ careRules: { ...settings.careRules, ...patch } });

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

  const exportBackup = () => {
    const payload = JSON.stringify(
      { exportedAt: new Date().toISOString(), customers, visits, memberships, staff, branches, settings },
      null,
      2,
    );
    downloadFile(
      `정통대왕쑥뜸원_전체백업_${stamp(todayISO())}.json`,
      payload,
      "application/json;charset=utf-8",
    );
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

      <div className="grid grid-cols-1 card-gap xl:grid-cols-2 xl:items-start">
        {/* 화면 */}
        <Card>
          <SectionTitle>화면</SectionTitle>
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
              <FieldLabel>테마</FieldLabel>
              <SegmentedControl<Theme>
                label="테마"
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
          </div>
        </Card>

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
        <Card>
          <SectionTitle>매장</SectionTitle>
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
              <FieldLabel>영업시간</FieldLabel>
              <input
                className={inputCls}
                value={settings.openHours}
                onChange={(e) => updateSettings({ openHours: e.target.value })}
              />
            </div>
            <div>
              <RuleField
                label="기본 관리주기"
                value={settings.careRules.defaultCycleDays}
                unit="일 (방문 이력이 적은 고객에게 적용)"
                onChange={(n) => setRule({ defaultCycleDays: n })}
              />
            </div>
          </div>
        </Card>

        {/* 직원 */}
        <Card>
          <SectionTitle
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
            직원
          </SectionTitle>
          <ul className="divide-y divide-stone-bg-deep">
            {staff.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-3 py-3"
              >
                <span className="font-semibold text-ink">{s.name}</span>
                <select
                  className={`${inputCls} !w-auto !py-1.5 text-sm`}
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
                  className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${
                    s.active
                      ? "bg-aqua-100 text-aqua-800"
                      : "bg-stone-bg-deep text-ink-sub"
                  }`}
                >
                  {s.active ? "재직 중" : "비활성"}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {/* 고객관리 기준 */}
        <Card>
          <SectionTitle>고객관리 기준</SectionTitle>
          <p className="-mt-2 mb-4 text-sm text-ink-sub">
            아래 기준은 오늘의 실행 브리핑과 재방문 관리 분류에 바로 적용됩니다.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RuleField
              label="장기 미방문 판단 기준"
              value={settings.careRules.dormantDays}
              unit="일 이상 미방문"
              onChange={(n) => setRule({ dormantDays: n })}
            />
            <RuleField
              label="이용권 소진 임박 기준"
              value={settings.careRules.membershipLowCount}
              unit="회 이하 잔여"
              onChange={(n) => setRule({ membershipLowCount: n })}
            />
            <RuleField
              label="재방문 예정 기준"
              value={settings.careRules.revisitWindowDays}
              unit="일 전부터 알림"
              onChange={(n) => setRule({ revisitWindowDays: n })}
            />
            <RuleField
              label="신규 고객 후속관리 기간"
              value={settings.careRules.newFollowupDays}
              unit="일"
              onChange={(n) => setRule({ newFollowupDays: n })}
            />
          </div>
        </Card>

        {/* 데이터 */}
        <Card>
          <SectionTitle>데이터</SectionTitle>
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
                  <span className="block truncate font-bold text-ink">
                    {e.label}
                  </span>
                  <span className="nowrap-num block truncate text-xs text-ink-sub">
                    {e.count()}건 · CSV
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-line pt-3">
            <Button variant="secondary" size="sm" onClick={exportBackup}>
              <DownloadIcon className="h-4 w-4" />
              전체 백업 (JSON)
            </Button>
            <p className="text-xs text-ink-sub">
              모든 기록을 한 파일로 보관합니다.
            </p>
          </div>

          <div className="mt-4 border-t border-stone-line pt-4">
            <p className="mb-2 text-sm text-ink-sub">
              현재 브라우저에 저장된 데모 데이터를 초기 샘플 상태로 되돌립니다.
            </p>
            <Button variant="danger-ghost" onClick={() => setConfirmReset(true)}>
              샘플 데이터로 초기화
            </Button>
          </div>
        </Card>
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
