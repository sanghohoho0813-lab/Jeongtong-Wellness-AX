"use client";

/** 방문/상담 기록 폼 — 이용권 차감, 신체부위 기록, 다음 관리일 지정 포함 */

import { useMemo, useState } from "react";
import { useStore } from "@/lib/data/store";
import {
  BodyPartRecord,
  PREFERENCE_CATEGORY_LABELS,
  Visit,
  VisitType,
} from "@/lib/types";
import { daysFromToday, formatDateKr } from "@/lib/utils/date";
import { recommendNextManageDate } from "@/lib/scoring/insight";
import { Badge, Button, FieldLabel, inputCls } from "@/components/ui";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { CheckIcon } from "@/components/ui/icons";
import { PREF_TONES } from "@/components/customers/CarePreferenceCard";
import { useToast } from "@/components/ui/toast";
import BodyMap from "@/components/body-map/BodyMap";

const PROGRAMS = [
  "쑥뜸 베이직 케어",
  "쑥뜸 딥 릴랙스 케어",
  "반신 온열 케어",
  "기타 프로그램",
];

export default function VisitForm({
  customerId: fixedCustomerId,
  visit,
  onSaved,
  onCancel,
}: {
  customerId?: string;
  /** 있으면 수정 모드 — 이용권 차감도 함께 정정된다 */
  visit?: Visit;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const {
    customers,
    staff,
    memberships,
    settings,
    addVisit,
    updateVisit,
    factsById,
  } = useStore();
  const toast = useToast();
  const editing = !!visit;
  const [customerId, setCustomerId] = useState(
    visit?.customerId ?? fixedCustomerId ?? "",
  );
  const [type, setType] = useState<VisitType>(visit?.type ?? "visit");
  const [programName, setProgramName] = useState(
    visit?.programName ?? PROGRAMS[0],
  );
  const [membershipId, setMembershipId] = useState(visit?.membershipId ?? "");
  const [parts, setParts] = useState<BodyPartRecord[]>(() => {
    if (visit) return visit.bodyParts;
    if (!fixedCustomerId) return [];
    return (
      customers.find((c) => c.id === fixedCustomerId)?.focusBodyParts ?? []
    );
  });
  const [reaction, setReaction] = useState(visit?.reaction ?? "");
  const [amount, setAmount] = useState(
    visit?.amount ? String(visit.amount) : "",
  );
  const [nextManage, setNextManage] = useState(
    visit
      ? (visit.nextManageDate ?? "")
      : daysFromToday(settings.careRules.defaultCycleDays),
  );
  const [nextManageTime, setNextManageTime] = useState<string | undefined>(
    visit?.nextManageTime,
  );
  const [staffId, setStaffId] = useState(visit?.staffId ?? "");
  const [appliedPrefs, setAppliedPrefs] = useState<string[]>(
    visit?.appliedPreferenceIds ?? [],
  );
  const [error, setError] = useState("");

  const sortedCustomers = useMemo(
    () => [...customers].sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [customers],
  );

  const selectedCustomer = customers.find((c) => c.id === customerId);

  /**
   * 선택 가능한 이용권 — 사용 중인 것 + (수정 모드에서) 이미 이 기록에 연결된 것.
   * 소진된 이용권이라도 원래 기록에 걸려 있으면 선택지에서 사라지면 안 된다.
   */
  const activeMemberships = memberships.filter(
    (m) =>
      m.customerId === customerId &&
      (m.status === "active" || (editing && m.id === visit?.membershipId)),
  );

  // AX 추천 다음 관리일 (선택된 고객의 기존 방문주기 기반)
  const recommendation = recommendNextManageDate(
    customerId ? factsById.get(customerId) : undefined,
    settings.careRules,
  );

  const selectCustomer = (id: string) => {
    setCustomerId(id);
    setMembershipId("");
    setAppliedPrefs([]);
    const c = customers.find((x) => x.id === id);
    setParts(c?.focusBodyParts ?? []);
  };

  const submit = () => {
    if (!customerId) return setError("고객을 선택하세요.");
    const payload = {
      customerId,
      type,
      programName: type === "visit" ? programName : undefined,
      membershipId: type === "visit" && membershipId ? membershipId : undefined,
      bodyParts: parts,
      reaction: reaction || undefined,
      amount: amount ? Number(amount.replace(/\D/g, "")) : undefined,
      nextManageDate: nextManage || undefined,
      nextManageTime: nextManage ? nextManageTime : undefined,
      staffId: staffId || undefined,
      appliedPreferenceIds: appliedPrefs,
    };
    const name = customers.find((c) => c.id === customerId)?.name ?? "고객";
    const kind = type === "consult" ? "상담" : "방문";
    if (visit) {
      updateVisit(visit.id, payload);
      toast(`${name} · ${kind} 기록을 수정했습니다`);
    } else {
      addVisit(payload);
      toast(`${name} · ${kind} 기록을 저장했습니다`);
    }
    onSaved();
  };

  return (
    <div className="space-y-4">
      {!fixedCustomerId && !editing && (
        <div>
          <FieldLabel>고객 *</FieldLabel>
          <select
            className={inputCls}
            value={customerId}
            onChange={(e) => selectCustomer(e.target.value)}
          >
            <option value="">고객을 선택하세요</option>
            {sortedCustomers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <FieldLabel>기록 유형</FieldLabel>
        <div className="flex gap-2">
          {(
            [
              { key: "visit", label: "방문 · 이용" },
              { key: "consult", label: "상담" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              className={`touch-target flex-1 rounded-btn px-4 py-2.5 text-sm font-bold transition-colors ${
                type === t.key
                  ? "bg-deep-800 text-white shadow-sm dark:bg-aqua-600"
                  : "bg-card-soft text-ink-soft ring-1 ring-stone-line hover:bg-aqua-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {type === "visit" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>이용 프로그램</FieldLabel>
            <select
              className={inputCls}
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
            >
              {PROGRAMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>이용권 사용</FieldLabel>
            <select
              className={inputCls}
              value={membershipId}
              onChange={(e) => setMembershipId(e.target.value)}
              disabled={!customerId}
            >
              <option value="">사용 안 함 (현장 결제 등)</option>
              {activeMemberships.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.programName} · 잔여 {m.remainingCount}회
                </option>
              ))}
            </select>
            {/* 저장 전 차감 예상값 안내 */}
            {(() => {
              const m = activeMemberships.find((x) => x.id === membershipId);
              if (!m) return null;
              // 수정 모드에서 이미 차감된 이용권은 다시 차감되지 않는다
              if (editing && m.id === visit?.membershipId) {
                return (
                  <p className="mt-2 rounded-btn bg-card-soft px-3 py-2 text-sm font-bold text-ink-sub ring-1 ring-stone-line">
                    이미 차감된 기록입니다 · 현재 잔여 {m.remainingCount}회
                  </p>
                );
              }
              return (
                <p className="mt-2 rounded-btn bg-aqua-50 px-3 py-2 text-sm font-bold text-aqua-800 ring-1 ring-aqua-100">
                  현재 <span className="nowrap-num">{m.remainingCount}회</span>{" "}
                  남음 · 이번 방문 1회 사용 → 저장 후{" "}
                  <span className="nowrap-num">
                    {Math.max(0, m.remainingCount - 1)}회
                  </span>{" "}
                  남음
                </p>
              );
            })()}
          </div>
        </div>
      )}

      {/* 고객 감동 포인트 — 케어 전 확인 체크리스트 */}
      {selectedCustomer && (selectedCustomer.preferences?.length ?? 0) > 0 && (
        <div className="rounded-card bg-gold-soft/50 px-3.5 py-3 ring-1 ring-gold/25">
          <p className="flex items-center gap-1.5 text-[0.7rem] font-extrabold uppercase tracking-wider text-gold-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            케어 선호 · 특이사항 확인
          </p>
          <p className="mt-1 text-xs text-ink-sub">
            이번 방문에서 반영한 항목을 체크하세요. 체크한 내용은 이용 이력에
            함께 기록됩니다.
          </p>
          <ul className="mt-2 space-y-1.5">
            {[...(selectedCustomer.preferences ?? [])]
              .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
              .map((p) => {
                const on = appliedPrefs.includes(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setAppliedPrefs((prev) =>
                          on
                            ? prev.filter((id) => id !== p.id)
                            : [...prev, p.id],
                        )
                      }
                      className={`touch-target flex w-full items-start gap-2.5 rounded-btn px-3 py-2 text-left transition-colors ${
                        on
                          ? "bg-aqua-50 ring-1 ring-aqua-300"
                          : "bg-card ring-1 ring-stone-line hover:bg-card-soft"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded ${
                          on
                            ? "bg-aqua-600 text-white"
                            : "bg-card-soft ring-1 ring-stone-line"
                        }`}
                        style={{ width: "1.125rem", height: "1.125rem" }}
                      >
                        {on && <CheckIcon className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={PREF_TONES[p.category].badge}>
                            {PREFERENCE_CATEGORY_LABELS[p.category]}
                          </Badge>
                          {p.pinned && (
                            <span className="text-[0.7rem] font-bold text-aqua-700">
                              매번 확인
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-sm text-ink-soft">
                          {p.note}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      <div>
        <FieldLabel>이번 회차 케어 부위</FieldLabel>
        {fixedCustomerId && parts.length > 0 && (
          <p className="mb-2 text-xs text-ink-sub">
            고객의 주요 케어 부위가 기본으로 선택되어 있습니다. 이번 방문에서
            실제 케어한 부위로 조정하세요.
          </p>
        )}
        <BodyMap value={parts} onChange={setParts} compactChips />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>담당 직원</FieldLabel>
          <select
            className={inputCls}
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
          >
            <option value="">미지정</option>
            {staff
              .filter((s) => s.active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <FieldLabel>다음 관리 예정일</FieldLabel>
          {/* 타자 없이 날짜·시간(오전/오후)까지 클릭으로 지정 */}
          <DateTimeField
            date={nextManage}
            time={nextManageTime}
            recommended={
              recommendation.date
                ? { date: recommendation.date, label: "AI 추천일" }
                : undefined
            }
            onChange={(d, t) => {
              setNextManage(d);
              setNextManageTime(t);
            }}
          />
          {/* AX 추천 다음 관리일 — 기존 방문주기 데이터 기반 (예측 모델 아님) */}
          <div className="mt-2 rounded-btn bg-card-soft px-3 py-2 ring-1 ring-stone-line">
            <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-ink-faint">
              AX 추천 다음 관리일
            </p>
            {recommendation.date ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="nowrap-num text-sm font-extrabold text-deep-800 dark:text-aqua-700">
                  {formatDateKr(recommendation.date)}
                </span>
                <span className="text-xs text-ink-sub">
                  {recommendation.basis}
                </span>
                <button
                  type="button"
                  onClick={() => setNextManage(recommendation.date!)}
                  disabled={nextManage === recommendation.date}
                  className="ml-auto rounded-full bg-aqua-50 px-3 py-1 text-xs font-bold text-aqua-800 ring-1 ring-aqua-200 transition-colors hover:bg-aqua-100 disabled:opacity-50"
                >
                  {nextManage === recommendation.date ? "적용됨" : "추천일 적용"}
                </button>
              </div>
            ) : (
              <p className="mt-1 text-xs text-ink-sub">
                {recommendation.basis}
              </p>
            )}
          </div>
        </div>
        {type === "visit" && (
          <div className="sm:col-span-2">
            <FieldLabel>현장 결제 금액 (원, 선택)</FieldLabel>
            <input
              className={inputCls}
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              placeholder="예: 60000"
              inputMode="numeric"
            />
          </div>
        )}
      </div>

      <div>
        <FieldLabel>고객 반응 / 메모</FieldLabel>
        <textarea
          className={`${inputCls} min-h-20`}
          value={reaction}
          onChange={(e) => setReaction(e.target.value)}
          placeholder="이용 후 반응, 선호사항, 다음 방문 참고사항을 기록하세요"
        />
      </div>

      {error && <p className="text-sm font-semibold text-danger">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button onClick={submit}>{editing ? "수정 저장" : "기록 저장"}</Button>
      </div>
    </div>
  );
}
