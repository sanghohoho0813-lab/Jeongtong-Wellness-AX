"use client";

/** 방문/상담 기록 폼 — 이용권 차감, 신체부위 기록, 다음 관리일 지정 포함 */

import { useEffect, useMemo, useState, useRef } from "react";
import { useStore } from "@/lib/data/store";
import {
  BodyPartRecord,
  PREFERENCE_CATEGORY_LABELS,
  Visit,
  VisitType,
} from "@/lib/types";
import {
  daysFromToday,
  formatDateKr,
  nowTime,
  splitIsoDateTime,
  toIsoDateTime,
  todayISO,
} from "@/lib/utils/date";
import { recommendNextManageDate } from "@/lib/scoring/insight";
import { Badge, Button, FieldLabel, FormActions, inputCls } from "@/components/ui";
import { useFormError } from "@/lib/utils/form";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { CheckIcon } from "@/components/ui/icons";
import { PREF_TONES } from "@/components/customers/CarePreferenceCard";
import { useToast } from "@/components/ui/toast";
import BodyMap from "@/components/body-map/BodyMap";

/*
 * 프로그램 목록도 매장 가격표(설정 → 서비스 · 이용권 상품)에서 읽는다.
 * 여기 적어 두면 매장이 파는 것과 화면에 뜨는 것이 어긋난다.
 */
const OTHER_PROGRAM = "기타";

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
    visits,
    products,
  } = useStore();
  const toast = useToast();
  /**
   * 고를 수 있는 프로그램 — 매장 가격표에 있는 서비스 이름들.
   * 예전 기록에 적힌 이름(지금은 안 파는 것)도 그대로 남겨야 수정할 때
   * 값이 멋대로 바뀌지 않는다.
   */
  const programOptions = useMemo(() => {
    const names = products
      .filter((p) => p.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => p.serviceName);
    const list = [...new Set([...names, OTHER_PROGRAM])];
    if (visit?.programName && !list.includes(visit.programName)) {
      list.unshift(visit.programName);
    }
    return list;
  }, [products, visit?.programName]);
  const defaultProgram = programOptions[0] ?? OTHER_PROGRAM;
  const editing = !!visit;
  const [customerId, setCustomerId] = useState(
    visit?.customerId ?? fixedCustomerId ?? "",
  );
  // 방문 일시 — 지난 방문을 나중에 입력하는 경우가 많아 직접 지정할 수 있다
  const [visitDate, setVisitDate] = useState(
    visit ? splitIsoDateTime(visit.visitedAt).date : todayISO(),
  );
  const [visitTime, setVisitTime] = useState<string | undefined>(
    visit ? splitIsoDateTime(visit.visitedAt).time : nowTime(),
  );
  const [type, setType] = useState<VisitType>(visit?.type ?? "visit");
  const [programName, setProgramName] = useState(
    visit?.programName ?? defaultProgram,
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
  const { error, fail, clear } = useFormError();
  const customerRef = useRef<HTMLSelectElement>(null);

  const sortedCustomers = useMemo(
    () => [...customers].sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [customers],
  );

  const selectedCustomer = customers.find((c) => c.id === customerId);

  /**
   * 이 고객의 지난 방문 — 이번 기록의 밑그림으로 쓴다.
   * (수정 중인 기록 자신은 제외)
   */
  const lastVisit = useMemo(() => {
    if (!customerId) return undefined;
    return [...visits]
      .filter(
        (v) =>
          v.customerId === customerId &&
          v.type === "visit" &&
          v.id !== visit?.id,
      )
      .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))[0];
  }, [visits, customerId, visit?.id]);

  /**
   * 고객이 정해지면 **지난 회차를 그대로 이어받는다.**
   *
   * 같은 분이 오시면 대개 같은 프로그램에 같은 부위다. 그런데도 매번
   * 첫 프로그램부터 다시 고르고 부위를 다시 짚어야 했다. 하루에 열 번이면
   * 열 번을 다시 골랐다. 이제 지난번 그대로 채워 두고, 달라진 것만 손보면 된다.
   * (수정 모드에서는 원래 기록을 건드리지 않는다)
   */
  useEffect(() => {
    if (editing || !customerId) return;
    const c = customers.find((x) => x.id === customerId);
    if (!c) return;
    setProgramName(lastVisit?.programName ?? defaultProgram);
    setParts(
      lastVisit && lastVisit.bodyParts.length > 0
        ? lastVisit.bodyParts
        : (c.focusBodyParts ?? []),
    );
    setStaffId(c.assignedStaffId ?? lastVisit?.staffId ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

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

  // 프로그램 · 부위 · 담당은 위 useEffect 가 지난 회차를 보고 채운다
  const selectCustomer = (id: string) => {
    setCustomerId(id);
    setMembershipId("");
    setAppliedPrefs([]);
  };

  const submit = () => {
    if (!customerId) return fail("고객을 선택하세요.", customerRef);
    // 방문 일시는 날짜 선택기라 데려갈 칸이 없다 — 문장만 띄운다
    if (!visitDate) return fail("방문 일시를 선택하세요.");
    if (visitDate > todayISO())
      return fail("앞으로의 날짜는 방문 기록으로 저장할 수 없습니다.");
    clear();
    const payload = {
      customerId,
      visitedAt: toIsoDateTime(visitDate, visitTime),
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
            ref={customerRef}
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

      {/* 방문 일시 — 지난 방문도 정확한 날짜로 남길 수 있어야 주기 계산이 맞는다 */}
      <div>
        <FieldLabel>방문 일시</FieldLabel>
        <DateTimeField
          date={visitDate}
          time={visitTime}
          ariaLabel="방문 일시"
          onChange={(d, t) => {
            setVisitDate(d);
            setVisitTime(t);
          }}
        />
        {visitDate && visitDate < todayISO() && (
          <p className="mt-1.5 text-[0.8125rem] font-bold text-warn-text">
            {formatDateKr(visitDate)} 방문으로 기록됩니다 (지난 날짜)
          </p>
        )}
      </div>

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
                  ? "bg-sel text-sel-ink shadow-sm"
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
              {programOptions.map((p) => (
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
                            ? "bg-sel text-sel-ink"
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FieldLabel>이번 회차 케어 부위</FieldLabel>
          {!editing && parts.length > 0 && (
            <button
              type="button"
              onClick={() => setParts([])}
              className="touch-target -my-2 shrink-0 text-[0.8125rem] font-bold text-ink-sub underline-offset-4 hover:text-aqua-700 hover:underline"
            >
              모두 지우기
            </button>
          )}
        </div>
        {/* 어디서 온 값인지 밝혀 둔다 — 미리 채워져 있으면 왜 그런지 알아야 고친다 */}
        {!editing && parts.length > 0 && (
          <p className="mb-2 text-xs text-ink-sub">
            {lastVisit && lastVisit.bodyParts.length > 0
              ? `지난 회차(${formatDateKr(lastVisit.visitedAt)})와 같게 미리 골라 두었습니다. 달라진 부위만 고치세요.`
              : "고객이 평소 원하시는 부위를 미리 골라 두었습니다. 실제 케어한 부위로 조정하세요."}
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
              AI 추천일
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

      <FormActions error={error || undefined}>
        <Button variant="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button onClick={submit} className="min-w-32 flex-1 sm:flex-none">
          {editing ? "수정 저장" : "기록 저장"}
        </Button>
      </FormActions>
    </div>
  );
}
