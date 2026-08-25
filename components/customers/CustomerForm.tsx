"use client";

/** 고객 등록 · 정보 수정 폼 (모달 내부) */

import { useRef, useState } from "react";
import { useStore } from "@/lib/data/store";
import { BodyPartRecord, Customer } from "@/lib/types";
import { daysFromToday } from "@/lib/utils/date";
import {
  formatPhoneInput,
  isValidPhone,
  phoneDigits,
} from "@/lib/utils/format";
import { Button, FieldLabel, FormActions, inputCls } from "@/components/ui";
import { useFormError } from "@/lib/utils/form";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { useToast } from "@/components/ui/toast";
import BodyMap from "@/components/body-map/BodyMap";

export default function CustomerForm({
  customer,
  initialName,
  onSaved,
  onCancel,
}: {
  /** 있으면 수정 모드 */
  customer?: Customer;
  /** 등록 모드에서 이름 칸을 미리 채워 둔다 (기록 화면에서 찾다가 넘어온 경우) */
  initialName?: string;
  onSaved: (customerId: string) => void;
  onCancel: () => void;
}) {
  const { staff, settings, customers, addCustomer, updateCustomer } = useStore();
  const toast = useToast();
  const editing = !!customer;
  const [name, setName] = useState(customer?.name ?? initialName ?? "");
  const [phone, setPhone] = useState(
    customer ? formatPhoneInput(customer.phone) : "",
  );
  const [gender, setGender] = useState<"female" | "male" | "">(
    customer?.gender === "female" || customer?.gender === "male"
      ? customer.gender
      : "",
  );
  /*
   * 출생연도 입력칸은 없앴다 — 매장이 쓰던 고객차트는 생년이 아니라
   * "60대"처럼 대(帶)로 적혀 있고, 현장에서 생년을 여쭙기도 어렵다.
   * 예전에 저장된 값은 지우지 않고 그대로 들고 간다.
   */
  const birthYear = customer?.birthYear;
  const [ageGroup, setAgeGroup] = useState(customer?.ageGroup ?? "");
  const [consultationNote, setConsultationNote] = useState(
    customer?.consultationNote ?? "",
  );
  const [staffId, setStaffId] = useState(customer?.assignedStaffId ?? "");
  const [memo, setMemo] = useState(customer?.memo ?? "");
  const [parts, setParts] = useState<BodyPartRecord[]>(
    customer?.focusBodyParts ?? [],
  );
  const [nextManage, setNextManage] = useState(
    customer
      ? (customer.nextManageDate ?? "")
      : daysFromToday(settings.careRules.defaultCycleDays),
  );
  const [nextManageTime, setNextManageTime] = useState<string | undefined>(
    customer?.nextManageTime,
  );
  const { error, fail, clear } = useFormError();
  /* 잘못 적은 칸으로 데려가려면 그 칸을 붙잡고 있어야 한다 */
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  /** 같은 연락처가 이미 등록되어 있으면 미리 알려 준다 (저장은 막지 않음) */
  const duplicate = (() => {
    const d = phoneDigits(phone);
    if (d.length < 10) return undefined;
    return customers.find(
      (c) => c.id !== customer?.id && phoneDigits(c.phone) === d,
    );
  })();

  const submit = () => {
    if (!name.trim()) return fail("고객명을 입력하세요.", nameRef);
    if (!phone.trim()) return fail("연락처를 입력하세요.", phoneRef);
    if (!isValidPhone(phone))
      return fail("연락처를 확인해 주세요. 예: 010-1234-5678", phoneRef);
    clear();

    if (customer) {
      updateCustomer(customer.id, {
        name: name.trim(),
        phone: phone.trim(),
        gender: gender || undefined,
        birthYear,
        ageGroup: ageGroup.trim() || undefined,
        consultationNote: consultationNote.trim() || undefined,
        memo: memo || undefined,
        focusBodyParts: parts,
        assignedStaffId: staffId || undefined,
        nextManageDate: nextManage || undefined,
        nextManageTime: nextManage ? nextManageTime : undefined,
      });
      toast(`${name.trim()} 고객 정보를 수정했습니다`);
      onSaved(customer.id);
      return;
    }

    const c = addCustomer({
      name,
      phone,
      gender: gender || undefined,
      birthYear,
      ageGroup: ageGroup.trim() || undefined,
      consultationNote: consultationNote.trim() || undefined,
      memo: memo || undefined,
      focusBodyParts: parts,
      assignedStaffId: staffId || undefined,
      nextManageDate: nextManage || undefined,
      nextManageTime: nextManage ? nextManageTime : undefined,
    });
    toast(`${c.name} 고객을 등록했습니다`);
    onSaved(c.id);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>고객명 *</FieldLabel>
          <input
            ref={nameRef}
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 김영희"
          />
        </div>
        <div>
          <FieldLabel>연락처 *</FieldLabel>
          <input
            ref={phoneRef}
            className={inputCls}
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            placeholder="010-0000-0000"
            inputMode="tel"
            maxLength={13}
          />
          {duplicate && (
            <p className="mt-1.5 text-[0.8125rem] font-bold text-warn-text">
              같은 연락처의 <b>{duplicate.name}</b> 고객이 이미 있습니다. 중복
              등록이 아닌지 확인해 주세요.
            </p>
          )}
        </div>
        <div>
          <FieldLabel>성별</FieldLabel>
          <select
            className={inputCls}
            value={gender}
            onChange={(e) => setGender(e.target.value as typeof gender)}
          >
            <option value="">선택 안 함</option>
            <option value="female">여성</option>
            <option value="male">남성</option>
          </select>
        </div>
        <div>
          <FieldLabel>연령대</FieldLabel>
          <input
            className={inputCls}
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
            placeholder="예: 60대"
            maxLength={10}
          />
          <p className="mt-1.5 text-[0.8125rem] text-ink-sub">
            정확한 생년을 여쭙기 어려울 때 적어 두는 칸입니다.
          </p>
        </div>
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
          <DateTimeField
            date={nextManage}
            time={nextManageTime}
            onChange={(d, t) => {
              setNextManage(d);
              setNextManageTime(t);
            }}
          />
        </div>
      </div>

      <div>
        <FieldLabel>집중 케어 희망 부위</FieldLabel>
        <BodyMap value={parts} onChange={setParts} compactChips />
      </div>

      {/*
        원문 상담메모와 특이사항을 나눠 둔다.
        원문은 고객이 말한 그대로 남겨 두는 칸이라 나중에 고쳐 쓰지 않고,
        운영하며 알게 된 것은 아래 특이사항에 쌓는다.
      */}
      <div>
        <FieldLabel>고객 원문 상담메모</FieldLabel>
        <textarea
          className={`${inputCls} min-h-20`}
          value={consultationNote}
          onChange={(e) => setConsultationNote(e.target.value)}
          placeholder="첫 상담에서 고객이 말한 내용을 그대로 적어 주세요"
        />
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-sub">
          고객이 말한 그대로 보관합니다. 시스템이 이 글을 해석하거나 관리
          방법을 자동으로 정하지 않고, 우선순위 계산에도 쓰지 않습니다.
        </p>
      </div>

      <div>
        <FieldLabel>특이사항</FieldLabel>
        <textarea
          className={`${inputCls} min-h-20`}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="운영하며 알게 된 참고사항"
        />
      </div>

      <FormActions error={error || undefined}>
        <Button variant="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button onClick={submit} className="min-w-32 flex-1 sm:flex-none">
          {editing ? "수정 저장" : "고객 등록"}
        </Button>
      </FormActions>
    </div>
  );
}
