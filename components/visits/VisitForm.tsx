"use client";

/** 방문/상담 기록 폼 — 이용권 차감, 신체부위 기록, 다음 관리일 지정 포함 */

import { useMemo, useState } from "react";
import { useStore } from "@/lib/data/store";
import { BodyPartRecord, VisitType } from "@/lib/types";
import { daysFromToday } from "@/lib/utils/date";
import { Button, FieldLabel, inputCls } from "@/components/ui";
import BodyMap from "@/components/body-map/BodyMap";

const PROGRAMS = [
  "쑥뜸 베이직 케어",
  "쑥뜸 딥 릴랙스 케어",
  "반신 온열 케어",
  "기타 프로그램",
];

export default function VisitForm({
  customerId: fixedCustomerId,
  onSaved,
  onCancel,
}: {
  customerId?: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { customers, staff, memberships, settings, addVisit } = useStore();
  const [customerId, setCustomerId] = useState(fixedCustomerId ?? "");
  const [type, setType] = useState<VisitType>("visit");
  const [programName, setProgramName] = useState(PROGRAMS[0]);
  const [membershipId, setMembershipId] = useState("");
  const [parts, setParts] = useState<BodyPartRecord[]>(() => {
    if (!fixedCustomerId) return [];
    return (
      customers.find((c) => c.id === fixedCustomerId)?.focusBodyParts ?? []
    );
  });
  const [reaction, setReaction] = useState("");
  const [amount, setAmount] = useState("");
  const [nextManage, setNextManage] = useState(
    daysFromToday(settings.careRules.defaultCycleDays),
  );
  const [staffId, setStaffId] = useState("");
  const [error, setError] = useState("");

  const sortedCustomers = useMemo(
    () => [...customers].sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [customers],
  );

  const activeMemberships = memberships.filter(
    (m) => m.customerId === customerId && m.status === "active",
  );

  const selectCustomer = (id: string) => {
    setCustomerId(id);
    setMembershipId("");
    const c = customers.find((x) => x.id === id);
    setParts(c?.focusBodyParts ?? []);
  };

  const submit = () => {
    if (!customerId) return setError("고객을 선택하세요.");
    addVisit({
      customerId,
      type,
      programName: type === "visit" ? programName : undefined,
      membershipId: type === "visit" && membershipId ? membershipId : undefined,
      bodyParts: parts,
      reaction: reaction || undefined,
      amount: amount ? Number(amount.replace(/\D/g, "")) : undefined,
      nextManageDate: nextManage || undefined,
      staffId: staffId || undefined,
    });
    onSaved();
  };

  return (
    <div className="space-y-4">
      {!fixedCustomerId && (
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
                  ? "bg-deep-800 text-white shadow-sm"
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
            <FieldLabel>이용권 차감</FieldLabel>
            <select
              className={inputCls}
              value={membershipId}
              onChange={(e) => setMembershipId(e.target.value)}
              disabled={!customerId}
            >
              <option value="">차감 안 함 (현장 결제 등)</option>
              {activeMemberships.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.programName} · 잔여 {m.remainingCount}회
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <FieldLabel>집중 케어 부위</FieldLabel>
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
          <input
            type="date"
            className={inputCls}
            value={nextManage}
            onChange={(e) => setNextManage(e.target.value)}
          />
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
          placeholder="고객 반응, 상담 내용, 특이사항"
        />
      </div>

      {error && <p className="text-sm font-semibold text-danger">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button onClick={submit}>기록 저장</Button>
      </div>
    </div>
  );
}
